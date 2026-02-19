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

  // List approved users only (status = true); never include pending (status = false)
  const listApproved = async () => {
    const { data, error } = await supabase
      .from("user")
      .select("user_id, email, fname, lname, status")
      .eq("status", true);
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

  // POST with list === "approved" → list approved clients
  if (req.method === "POST" && body.list === "approved") return listApproved();

  // POST with no user_id and no action → list pending (Supabase invoke uses POST by default)
  if (req.method === "POST" && body.user_id == null && body.action == null) return listPending();

  const action = body.action != null ? String(body.action).toLowerCase() : "";

  // POST with action "approve" → approve user (only if currently pending)
  if (req.method === "POST" && action === "approve") {
    const rawAdminId = body.admin_id;
    const rawUserId = body.user_id;
    if (rawAdminId == null || rawUserId == null) {
      return new Response(
        JSON.stringify({ error: "Missing admin_id or user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const user_id = Number(rawUserId);
    const admin_id = Number(rawAdminId);
    if (!Number.isFinite(user_id) || !Number.isFinite(admin_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid admin_id or user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existing } = await supabase
      .from("user")
      .select("status")
      .eq("user_id", user_id)
      .single();

    if (existing?.status === true) {
      return new Response(
        JSON.stringify({ error: "User is already approved" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error } = await supabase
      .from("user")
      .update({ status: true })
      .eq("user_id", user_id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("audit_log").insert({
      admin_id,
      target_user_id: user_id,
      action: "approve",
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST with action "deny" → deny user (keep status false, log action)
  if (req.method === "POST" && action === "deny") {
    const rawAdminId = body.admin_id;
    const rawUserId = body.user_id;
    if (rawAdminId == null || rawUserId == null) {
      return new Response(
        JSON.stringify({ error: "Missing admin_id or user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const user_id = Number(rawUserId);
    const admin_id = Number(rawAdminId);
    if (!Number.isFinite(user_id) || !Number.isFinite(admin_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid admin_id or user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error } = await supabase
      .from("user")
      .update({ status: false })
      .eq("user_id", user_id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("audit_log").insert({
      admin_id,
      target_user_id: user_id,
      action: "deny",
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Clear error when POST looks like approve/deny but action was wrong
  if (req.method === "POST" && (body.user_id != null || body.admin_id != null)) {
    return new Response(
      JSON.stringify({
        error:
          "Missing or invalid action. Send JSON body: { action: 'approve' or 'deny', admin_id: number, user_id: number }",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ error: "Not Found" }),
    { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
