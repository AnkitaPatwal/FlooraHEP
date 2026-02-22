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

  // POST with action "delete" → delete approved user from public.user and auth
  if (req.method === "POST" && action === "delete") {
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

    const { data: existing, error: fetchErr } = await supabase
      .from("user")
      .select("user_id, email, fname, lname, status")
      .eq("user_id", user_id)
      .single();

    if (fetchErr || !existing) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = (existing.email ?? "").toLowerCase();
    if (!email) {
      return new Response(
        JSON.stringify({ error: "User has no email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find auth user by email and delete from auth
    const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUser = listData?.users?.find((u) => (u.email ?? "").toLowerCase() === email);
    if (authUser?.id) {
      const { error: authDelErr } = await supabase.auth.admin.deleteUser(authUser.id);
      if (authDelErr) {
        console.error("auth.admin.deleteUser error:", authDelErr.message);
        return new Response(
          JSON.stringify({ error: "Failed to delete auth user: " + authDelErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { error: auditError } = await supabase.from("audit_log").insert({
      admin_id,
      target_user_id: user_id,
      action: "delete",
    });
    if (auditError) {
      console.error("audit_log insert (delete) failed:", auditError.message);
    }

    // If this user is an admin, reassign their content to another admin so user (and admin row) can be deleted
    const { data: adminRow } = await supabase.from("admin").select("user_id").eq("user_id", user_id).maybeSingle();
    if (adminRow) {
      const { data: otherAdmins } = await supabase.from("admin").select("user_id").neq("user_id", user_id).limit(1);
      const fallbackAdminId = otherAdmins?.[0]?.user_id;
      if (fallbackAdminId == null) {
        return new Response(
          JSON.stringify({ error: "Cannot delete: this user is an admin and there is no other admin to reassign their content to." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      await supabase.from("tag").update({ created_by_admin_id: fallbackAdminId }).eq("created_by_admin_id", user_id);
      await supabase.from("exercise").update({ created_by_admin_id: fallbackAdminId }).eq("created_by_admin_id", user_id);
      await supabase.from("module").update({ created_by_admin_id: fallbackAdminId }).eq("created_by_admin_id", user_id);
      await supabase.from("user_module").update({ assigned_by_admin_id: fallbackAdminId }).eq("assigned_by_admin_id", user_id);
    }

    // Remove rows that reference this user with ON DELETE RESTRICT (video, photo)
    const { error: videoErr } = await supabase.from("video").delete().eq("uploader_user_id", user_id);
    if (videoErr) {
      return new Response(
        JSON.stringify({ error: "Failed to delete user videos: " + videoErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { error: photoErr } = await supabase.from("photo").delete().eq("uploader_user_id", user_id);
    if (photoErr) {
      return new Response(
        JSON.stringify({ error: "Failed to delete user photos: " + photoErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: deleteErr } = await supabase.from("user").delete().eq("user_id", user_id);
    if (deleteErr) {
      return new Response(
        JSON.stringify({ error: "Failed to delete user record: " + deleteErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Clear error when POST looks like approve/deny/delete but action was wrong
  if (req.method === "POST" && (body.user_id != null || body.admin_id != null)) {
    return new Response(
      JSON.stringify({
        error:
          "Missing or invalid action. Send JSON body: { action: 'approve', 'deny', or 'delete', admin_id: number, user_id: number }",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ error: "Not Found" }),
    { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
