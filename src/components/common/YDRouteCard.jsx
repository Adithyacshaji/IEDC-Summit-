import React, { useState } from 'react';
import { ArrowUpDown, X, Search, ChevronRight, Navigation } from 'lucide-react';
import { useDatabase } from '../../context/DatabaseContext';

export default function YDRouteCard({
  destination,
  origin,
  onSelectDestination,
  onSelectOrigin,
  onSwap,
  onClose
}) {
  const { searchItems } = useDatabase();
  const [editingField, setEditingField] = useState(null); // 'origin' | 'destination' | null
  const [searchQuery, setSearchQuery] = useState('');

  // Filter search items when editing origin or destination
  const filteredItems = searchQuery.trim() === '' ? [] : searchItems.filter(item => {
    const q = searchQuery.toLowerCase();
    const nameMatch = item.name?.toLowerCase().includes(q);
    const speakerMatch = item.type === 'event' && item.speakers?.some(s => s.toLowerCase().includes(q));
    return nameMatch || speakerMatch;
  });

  const originName = origin ? (origin.building || origin.name || origin.event_name) : 'Your Location';
  const destName = destination ? (destination.building || destination.name || destination.event_name || destination.id) : 'Select Destination';

  return (
    <div className="relative w-full bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.14)] border border-gray-100 overflow-hidden pointer-events-auto transition-all animate-in slide-in-from-top-2 duration-300">
      
      {/* Search Overlay when editing Origin or Destination */}
      {editingField ? (
        <div className="p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-3 py-2 border border-gray-200">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={editingField === 'origin' ? "Search new starting point..." : "Search new destination..."}
              className="flex-1 bg-transparent text-xs font-semibold text-gray-800 outline-none placeholder:text-gray-400"
            />
            <button
              onClick={() => { setEditingField(null); setSearchQuery(''); }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick Option to Reset Origin to Live GPS */}
          {editingField === 'origin' && searchQuery.trim() === '' && (
            <button
              onClick={() => {
                onSelectOrigin(null); // Reset to Live GPS
                setEditingField(null);
              }}
              className="flex items-center gap-2.5 p-2.5 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 rounded-xl text-xs font-bold transition-colors text-left"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping shrink-0" />
              <span>Use Live GPS / Your Location</span>
            </button>
          )}

          {/* Search Results List */}
          {searchQuery.trim() !== '' && (
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-50 rounded-xl border border-gray-100">
              {filteredItems.length === 0 ? (
                <div className="p-3 text-xs text-gray-500 text-center">No locations found</div>
              ) : (
                filteredItems.map((item, i) => (
                  <button
                    key={`${item.id}-${i}`}
                    onClick={() => {
                      if (editingField === 'origin') {
                        onSelectOrigin(item);
                      } else {
                        onSelectDestination(item);
                      }
                      setEditingField(null);
                      setSearchQuery('');
                    }}
                    className="w-full p-2.5 hover:bg-gray-50 flex items-center justify-between text-left text-xs transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-gray-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{item.building || 'Campus Location'}</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-400 shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        /* Y/D Route Card Main Display */
        <div className="p-3 flex items-center gap-3">
          {/* Vertical Connector Dots */}
          <div className="flex flex-col items-center gap-1 my-1">
            <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm shrink-0" />
            <div className="w-0.5 h-6 bg-gray-200" />
            <div className="w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow-sm shrink-0" />
          </div>

          {/* Origin & Destination Display Column */}
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            {/* Origin */}
            <button
              onClick={() => setEditingField('origin')}
              className="w-full text-left bg-gray-50 hover:bg-gray-100/80 px-3 py-1.5 rounded-xl transition-colors flex items-center justify-between group"
              title="Tap to change starting location"
            >
              <span className="text-xs font-semibold text-gray-800 truncate">{originName}</span>
              <span className="text-[10px] text-gray-400 group-hover:text-blue-600 font-bold shrink-0 ml-1">Edit</span>
            </button>

            {/* Destination */}
            <button
              onClick={() => setEditingField('destination')}
              className="w-full text-left bg-gray-50 hover:bg-gray-100/80 px-3 py-1.5 rounded-xl transition-colors flex items-center justify-between group"
              title="Tap to change destination"
            >
              <span className="text-xs font-extrabold text-gray-900 truncate">{destName}</span>
              <span className="text-[10px] text-gray-400 group-hover:text-blue-600 font-bold shrink-0 ml-1">Edit</span>
            </button>
          </div>

          {/* Action Buttons: Swap & Exit Route Mode */}
          <div className="flex flex-col gap-1 shrink-0 border-l border-gray-100 pl-2">
            <button
              onClick={onSwap}
              className="p-2 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors active:scale-95"
              title="Swap Origin and Destination"
            >
              <ArrowUpDown size={16} />
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition-colors active:scale-95"
              title="Close Route Card & Return to Search Bar"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
