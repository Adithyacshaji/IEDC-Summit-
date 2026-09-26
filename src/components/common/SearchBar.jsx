import React, { useState, useRef, useMemo } from 'react';
import { Search, X, MapPin, Calendar, Users } from 'lucide-react';
import { useDatabase } from '../../context/DatabaseContext';

function SearchBar({ onNavigate, onClear }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { searchItems } = useDatabase();
  const inputRef = useRef(null);

  const filteredItems = useMemo(() => {
    if (!query || query.trim() === '') return [];
    const q = query.toLowerCase().trim();
    
    const matches = searchItems.filter(item => {
      const nameMatch = item.name?.toLowerCase().includes(q);
      const bldgMatch = item.building?.toLowerCase().includes(q);
      const roomMatch = item.room?.toLowerCase().includes(q);
      
      let speakerMatch = false;
      if (item.type === 'event') {
        if (Array.isArray(item.speakers)) {
          speakerMatch = item.speakers.some(s => typeof s === 'string' && s.toLowerCase().includes(q));
        }
        if (!speakerMatch && typeof item.speaker === 'string') {
          speakerMatch = item.speaker.toLowerCase().includes(q);
        }
      }
      
      return nameMatch || bldgMatch || roomMatch || speakerMatch;
    });

    // Strict deduplication to guarantee unique search results
    const seen = new Set();
    return matches.filter(item => {
      const idKey = item.id ? `id:${item.id}` : null;
      const contentKey = `${item.type}:${(item.name || '').trim().toLowerCase()}:${(item.building || '').trim().toLowerCase()}:${(item.room || '').trim().toLowerCase()}`;
      
      if (idKey && seen.has(idKey)) return false;
      if (seen.has(contentKey)) return false;
      
      if (idKey) seen.add(idKey);
      seen.add(contentKey);
      return true;
    });
  }, [searchItems, query]);

  const handleSelect = (item) => {
    setQuery('');
    setIsOpen(false);
    
    onNavigate(item);
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-full z-50">
      <div className="flex items-center bg-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)] px-4 py-3 border border-gray-100">
        <Search className="text-gray-400" size={20} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search events, speakers, or places..."
          className="flex-1 ml-3 bg-transparent outline-none text-[15px] font-medium text-gray-800 placeholder:text-gray-400 placeholder:font-normal"
        />
        {query && (
          <button onClick={() => { setQuery(''); setIsOpen(false); if (onClear) onClear(); }}>
            <X className="text-gray-400 hover:text-gray-600" size={20} />
          </button>
        )}
      </div>

      {isOpen && query.trim() !== '' && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-[60vh] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No results found</div>
          ) : (
            filteredItems.map((item, i) => {
              const speakerText = Array.isArray(item.speakers) && item.speakers.length > 0 
                ? item.speakers.join(', ') 
                : (item.speaker || '');

              return (
                <button
                  key={`${item.type}-${item.id}-${i}`}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 text-left"
                >
                  <div className="mt-1">
                    {item.type === 'event' ? <Calendar size={18} className="text-blue-600" /> : <MapPin size={18} className="text-blue-600" />}
                  </div>
                  <div>
                    <h4 className="text-[15px] font-semibold text-gray-900">{item.name}</h4>
                    <p className="text-[13px] text-gray-500 mt-0.5">
                      {item.type === 'event' 
                        ? `${item.building || 'Campus Event'}${item.floor ? ` • Floor ${item.floor}` : ''}${item.room ? ` (${item.room})` : ''}`
                        : 'Campus Location'}
                    </p>
                    {item.type === 'event' && speakerText && (
                      <p className="text-[12px] text-purple-700 font-medium mt-1 flex items-center gap-1.5 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 w-fit">
                        <Users size={13} className="text-purple-600" /> Speaker: {speakerText}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
