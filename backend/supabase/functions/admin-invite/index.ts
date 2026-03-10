import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ message: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const fromEmail = Deno.env.get("RESET_FROM_EMAIL")!;
    const inviteBaseUrl = Deno.env.get("FRONTEND_ADMIN_INVITE_URL")!;

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ message: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resendApiKey || !fromEmail) {
      return new Response(JSON.stringify({ message: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!inviteBaseUrl) {
      return new Response(JSON.stringify({ message: "Invite URL not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const raw = await req.text();
    let body: { email?: string } = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return new Response(JSON.stringify({ message: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = (body.email ?? "").trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ message: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client (DB + admin)
    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    // 1) Identify the caller from their access token
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.email) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerEmail = userData.user.email.toLowerCase();

    // 2) Enforce super admin only
    const { data: adminRow, error: adminErr } = await supabase
      .from("admin_users")
      .select("email, role, is_active")
      .eq("email", callerEmail)
      .maybeSingle();

    if (adminErr) {
      return new Response(JSON.stringify({ message: "Admin check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isSuperAdmin =
      adminRow && adminRow.is_active === true && adminRow.role === "super_admin";

    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ message: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Create invite token (24 hours)
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = toHex(tokenBytes);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: inviteInsertErr } = await supabase
      .from("admin_invites")
      .insert({
        email,
        token,
        expires_at: expiresAt,
        created_by_email: callerEmail,
      });

    if (inviteInsertErr) {
      return new Response(JSON.stringify({ message: "Could not create invite" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Send email via Resend
    const inviteUrl = `${inviteBaseUrl}?token=${encodeURIComponent(token)}`;

    const html = `
<div style="
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: #1F2937;
  background-color: #FFFFFF;
  padding: 24px;
">

  <h2 style="
    margin: 0 0 12px 0;
    font-size: 22px;
    font-weight: 700;
    color: #111827;
  ">
    You’ve been invited to Floora Admin
  </h2>

  <p style="margin: 0 0 12px 0;">
    A super admin invited you to create an admin account for Floora.
  </p>

  <p style="margin: 0 0 20px 0;">
    Click the button below to set your password and finish setting up your admin access.
    This link will expire in <strong>24 hours</strong>.
  </p>

  <a
    href="${inviteUrl}"
    style="
      display: inline-block;
      background-color: #2B8C8E;
      color: #FFFFFF;
      text-decoration: none;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 15px;
    "
  >
    Accept invite
  </a>

  <p style="
    margin: 20px 0 12px 0;
    font-size: 14px;
    color: #6B7280;
  ">
    If the button doesn’t work, copy and paste this link into your browser:
  </p>

  <p style="
    margin: 0 0 20px 0;
    font-size: 14px;
    word-break: break-all;
  ">
    <a href="${inviteUrl}" style="color: #2B8C8E;">
      ${inviteUrl}
    </a>
  </p>

  <hr style="
    border: none;
    border-top: 1px solid #E5E7EB;
    margin: 24px 0;
  " />

  <p style="
    margin: 0;
    font-size: 13px;
    color: #6B7280;
  ">
    If you weren’t expecting this invite, you can safely ignore this email.
    No account will be created unless you use the link above.
  </p>

</div>
    `.trim();

    const sendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: "You’re invited to Floora Admin",
        html,
      }),
    });

    if (!sendResp.ok) {
      const errText = await sendResp.text();
      console.error("Resend send failed:", errText);
      return new Response(JSON.stringify({ message: "Invite created but email failed to send" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-invite error:", err);
    return new Response(JSON.stringify({ message: "Something went wrong" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});