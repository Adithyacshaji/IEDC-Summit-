import React, { useMemo } from 'react';
import { MapPin, Navigation, X, Footprints } from 'lucide-react';
import { gpsDistanceMeters } from '../../utils/gpsDistance';

function YDCard({ destination, route = [], onStart, onCancel }) {
  if (!destination) return null;

  const title = destination.building || destination.name || destination.event_name || destination.id || 'Destination';
  
  const subtitleParts = [];
  if (destination.building && destination.name && destination.name !== destination.building) {
    subtitleParts.push(destination.building);
  }
  if (destination.floor) {
    const fStr = String(destination.floor).toLowerCase();
    const floorFormatted = /^g$/i.test(fStr) || /^ground$/i.test(fStr) ? 'Ground Floor' : `Floor ${destination.floor}`;
    subtitleParts.push(floorFormatted);
  }
  if (destination.room || destination.room_number) {
    subtitleParts.push(destination.room || destination.room_number);
  }

  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' • ') : 'Campus Location';

  // Calculate distance & estimated walking time from polyline route coordinates
  const { distanceMeters, estimatedMins } = useMemo(() => {
    if (!route || route.length < 2) return { distanceMeters: 0, estimatedMins: 0 };
    let dist = 0;
    for (let i = 0; i < route.length - 1; i++) {
      dist += gpsDistanceMeters(route[i], route[i + 1]);
    }
    const meters = Math.round(dist);
    const mins = Math.max(1, Math.ceil(meters / 75)); // Approx 75m/min walking speed
    return { distanceMeters: meters, estimatedMins: mins };
  }, [route]);

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-3 right-3 max-w-md mx-auto z-[100] pointer-events-none">
      <div className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.16)] border border-gray-100 p-3.5 flex flex-col gap-3 animate-in slide-in-from-bottom duration-300">
        
        {/* Row 1: Pin icon, Title, Subtitle & Distance/Time Pill */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl shrink-0 mt-0.5">
              <MapPin size={20} />
            </div>
            <div className="min-w-0">
              <h4 className="text-base font-extrabold text-gray-900 truncate leading-snug">
                {title}
              </h4>
              <p className="text-xs text-gray-500 font-medium truncate mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>

          {distanceMeters > 0 && (
            <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-[11px] font-bold border border-slate-200">
              <Footprints size={13} className="text-blue-600" />
              <span>{distanceMeters}m • {estimatedMins} min</span>
            </div>
          )}
        </div>

        {/* Row 2: Cancel & Start Navigation Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <X size={15} />
            <span>Cancel</span>
          </button>

          <button
            onClick={onStart}
            className="flex-[1.5] py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <Navigation size={15} className="animate-pulse" />
            <span>Start Navigation</span>
          </button>
        </div>

      </div>
    </div>
  );
}

export default YDCard;

