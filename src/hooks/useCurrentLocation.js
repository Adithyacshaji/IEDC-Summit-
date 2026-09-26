import { useState, useRef, useCallback, useEffect } from "react";
import { gpsDistanceMeters } from "../utils/gpsDistance";

// ─── Constants ──────────────────────────────────────────────────────────────

// GPS position smoothing (higher = more responsive to real movement)
const GPS_ALPHA = 0.4;
// Reject GPS readings worse than this accuracy circle (meters) - set higher to accept live device/browser fixes
const MAX_ACCURACY_METERS = 1000;
// GPS acquisition timeout — after this, GPS is declared unavailable (indoors)
const GPS_TIMEOUT_MS = 10000;
// Above this accuracy (m) GPS is "poor" but still usable
const POOR_ACCURACY_THRESHOLD = 35;
// Consecutive poor readings before declaring GPS failed
const POOR_READING_LIMIT = 3;

// Heading smoothing — higher = more responsive, lower = smoother
// 0.4 gives Google Maps-like snappy response without jitter
const HEADING_ALPHA = 0.4;

// Minimum GPS speed (m/s) to use GPS course heading (walking pace ~1.4 m/s)
const MIN_SPEED_FOR_GPS_HEADING = 0.4;

// Compass update rate — 16ms = 60fps (matching display refresh)
// Google Maps updates the heading indicator every frame using gyroscope-fused data
const ORIENTATION_THROTTLE_MS = 16;

// Tilt threshold — if device beta < this, it's lying flat and compass is unreliable
// Google dims the beam when the phone is flat on a table
const MIN_TILT_DEGREES = 15;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the current screen orientation offset in degrees.
 *
 * This is CRITICAL for correct compass behaviour on Android:
 * When you rotate your phone to landscape, the raw `alpha` from DeviceOrientation
 * still comes in without accounting for the screen rotation — it will be 90° off.
 * Google Maps compensates by adding the screen's physical rotation angle.
 *
 * screen.orientation.angle:
 *   0°   = portrait (normal)
 *   90°  = landscape, phone rotated clockwise (top points left)
 *   180° = portrait upside-down
 *   270° = landscape, phone rotated counter-clockwise (top points right)
 */
function getScreenOrientationAngle() {
  if (typeof screen !== "undefined" && screen.orientation?.angle !== undefined) {
    return screen.orientation.angle;
  }
  // Fallback: window.orientation (deprecated but widely supported)
  if (typeof window !== "undefined" && window.orientation !== undefined) {
    // window.orientation uses a different sign convention — normalize to 0-360
    return ((window.orientation % 360) + 360) % 360;
  }
  return 0;
}

/**
 * Shortest-path angular interpolation.
 * Handles wrap-around (e.g. 359° → 1° goes the short way, not the long way).
 */
function smoothAngle(prev, next, alpha) {
  if (prev === null || prev === undefined) return next;
  const delta = ((next - prev) + 540) % 360 - 180;
  return (prev + delta * alpha + 360) % 360;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * GPS status values:
 * - pending  → waiting for first fix
 * - ok       → good lock (accuracy ≤ 35m)
 * - poor     → weak but usable (35m < accuracy ≤ 50m)
 * - failed   → permission denied or repeated bad readings
 * - timeout  → no fix within GPS_TIMEOUT_MS (likely inside building)
 */
export default function useCurrentLocation() {
  const [location, setLocation] = useState(null);
  const [heading, setHeading] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("pending");
  const [isTracking, setIsTracking] = useState(false);

  // iOS 13+ requires explicit permission for DeviceOrientationEvent
  const [compassPermission, setCompassPermission] = useState(
    typeof DeviceOrientationEvent === "undefined" ||
    typeof DeviceOrientationEvent.requestPermission !== "function"
      ? "granted"   // non-iOS: permission not required
      : "unknown"   // iOS: need to ask
  );

  const watchIdRef = useRef(null);
  const smoothedPosRef = useRef(null);    // Smoothed GPS position
  const smoothedHdgRef = useRef(null);    // Smoothed heading
  const timeoutRef = useRef(null);
  const poorCountRef = useRef(0);
  const hasFixRef = useRef(false);
  const locationListenersRef = useRef(new Set());
  const latestLocationRef = useRef(null);
  const approximateLocationRef = useRef(null);
  const appLocationPublishedRef = useRef(false);
  const lastOrientationTimeRef = useRef(0);

  // ── Public API ────────────────────────────────────────────────────────────

  const subscribeToLocation = useCallback((listener) => {
    locationListenersRef.current.add(listener);
    return () => locationListenersRef.current.delete(listener);
  }, []);

  const getLatestLocation = useCallback(() => latestLocationRef.current, []);
  const getApproximateLocation = useCallback(() => approximateLocationRef.current, []);

  /**
   * Request compass permission on iOS 13+ (must be called from a user gesture).
   * Returns "granted" | "denied" | "not-required"
   */
  const requestCompassPermission = useCallback(async () => {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      try {
        const result = await DeviceOrientationEvent.requestPermission();
        setCompassPermission(result);
        return result;
      } catch (err) {
        console.warn("DeviceOrientationEvent.requestPermission:", err);
        setCompassPermission("denied");
        return "denied";
      }
    }
    setCompassPermission("granted");
    return "not-required";
  }, []);

  // ── Internal helpers ──────────────────────────────────────────────────────

  const clearGpsTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Smooth a new raw heading and publish it as React state.
   * Uses shortest-path interpolation to handle 359°→1° wrap correctly.
   */
  const publishHeading = useCallback((rawDeg) => {
    if (rawDeg === null || rawDeg === undefined || isNaN(rawDeg)) return;
    const smoothed = smoothAngle(smoothedHdgRef.current, rawDeg, HEADING_ALPHA);
    smoothedHdgRef.current = smoothed;
    setHeading(Math.round(smoothed));
  }, []);

  // ── GPS tracking ──────────────────────────────────────────────────────────

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
    smoothedPosRef.current = null;

    clearGpsTimeout();
    timeoutRef.current = setTimeout(() => {
      if (!hasFixRef.current) setGpsStatus("timeout");
    }, GPS_TIMEOUT_MS);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        clearGpsTimeout();
        hasFixRef.current = true;

        const { latitude, longitude, accuracy: acc, heading: gpsHdg, speed } = pos.coords;
        approximateLocationRef.current = { lat: latitude, lng: longitude };

        if (acc > MAX_ACCURACY_METERS) {
          poorCountRef.current += 1;
          setGpsStatus(poorCountRef.current >= POOR_READING_LIMIT ? "failed" : "poor");
          return;
        }

        poorCountRef.current = 0;
        setGpsStatus(acc > POOR_ACCURACY_THRESHOLD ? "poor" : "ok");

        // ── GPS position smoothing ─────────────────────────────────────────
        if (!smoothedPosRef.current) {
          smoothedPosRef.current = { lat: latitude, lng: longitude };
        } else {
          smoothedPosRef.current = {
            lat: GPS_ALPHA * latitude + (1 - GPS_ALPHA) * smoothedPosRef.current.lat,
            lng: GPS_ALPHA * longitude + (1 - GPS_ALPHA) * smoothedPosRef.current.lng,
          };
        }

        const locArray = [smoothedPosRef.current.lat, smoothedPosRef.current.lng];
        latestLocationRef.current = locArray;
        locationListenersRef.current.forEach((l) => l(locArray, { heading: gpsHdg, accuracy: acc }));
        setLocation(locArray);
        setAccuracy(acc);

        // ── GPS course heading ────────────────────────────────────────────
        // GPS course (heading field) = direction of travel, always true-north.
        // Use it when moving — more reliable than compass in areas with magnetic interference.
        const isMoving =
          speed !== null && speed !== undefined && !isNaN(speed) &&
          speed >= MIN_SPEED_FOR_GPS_HEADING &&
          gpsHdg !== null && gpsHdg !== undefined && !isNaN(gpsHdg);

        if (isMoving) {
          publishHeading(gpsHdg);
        }
      },
      (err) => {
        console.warn("watchPosition error:", err.message);
        clearGpsTimeout();
        setGpsStatus("failed");
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: GPS_TIMEOUT_MS }
    );
  }, [clearGpsTimeout, publishHeading]);

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
      if (!navigator.geolocation) { setGpsStatus("failed"); resolve(null); return; }
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

  // ── Compass / Device Orientation ──────────────────────────────────────────
  useEffect(() => {
    startTracking();

    /**
     * GOOGLE MAPS COMPASS LOGIC — implemented faithfully:
     *
     * 1. Source priority (most accurate → least):
     *    a. webkitCompassHeading (iOS Safari) — already true-north, auto-compensates screen rotation
     *    b. DeviceOrientationAbsoluteEvent alpha (Chrome Android ≥59) — true-north, needs screen correction
     *    c. Standard deviceorientation with e.absolute===true — same as (b)
     *    (non-absolute alpha is NEVER used — it's device-frame-relative, not geographic)
     *
     * 2. Screen orientation compensation (THE critical step most implementations miss):
     *    On Android, the raw `alpha` from DeviceOrientation does NOT account for screen rotation.
     *    If you hold your phone in landscape, alpha is 90° off. Google Maps adds the screen's
     *    physical rotation angle to correct this: heading = (360 - alpha + screenAngle) % 360
     *
     * 3. Device tilt guard:
     *    When `beta` (forward/back tilt) is very small, the phone is near-horizontal (lying flat).
     *    In this position, the magnetometer measures the Z-axis instead of horizontal plane,
     *    making compass reading unreliable. Google dims the beam in this case — we skip the update.
     *
     * 4. 60fps updates via gyroscope fusion:
     *    The browser's DeviceOrientation events are fused with gyroscope data by the OS,
     *    so they update at ~60fps with smooth angular tracking. We process at full 60fps.
     */
    const handleOrientation = (e) => {
      const now = Date.now();
      if (now - lastOrientationTimeRef.current < ORIENTATION_THROTTLE_MS) return;
      lastOrientationTimeRef.current = now;

      let raw = null;

      if (
        typeof e.webkitCompassHeading === "number" &&
        !isNaN(e.webkitCompassHeading) &&
        e.webkitCompassHeading >= 0
      ) {
        // ── iOS Safari ───────────────────────────────────────────────────
        // webkitCompassHeading: true-north clockwise (0–360°)
        // iOS automatically compensates for screen orientation — use as-is.
        //
        // Tilt guard: webkitCompassAccuracy > 30 means poor magnetic environment.
        // beta < MIN_TILT_DEGREES means phone is near-horizontal (compass unreliable).
        const beta = Math.abs(e.beta ?? 90);
        if (beta < MIN_TILT_DEGREES) return; // phone is flat — skip

        raw = e.webkitCompassHeading;

      } else if (
        typeof e.alpha === "number" && !isNaN(e.alpha) &&
        (e.absolute === true || e.type === "deviceorientationabsolute")
      ) {
        // ── Android / Standard absolute ──────────────────────────────────
        // alpha: CCW degrees from geographic north (0–360°)
        // Formula: compassHeading = (360 - alpha + screenAngle) % 360
        //
        // The screenAngle correction is ESSENTIAL — without it the cone points
        // 90° wrong when holding the phone in landscape mode.
        //
        // Tilt guard: beta is degrees from flat (0°=flat, 90°=upright).
        // We need beta > MIN_TILT_DEGREES to have reliable horizontal-plane reading.
        const beta = Math.abs(e.beta ?? 90);
        if (beta < MIN_TILT_DEGREES) return; // phone is flat — skip

        const screenAngle = getScreenOrientationAngle();
        raw = (360 - e.alpha + screenAngle) % 360;
      }
      // Non-absolute alpha → intentionally skipped (device-frame-relative, wrong direction)

      if (raw !== null) {
        publishHeading(raw);
      }
    };

    // Register deviceorientationabsolute first (Chrome Android ≥59).
    // This event always fires with e.absolute === true and is OS-fused with gyroscope.
    let registeredAbsolute = false;
    if (typeof DeviceOrientationAbsoluteEvent !== "undefined") {
      window.addEventListener("deviceorientationabsolute", handleOrientation, true);
      registeredAbsolute = true;
    }

    // Also register standard deviceorientation for iOS + Android fallback.
    if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", handleOrientation, true);
    }

    return () => {
      stopTracking();
      if (registeredAbsolute) {
        window.removeEventListener("deviceorientationabsolute", handleOrientation, true);
      }
      if (window.DeviceOrientationEvent) {
        window.removeEventListener("deviceorientation", handleOrientation, true);
      }
    };
  }, [startTracking, stopTracking, publishHeading]);

  return {
    location,
    heading,
    accuracy,
    gpsStatus,
    isTracking,
    compassPermission,
    requestCompassPermission,
    getOneShotLocation,
    startTracking,
    stopTracking,
    subscribeToLocation,
    getLatestLocation,
    getApproximateLocation,
    gpsDistanceMeters,
  };
}
