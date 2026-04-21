//Verify user account exists before authentication
//Validate email against existing accounts.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

//CORS headers for the function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // ✅ include apikey because the mobile app should send it
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
};

//Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Signup stores the chosen password on `public.user` and creates `auth.users`.
 * If Auth is missing (approve never synced, manual DB, deleted auth row), create it
 * so mobile `signInWithPassword` succeeds. Plaintext `user.password` only (not bcrypt).
 */
async function ensureAuthUserFromPublicRow(
  supabase: ReturnType<typeof createClient>,
  userId: number,
  loginEmail: string
): Promise<void> {
  const target = loginEmail.trim().toLowerCase();
  if (!target || !Number.isFinite(userId)) return;

  let page = 1;
  const perPage = 1000;
  for (let i = 0; i < 25; i++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("check-email-exists ensureAuth listUsers:", error.message);
      return;
    }
    const users = data?.users ?? [];
    if (users.some((u: { email?: string | null }) => (u.email ?? "").trim().toLowerCase() === target)) {
      return;
    }
    if (users.length < perPage) break;
    page += 1;
  }

  const { data: row, error: pwdErr } = await supabase
    .from("user")
    .select("password")
    .eq("user_id", userId)
    .maybeSingle();

  if (pwdErr || !row) {
    console.error("check-email-exists ensureAuth password fetch:", pwdErr?.message);
    return;
  }

  const password = String((row as { password?: string }).password ?? "").trim();
  if (password.length < 8) return;
  if (/^\$2[aby]\$/.test(password)) {
    console.warn("check-email-exists: user.password looks bcrypt; skip Auth bootstrap");
    return;
  }

  const { error: cErr } = await supabase.auth.admin.createUser({
    email: target,
    password,
    email_confirm: true,
  });

  if (cErr && !/already|registered|exists|duplicate/i.test(String(cErr.message))) {
    console.error("check-email-exists ensureAuth createUser:", cErr.message);
  }
}

//Serve the function
serve(async (req) => {
  //CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  //Check if the method is POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, message: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  //Try to process the request
  try {
    const body = await req.json();
    //Get the email from the body
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    //Check if the email is required
    if (!email) {
      return new Response(
        JSON.stringify({ success: false, message: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    //Check if the email is valid
    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    //Get the Supabase URL and service key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    //Check if the Supabase URL and service key are missing
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase environment variables");
    }
    //Create the Supabase client
    const supabase = createClient(supabaseUrl, serviceKey);
    //Get the user from the database
    const { data: user, error } = await supabase
      .from("user")
      .select("user_id, status")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (error) {
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    //Check if the user exists
    if (!user) {
      return new Response(
        JSON.stringify({
          success: true,
          exists: false,
          message: "No account found with this email",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ FIX: status might be boolean OR string (approved/pending/denied)
    const statusValue: unknown = user.status;
    const isApproved =
      statusValue === true ||
      (typeof statusValue === "string" && statusValue.toLowerCase() === "approved");

    const row = user as { user_id: number };
    if (isApproved) {
      await ensureAuthUserFromPublicRow(supabase, row.user_id, email.toLowerCase());
    }

    //Return the response
    return new Response(
      JSON.stringify({
        success: true,
        exists: true,
        approved: isApproved,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    //Get the error message
    const message = err instanceof Error ? err.message : "Something went wrong";
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
