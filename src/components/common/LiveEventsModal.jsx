import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  MapPin, Flame, X, Clock, Users, Wrench, Sparkles,
  Rocket, Trophy, Award, Music, Building2, ChevronLeft
} from 'lucide-react';
import { getIndianDateTime, isEventLiveInIST } from '../../utils/istTime';
import './LiveEventsModal.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const KNOWN_CATEGORIES = [
  "workshops and clinics","panel discussions and fireside chats","panel discussions & chats",
  "activity hub","startup exhibitions","hackathons and quiz","hackathons & quiz",
  "formal function","formal functions","proshow","pro show","general",
];

function sanitizeSpeaker(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return KNOWN_CATEGORIES.includes(raw.trim().toLowerCase()) ? '' : raw.trim();
}

function getSpeakerDisplay(event) {
  if (Array.isArray(event.speakers) && event.speakers.length > 0)
    return event.speakers.map(sanitizeSpeaker).filter(Boolean).join(', ');
  return sanitizeSpeaker(event.speaker || event.speaker_name || event["Speaker's name"] || '');
}

function getTimeString(e) {
  if (!e) return '';
  if (e.time_start && e.time_end) return `${e.time_start.substring(0, 5)} – ${e.time_end.substring(0, 5)}`;
  if (e.time_start) return e.time_start.substring(0, 5);
  return e.time_slot || e.time || '';
}

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

const CATEGORY_COLORS = [
  { bg: '#eff6ff', border: '#bfdbfe', icon: '#2563eb', text: '#1e40af' },
  { bg: '#f0fdf4', border: '#bbf7d0', icon: '#16a34a', text: '#15803d' },
  { bg: '#fdf4ff', border: '#e9d5ff', icon: '#9333ea', text: '#7e22ce' },
  { bg: '#fff7ed', border: '#fed7aa', icon: '#ea580c', text: '#c2410c' },
  { bg: '#fefce8', border: '#fde68a', icon: '#ca8a04', text: '#a16207' },
  { bg: '#f0f9ff', border: '#bae6fd', icon: '#0284c7', text: '#0369a1' },
  { bg: '#fff1f2', border: '#fecdd3', icon: '#e11d48', text: '#be123c' },
];

// ─── Reusable Event Card ───────────────────────────────────────────────────────
function EventCard({ event, onNavigate, onClose, live }) {
  const timeDisp    = getTimeString(event);
  const bldgDisp    = event.building || event.block_name || '';
  const roomDisp    = event.room || event.room_name || event.room_number || '';
  const floorDisp   = event.floor || event.floor_number || '';
  const speakerDisp = getSpeakerDisplay(event);
  const categoryDisp = event.event_category || event.category || '';

  return (
    <div className={`lem-event-card${live ? ' lem-event-card--live' : ''}`}>
      {live && (
        <div className="lem-live-badge">
          <span className="lem-live-dot" />
          LIVE
        </div>
      )}
      {categoryDisp && !live && (
        <div className="lem-event-category">{categoryDisp}</div>
      )}
      <h3 className="lem-event-title">{event.event_name}</h3>
      <div className="lem-event-meta">
        {speakerDisp && (
          <div className="lem-meta-row">
            <Users size={13} className="lem-meta-icon lem-purple" />
            <span className="lem-purple">{speakerDisp}</span>
          </div>
        )}
        {timeDisp && (
          <div className="lem-meta-row">
            <Clock size={13} className="lem-meta-icon" />
            <span>{timeDisp}</span>
          </div>
        )}
        {bldgDisp && (
          <div className="lem-meta-row">
            <MapPin size={13} className="lem-meta-icon lem-blue" />
            <span className="lem-blue">
              {bldgDisp}{floorDisp ? ` · ${floorDisp}` : ''}{roomDisp ? ` · ${roomDisp}` : ''}
            </span>
          </div>
        )}
      </div>
      <button className="lem-nav-btn" onClick={() => { onNavigate(event); onClose(); }}>
        <MapPin size={14} /> Take me there
      </button>
    </div>
  );
}


// ─── Main Modal ───────────────────────────────────────────────────────────────
const LiveEventsModal = forwardRef(function LiveEventsModal({ events = [], onNavigate, onClose }, ref) {
  const [tab, setTab]               = useState('all');
  const [selectedCat, setSelectedCat] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => getIndianDateTime());

  // Expose handleBack() so App.jsx's Android back-button handler can call it.
  // Returns true if this component consumed the back action (category drill-down
  // was open and has now been closed), false if the caller should handle it.
  useImperativeHandle(ref, () => ({
    handleBack() {
      if (selectedCat) {
        setSelectedCat(null);
        return true; // consumed — went from event list back to category grid
      }
      return false; // not consumed — caller should close the whole modal
    }
  }), [selectedCat]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getIndianDateTime()), 30000);
    return () => clearInterval(timer);
  }, []);

  const isLive = (e) => isEventLiveInIST(e, currentTime);

  const categories = useMemo(() => {
    const seen = new Set(); const cats = [];
    events.forEach(e => {
      const cat = e.event_category || e.category || 'General';
      if (cat && !seen.has(cat)) { seen.add(cat); cats.push(cat); }
    });
    return cats;
  }, [events]);

  const categoryEvents = useMemo(() =>
    !selectedCat ? [] : events.filter(e => (e.event_category || e.category || 'General') === selectedCat),
  [events, selectedCat]);

  const liveEvents = useMemo(() => events.filter(isLive), [events, currentTime]);
  const hasLive = liveEvents.length > 0;

  return (
    <div className="lem-overlay">
      <div className="lem-card">

        {/* Header */}
        <div className="lem-header">
          <div className="lem-header-left">
            {tab === 'all' && selectedCat && (
              <button className="lem-back-btn" onClick={() => setSelectedCat(null)}>
                <ChevronLeft size={18} />
              </button>
            )}
            <h2 className="lem-title">
              {tab === 'all' && selectedCat ? selectedCat : 'Events'}
            </h2>
          </div>
          {/* Hide close button when inside a category drill-down — back button serves that purpose */}
          {!selectedCat && (
            <button className="lem-close-btn" onClick={onClose}><X size={18} /></button>
          )}
        </div>

        {/* Tabs */}
        <div className="lem-tabs">
          <button className={`lem-tab${tab === 'all' ? ' lem-tab--active' : ''}`}
            onClick={() => { setTab('all'); setSelectedCat(null); }}>
            All Events
          </button>
          <button className={`lem-tab${tab === 'live' ? ' lem-tab--active' : ''}`}
            onClick={() => { setTab('live'); setSelectedCat(null); }}>
            {hasLive && <span className="lem-tab-live-dot" />}
            Live Events
            {hasLive && <span className="lem-tab-count">{liveEvents.length}</span>}
          </button>
        </div>

        {/* Content */}
        <div className="lem-content">

          {/* ALL: Category Grid */}
          {tab === 'all' && !selectedCat && (
            <div className="lem-cat-grid">
              {categories.map((cat, i) => {
                const Icon   = getCategoryIcon(cat);
                const colors = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                const count  = events.filter(e => (e.event_category || e.category || 'General') === cat).length;
                const catHasLive = events.some(e => (e.event_category || e.category || 'General') === cat && isLive(e));
                return (
                  <button key={cat} className="lem-cat-card"
                    style={{ background: colors.bg, borderColor: colors.border }}
                    onClick={() => setSelectedCat(cat)}>
                    {catHasLive && <span className="lem-cat-live-dot" />}
                    <div className="lem-cat-icon" style={{ color: colors.icon }}>
                      <Icon size={22} />
                    </div>
                    <span className="lem-cat-name" style={{ color: colors.text }}>{cat}</span>
                    <span className="lem-cat-count" style={{ color: colors.icon }}>{count} events</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ALL: Category drill-down */}
          {tab === 'all' && selectedCat && (
            <div className="lem-event-list">
              {categoryEvents.length === 0
                ? <div className="lem-empty">No events in this category.</div>
                : categoryEvents.map(ev => (
                  <EventCard key={ev.id || ev.event_name} event={ev}
                    live={isLive(ev)} onNavigate={onNavigate} onClose={onClose} />
                ))}
            </div>
          )}

          {/* LIVE tab */}
          {tab === 'live' && (
            <div className="lem-event-list">
              {liveEvents.length === 0
                ? (
                  <div className="lem-empty">
                    <Flame size={32} style={{ color: '#ef4444', marginBottom: 8 }} />
                    <p style={{ fontWeight: 700, color: '#374151' }}>No live events right now</p>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Check back soon!</p>
                  </div>
                )
                : liveEvents.map(ev => (
                  <EventCard key={ev.id || ev.event_name} event={ev}
                    live={true} onNavigate={onNavigate} onClose={onClose} />
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="lem-footer">
          <button className="lem-dismiss-btn" onClick={onClose}>Explore Campus Map</button>
        </div>
      </div>
    </div>
  );
});

export default LiveEventsModal;
