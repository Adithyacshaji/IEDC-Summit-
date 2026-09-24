import React, { createContext, useState, useEffect, useMemo, useContext } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

export const DatabaseContext = createContext({});

export const DatabaseProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const fetchEvents = async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase.from('events').select('*');
    if (error) console.error("Error fetching events:", error);
    else setEvents(data || []);
  };

  const fetchNodes = async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase.from('outdoor_nodes').select('*');
    if (error) console.error("Error fetching nodes:", error);
    else setNodes(data || []);
  };

  const fetchEdges = async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase.from('outdoor_edges').select('*');
    if (error) console.error("Error fetching edges:", error);
    else setEdges(data || []);
  };

  const loadAllData = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    await Promise.all([
      fetchEvents(),
      fetchNodes(),
      fetchEdges()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Helper string cleaner for fuzzy string matching
  const cleanStr = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  // Combine events and DB nodes, attaching node positions & routeNodes to events automatically
  const searchItems = useMemo(() => {
    const eventItems = events.map(e => {
      const eb = cleanStr(e.building);
      
      // Match building in outdoor_nodes table
      const bNode = nodes.find(n => {
        const nb = cleanStr(n.building_name || n.name || n.id);
        return nb && eb && (nb.includes(eb) || eb.includes(nb));
      });

      const pos = bNode && bNode.latitude && bNode.longitude 
        ? [parseFloat(bNode.latitude), parseFloat(bNode.longitude)] 
        : null;

      const eventCat = e.event_category || (Array.isArray(e.speakers) && e.speakers[0]) || e.category || 'General';
      return {
        ...e,
        id: e.id,
        name: e.event_name,
        type: "event",
        building: e.building,
        floor: e.floor,
        room: e.room,
        speakers: e.speakers,
        eventCategory: eventCat,
        category: eventCat,
        routeNode: bNode ? bNode.id : null,
        position: pos
      };
    });

    const nodeItems = nodes
      .filter(n => n.building_name || n.name)
      .map(n => ({
        id: n.id,
        name: n.building_name || n.name,
        type: "location",
        building: n.building_name || n.name,
        routeNode: n.id,
        position: [parseFloat(n.latitude), parseFloat(n.longitude)]
      }));

    return [...eventItems, ...nodeItems];
  }, [events, nodes]);

  return (
    <DatabaseContext.Provider value={{ loading, events, nodes, edges, searchItems }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => useContext(DatabaseContext);
