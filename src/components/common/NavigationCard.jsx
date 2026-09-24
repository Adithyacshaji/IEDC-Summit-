import React from 'react';
import { CheckCircle2, X, Building2, Navigation, MapPin } from 'lucide-react';

const formatFloor = (f) => {
  if (!f) return null;
  const str = String(f).trim();
  if (!str) return null;
  if (/^g$/i.test(str) || /^ground$/i.test(str)) return 'Ground Floor';
  if (/^b1$/i.test(str)) return 'Basement 1';
  if (/^b2$/i.test(str)) return 'Basement 2';
  const num = parseInt(str, 10);
  if (!isNaN(num)) {
    const s = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
    return `${num}${s} Floor`;
  }
  return `Floor ${str}`;
};

export default function NavigationCard({ destination, isNearBuilding = false, onCancel, onReached }) {
  if (!destination) return null;

  const title = destination.building || destination.name || destination.event_name || destination.id || 'Destination';
  const building = destination.building || 'Main Block';
  const floorStr = formatFloor(destination.floor);
  const room = destination.room || destination.room_number || null;
  const isEvent = destination.type === 'event' || Boolean(destination.event_name);

  // MODE 1: Active Navigation Mid-Route (Walking towards destination, not yet near building)
  // Shows a clean floating "Cancel Navigation" bottom bar
  if (!isNearBuilding) {
    return (
      <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-3 right-3 max-w-md mx-auto z-[100] pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/95 text-white backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.25)] border border-slate-800 p-3.5 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300">
          
          {/* Left: Pulsing Nav Status & Destination Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0">
              <Navigation size={18} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
                  Navigating
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-white truncate" title={title}>
                {title}
              </h4>
            </div>
          </div>

          {/* Right: Cancel Navigation Action Button */}
          <button
            onClick={onCancel}
            className="py-2 px-3.5 bg-red-600/90 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-sm text-xs flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
          >
            <X size={15} />
            <span>Cancel Navigation</span>
          </button>

        </div>
      </div>
    );
  }

  // MODE 2: Reached Near Building
  // Shows full Building Information Card with room, floor, building details & Reached / Cancel buttons
  return (
    <div className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 right-3 max-w-md mx-auto z-[100] pointer-events-none">
      <div className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_6px_22px_rgba(0,0,0,0.16)] border border-blue-200 p-4 flex flex-col gap-3 animate-in slide-in-from-bottom duration-300">
        
        {/* Row 1: Header - Near Building Badge, Title & Icon */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span>Near Building</span>
            </span>
            <h4 className="text-[15px] font-extrabold text-gray-900 truncate" title={title}>
              {title}
            </h4>
          </div>

          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <MapPin size={18} className="animate-bounce" />
          </div>
        </div>

        {/* Row 2: Detailed Location Sentence */}
        <div className="px-3 py-2 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-gray-700 flex items-start gap-2">
          <Building2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-snug font-medium text-gray-700">
            {isEvent ? 'This event is happening ' : 'Located '}
            {room || floorStr ? (
              <>
                {'in '}
                {room && (
                  <span className="font-bold text-blue-700">
                    {room}
                  </span>
                )}
                {room && floorStr ? ', ' : ''}
                {floorStr && (
                  <span className="font-bold text-blue-700">
                    {floorStr}
                  </span>
                )}
                {' of '}
              </>
            ) : (
              'at '
            )}
            <span className="font-bold text-gray-900">
              {building}
            </span>
            .
          </p>
        </div>

        {/* Row 3: Action Buttons */}
        <div className="flex items-center gap-2.5 pt-1 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition-colors text-xs flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <X size={15} />
            <span>Cancel</span>
          </button>

          <button
            onClick={onReached}
            className="flex-[1.4] py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md text-xs flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <CheckCircle2 size={16} />
            <span>Reached</span>
          </button>
        </div>

      </div>
    </div>
  );
}

