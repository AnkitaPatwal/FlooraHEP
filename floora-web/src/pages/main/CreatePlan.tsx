import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../../components/layouts/AppLayout";
import { supabase } from "../../lib/supabase-client";
import "./CreatePlan.css";

interface Module {
  module_id: number;
  title: string;
  description: string;
  session_number: number;
  type?: string;
  image?: string;
}

function mapModuleToSession(module: any) {
  return {
    module_id: module.module_id,
    title: module.title,
    type: module.description,
    image: "",
    description: module.description,
    session_number: module.session_number ?? 0
  };
}

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

export default function CreatePlan() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isEditMode = Boolean(id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
  
  const [categories, setCategories] = useState<{ category_id: number; name: string }[]>([]);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [selectedModules, setSelectedModules] = useState<Module[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchModules();
    if (isEditMode) {
      fetchPlan(id!);
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch("http://localhost:3000/api/admin/categories", { headers });
      if (!res.ok) return;
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      // non-blocking
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setAddingCategory(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch("http://localhost:3000/api/admin/categories", {
        method: "POST",
        headers,
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add category");
      setCategories(prev => [...prev, data]);
      setCategoryId(data.category_id);
      setNewCategoryName("");
    } catch (err: any) {
      setError(err.message || "Failed to add category.");
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryIdToDelete: number) => {
    if (!window.confirm("Delete this category? Plans using it will become Uncategorized.")) return;
    setDeletingCategoryId(categoryIdToDelete);
    setError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(`http://localhost:3000/api/admin/categories/${categoryIdToDelete}`, {
        method: "DELETE",
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete category");
      setCategories(prev => prev.filter(c => c.category_id !== categoryIdToDelete));
      if (categoryId === categoryIdToDelete) setCategoryId("");
    } catch (err: any) {
      setError(err.message || "Failed to delete category.");
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const fetchModules = async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch("http://localhost:3000/api/admin/modules", { headers });
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
      const headers = await authHeaders();
      const res = await fetch(`http://localhost:3000/api/admin/plans/${planId}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch plan");
      const data = await res.json();
      setTitle(data.title || "");
      setDescription(data.description || "");
      setCategoryId(data.category_id ?? "");
      
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
      categoryId: categoryId === "" ? null : categoryId,
      moduleIds: selectedModules.map(m => m.module_id)
    };

    try {
      const headers = await authHeaders();
      const url = isEditMode
        ? `http://localhost:3000/api/admin/plans/${id}`
        : "http://localhost:3000/api/admin/plans";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
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
      const headers = await authHeaders();
      const res = await fetch(`http://localhost:3000/api/admin/plans/${id}`, {
        method: "DELETE",
        headers
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

          <div className="form-group">
            <label>Category</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}
              className="form-group input"
              style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px", width: "100%" }}
            >
              <option value="">Uncategorized</option>
              {categories.map(c => (
                <option key={c.category_id} value={c.category_id}>{c.name}</option>
              ))}
            </select>
            <div className="form-group add-category-row" style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" }}>
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="New category name"
                className="module-search"
                style={{ flex: 1 }}
                disabled={addingCategory}
              />
              <button
                type="button"
                className="add-module-btn"
                onClick={handleAddCategory}
                disabled={addingCategory || !newCategoryName.trim()}
              >
                {addingCategory ? "Adding..." : "Add category"}
              </button>
            </div>
            {categories.length > 0 && (
              <div className="existing-categories" style={{ marginTop: "12px" }}>
                <span style={{ fontSize: "13px", color: "#64748b", marginRight: "8px" }}>Existing categories:</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px" }}>
                  {categories.map(c => (
                    <span
                      key={c.category_id}
                      className="module-category-tag"
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 8px" }}
                    >
                      {c.name}
                      <button
                        type="button"
                        aria-label={`Delete ${c.name}`}
                        onClick={() => handleDeleteCategory(c.category_id)}
                        disabled={deletingCategoryId === c.category_id}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "0 2px", fontSize: "14px", lineHeight: 1, color: "#64748b" }}
                      >
                        {deletingCategoryId === c.category_id ? "…" : "×"}
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
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
                        <span className="module-category-tag">Session {m.session_number}</span>
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
                          <span className="module-category-tag">Session {m.session_number}</span>
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