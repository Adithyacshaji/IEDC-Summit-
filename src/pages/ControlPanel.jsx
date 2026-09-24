import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Link, useLocation } from "react-router-dom";
import { LogOut, Building, Users, Menu, X, MapPin } from "lucide-react";
import { supabase } from "../utils/supabaseClient";

import DepartmentManager from "../components/admin/DepartmentManager";
import FacultyManager from "../components/admin/FacultyManager";
import MapNodesManager from "../components/admin/MapNodesManager";
import RoomsManager from "../components/admin/RoomsManager";

export default function ControlPanel() {
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/admin");
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/admin");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Close sidebar on navigation change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 overflow-hidden font-sans relative">
      {/* Mobile Sidebar Overlay Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Premium Glassmorphism */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white/90 backdrop-blur-xl border-r border-slate-200/60 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-40 transition-transform duration-300 md:relative md:translate-x-0 md:flex ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="p-8 border-b border-slate-100/50 text-center relative overflow-hidden">
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-4 right-4 p-2 text-slate-500 hover:bg-slate-100 rounded-xl md:hidden"
          >
            <X size={18} />
          </button>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50/50 to-transparent -z-10"></div>
          <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center p-2">
            <img src="/campus-compass-logo.svg" alt="Campus Compass Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="font-bold text-xl text-slate-800 tracking-tight">Admin Console</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Campus RouteX</p>
        </div>
        
        <nav className="flex-1 p-5 space-y-2 overflow-y-auto">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-3">Management</div>
          
          <Link
            to="/admin/dashboard"
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
              location.pathname === "/admin/dashboard" || location.pathname === "/admin/dashboard/"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            }`}
          >
            <Building size={20} className={location.pathname === "/admin/dashboard" || location.pathname === "/admin/dashboard/" ? "text-white" : "text-slate-400 group-hover:text-blue-600 transition-colors"} />
            <span className="font-medium">Departments</span>
          </Link>
          
          <Link
            to="/admin/dashboard/faculties"
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
              location.pathname.includes("/faculties")
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            }`}
          >
            <Users size={20} className={location.pathname.includes("/faculties") ? "text-white" : "text-slate-400 group-hover:text-blue-600 transition-colors"} />
            <span className="font-medium">Faculties & Staff</span>
          </Link>
          
          <Link
            to="/admin/dashboard/nodes"
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
              location.pathname.includes("/nodes")
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            }`}
          >
            <MapPin size={20} className={location.pathname.includes("/nodes") ? "text-white" : "text-slate-400 group-hover:text-blue-600 transition-colors"} />
            <span className="font-medium">Map Nodes</span>
          </Link>
          
          <Link
            to="/admin/dashboard/rooms"
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
              location.pathname.includes("/rooms")
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            }`}
          >
            <Building size={20} className={location.pathname.includes("/rooms") ? "text-white" : "text-slate-400 group-hover:text-blue-600 transition-colors"} />
            <span className="font-medium">Rooms</span>
          </Link>
        </nav>
        
        <div className="p-5 border-t border-slate-100/50 bg-slate-50/30">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 px-4 py-3.5 w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-all duration-200 font-medium border border-transparent hover:border-rose-100"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-slate-50">
        {/* Mobile Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/50 md:hidden z-20">
          <div className="flex items-center gap-3">
            <img src="/campus-compass-logo.svg" alt="Campus Compass Logo" className="w-8 h-8 object-contain" />
            <span className="font-bold text-slate-800 text-lg">Admin Console</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Menu size={24} />
          </button>
        </header>

        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-600/5 to-transparent pointer-events-none"></div>
        <div className="flex-1 overflow-y-auto p-4 md:p-10 z-10 custom-scrollbar">
          <div className="max-w-6xl mx-auto h-full flex flex-col">
            <Routes>
              <Route path="/" element={<DepartmentManager />} />
              <Route path="/faculties" element={<FacultyManager />} />
              <Route path="/nodes" element={<MapNodesManager />} />
              <Route path="/rooms" element={<RoomsManager />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}
