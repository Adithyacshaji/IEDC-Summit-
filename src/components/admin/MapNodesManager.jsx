import React, { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";
import { Plus, Edit2, Trash2, X, MapPin, Search } from "lucide-react";

export default function MapNodesManager() {
  const [activeTab, setActiveTab] = useState("indoor_nodes");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    let query = supabase.from(activeTab).select("*");
    
    // Default sorting based on table
    if (activeTab === "indoor_nodes") query = query.order("id");
    else if (activeTab === "locations" || activeTab === "qr_locations") query = query.order("name");
    else query = query.order("id");

    const { data: resData, error: resError } = await query;
    
    if (resError) {
      setError(`Failed to load ${activeTab}`);
    } else {
      setData(resData || []);
      setError(null);
    }
    setLoading(false);
  };

  const handleOpenForm = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({ ...item });
    } else {
      setEditingId(null);
      // Initialize empty form data based on active tab
      if (activeTab === "indoor_nodes") {
        setFormData({ id: "", lat: 0, lng: 0, floor: "", building: "stmarys", label: "", label_lat: 0, label_lng: 0 });
      } else if (activeTab === "locations") {
        setFormData({ name: "", lat: 0, lng: 0, route_node: "" });
      } else if (activeTab === "qr_locations") {
        setFormData({ name: "", lat: 0, lng: 0, start_node: "", type: "", floor: "", building: "stmarys" });
      }
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData };
    
    let submitError;
    if (editingId) {
      // Remove id from payload if editing unless it's indoor_nodes (where id is text and might be edited, but let's keep it safe)
      const res = await supabase.from(activeTab).update(payload).eq("id", editingId);
      submitError = res.error;
    } else {
      const res = await supabase.from(activeTab).insert([payload]);
      submitError = res.error;
    }

    if (submitError) {
      alert("Failed to save: " + submitError.message);
    } else {
      setIsFormOpen(false);
      fetchData();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete this record?`)) return;
    
    const { error: delError } = await supabase.from(activeTab).delete().eq("id", id);
    if (delError) {
      alert("Failed to delete record.");
    } else {
      fetchData();
    }
  };

  const filteredData = data.filter(item => {
    const query = searchQuery.toLowerCase();
    if (activeTab === "indoor_nodes") return item.id?.toLowerCase().includes(query) || item.label?.toLowerCase().includes(query);
    return item.name?.toLowerCase().includes(query);
  });

  const renderTableHeaders = () => {
    if (activeTab === "indoor_nodes") {
      return (
        <>
          <th className="p-5 font-bold">Node ID</th>
          <th className="p-5 font-bold">Location</th>
          <th className="p-5 font-bold">Coordinates</th>
          <th className="p-5 font-bold">Label Position</th>
        </>
      );
    }
    if (activeTab === "locations") {
      return (
        <>
          <th className="p-5 font-bold">Name</th>
          <th className="p-5 font-bold">Coordinates</th>
          <th className="p-5 font-bold">Route Node</th>
        </>
      );
    }
    if (activeTab === "qr_locations") {
      return (
        <>
          <th className="p-5 font-bold">Name</th>
          <th className="p-5 font-bold">Type</th>
          <th className="p-5 font-bold">Location</th>
          <th className="p-5 font-bold">Start Node</th>
        </>
      );
    }
  };

  const renderTableRow = (item) => {
    if (activeTab === "indoor_nodes") {
      return (
        <>
          <td className="p-5 font-bold text-slate-800">{item.id}</td>
          <td className="p-5 text-sm text-slate-600">
            Building: {item.building}<br/>
            Floor: {item.floor || "-"}
          </td>
          <td className="p-5 text-sm text-slate-600">
            Lat: {item.lat}<br/>
            Lng: {item.lng}
          </td>
          <td className="p-5 text-sm text-slate-600">
            {item.label ? (
              <>
                Label: {item.label}<br/>
                Lat: {item.label_lat}<br/>
                Lng: {item.label_lng}
              </>
            ) : <span className="text-slate-400 italic">No Label</span>}
          </td>
        </>
      );
    }
    if (activeTab === "locations") {
      return (
        <>
          <td className="p-5 font-bold text-slate-800">{item.name}</td>
          <td className="p-5 text-sm text-slate-600">
            Lat: {item.lat}<br/>
            Lng: {item.lng}
          </td>
          <td className="p-5 text-sm font-medium text-blue-600">{item.route_node}</td>
        </>
      );
    }
    if (activeTab === "qr_locations") {
      return (
        <>
          <td className="p-5 font-bold text-slate-800">{item.name}</td>
          <td className="p-5 text-sm text-slate-600 uppercase font-semibold tracking-wider text-xs">{item.type}</td>
          <td className="p-5 text-sm text-slate-600">
            Building: {item.building}<br/>
            Floor: {item.floor || "-"}
          </td>
          <td className="p-5 text-sm font-medium text-blue-600">{item.start_node}</td>
        </>
      );
    }
  };

  const renderFormFields = () => {
    if (activeTab === "indoor_nodes") {
      return (
        <>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">Node ID *</label>
            <input type="text" required value={formData.id || ""} onChange={(e) => setFormData({...formData, id: e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl" disabled={!!editingId} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Latitude *</label>
              <input type="number" step="any" required value={formData.lat || ""} onChange={(e) => setFormData({...formData, lat: parseFloat(e.target.value)})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Longitude *</label>
              <input type="number" step="any" required value={formData.lng || ""} onChange={(e) => setFormData({...formData, lng: parseFloat(e.target.value)})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Building *</label>
              <select required value={formData.building || ""} onChange={(e) => setFormData({...formData, building: e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl">
                <option value="stmarys">St. Mary's Block</option>
                <option value="chavara">St. Chavara Block</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Floor</label>
              <input type="text" value={formData.floor || ""} onChange={(e) => setFormData({...formData, floor: e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl" />
            </div>
          </div>
          <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
            <label className="block text-sm font-bold text-slate-700">Map Label (Optional)</label>
            <input type="text" value={formData.label || ""} onChange={(e) => setFormData({...formData, label: e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl" placeholder="e.g. Canteen" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Label Latitude</label>
              <input type="number" step="any" value={formData.label_lat || ""} onChange={(e) => setFormData({...formData, label_lat: parseFloat(e.target.value)})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Label Longitude</label>
              <input type="number" step="any" value={formData.label_lng || ""} onChange={(e) => setFormData({...formData, label_lng: parseFloat(e.target.value)})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl" />
            </div>
          </div>
        </>
      );
    }
    if (activeTab === "locations") {
      return (
        <>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">Name *</label>
            <input type="text" required value={formData.name || ""} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Latitude *</label>
              <input type="number" step="any" required value={formData.lat || ""} onChange={(e) => setFormData({...formData, lat: parseFloat(e.target.value)})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Longitude *</label>
              <input type="number" step="any" required value={formData.lng || ""} onChange={(e) => setFormData({...formData, lng: parseFloat(e.target.value)})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">Route Node ID *</label>
            <input type="text" required value={formData.route_node || ""} onChange={(e) => setFormData({...formData, route_node: e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl" />
          </div>
        </>
      );
    }
    if (activeTab === "qr_locations") {
      return (
        <>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">Name *</label>
            <input type="text" required value={formData.name || ""} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Type *</label>
              <select required value={formData.type || ""} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl">
                <option value="">Select Type</option>
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Start Node ID *</label>
              <input type="text" required value={formData.start_node || ""} onChange={(e) => setFormData({...formData, start_node: e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Building</label>
              <select value={formData.building || ""} onChange={(e) => setFormData({...formData, building: e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl">
                <option value="">None (Outdoor)</option>
                <option value="stmarys">St. Mary's Block</option>
                <option value="chavara">St. Chavara Block</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Floor</label>
              <input type="text" value={formData.floor || ""} onChange={(e) => setFormData({...formData, floor: e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Latitude</label>
              <input type="number" step="any" value={formData.lat || ""} onChange={(e) => setFormData({...formData, lat: parseFloat(e.target.value)})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Longitude</label>
              <input type="number" step="any" value={formData.lng || ""} onChange={(e) => setFormData({...formData, lng: parseFloat(e.target.value)})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl" />
            </div>
          </div>
        </>
      );
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Map Nodes Manager</h1>
        <p className="text-slate-500 mt-2 text-sm">Manage indoor map nodes, custom locations, and QR scan points.</p>
      </div>

      <div className="flex gap-2 mb-6 p-1 bg-slate-200/50 rounded-2xl w-fit">
        {[
          { id: "indoor_nodes", label: "Indoor Nodes" },
          { id: "locations", label: "Map Locations" },
          { id: "qr_locations", label: "QR Locations" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === tab.id 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden flex-1 flex flex-col relative">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all duration-200 text-sm font-semibold active:scale-95 whitespace-nowrap"
          >
            <Plus size={18} /> Add New
          </button>
        </div>

        {error && <div className="p-4 m-4 rounded-xl text-rose-600 bg-rose-50 border border-rose-100/50 text-sm font-medium">{error}</div>}

        <div className="overflow-y-auto overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <tr className="text-slate-500 text-xs uppercase tracking-widest">
                {renderTableHeaders()}
                <th className="p-5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-slate-400 font-medium">Loading data...</td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-slate-400 font-medium">No records found.</td>
              </tr>
            ) : (
              filteredData.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                  {renderTableRow(item)}
                  <td className="p-5 flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenForm(item)} 
                      className="p-2.5 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)} 
                      className="p-2.5 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>

        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-end md:p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md h-full md:rounded-3xl rounded-none shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-300">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 shadow-sm">
                <h2 className="text-xl font-extrabold text-slate-800">
                  {editingId ? "Edit Record" : "New Record"}
                </h2>
                <button onClick={() => setIsFormOpen(false)} className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
                {renderFormFields()}
                
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 active:scale-95 transition-all"
                  >
                    {editingId ? "Save Changes" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
