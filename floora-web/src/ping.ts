import { supabase } from "./lib/supabase-client";

(async () => {
  console.log("[ping] file loaded");
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log("[ping] supabase ping:", { data, error });
  } catch (e) {
    console.error("[ping] supabase ping failed:", e);
  }
})();