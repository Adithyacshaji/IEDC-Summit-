import React, { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";
import { Plus, Edit2, Trash2, X, Check, Building, Search } from "lucide-react";

export default function DepartmentManager() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    building: "stmarys",
    floor: "",
    room: "",
    has_indoor_navigation: false,
    route_node: "",
    indoor_node: "",
    image_url: ""
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("name");
    
    if (error) {
      setError("Failed to load departments.");
    } else {
      setDepartments(data);
    }
    setLoading(false);
  };

  const handleOpenForm = (dept = null) => {
    if (dept) {
      setEditingId(dept.id);
      setFormData({
        name: dept.name || "",
        building: dept.building || "stmarys",
        floor: dept.floor || "",
        room: dept.room || "",
        has_indoor_navigation: dept.has_indoor_navigation || false,
        route_node: dept.route_node || "",
        indoor_node: dept.indoor_node || "",
        image_url: dept.image_url || ""
      });
      setImageFile(null);
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        building: "stmarys",
        floor: "",
        room: "",
        has_indoor_navigation: false,
        route_node: "",
        indoor_node: "",
        image_url: ""
      });
      setImageFile(null);
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData };
    
    if (imageFile) {
      setUploading(true);
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `departments/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, imageFile);
        
      if (uploadError) {
        alert("Failed to upload image: " + uploadError.message);
        setUploading(false);
        return;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
        
      payload.image_url = publicUrl;
      setUploading(false);
    }

    if (!payload.image_url) {
      delete payload.image_url;
    }

    let error;
    if (editingId) {
      const res = await supabase.from("departments").update(payload).eq("id", editingId);
      error = res.error;
    } else {
      const res = await supabase.from("departments").insert([payload]);
      error = res.error;
    }

    if (error) {
      alert("Failed to save department: " + error.message);
    } else {
      setIsFormOpen(false);
      fetchDepartments();
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This may break faculties linked to it.`)) return;
    
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) {
      alert("Failed to delete. Ensure no faculties are linked to this department first.");
    } else {
      fetchDepartments();
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Departments</h1>
        <p className="text-slate-500 mt-2 text-sm">Manage the academic departments, administrative blocks, and their locations.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden flex-1 flex flex-col relative">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white flex-wrap gap-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Building className="text-blue-600" size={20} />
            <span className="hidden sm:inline">Department List</span>
          </h2>
          
          <div className="relative flex-1 min-w-[200px] max-w-md mx-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search departments..." 
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
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <tr className="text-slate-500 text-xs uppercase tracking-widest">
                <th className="p-5 font-bold">Department Name</th>
                <th className="p-5 font-bold">Location</th>
                <th className="p-5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
            {loading ? (
              <tr>
                <td colSpan="3" className="p-12 text-center text-slate-400 font-medium">Loading departments...</td>
              </tr>
            ) : (() => {
              const filteredDepartments = departments.filter(dept => 
                dept.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                dept.building?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                dept.id?.toString().includes(searchQuery)
              );

              if (filteredDepartments.length === 0) {
                return (
                  <tr>
                    <td colSpan="3" className="p-12 text-center text-slate-400 font-medium">
                      {searchQuery ? "No matching departments found." : "No departments found. Create one to get started."}
                    </td>
                  </tr>
                );
              }

              return filteredDepartments.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-5">
                    <div className="font-bold text-slate-800">{dept.name}</div>
                    <div className="text-xs text-slate-400 font-medium mt-1">ID: #{dept.id.toString().substring(0, 8)}</div>
                  </td>
                  
                  <td className="p-5 text-sm">
                    {dept.room || dept.floor || dept.building ? (
                      <>
                        <div className="font-medium text-slate-700">{dept.room || "No Room"} <span className="text-slate-400 font-normal">({dept.floor || "No Floor"})</span></div>
                        <div className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1">
                          {dept.building === "stmarys" ? "St. Mary's Block" : dept.building === "chavara" ? "St. Chavara Block" : dept.building}
                          {dept.has_indoor_navigation && <span className="text-blue-500 ml-1" title="Indoor Navigation Enabled">📍</span>}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400 italic">No Location Set</span>
                    )}
                  </td>
                  
                  <td className="p-5 flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenForm(dept)} 
                      className="p-2.5 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(dept.id, dept.name)} 
                      className="p-2.5 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-end md:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full md:rounded-3xl rounded-none shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 shadow-sm">
              <h2 className="text-xl font-extrabold text-slate-800">
                {editingId ? "Edit Department" : "New Department"}
              </h2>
              <button onClick={() => setIsFormOpen(false)} className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
              
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Image</label>
                <div className="flex items-center gap-4">
                  {(formData.image_url || imageFile) && (
                    <div className="w-16 h-16 rounded-xl border-2 border-slate-200 overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center">
                      <img 
                        src={imageFile ? URL.createObjectURL(imageFile) : formData.image_url} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Department Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800"
                  placeholder="e.g. Computer Science"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Building</label>
                <select
                  value={formData.building}
                  onChange={(e) => setFormData({...formData, building: e.target.value})}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800"
                >
                  <option value="stmarys">St. Mary's Block</option>
                  <option value="chavara">St. Chavara Block</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Floor</label>
                  <input
                    type="text"
                    value={formData.floor}
                    onChange={(e) => setFormData({...formData, floor: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800"
                    placeholder="e.g. 1, 5, G"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Office Room / Area</label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({...formData, room: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800"
                    placeholder="e.g. N400"
                  />
                </div>
              </div>
              
              <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      id="has_indoor"
                      checked={formData.has_indoor_navigation}
                      onChange={(e) => setFormData({...formData, has_indoor_navigation: e.target.checked})}
                      className="w-5 h-5 cursor-pointer appearance-none rounded border-2 border-blue-200 checked:bg-blue-600 checked:border-blue-600 transition-colors"
                    />
                    <Check size={14} className={`absolute left-0.5 top-0.5 text-white pointer-events-none transition-opacity ${formData.has_indoor_navigation ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                  <span className="font-bold text-blue-900 group-hover:text-blue-700 transition-colors">Enable Indoor Routing</span>
                </label>
                
                {formData.has_indoor_navigation && (
                  <div className="grid grid-cols-2 gap-4 mt-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider">Outdoor Node</label>
                      <input
                        type="text"
                        value={formData.route_node}
                        onChange={(e) => setFormData({...formData, route_node: e.target.value})}
                        className="w-full px-3 py-2 border-2 border-blue-200 bg-white rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-800 text-sm"
                        placeholder="e.g. chavara"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider">Indoor Node</label>
                      <input
                        type="text"
                        value={formData.indoor_node}
                        onChange={(e) => setFormData({...formData, indoor_node: e.target.value})}
                        className="w-full px-3 py-2 border-2 border-blue-200 bg-white rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-800 text-sm"
                        placeholder="e.g. F501"
                      />
                    </div>
                  </div>
                )}
              </div>

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
                  disabled={uploading}
                  className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Uploading...
                    </>
                  ) : editingId ? "Save Changes" : "Create Department"}
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
