import React, { useState, useRef } from 'react';
import { Search, X, MapPin, Calendar } from 'lucide-react';
import { useDatabase } from '../../context/DatabaseContext';

function SearchBar({ onNavigate, onClear }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { searchItems } = useDatabase();
  const inputRef = useRef(null);

  const filteredItems = query.trim() === '' ? [] : searchItems.filter(item => {
    const q = query.toLowerCase();
    const nameMatch = item.name?.toLowerCase().includes(q);
    
    let speakerMatch = false;
    if (item.type === 'event' && item.speakers) {
      speakerMatch = item.speakers.some(s => s.toLowerCase().includes(q));
    }
    
    return nameMatch || speakerMatch;
  });

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
            filteredItems.map((item, i) => (
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
                      ? `${item.building}${item.floor ? ` • Floor ${item.floor}` : ''}`
                      : 'Campus Location'}
                  </p>
                  {item.type === 'event' && item.speakers && item.speakers.length > 0 && (
                    <p className="text-[12px] text-gray-400 mt-0.5">
                      Speakers: {item.speakers.join(', ')}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
