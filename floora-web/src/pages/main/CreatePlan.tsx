import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../../components/layouts/AppLayout";
import "./CreatePlan.css";

interface Module {
  module_id: number;
  title: string;
  description: string;
  session_number: number;
  category?: string;
  type?: string;
  image?: string;
}

// map backend "module" terminology to frontend "Session" terminology used in Session.tsx
function mapModuleToSession(module: any) {
  // Use category if present or try to extract from title/description
  let category = module.category || "Uncategorized";
  
  const searchStr = `${module.title} ${module.description}`.toLowerCase();
  if (searchStr.includes("back pain")) category = "Back Pain";
  if (searchStr.includes("core") || searchStr.includes("pelvic")) category = "DRA";
  
  return {
    module_id: module.module_id,
    category: category,
    title: module.title,
    type: module.description,
    image: "", // Use image once available in API
    description: module.description,
    session_number: module.session_number
  };
}

export default function CreatePlan() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isEditMode = Boolean(id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [selectedModules, setSelectedModules] = useState<Module[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchModules();
    if (isEditMode) {
      fetchPlan(id!);
    }
  }, [id]);

  const fetchModules = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/admin/modules", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch modules");
      const data = await res.json();
      setAvailableModules(data.map(mapModuleToSession));
    } catch (err: any) {
      console.error(err);
      setError("Could not load available sessions.");
    }
  };

  const fetchPlan = async (planId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`http://localhost:3000/api/admin/plans/${planId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch plan");
      const data = await res.json();
      setTitle(data.title || "");
      setDescription(data.description || "");
      
      if (data.plan_module) {
        const loadedModules = data.plan_module.map((pm: any) => mapModuleToSession(pm.module));
        setSelectedModules(loadedModules);
      }
    } catch (err: any) {
      console.error(err);
      setError("Could not load the plan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddModule = (module: Module) => {
    if (selectedModules.find((m) => m.module_id === module.module_id)) return;
    setSelectedModules([...selectedModules, module]);
  };

  const handleRemoveModule = (moduleId: number) => {
    setSelectedModules(selectedModules.filter((m) => m.module_id !== moduleId));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      title,
      description,
      moduleIds: selectedModules.map(m => m.module_id)
    };

    try {
      let url = "http://localhost:3000/api/admin/plans";
      let method = "POST";
      
      if (isEditMode) {
        url = `http://localhost:3000/api/admin/plans/${id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save plan");

      setSuccess(`Plan ${isEditMode ? "updated" : "saved"} successfully!`);
      navigate(`/plan-dashboard`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;
    
    try {
      setIsSaving(true);
      const res = await fetch(`http://localhost:3000/api/admin/plans/${id}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!res.ok) throw new Error("Failed to delete plan");
      
      navigate("/plan-dashboard");
    } catch (err: any) {
      console.error(err);
      setError("Failed to delete plan.");
      setIsSaving(false);
    }
  };

  const filteredModules = availableModules.filter(m => 
    m.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="create-plan-page">
        <header className="create-plan-header">
          <h1>{isEditMode ? "Edit Plan" : "Create Plan"}</h1>
          <button className="back-btn" onClick={() => navigate("/plan-dashboard")}>Back</button>
        </header>

        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}
        {isLoading && <div className="loading-banner">Loading plan...</div>}

        <form onSubmit={handleSave} className="create-plan-form">
          <div className="form-group">
            <label>Plan Title *</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Pelvic Floor Recovery"
              required
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Enter plan description..."
              required
              rows={4}
            />
          </div>

          <div className="modules-section">
            <div className="modules-left">
              <h3>Available Sessions</h3>
              <input 
                type="text" 
                placeholder="Search sessions..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="module-search"
              />
              <div className="module-list available-list">
                {filteredModules.map(m => (
                  <div key={m.module_id} className="module-item">
                    <div className="module-item-content">
                      <div className="module-item-header">
                        <strong>{m.title}</strong>
                        {m.category && <span className="module-category-tag">{m.category}</span>}
                      </div>
                      <p>{m.description}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleAddModule(m)}
                      disabled={selectedModules.some(sm => sm.module_id === m.module_id)}
                      className="add-module-btn"
                    >
                      {selectedModules.some(sm => sm.module_id === m.module_id) ? "Added" : "Add"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="modules-right">
              <h3>Selected Sessions ({selectedModules.length})</h3>
              <div className="module-list selected-list">
                {selectedModules.length === 0 ? (
                  <p className="empty-state">No sessions selected yet.</p>
                ) : (
                  selectedModules.map((m, index) => (
                    <div key={m.module_id} className="module-item">
                      <div className="module-item-content">
                        <div className="module-item-header">
                          <strong>{index + 1}. {m.title}</strong>
                          {m.category && <span className="module-category-tag">{m.category}</span>}
                        </div>
                        <p>{m.description}</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveModule(m.module_id)}
                        className="remove-module-btn"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {isEditMode ? (
              <button 
                type="button" 
                onClick={handleDelete}
                className="remove-module-btn"
                disabled={isSaving || isLoading}
              >
                Delete Plan
              </button>
            ) : <div></div>}
            
            <button 
              type="submit" 
              className="save-plan-btn" 
              disabled={isSaving || isLoading}
            >
              {isSaving ? "Saving..." : "Save Plan"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}