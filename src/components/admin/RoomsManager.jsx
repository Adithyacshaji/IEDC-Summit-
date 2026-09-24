import React, { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";
import { Plus, Edit2, Trash2, X, Check, Search, MapPin } from "lucide-react";

export default function RoomsManager() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    room_id: "",
    name: "",
    floor: "",
    building: "St Mary's Block",
    route_node: "",
    indoor_node: ""
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("name");
    
    if (error) {
      setError("Failed to load rooms.");
    } else {
      setRooms(data);
    }
    setLoading(false);
  };

  const handleOpenForm = (room = null) => {
    if (room) {
      setEditingId(room.id);
      setFormData({
        room_id: room.room_id || "",
        name: room.name || "",
        floor: room.floor || "",
        building: room.building || "St Mary's Block",
        route_node: room.route_node || "",
        indoor_node: room.indoor_node || ""
      });
    } else {
      setEditingId(null);
      setFormData({
        room_id: "",
        name: "",
        floor: "",
        building: "St Mary's Block",
        route_node: "",
        indoor_node: ""
      });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData };
    
    // Convert empty strings to null for optional fields
    if (!payload.indoor_node) payload.indoor_node = null;
    if (!payload.route_node) payload.route_node = null;

    if (editingId) {
      const { error: updateError } = await supabase
        .from("rooms")
        .update(payload)
        .eq("id", editingId);
        
      if (updateError) {
        alert("Failed to update room: " + updateError.message);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("rooms")
        .insert([payload]);
        
      if (insertError) {
        alert("Failed to create room: " + insertError.message);
        return;
      }
    }

    setIsFormOpen(false);
    fetchRooms();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this room?")) {
      const { error } = await supabase.from("rooms").delete().eq("id", id);
      if (error) {
        alert("Failed to delete room: " + error.message);
      } else {
        fetchRooms();
      }
    }
  };

  const filteredRooms = rooms.filter(r => {
    const matchesSearch = (r.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
                          (r.room_id?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesBuilding = buildingFilter === "all" || r.building === buildingFilter;
    return matchesSearch && matchesBuilding;
  });

  if (loading && rooms.length === 0) return <div className="p-8 text-center text-gray-500">Loading rooms...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rooms</h2>
          <p className="text-sm text-gray-500">Manage rooms and search locations.</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} /> Add Room
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-700"
          >
            <option value="all">All Buildings</option>
            <option value="St Mary's Block">St Mary's Block</option>
            <option value="chavara">St Chavara Block</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-sm text-gray-500">
                <th className="px-6 py-4 font-medium">Room Name</th>
                <th className="px-6 py-4 font-medium">Room ID</th>
                <th className="px-6 py-4 font-medium">Building</th>
                <th className="px-6 py-4 font-medium">Floor</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No rooms found.
                  </td>
                </tr>
              ) : (
                filteredRooms.map((r) => (
                  <tr key={r.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{r.name}</div>
                      {(r.indoor_node || r.route_node) && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <MapPin size={12} />
                          Indoor: {r.indoor_node || 'N/A'}, Route: {r.route_node || 'N/A'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {r.room_id}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {r.building === 'chavara' ? 'St Chavara' : r.building}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {r.floor}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenForm(r)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Room"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Room"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? "Edit Room" : "Add Room"}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Room Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="e.g. Programming Lab"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Room ID <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.room_id}
                    onChange={(e) => setFormData({...formData, room_id: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="e.g. N201"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Building <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={formData.building}
                    onChange={(e) => setFormData({...formData, building: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="St Mary's Block">St Mary's Block</option>
                    <option value="chavara">St Chavara Block</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Floor <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.floor}
                    onChange={(e) => setFormData({...formData, floor: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="e.g. B2, G, 1"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-4">
                <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                  <MapPin size={16} className="text-blue-500" /> Navigation Nodes (Optional)
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Route Node</label>
                    <input
                      type="text"
                      value={formData.route_node || ""}
                      onChange={(e) => setFormData({...formData, route_node: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
                      placeholder="e.g. b1, chavara"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Indoor Node</label>
                    <input
                      type="text"
                      value={formData.indoor_node || ""}
                      onChange={(e) => setFormData({...formData, indoor_node: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
                      placeholder="e.g. F201"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-blue-600/20"
                >
                  <Check size={18} /> {editingId ? "Update Room" : "Add Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
