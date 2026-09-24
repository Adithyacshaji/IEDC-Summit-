import React, { useState, useEffect, useMemo, memo } from 'react';
import { Sheet } from 'react-modal-sheet';
import { Building2, MapPin, Wrench, Users, Sparkles, Rocket, Trophy, Award, Music } from 'lucide-react';
import { getIndianDateTime, isEventLiveInIST } from '../../utils/istTime';

function getCategoryIcon(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('workshop')) return Wrench;
  if (n.includes('panel') || n.includes('fireside')) return Users;
  if (n.includes('activity')) return Sparkles;
  if (n.includes('exhibition') || n.includes('startup')) return Rocket;
  if (n.includes('hackathon') || n.includes('quiz')) return Trophy;
  if (n.includes('formal') || n.includes('function') || n.includes('session')) return Award;
  if (n.includes('pro')) return Music;
  return Building2;
}

function BottomSheet({ isOpen, onClose, buildingName = "Category", events = [], onNavigate }) {
  const [selectedTime, setSelectedTime] = useState('ALL');
  const [currentTime, setCurrentTime] = useState(() => getIndianDateTime());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getIndianDateTime()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Phone hardware back button handler with History API integration
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ bottomSheetOpen: true }, '', '#bottomsheet');

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.bottomSheetOpen) {
        window.history.back();
      }
    };
  }, [isOpen]);

  // Reset selected time filter to 'ALL' whenever bottom sheet opens or category changes
  useEffect(() => {
    if (isOpen) {
      setSelectedTime('ALL');
    }
  }, [isOpen, buildingName]);

  // Extract unique TIME SLOTS from category events with 'ALL' first
  const timeSlots = useMemo(() => {
    if (!events || events.length === 0) return ['ALL'];
    const slots = [...new Set(
      events
        .map(e => (e.time_start && e.time_end ? (e.time_start.substring(0, 5) + ' - ' + e.time_end.substring(0, 5)) : (e.time_start ? e.time_start.substring(0, 5) : '')))
        .filter(Boolean)
    )].sort();
    return ['ALL', ...slots];
  }, [events]);

  // Filter events by selected TIME SLOT
  const filteredEvents = useMemo(() => {
    if (!events || events.length === 0) return [];
    if (!selectedTime || selectedTime === 'ALL') {
      return events;
    }
    return events.filter(e => {
      const slot = e.time_start && e.time_end ? (e.time_start.substring(0, 5) + ' - ' + e.time_end.substring(0, 5)) : (e.time_start ? e.time_start.substring(0, 5) : '');
      return slot === selectedTime;
    });
  }, [events, selectedTime]);

  // Real-time IST live check comparing India date & time
  const isLive = (event) => isEventLiveInIST(event, currentTime);

  // Sort LIVE events to the very TOP of the list
  const sortedEvents = useMemo(() => {
    if (!filteredEvents) return [];
    return [...filteredEvents].sort((a, b) => {
      const aLive = isLive(a) ? 1 : 0;
      const bLive = isLive(b) ? 1 : 0;
      return bLive - aLive;
    });
  }, [filteredEvents, currentTime]);

  const HeaderIcon = getCategoryIcon(buildingName);

  return (
    <>
      <Sheet 
        isOpen={isOpen} 
        onClose={onClose} 
        snapPoints={[0, 0.9, 1]} 
        initialSnap={1}
      >
        <Sheet.Container style={{ borderTopLeftRadius: '28px', borderTopRightRadius: '28px' }}>
          <Sheet.Header />
          <Sheet.Content disableScrollLock={true}>
            <div className='px-5 pb-8 h-full overflow-y-auto hide-scrollbar'>
              {/* Header Title displaying current category name */}
              <div className='flex items-center gap-3 mb-4 pt-1'>
                <div className='p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-sm'>
                  <HeaderIcon size={26} strokeWidth={2.2} />
                </div>
                <div>
                  <h2 className='text-xl font-extrabold text-gray-900 leading-tight'>
                    {buildingName}
                  </h2>
                  <p className='text-xs text-gray-500 font-medium mt-0.5'>
                    {events.length} {events.length === 1 ? 'event' : 'events'} in this category
                  </p>
                </div>
              </div>

              {/* Time Filter Chips starting with 'ALL' */}
              {timeSlots.length > 0 && (
                <div className='flex gap-2 overflow-x-auto pb-3 hide-scrollbar mb-2'>
                  {timeSlots.map(slot => {
                    const isActive = selectedTime === slot;
                    const slotEvents = slot === 'ALL'
                      ? events
                      : events.filter(e => (e.time_start?.substring(0,5) + ' - ' + e.time_end?.substring(0,5)) === slot);
                    const hasLiveEvent = slotEvents.some(e => isLive(e));

                    return (
                      <button
                        key={slot}
                        onClick={() => setSelectedTime(slot)}
                        className={'flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full font-semibold text-xs transition-all duration-200 border cursor-pointer ' + 
                          (isActive 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                            : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200 shadow-sm'
                          )
                        }
                      >
                        {hasLiveEvent && (
                          <div className='w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse'></div>
                        )}
                        {slot === 'ALL' ? 'ALL' : slot}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Events List */}
              {sortedEvents.length > 0 ? (
                <div className='space-y-3 mt-1'>
                  {sortedEvents.map(event => (
                    <div key={event.id} className='bg-gray-50 p-4 rounded-2xl relative overflow-hidden shadow-sm border border-gray-200/80 hover:border-blue-300 transition-colors'>
                      {isLive(event) && (
                        <div className='absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wider animate-pulse flex items-center gap-1'>
                          <span className='w-1.5 h-1.5 rounded-full bg-white'></span>
                          LIVE NOW (IST)
                        </div>
                      )}
                      <h3 className='text-base font-bold text-gray-900 pr-8 leading-snug'>{event.event_name}</h3>
                      
                      <div className='mt-2.5 flex flex-col gap-1 text-[13px] text-gray-600'>
                        <div className='flex gap-2'>
                          <span className='font-medium text-gray-500 w-16 shrink-0'>Time:</span> 
                          <span className='font-semibold text-gray-800'>
                            {event.time_start?.substring(0,5)} {event.time_end ? `- ${event.time_end?.substring(0,5)}` : ''}
                          </span>
                        </div>
                        {event.building && event.building.trim() !== "" && (
                          <div className='flex gap-2'>
                            <span className='font-medium text-gray-500 w-16 shrink-0'>Location:</span>
                            <span className='font-semibold text-blue-600'>{event.building}</span>
                          </div>
                        )}
                        {event.floor && (
                          <div className='flex gap-2'>
                            <span className='font-medium text-gray-500 w-16 shrink-0'>Floor:</span>
                            <span className='font-semibold text-gray-800'>{event.floor}</span>
                          </div>
                        )}
                        {event.room && (
                          <div className='flex gap-2'>
                            <span className='font-medium text-gray-500 w-16 shrink-0'>Room:</span>
                            <span className='font-semibold text-gray-800'>{event.room}</span>
                          </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => {
                          onNavigate(event);
                          onClose();
                        }}
                        className='mt-3.5 w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm text-xs cursor-pointer'
                      >
                        <MapPin size={15} /> Take me there
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 mt-2'>
                  <p className='text-gray-500 font-medium text-sm'>No events scheduled for {buildingName}{selectedTime !== 'ALL' ? ' at ' + selectedTime : ''}.</p>
                  {selectedTime !== 'ALL' && (
                    <button 
                      onClick={() => setSelectedTime('ALL')}
                      className='mt-3 text-xs text-blue-600 font-bold hover:underline'
                    >
                      Show All Category Events
                    </button>
                  )}
                </div>
              )}
            </div>
          </Sheet.Content>
        </Sheet.Container>
        <Sheet.Backdrop onTap={onClose} className="bg-black/30 backdrop-blur-[2px]" />
      </Sheet>
    </>
  );
}

export default memo(BottomSheet);
