import AppLayout from "../../components/layouts/AppLayout";
import "../../components/main/Plan.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
  plan_module: any[];
}

function mapDataToPlan(plan: PlanData): Plan {
  // Try to figure out a category for grouping on the Plan page, default to Uncategorized
  let category = "Uncategorized";
  const searchStr = `${plan.title} ${plan.description}`.toLowerCase();
  if (searchStr.includes("back pain")) category = "Back Pain";
  if (searchStr.includes("core") || searchStr.includes("pelvic")) category = "DRA";

  return {
    id: plan.plan_id,
    title: plan.title,
    category: category,
    type: plan.description ?? 'Plan',
    sessionCount: plan.plan_module ? plan.plan_module.length : 0,
    image: '', // placeholder until thumbnail is implemented
  };
}

export default function Plan() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:3000/api/admin/plans", { credentials: "include" })
      .then(res => res.json())
      .then((data: unknown) => {
        console.log("RAW DATA:", data);
        if (!Array.isArray(data)) {
          console.error("Expected array from API, got:", typeof data);
          setPlans([]);
          return;
        }
        setPlans((data as PlanData[]).map(mapDataToPlan));
      })
      .catch(err => {
        console.error("Failed to fetch plans:", err);
        setPlans([]);
      });
  }, []);
  
// Group plans by category
// handles null/undefined plans or category
const groupedPlans = (plans ?? []).reduce((acc, plan) => {
  const category = plan.category ?? 'Uncategorized';
  if (!acc[category]) acc[category] = [];
  acc[category].push(plan);
  return acc;
}, {} as Record<string, Plan[]>);

  console.log("PLANS STATE:", plans);

  return (
    
    <AppLayout>
      <div className="plan-page">
        {/* ==== HEADER ==== */}
        <header className="plan-header">
          <div className="plan-header-left">
            <h1 className="plan-title">Plans</h1>
            <p className="plan-count">{plans.length} Plans</p>
            <button className="plan-new-plan-btn" onClick={() => navigate("/plan-dashboard/create")}>+ New Plan</button>
          </div>

          {/* SEARCH BAR SECTION */}
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
              <input type="text" className="plan-search-bar" placeholder="Search" />
            </div>
          </div>
        </header>

        <hr className="plan-divider" />

        {/* ==== PLAN CARDS ==== */}
        {Object.entries(groupedPlans).map(([category, items]) => (
          <section className="plan-category-section" key={category}>
            <h2 className="plan-category-title">
              {category} <span>{items.length} {items.length === 1 ? 'Plan' : 'Plans'}</span>
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
                      <span className="material-symbols-outlined">vital_signs</span>
                      {plan.sessionCount} {plan.sessionCount === 1 ? 'session' : 'sessions'}
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