import { useEffect, useState } from "react";
import AppLayout from "../../components/layouts/AppLayout";
import { supabase } from "../../lib/supabase-client";
import "../../components/UserApproval.css";

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function Profile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get authenticated user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw new Error(authError.message);
        if (!user) throw new Error("No authenticated user found");

        // Fetch profile from DB
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, display_name, avatar_url")
          .eq("id", user.id)
          .single();

        if (profileError) throw new Error(profileError.message);

        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    void fetchProfile();
  }, []);

  const name = profile?.display_name || "—";
  const email = profile?.email || "—";

  const initials =
    name !== "—"
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "U";

  return (
    <AppLayout>
      <div className="ua-page">
        <div className="ua-panel">
          <header className="ua-header">
            <h1 className="ua-title">My Profile</h1>
          </header>

          {loading && <p className="ua-empty">Loading profile...</p>}

          {error && (
            <p className="ua-error" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && (
            <div className="ua-body">
              <aside className="ua-left">
                <div className="ua-avatar-wrap">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="User avatar"
                      className="ua-avatar"
                    />
                  ) : (
                    <div className="ua-avatar ua-avatar-fallback">
                      {initials}
                    </div>
                  )}
                </div>
              </aside>

              <form className="ua-form">
                <label className="ua-field">
                  <span className="ua-label">Name</span>
                  <input className="ua-input" value={name} disabled />
                </label>

                <label className="ua-field">
                  <span className="ua-label">Email</span>
                  <input className="ua-input" value={email} disabled />
                </label>
              </form>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}