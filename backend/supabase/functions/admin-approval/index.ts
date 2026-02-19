import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

 
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const path = url.pathname;

  // GET or POST (no body) → list pending clients (name + email only; no password)
  const listPending = async () => {
    const { data, error } = await supabase
      .from("user")
      .select("user_id, email, fname, lname, status")
      .eq("status", false);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };
  if (req.method === "GET") return listPending();

  // Parse POST JSON (optional for list)
  let body: Record<string, unknown> = {};
  try {
    const raw = await req.text();
    if (raw) body = JSON.parse(raw);
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // POST with no user_id → list pending (Supabase invoke uses POST by default)
  if (req.method === "POST" && body.user_id == null) return listPending();

  // POST /api/admin/approve
  if (req.method === "POST" && path.endsWith("/approve")) {
    const { admin_id, user_id } = body;

    if (!admin_id || !user_id)
      return new Response("Missing admin_id or user_id", { status: 400 });

    // Approve user
    const { error } = await supabase
      .from("user")
      .update({ status: true })
      .eq("user_id", user_id);

    if (error) return new Response(error.message, { status: 400 });

    await supabase.from("audit_log").insert({
      admin_id,
      target_user_id: user_id,
      action: "approve",
    });

    return new Response("User approved", { status: 200 });
  }


  // POST /api/admin/deny
if (req.method === "POST" && path.endsWith("/deny")) {
    const { admin_id, user_id } = body;
  
    if (!admin_id || !user_id)
      return new Response("Missing admin_id or user_id", { status: 400 });
  
    // Set user status to false
    const { error } = await supabase
      .from("user")
      .update({ status: false })
      .eq("user_id", user_id);
  
    if (error) return new Response(error.message, { status: 400 });
  
    await supabase.from("audit_log").insert({
      admin_id,
      target_user_id: user_id,
      action: "deny",
    });
  
    return new Response("User denied", { status: 200 });
  }

  return new Response(
    JSON.stringify({ error: "Not Found" }),
    { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
