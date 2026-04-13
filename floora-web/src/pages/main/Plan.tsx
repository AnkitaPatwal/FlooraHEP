import AppLayout from "../../components/layouts/AppLayout";
import { AssignmentPulseIcon } from "../../components/icons/AssignmentPulseIcon";
import "../../components/main/Plan.css";
import { useState, useEffect, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase-client";
import planFallbackImg from "../../assets/exercise.jpg";
import { useAssignmentCountsRefresh } from "../../hooks/useAssignmentCountsRefresh";
import {
  getAssignmentCountsVersion,
  subscribeAssignmentCountsVersion,
} from "../../lib/assignmentCountsVersionStore";

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
  assigned_user_count: number;
  image: string;
}

interface PlanData {
  plan_id: number;
  title: string;
  description: string;
  category_id: number | null;
  plan_category: { category_id: number; name: string } | null;
  plan_module: { module_id: number; order_index?: number }[];
  assigned_user_count?: number;
  cover_thumbnail_url?: string | null;
}

function activeUsersLabel(count: number): string {
  return count === 1 ? "1 Active User" : `${count} Active Users`;
}

function mapDataToPlan(plan: PlanData): Plan {
  const categoryName = plan.plan_category?.name ?? "Uncategorized";
  const thumb = plan.cover_thumbnail_url?.trim();
  return {
    id: plan.plan_id,
    title: plan.title,
    category: categoryName,
    type: plan.description ?? "Plan",
    assigned_user_count:
      typeof plan.assigned_user_count === "number" ? plan.assigned_user_count : 0,
    image: thumb || "",
  };
}

export default function Plan() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const navigate = useNavigate();
  const { location, refreshToken } = useAssignmentCountsRefresh();
  const countsVersion = useSyncExternalStore(
    subscribeAssignmentCountsVersion,
    getAssignmentCountsVersion,
    getAssignmentCountsVersion,
  );

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const res = await fetch(`${API_BASE}/api/admin/plans`, {
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
          },
          cache: "no-store",
        });
        const data: unknown = await res.json();
        console.log("RAW DATA:", data);
        if (!Array.isArray(data)) {
          console.error("Expected array from API, got:", typeof data);
          setPlans([]);
          return;
        }
        setPlans((data as PlanData[]).map(mapDataToPlan));
      } catch (err) {
        console.error("Failed to fetch plans:", err);
        setPlans([]);
      }
    };

    loadPlans();
  }, [location.key, refreshToken, countsVersion]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const filteredPlans = (plans ?? []).filter((plan) => {
    if (!debouncedSearch) return true;

    const title = (plan.title ?? "").toLowerCase();
    const category = (plan.category ?? "").toLowerCase();

    return (
      title.includes(debouncedSearch) || category.includes(debouncedSearch)
    );
  });

  const groupedPlans = filteredPlans.reduce((acc, plan) => {
    const category = plan.category ?? "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(plan);
    return acc;
  }, {} as Record<string, Plan[]>);

  return (
    <AppLayout>
      <div className="plan-page">
        <header className="plan-header">
          <div className="plan-header-left">
            <h1 className="plan-title">Plans</h1>
            <p className="plan-count">{filteredPlans.length} Plans</p>
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
                  strokeWidth={1.5}
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
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                  onClick={() => navigate(`/plan-dashboard/${plan.id}/edit`)}
                >
                  <img
                    src={plan.image || planFallbackImg}
                    alt=""
                    className="plan-image"
                  />
                  <div className="plan-info">
                    <h3>{plan.title}</h3>
                    <p>{plan.category}</p>
                    <span className="plan-tag">
                      <AssignmentPulseIcon className="assignment-count-pulse-icon" />
                      {activeUsersLabel(plan.assigned_user_count)}
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