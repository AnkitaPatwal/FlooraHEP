import AppLayout from "../../components/layouts/AppLayout";
import "../../components/main/Plan.css";
import { useState, useEffect } from "react";
//import exerciseImg from "../../assets/exercise.jpg";

interface Plan {
  id: number;
  category: string;
  title: string;
  type: string;
  image: string;
}

export default function Plan() {
  const [plans, setPlans] = useState<Plan[]>([]);
  useEffect(() => {
    fetch("http://localhost:3000/api/admin/modules")
      .then(res => res.json())
      .then(data => {
        console.log("RAW DATA:", data);
        setPlans(data); // temporary test
      })
      .catch(err => console.error(err));
  }, []);
  
  
  
  // Group plans by category
  const groupedPlans = plans.reduce((acc, plan) => {
    if (!acc[plan.category]) acc[plan.category] = [];
    acc[plan.category].push(plan);
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
            <button className="plan-new-plan-btn">+ New Plan</button>
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
              {category} <span>{items.length} {items.length === 1 ? 'Exercise' : 'Sessions'}</span>
            </h2>

            <div className="plan-grid">
              {items.map((plan) => (
                <div className="plan-card" key={plan.id}>
                  <img src={plan.image} alt={plan.title} className="plan-image" />
                  <div className="plan-info">
                    <h3>{plan.title}</h3>
                    <p>{plan.category}</p>
                    <span className="plan-tag">
                      <span className="material-symbols-outlined">vital_signs</span>
                      {plan.type}
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