import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.33.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    console.log("forgot-password raw body:", rawBody);

    let parsed: { email?: string } = {};
    try {
      parsed = JSON.parse(rawBody);
    } catch (e) {
      console.error("JSON parse failed:", e);
      return new Response(JSON.stringify({ message: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = parsed.email;
    const trimmed = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return new Response(JSON.stringify({ message: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = toHex(tokenBytes);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // expires in 15 mins

    console.log("inserting password_resets for:", trimmed);
    const { error: insertErr } = await supabase.from("password_resets").insert({
      email: trimmed,
      token,
      expires_at: expiresAt,
    });

    if (insertErr) {
      console.error("password_resets insert error:", insertErr);
      return new Response(JSON.stringify({ message: "Could not process request" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SEND EMAIL (token embedded)
    const resetBaseUrl = Deno.env.get("FRONTEND_RESET_PASSWORD_URL");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESET_FROM_EMAIL");

    if (!resetBaseUrl) {
      console.warn("FRONTEND_RESET_PASSWORD_URL not set; cannot send reset email.");
    } else if (!resendApiKey || !fromEmail) {
      console.warn("RESEND_API_KEY or RESET_FROM_EMAIL not set; cannot send reset email.");
    } else {
      const resetUrl = `${resetBaseUrl}?token=${encodeURIComponent(token)}`;

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
    Reset your password
  </h2>

  <p style="margin: 0 0 12px 0;">
    We received a request to reset the password for your Floora account.
  </p>

  <p style="margin: 0 0 20px 0;">
    Click the button below to choose a new password. This link will expire in
    <strong>15 minutes</strong>.
  </p>

  <a
    href="${resetUrl}"
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
    Reset password
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
    <a href="${resetUrl}" style="color: #2B8C8E;">
      ${resetUrl}
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
    If you didn’t request a password reset, you can safely ignore this email.
    Your password will not change unless you use the link above.
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
          to: trimmed,
          subject: "Reset your Floora password",
          html,
        }),
      });

      if (!sendResp.ok) {
        const errText = await sendResp.text();
        console.error("Resend send email failed:", errText);
      } else {
        console.log("Reset email sent to:", trimmed);
      }
    }

    if (resetBaseUrl) {
      const redirectTo = `${resetBaseUrl}?token=${encodeURIComponent(token)}`;
      console.log("generating recovery link redirectTo:", redirectTo);

      const { data, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: trimmed,
        options: { redirectTo },
      });

      if (linkErr) {
        console.error("generateLink error:", linkErr);
      } else {
        console.log("Password recovery action_link:", data?.properties?.action_link);
      }
    }

    return new Response(
      JSON.stringify({
        message: "If an account with this email exists, a reset link has been sent.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("forgot-password error:", err);
    return new Response(JSON.stringify({ message: "Something went wrong" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
