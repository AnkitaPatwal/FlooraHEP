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

type UserRow = {
  user_id: number;
  email: string;
  fname: string;
  lname: string;
  status: boolean;
};

type EnrichedUser = UserRow & {
  avatar_url: string | null;
  plans: { plan_id: number; title: string }[];
};

/**
 * PostgREST `.in("email", …)` is case-sensitive. `public.user` and `profiles` often differ in
 * casing, which yields no profile row → missing avatar_url and plans. Use ILIKE per email.
 */
function profilesEmailOrFilter(emails: string[]): string {
  return emails
    .map((em) => {
      const inner = em.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `email.ilike."${inner}"`;
    })
    .join(",");
}

/** Auth user ids are UUIDs; JS Map keys are case-sensitive so normalize for joins. */
function normUuid(id: string): string {
  return id.trim().toLowerCase();
}

/** Join profiles (avatar) and user_packages + plan (titles) for admin user lists. */
async function enrichUsers(
  supabase: ReturnType<typeof createClient>,
  rows: UserRow[]
): Promise<EnrichedUser[]> {
  if (!rows.length) return [];

  const emails = [
    ...new Set(
      rows
        .map((r) => (r.email ?? "").trim().toLowerCase())
        .filter(Boolean)
    ),
  ];

  if (!emails.length) {
    return rows.map((r) => ({ ...r, avatar_url: null, plans: [] }));
  }

  const profs: { id: unknown; email: unknown; avatar_url: unknown }[] = [];
  const chunkSize = 35;
  for (let i = 0; i < emails.length; i += chunkSize) {
    const chunk = emails.slice(i, i + chunkSize);
    const { data, error: profErr } = await supabase
      .from("profiles")
      .select("id, email, avatar_url")
      .or(profilesEmailOrFilter(chunk));
    if (profErr) console.error("enrichUsers profiles:", profErr.message);
    profs.push(...(data ?? []));
  }

  const emailToProfile = new Map<
    string,
    { id: string; avatar_url: string | null }
  >();
  for (const p of profs ?? []) {
    const em = (p.email as string | null)?.trim().toLowerCase();
    if (em) {
      emailToProfile.set(em, {
        id: normUuid(String(p.id)),
        avatar_url: (p.avatar_url as string | null) ?? null,
      });
    }
  }

  const uuids = [...new Set([...emailToProfile.values()].map((v) => v.id))];
  const packages: { user_id: string; package_id: number }[] = [];

  if (uuids.length) {
    const { data: upRows, error: upErr } = await supabase
      .from("user_packages")
      .select("user_id, package_id")
      .in("user_id", uuids);
    if (upErr) console.error("enrichUsers user_packages:", upErr.message);
    for (const row of upRows ?? []) {
      packages.push({
        user_id: normUuid(String((row as { user_id: string }).user_id)),
        package_id: Number((row as { package_id: number }).package_id),
      });
    }
  }

  const planIds = [...new Set(packages.map((p) => p.package_id))];
  const planTitleMap = new Map<number, string>();
  if (planIds.length) {
    const { data: planRows, error: planErr } = await supabase
      .from("plan")
      .select("plan_id, title")
      .in("plan_id", planIds);
    if (planErr) console.error("enrichUsers plan:", planErr.message);
    for (const pl of planRows ?? []) {
      planTitleMap.set(
        Number((pl as { plan_id: number }).plan_id),
        String((pl as { title: string }).title)
      );
    }
  }

  const uuidToPlans = new Map<string, { plan_id: number; title: string }[]>();
  for (const pkg of packages) {
    const title = planTitleMap.get(pkg.package_id) ?? "Unknown plan";
    const list = uuidToPlans.get(pkg.user_id) ?? [];
    list.push({ plan_id: pkg.package_id, title });
    uuidToPlans.set(pkg.user_id, list);
  }

  return rows.map((r) => {
    const em = (r.email ?? "").trim().toLowerCase();
    const prof = em ? emailToProfile.get(em) : undefined;
    const avatar_url = prof?.avatar_url ?? null;
    const plans = prof ? uuidToPlans.get(normUuid(prof.id)) ?? [] : [];
    return { ...r, avatar_url, plans };
  });
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
    const enriched = await enrichUsers(supabase, pendingOnly as UserRow[]);
    return new Response(JSON.stringify(enriched), {
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
    const enriched = await enrichUsers(supabase, (data ?? []) as UserRow[]);
    return new Response(JSON.stringify(enriched), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  // POST with list === "denied" → users with a deny audit entry (still in public.user)
  const listDenied = async () => {
    const { data: deniedRows, error: auditErr } = await supabase
      .from("audit_log")
      .select("target_user_id")
      .eq("action", "deny");
    if (auditErr) {
      return new Response(JSON.stringify({ error: auditErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const deniedIds = [
      ...new Set(
        (deniedRows ?? []).map((r) => Number((r as { target_user_id: number }).target_user_id))
      ),
    ].filter((id) => Number.isFinite(id));
    if (!deniedIds.length) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data, error } = await supabase
      .from("user")
      .select("user_id, email, fname, lname, status")
      .in("user_id", deniedIds);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const enriched = await enrichUsers(supabase, (data ?? []) as UserRow[]);
    return new Response(JSON.stringify(enriched), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  const listParam =
    body.list != null ? String(body.list).trim().toLowerCase() : "";

  // POST with list === "approved" → list approved clients
  if (req.method === "POST" && listParam === "approved") return listApproved();

  // POST with list === "denied" → list denied clients (for admin UI)
  if (req.method === "POST" && listParam === "denied") return listDenied();

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

    // Best-effort dashboard activity entry (covers cases where audit_log isn't readable in API)
    try {
      const display = [existing?.fname, existing?.lname].filter(Boolean).join(" ").trim() || existing?.email || "Client";
      await supabase.from("admin_dashboard_activity").insert({
        message: `Added: Approved client account (${display})`,
      });
    } catch (_) {
      // non-blocking
    }

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

    // Best-effort dashboard activity entry
    try {
      const display = [existing?.fname, existing?.lname].filter(Boolean).join(" ").trim() || existing?.email || "Client";
      await supabase.from("admin_dashboard_activity").insert({
        message: `Denied: Registration request (${display})`,
      });
    } catch (_) {
      // non-blocking
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

    // Best-effort dashboard activity entry (audit_log may fail and deleted user can't be resolved later)
    try {
      const display = [existing?.fname, existing?.lname].filter(Boolean).join(" ").trim() || existing?.email || "Client";
      await supabase.from("admin_dashboard_activity").insert({
        message: `Deleted: Client account (${display})`,
      });
    } catch (_) {
      // non-blocking
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
