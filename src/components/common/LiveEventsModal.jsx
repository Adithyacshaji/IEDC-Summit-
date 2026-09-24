import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Flame, X, Sparkles, Clock, Calendar } from 'lucide-react';
import { getIndianDateTime, isEventLiveInIST } from '../../utils/istTime';
import './LiveEventsModal.css';

export default function LiveEventsModal({ events = [], onNavigate, onClose }) {
  const [currentTime, setCurrentTime] = useState(() => getIndianDateTime());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getIndianDateTime()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Real-time IST live check comparing date & time
  const liveEvents = useMemo(() => {
    if (!events || events.length === 0) return [];
    return events.filter((e) => isEventLiveInIST(e, currentTime));
  }, [events, currentTime]);

  if (liveEvents.length === 0) return null;

  return (
    <div className='live-modal-overlay'>
      <div className='live-modal-card'>
        {/* Header */}
        <div className='live-modal-header'>
          <div className='flex items-center gap-2'>
            <div className='live-badge'>
              <span className='live-dot animate-ping'></span>
              <span className='live-dot-solid'></span>
              <Flame size={16} className='text-blue-600' />
              <span>LIVE NOW (IST)</span>
            </div>
          </div>

          <button onClick={onClose} className='live-close-btn' title='Close'>
            <X size={20} />
          </button>
        </div>

        {/* Title */}
        <div className='px-5 pt-3 pb-2 text-left'>
          <h2 className='text-xl font-extrabold text-gray-900 leading-tight'>
            Sessions Happening Now
          </h2>
          <p className='text-xs text-gray-500 mt-1'>
            Real-time India Standard Time (IST) sessions. Tap 'Take me there' for instant navigation.
          </p>
        </div>

        {/* Live Events Scroll List */}
        <div className='live-events-list'>
          {liveEvents.map((event) => (
            <div key={event.id} className='live-event-item'>
              <div className='flex justify-between items-start'>
                <h3 className='live-event-title'>{event.event_name}</h3>
                <span className='live-tag'>LIVE</span>
              </div>

              <div className='live-event-meta'>
                <div className='flex items-center gap-1.5 text-xs text-gray-600 font-medium'>
                  <MapPin size={14} className='text-blue-600 shrink-0' />
                  <span>{event.building}   {event.floor || 'G'}   {event.room || 'Venue'}</span>
                </div>

                <div className='flex items-center gap-1.5 text-xs text-gray-500 mt-1'>
                  <Clock size={14} className='text-slate-600 shrink-0' />
                  <span>{event.time_start?.substring(0, 5)} - {event.time_end?.substring(0, 5)}</span>
                </div>

                {event.speakers && event.speakers.length > 0 && (
                  <div className='mt-2 flex flex-wrap gap-1'>
                    {event.speakers.map((s) => (
                      <span key={s} className='bg-white border border-gray-200 text-gray-700 text-[11px] px-2 py-0.5 rounded-md font-medium'>
                        ?? {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  onNavigate(event);
                  onClose();
                }}
                className='live-nav-btn'
              >
                <MapPin size={16} /> Take me there
              </button>
            </div>
          ))}
        </div>

        {/* Footer Close Button */}
        <div className='p-4 border-t border-gray-100'>
          <button onClick={onClose} className='live-dismiss-btn'>
            Explore Full Campus Map
          </button>
        </div>
      </div>
    </div>
  );
}
