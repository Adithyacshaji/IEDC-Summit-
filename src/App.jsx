import React, { useState, useMemo } from "react";
import { useDatabase } from "./context/DatabaseContext";
import useCurrentLocation from "./hooks/useCurrentLocation";
import SearchBar from "./components/common/SearchBar";
import SearchChips from "./components/common/SearchChips";
import BottomSheet from "./components/common/BottomSheet";
import YDCard from "./components/common/YDCard";
import CampusMap from "./components/map/CampusMap";
import LoadingScreen from "./components/common/LoadingScreen";
import LandingScreen from "./components/common/LandingScreen";
import LiveEventsModal from "./components/common/LiveEventsModal";
import NavigationCard from "./components/common/NavigationCard";
import FeedbackCard from "./components/common/FeedbackCard";
import LocationAlertCard from "./components/common/LocationAlertCard";
import YDRouteCard from "./components/common/YDRouteCard";
import { buildNodeMap, findNearestOutdoorNode, findOutdoorPath } from "./routing/outdoorRouter";
import { gpsDistanceMeters } from "./utils/gpsDistance";
import { getDistanceToRoute } from "./utils/distanceToRoute";
import "./App.css";

// Default user position if GPS unavailable (Campus Entrance)
const DEFAULT_USER_POS = [10.361964, 76.285827];

export default function App() {
  const { loading: dbLoading, events, nodes, edges, searchItems } = useDatabase();
  const { location, heading: compassHeading, gpsStatus, startTracking, getOneShotLocation } = useCurrentLocation();

  // Minimalist Splash / Landing Screen State
  const [showLanding, setShowLanding] = useState(true);

  // Live Events Popup Modal State on First Load
  const [showLiveModal, setShowLiveModal] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [customOrigin, setCustomOrigin] = useState(null); // null means Live GPS / Your Location
  const [route, setRoute] = useState([]);
  const [isNavigating, setIsNavigating] = useState(false);

  // Keep route state synced in a ref for safe off-route checks without re-render loops
  const routeRef = React.useRef(route);
  React.useEffect(() => {
    routeRef.current = route;
  }, [route]);

  // Feedback Card state after reaching destination
  const [showFeedbackCard, setShowFeedbackCard] = useState(false);
  const [feedbackDestination, setFeedbackDestination] = useState(null);

  // GPS Alert Dismissal state
  const [dismissGpsAlert, setDismissGpsAlert] = useState(false);

  // Testing Flag: Set to true to force Default Entrance Location; false to use Real Live GPS
  const [useDefaultLocation, setUseDefaultLocation] = useState(true);

  const handleRetryGps = async () => {
    startTracking();
    await getOneShotLocation();
  };

  // BottomSheet State
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState("Main");
  const [activeCategory, setActiveCategory] = useState(null);

  // Build dynamic node map lookup { [id]: [lat, lng] } from DB nodes
  const nodeMap = useMemo(() => {
    return buildNodeMap(nodes);
  }, [nodes]);

  // Computed active user coordinates
  const userCoords = useMemo(() => {
    // If testing state is true, force Default Entrance Location
    if (useDefaultLocation) {
      return DEFAULT_USER_POS;
    }
    // Otherwise use real-time GPS location if available
    if (location && Array.isArray(location) && location.length === 2 && location[0] && location[1]) {
      return location;
    }
    if (location && typeof location === "object" && location.lat && location.lng) {
      return [location.lat, location.lng];
    }
    return DEFAULT_USER_POS;
  }, [location, useDefaultLocation]);

  // Active starting coordinates (uses customOrigin if selected by user, otherwise userCoords)
  const activeStartCoords = useMemo(() => {
    if (customOrigin && customOrigin.position && Array.isArray(customOrigin.position)) {
      return customOrigin.position;
    }
    return userCoords;
  }, [customOrigin, userCoords]);

  // Helper string cleaner
  const cleanStr = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  // Computed display coordinates for user location icon:
  // If user is within 3 meters of the current route, snap/center icon directly on the path line!
  const displayUserCoords = useMemo(() => {
    if (route && route.length >= 2 && userCoords) {
      const userLoc = { lat: userCoords[0], lng: userCoords[1] };
      const { point, distanceMeters } = getDistanceToRoute(route, userLoc);
      if (distanceMeters <= 3 && point && Array.isArray(point)) {
        return point; // Centered to path line!
      }
    }
    return userCoords;
  }, [route, userCoords]);

  // Live dynamic route update with off-route threshold (5m) & smooth path reduction
  React.useEffect(() => {
    if (!destination) return;

    const currentRoute = routeRef.current;
    const userLoc = { lat: activeStartCoords[0], lng: activeStartCoords[1] };

    // If an active route already exists, check distance to current route line
    if (currentRoute && currentRoute.length >= 2) {
      const { point, distanceMeters, segmentIndex } = getDistanceToRoute(currentRoute, userLoc);

      // If user is within 5 meters of current route line, stay ON ROUTE!
      // Do NOT re-run A* nearest node search to avoid path flipping.
      if (distanceMeters <= 5) {
        // Snap path origin to route if within 3m, otherwise use activeStartCoords
        const startPoint = (distanceMeters <= 3 && point && Array.isArray(point)) ? point : activeStartCoords;
        const remainingSegment = currentRoute.slice(segmentIndex + 1);
        const updatedRoute = [startPoint, ...remainingSegment];
        
        if (updatedRoute.length >= 2) {
          setRoute(updatedRoute);
        }
        return;
      }
    }

    // User is > 5m OFF-ROUTE (or route is brand new/empty): recalculate A* path from user's current location
    const startNodeId = findNearestOutdoorNode(activeStartCoords[0], activeStartCoords[1], nodeMap);
    let destNodeId = null;
    let destPos = destination.position;

    if (destination.routeNode && nodeMap[destination.routeNode]) {
      destNodeId = destination.routeNode;
      destPos = nodeMap[destination.routeNode];
    } else if (destination.id && nodeMap[destination.id]) {
      destNodeId = destination.id;
      destPos = nodeMap[destination.id];
    } else if (destination.position && Array.isArray(destination.position)) {
      destNodeId = findNearestOutdoorNode(destination.position[0], destination.position[1], nodeMap);
    } else {
      const targetClean = cleanStr(destination.building || destination.name || destination.event_name);
      const matchingNode = nodes.find((n) => {
        const nc = cleanStr(n.building_name || n.name || n.id);
        return nc && targetClean && (nc.includes(targetClean) || targetClean.includes(nc));
      });

      if (matchingNode) {
        destNodeId = matchingNode.id;
        destPos = [parseFloat(matchingNode.latitude), parseFloat(matchingNode.longitude)];
      }
    }

    let pathNodeIds = [];
    if (startNodeId && destNodeId && startNodeId !== destNodeId) {
      pathNodeIds = findOutdoorPath(startNodeId, destNodeId, nodeMap, edges);
    }

    let routeCoords = pathNodeIds
      .map((id) => nodeMap[id])
      .filter((coord) => coord && Array.isArray(coord));

    if (routeCoords.length < 2 && destPos) {
      routeCoords = [activeStartCoords, destPos];
    } else if (routeCoords.length >= 2) {
      routeCoords = [activeStartCoords, ...routeCoords];
    }

    setRoute(routeCoords);
  }, [activeStartCoords, destination, nodeMap, nodes, edges]);

  // Calculate live distance in meters from active user location to destination
  const distanceToDestMeters = useMemo(() => {
    if (!destination || !destination.position || !userCoords) return Infinity;
    return gpsDistanceMeters(userCoords, destination.position);
  }, [destination, userCoords]);

  // Near building threshold (e.g. within 30 meters of destination building)
  const isNearBuilding = useMemo(() => {
    return isNavigating && distanceToDestMeters <= 30;
  }, [isNavigating, distanceToDestMeters]);

  // Handle selecting a destination (Route Preview Mode: shows path on map + preview card)
  const handleSelectDestination = (targetItem = null) => {
    if (!targetItem) return;

    // Resolve target position
    let destPos = targetItem.position;
    if (!destPos) {
      if (targetItem.routeNode && nodeMap[targetItem.routeNode]) {
        destPos = nodeMap[targetItem.routeNode];
      } else if (targetItem.id && nodeMap[targetItem.id]) {
        destPos = nodeMap[targetItem.id];
      } else {
        const targetClean = cleanStr(targetItem.building || targetItem.name || targetItem.event_name);
        const matchingNode = nodes.find((n) => {
          const nc = cleanStr(n.building_name || n.name || n.id);
          return nc && targetClean && (nc.includes(targetClean) || targetClean.includes(nc));
        });
        if (matchingNode) {
          destPos = [parseFloat(matchingNode.latitude), parseFloat(matchingNode.longitude)];
        }
      }
    }

    const startNodeId = findNearestOutdoorNode(activeStartCoords[0], activeStartCoords[1], nodeMap);
    let destNodeId = targetItem.id && nodeMap[targetItem.id] ? targetItem.id : (destPos ? findNearestOutdoorNode(destPos[0], destPos[1], nodeMap) : null);
    
    let pathNodeIds = [];
    if (startNodeId && destNodeId && startNodeId !== destNodeId) {
      pathNodeIds = findOutdoorPath(startNodeId, destNodeId, nodeMap, edges);
    }

    let routeCoords = pathNodeIds
      .map((id) => nodeMap[id])
      .filter((coord) => coord && Array.isArray(coord));

    if (routeCoords.length < 2 && destPos) {
      routeCoords = [activeStartCoords, destPos];
    } else if (routeCoords.length >= 2) {
      routeCoords = [activeStartCoords, ...routeCoords];
    }

    setRoute(routeCoords);
    setDestination({
      ...targetItem,
      position: destPos || (routeCoords.length > 0 ? routeCoords[routeCoords.length - 1] : null)
    });
    setSelectedLocation(targetItem);
    setIsNavigating(false); // Keeps in Route Preview mode until user clicks "Start Navigation"
    setBottomSheetOpen(false);

    if (targetItem.type === "event" || targetItem.type === "location" || targetItem.building) {
      setSelectedBuilding(targetItem.building || targetItem.name || "Campus Location");
    }
  };

  // Confirm Start Navigation (User clicks "Start Navigation" button on YDCard)
  const handleConfirmStartNavigation = () => {
    if (!destination) return;
    setIsNavigating(true);
    setBottomSheetOpen(false);
  };

  // Handle selecting category chips
  const handleSelectCategory = (catId) => {
    setActiveCategory(catId);
    setBottomSheetOpen(true);
  };

  // Filter events strictly for current activeCategory in BottomSheet
  const categoryEvents = useMemo(() => {
    if (!events || events.length === 0) return [];
    if (!activeCategory) return events;

    const targetClean = cleanStr(activeCategory);

    return events.filter((e) => {
      const cat = e.event_category || (Array.isArray(e.speakers) && e.speakers[0]) || e.category || "";
      const catClean = cleanStr(cat);
      if (!catClean) return false;
      return catClean === targetClean || catClean.includes(targetClean) || targetClean.includes(catClean);
    });
  }, [events, activeCategory]);

  // Cancel / Stop Navigation
  const handleCancelNavigation = () => {
    setRoute([]);
    setIsNavigating(false);
    setDestination(null);
    setSelectedLocation(null);
    setCustomOrigin(null);
  };

  // Swap origin and destination in YDRouteCard
  const handleSwapYD = () => {
    if (!destination) return;
    const oldDest = destination;
    const oldOrigin = customOrigin;
    setDestination(oldOrigin || { name: "Your Location", position: userCoords });
    setCustomOrigin(oldDest);
  };

  // Close YDRouteCard & exit route mode
  const handleCloseYD = () => {
    setCustomOrigin(null);
    handleCancelNavigation();
  };

  // Reached Destination -> Open Feedback Modal
  const handleReachedDestination = () => {
    setFeedbackDestination(destination);
    setRoute([]);
    setIsNavigating(false);
    setDestination(null);
    setSelectedLocation(null);
    setShowFeedbackCard(true);
  };

  if (dbLoading) {
    return <LoadingScreen message="Loading IEDC Summit Outdoor Map..." />;
  }

  return (
    <div className="fixed inset-0 w-full h-full h-[100dvh] overflow-hidden bg-gray-50 flex flex-col touch-none select-none">
      {/* Minimalist Splash / Loading Screen */}
      {showLanding && (
        <LandingScreen 
          onFinish={() => {
            setShowLanding(false);
            setShowLiveModal(true); // Open live events popup on map load
          }} 
        />
      )}

      {/* Live Events Popup Modal on First Map Load */}
      {!showLanding && showLiveModal && (
        <LiveEventsModal
          events={events}
          onNavigate={(event) => {
            handleSelectDestination(event);
          }}
          onClose={() => setShowLiveModal(false)}
        />
      )}

      {/* Top Floating Control Bar */}
      <div className="absolute top-[calc(0.75rem+env(safe-area-inset-top))] left-0 right-0 z-40 px-3 sm:px-4 max-w-lg mx-auto pointer-events-none flex flex-col gap-2">
        <div className="w-full pointer-events-auto">
          {destination ? (
            <YDRouteCard
              destination={destination}
              origin={customOrigin}
              onSelectDestination={(newDest) => {
                handleSelectDestination(newDest);
              }}
              onSelectOrigin={(newOrig) => {
                setCustomOrigin(newOrig);
              }}
              onSwap={handleSwapYD}
              onClose={handleCloseYD}
            />
          ) : (
            <SearchBar
              onNavigate={(item) => {
                handleSelectDestination(item);
              }}
              onClear={() => {
                handleCancelNavigation();
              }}
            />
          )}
        </div>

        {!destination && (
          <SearchChips
            onSelectCategory={handleSelectCategory}
            activeCategory={activeCategory}
          />
        )}

        {/* Location Mode Toggle (For Testing: Toggle between Real Live GPS vs Default Entrance Position) */}
        <div className="flex justify-end pt-0.5 pointer-events-auto">
          <button
            onClick={() => setUseDefaultLocation((prev) => !prev)}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold shadow-md border transition-all flex items-center gap-1.5 backdrop-blur-md ${
              useDefaultLocation
                ? "bg-slate-900/90 text-white border-slate-700 hover:bg-slate-800"
                : "bg-blue-600/90 text-white border-blue-700 hover:bg-blue-700"
            }`}
            title="Click to toggle between Real GPS Location and Default Entrance Location"
          >
            <span className={`w-2 h-2 rounded-full bg-white ${!useDefaultLocation ? "animate-ping" : ""}`} />
            <span>{useDefaultLocation ? "Testing Mode: Default Entrance Location" : "Live GPS Mode"}</span>
          </button>
        </div>
      </div>

      {/* Main Outdoor Map */}
      <div className="w-full h-full z-0">
        <CampusMap
          selectedLocation={selectedLocation}
          currentLocation={displayUserCoords}
          heading={compassHeading}
          route={route}
          destination={destination}
          isNavigating={isNavigating}
          onSelectLocation={(loc) => {
            handleSelectDestination(loc);
          }}
        />
      </div>


      {/* Route Preview Info Card (Shows route path on map + preview card with Cancel and Start Navigation) */}
      {destination && !isNavigating && !bottomSheetOpen && (
        <YDCard
          destination={destination}
          route={route}
          onStart={handleConfirmStartNavigation}
          onCancel={handleCancelNavigation}
        />
      )}

      {/* Active Navigation Card (Compact floating 'Cancel Navigation' bar mid-route; automatically expands into Building Info Card when near building) */}
      {isNavigating && (
        <NavigationCard
          destination={destination}
          isNearBuilding={isNearBuilding}
          onCancel={handleCancelNavigation}
          onReached={handleReachedDestination}
        />
      )}

      {/* Post-Navigation Feedback Modal */}
      {showFeedbackCard && (
        <FeedbackCard
          destination={feedbackDestination}
          onClose={() => setShowFeedbackCard(false)}
        />
      )}

      {/* Location Access Denied / Turn On GPS Alert Card */}
      {!showLanding && (gpsStatus === "failed" || gpsStatus === "timeout") && !dismissGpsAlert && (
        <LocationAlertCard
          onRetry={handleRetryGps}
          onClose={() => setDismissGpsAlert(true)}
        />
      )}

      {/* Event Timeline Bottom Sheet */}
      <BottomSheet
        isOpen={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        buildingName={activeCategory || selectedBuilding || "Event Category"}
        events={categoryEvents}
        onNavigate={(event) => {
          handleSelectDestination(event);
        }}
      />
    </div>
  );
}

