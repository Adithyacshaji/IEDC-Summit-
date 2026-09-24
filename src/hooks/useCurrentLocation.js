import { useState, useRef, useCallback, useEffect } from "react";
import { gpsDistanceMeters } from "../utils/gpsDistance";

// Kalman-like weighted average smoothing for noisy campus GPS.
const ALPHA = 0.35;
// Reject readings worse than this accuracy (meters).
const MAX_ACCURACY_METERS = 50;
// How long to wait before declaring GPS timeout (likely indoors).
const GPS_TIMEOUT_MS = 10000;
// Accuracy above this marks GPS as "poor" but still usable.
const POOR_ACCURACY_THRESHOLD = 35;
// Consecutive bad readings before declaring GPS failed.
const POOR_READING_LIMIT = 3;
// Smoothing factor for heading (0 = no update, 1 = instant). Lower = smoother.
const HEADING_ALPHA = 0.15;
// Minimum speed (m/s) to trust GPS heading (below this, use compass)
const MIN_SPEED_FOR_GPS_HEADING = 0.5;
// Orientation event throttle interval (ms) — 15fps is plenty for smooth rotation
const ORIENTATION_THROTTLE_MS = 66;

/**
 * GPS status values:
 * - pending  → waiting for first fix
 * - ok       → good lock
 * - poor     → weak but usable
 * - failed   → permission denied or repeated bad readings
 * - timeout  → no fix within GPS_TIMEOUT_MS (likely inside building)
 */
export default function useCurrentLocation() {
  const [location, setLocation] = useState(null);
  const [heading, setHeading] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("pending");
  const [isTracking, setIsTracking] = useState(false);

  const watchIdRef = useRef(null);
  const smoothedRef = useRef(null);
  const timeoutRef = useRef(null);
  const poorCountRef = useRef(0);
  const hasFixRef = useRef(false);
  const locationListenersRef = useRef(new Set());
  const latestLocationRef = useRef(null);
  const approximateLocationRef = useRef(null);
  const appLocationPublishedRef = useRef(false);
  // Smoothed heading state ref (avoids triggering re-renders on every compass tick)
  const smoothedHeadingRef = useRef(null);
  const lastOrientationTimeRef = useRef(0);

  const subscribeToLocation = useCallback((listener) => {
    locationListenersRef.current.add(listener);
    return () => locationListenersRef.current.delete(listener);
  }, []);
  const getLatestLocation = useCallback(() => latestLocationRef.current, []);
  const getApproximateLocation = useCallback(() => approximateLocationRef.current, []);

  const applySmoothing = useCallback((rawLat, rawLng) => {
    if (!smoothedRef.current) {
      smoothedRef.current = { lat: rawLat, lng: rawLng };
    } else {
      smoothedRef.current = {
        lat: ALPHA * rawLat + (1 - ALPHA) * smoothedRef.current.lat,
        lng: ALPHA * rawLng + (1 - ALPHA) * smoothedRef.current.lng,
      };
    }
    return { ...smoothedRef.current };
  }, []);

  const clearGpsTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported.");
      setGpsStatus("failed");
      return;
    }
    if (watchIdRef.current !== null) return;

    setIsTracking(true);
    setGpsStatus("pending");
    hasFixRef.current = false;
    poorCountRef.current = 0;
    appLocationPublishedRef.current = false;
    setLocation(null);
    smoothedRef.current = null;

    clearGpsTimeout();
    timeoutRef.current = setTimeout(() => {
      if (!hasFixRef.current) setGpsStatus("timeout");
    }, GPS_TIMEOUT_MS);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        clearGpsTimeout();
        hasFixRef.current = true;

        const { latitude, longitude, accuracy: acc, heading: hdg, speed } = pos.coords;
        approximateLocationRef.current = { lat: latitude, lng: longitude };

        if (acc > MAX_ACCURACY_METERS) {
          poorCountRef.current += 1;
          setGpsStatus(
            poorCountRef.current >= POOR_READING_LIMIT ? "failed" : "poor"
          );
          return;
        }

        poorCountRef.current = 0;
        setGpsStatus(acc > POOR_ACCURACY_THRESHOLD ? "poor" : "ok");

        const smoothed = applySmoothing(latitude, longitude);
        const locArray = [smoothed.lat, smoothed.lng];
        latestLocationRef.current = locArray;

        locationListenersRef.current.forEach((listener) => listener(locArray, { heading: hdg, accuracy: acc }));

        // Update live user location state continuously
        setLocation(locArray);
        setAccuracy(acc);

        // Use GPS movement heading when moving fast enough (more accurate than compass for navigation)
        const isMoving = speed !== null && speed !== undefined && !isNaN(speed) && speed >= MIN_SPEED_FOR_GPS_HEADING;
        if (isMoving && hdg !== null && hdg !== undefined && !isNaN(hdg)) {
          // Smooth GPS heading with low-pass filter
          const prev = smoothedHeadingRef.current;
          if (prev === null || prev === undefined) {
            smoothedHeadingRef.current = hdg;
          } else {
            // Shortest-path angular interpolation
            let delta = ((hdg - prev) + 540) % 360 - 180;
            smoothedHeadingRef.current = (prev + delta * HEADING_ALPHA + 360) % 360;
          }
          setHeading(Math.round(smoothedHeadingRef.current));
        }
      },
      (err) => {
        console.warn("watchPosition error:", err.message);
        clearGpsTimeout();
        setGpsStatus("failed");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: GPS_TIMEOUT_MS,
      }
    );
  }, [applySmoothing, clearGpsTimeout]);

  const stopTracking = useCallback(() => {
    clearGpsTimeout();
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, [clearGpsTimeout]);

  const getOneShotLocation = useCallback(() => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setGpsStatus("failed");
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = [pos.coords.latitude, pos.coords.longitude];
          hasFixRef.current = true;
          setGpsStatus("ok");
          setLocation(loc);
          resolve(loc);
        },
        (err) => {
          console.warn("getOneShotLocation error:", err.message);
          setGpsStatus("failed");
          resolve(null);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: GPS_TIMEOUT_MS }
      );
    });
  }, []);

  useEffect(() => {
    startTracking();

    const handleOrientation = (e) => {
      // Throttle to ~15fps to prevent React state thrashing
      const now = Date.now();
      if (now - lastOrientationTimeRef.current < ORIENTATION_THROTTLE_MS) return;
      lastOrientationTimeRef.current = now;

      let raw = null;
      if (e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null) {
        // iOS WebKit Compass Heading (already absolute)
        raw = e.webkitCompassHeading;
      } else if (e.alpha !== undefined && e.alpha !== null) {
        // Standard Device Orientation (0-360 degrees)
        raw = (360 - e.alpha) % 360;
      }

      if (raw !== null && !isNaN(raw)) {
        // Smooth compass heading with low-pass filter
        const prev = smoothedHeadingRef.current;
        if (prev === null || prev === undefined) {
          smoothedHeadingRef.current = raw;
        } else {
          let delta = ((raw - prev) + 540) % 360 - 180;
          smoothedHeadingRef.current = (prev + delta * HEADING_ALPHA + 360) % 360;
        }
        setHeading(Math.round(smoothedHeadingRef.current));
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", handleOrientation, true);
    }

    return () => {
      stopTracking();
      if (window.DeviceOrientationEvent) {
        window.removeEventListener("deviceorientation", handleOrientation, true);
      }
    };
  }, [startTracking, stopTracking]);

  return {
    location,
    heading,
    accuracy,
    gpsStatus,
    isTracking,
    getOneShotLocation,
    startTracking,
    stopTracking,
    subscribeToLocation,
    getLatestLocation,
    getApproximateLocation,
    gpsDistanceMeters,
  };
}
