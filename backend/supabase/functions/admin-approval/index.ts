import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
};

/** Send approval or denial email via Resend. No domain: set only RESEND_API_KEY; uses onboarding@resend.dev (delivers to Resend account email). */
async function sendStatusEmail(
  kind: "approve" | "deny",
  to: string,
  name: string
): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return;
  const from = Deno.env.get("RESEND_FROM_EMAIL") || Deno.env.get("FROM_EMAIL") || "Floora HEP <onboarding@resend.dev>";
  const isApproved = kind === "approve";
  const subject = isApproved ? "Your Account Has Been Approved!" : "Account Request Denied";
  const html = isApproved
    ? `<!DOCTYPE html><html><body style="font-family: Arial, sans-serif;"><h2>Welcome, ${escapeHtml(name)}!</h2><p>Your account has been <strong>approved</strong>.</p><p>You can now log in to your account.</p></body></html>`
    : `<!DOCTYPE html><html><body style="font-family: Arial, sans-serif;"><h2>Hello ${escapeHtml(name)},</h2><p>Your account request was <strong>denied</strong>.</p><p>You will not be able to log in. If you believe this is an error, please contact support.</p></body></html>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) console.error("Resend email error:", res.status, await res.text());
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

  // GET or POST (no body) → list pending clients (status false and never denied; denied users disappear from list)
  const listPending = async () => {
    let deniedSet = new Set<number>();
    const { data: deniedRows, error: auditErr } = await supabase
      .from("audit_log")
      .select("target_user_id")
      .eq("action", "deny");
    if (!auditErr && deniedRows) {
      deniedSet = new Set(deniedRows.map((r) => Number(r.target_user_id)));
    }

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
    const pendingOnly = (data ?? []).filter((u) => !deniedSet.has(Number(u.user_id)));
    return new Response(JSON.stringify(pendingOnly), {
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
      .select("status, email, fname, lname")
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

    const email = existing?.email;
    const name = [existing?.fname, existing?.lname].filter(Boolean).join(" ") || "there";
    if (email) {
      try { await sendStatusEmail("approve", email, name); } catch (_) { /* don't fail the request */ }
    }

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

    const { data: existing } = await supabase
      .from("user")
      .select("email, fname, lname")
      .eq("user_id", user_id)
      .single();

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

    const { error: auditError } = await supabase.from("audit_log").insert({
      admin_id,
      target_user_id: user_id,
      action: "deny",
    });
    if (auditError) {
      console.error("audit_log insert (deny) failed:", auditError.message);
      return new Response(
        JSON.stringify({ error: "Failed to record denial. Ensure audit_log exists and service_role has INSERT." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = existing?.email;
    const name = [existing?.fname, existing?.lname].filter(Boolean).join(" ") || "there";
    if (email) {
      try { await sendStatusEmail("deny", email, name); } catch (_) { /* don't fail the request */ }
    }

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
