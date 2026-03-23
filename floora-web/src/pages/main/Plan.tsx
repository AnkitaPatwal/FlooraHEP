import AppLayout from "../../components/layouts/AppLayout";
import "../../components/main/Plan.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface Module {
  module_id: number;
  title: string;
  description: string;
  session_number: number;
  module_exercise: any[];
}

interface Plan {
  id: number;
  category: string;
  title: string;
  type: string;
  sessionCount: number;
  image: string;
}

interface PlanData {
  plan_id: number;
  title: string;
  description: string;
  category_id: number | null;
  plan_category: { category_id: number; name: string } | null;
  plan_module: any[];
}

function mapDataToPlan(plan: PlanData): Plan {
  const categoryName = plan.plan_category?.name ?? "Uncategorized";
  return {
    id: plan.plan_id,
    title: plan.title,
    category: categoryName,
    type: plan.description ?? "Plan",
    sessionCount: plan.plan_module ? plan.plan_module.length : 0,
    image: "",
  };
}

export default function Plan() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  useEffect(() => {
    if (!accessToken) return;
    setError(null);

    const loadPlans = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/plans`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data: unknown = await res.json();

        if (!res.ok) {
          const msg = (data as { error?: string })?.error ?? `Request failed (${res.status})`;
          setError(msg);
          setPlans([]);
          return;
        }
        if (!Array.isArray(data)) {
          setPlans([]);
          return;
        }
        setPlans((data as PlanData[]).map(mapDataToPlan));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to fetch plans";
        setError(msg);
        setPlans([]);
      }
    };

    loadPlans();
  }, [accessToken]);

  const groupedPlans = (plans ?? []).reduce((acc, plan) => {
    const category = plan.category ?? "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(plan);
    return acc;
  }, {} as Record<string, Plan[]>);

  return (
    <AppLayout>
      <div className="plan-page">
        {error && (
          <div style={{ padding: 16, background: "#fee", color: "#c00", marginBottom: 16 }}>
            {error}
          </div>
        )}
        <header className="plan-header">
          <div className="plan-header-left">
            <h1 className="plan-title">Plans</h1>
            <p className="plan-count">{plans.length} Plans</p>
            <button
              className="plan-new-plan-btn"
              onClick={() => navigate("/plan-dashboard/create")}
            >
              + New Plan
            </button>
          </div>

          <div className="plan-header-right">
            <div className="plan-search-wrapper">
              <span className="plan-search-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="icon"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35m1.6-4.15a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
                  />
                </svg>
              </span>
              <input
                type="text"
                className="plan-search-bar"
                placeholder="Search plans..."
              />
            </div>
          </div>
        </header>

        <hr className="plan-divider" />

        {Object.entries(groupedPlans).map(([category, items]) => (
          <section className="plan-category-section" key={category}>
            <h2 className="plan-category-title">
              {category}{" "}
              <span>
                {items.length} {items.length === 1 ? "Plan" : "Plans"}
              </span>
            </h2>

            <div className="plan-grid">
              {items.map((plan) => (
                <div
                  className="plan-card"
                  key={plan.id}
                  onClick={() => navigate(`/plan-dashboard/${plan.id}`)}
                >
                  <div className="plan-info">
                    <h3>{plan.title}</h3>
                    <p>{plan.category}</p>
                    <span className="plan-tag">
                      <span className="material-symbols-outlined">
                        vital_signs
                      </span>
                      {plan.sessionCount}{" "}
                      {plan.sessionCount === 1 ? "session" : "sessions"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppLayout>
  );
}