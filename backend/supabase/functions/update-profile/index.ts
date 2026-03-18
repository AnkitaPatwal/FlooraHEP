// @ts-nocheck — Deno Edge Function; use Deno extension or supabase functions serve for type-checking
// ATH-386/ATH-390: Profile info updates — name in DB, email in Supabase Auth + DB sync
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, message: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ success: false, message: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser(token);

  if (authError || !authUser?.email) {
    return new Response(
      JSON.stringify({ success: false, message: "Invalid or expired session" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const currentEmail = authUser.email.trim().toLowerCase();

  // GET — return current user profile (name, email, avatar_url) from public.user + profiles
  if (req.method === "GET") {
    const { data: userRow, error } = await supabase
      .from("user")
      .select("user_id, fname, lname, email")
      .eq("email", currentEmail)
      .maybeSingle();

    if (error) {
      console.error("get profile error:", error);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to load profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userRow) {
      return new Response(
        JSON.stringify({ success: false, message: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", authUser.id)
      .maybeSingle();

    const name = [userRow.fname, userRow.lname].filter(Boolean).join(" ").trim() || null;
    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          user_id: userRow.user_id,
          name: name ?? undefined,
          fname: userRow.fname,
          lname: userRow.lname,
          email: userRow.email,
          avatar_url: profileRow?.avatar_url ?? null,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // POST — update name and/or email
  const body = (await req.json()) as { name?: string; fname?: string; lname?: string; email?: string };
  const fullName = typeof body.name === "string" ? body.name.trim() : null;
  const fname = typeof body.fname === "string" ? body.fname.trim() : null;
  const lname = typeof body.lname === "string" ? body.lname.trim() : null;
  const newEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;

  if (!fullName && !fname && !lname && !newEmail) {
    return new Response(
      JSON.stringify({ success: false, message: "Provide name and/or email to update" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: userRow, error: fetchErr } = await supabase
    .from("user")
    .select("user_id")
    .eq("email", currentEmail)
    .maybeSingle();

  if (fetchErr || !userRow) {
    return new Response(
      JSON.stringify({ success: false, message: "User not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const user_id = userRow.user_id;

  if (newEmail !== null) {
    if (!isValidEmail(newEmail)) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (newEmail === currentEmail) {
      return new Response(
        JSON.stringify({ success: false, message: "New email is the same as current" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existing } = await supabase
      .from("user")
      .select("user_id")
      .eq("email", newEmail)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ success: false, message: "This email is already in use" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: authUpdateErr } = await supabase.auth.admin.updateUserById(authUser.id, {
      email: newEmail,
    });

    if (authUpdateErr) {
      console.error("auth update error:", authUpdateErr);
      return new Response(
        JSON.stringify({ success: false, message: authUpdateErr.message || "Failed to update email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: userUpdateErr } = await supabase
      .from("user")
      .update({ email: newEmail })
      .eq("user_id", user_id);

    if (userUpdateErr) {
      console.error("user email update error:", userUpdateErr);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to sync email to profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: profileUpdateErr } = await supabase
      .from("profiles")
      .update({ email: newEmail })
      .eq("id", authUser.id);

    if (profileUpdateErr) {
      console.error("profiles email update error:", profileUpdateErr);
      // non-fatal: auth and user are updated
    }
  }

  if (fullName !== null || fname !== null || lname !== null) {
    let newFname: string;
    let newLname: string;
    if (fname !== null && lname !== null) {
      newFname = fname;
      newLname = lname;
    } else if (fullName !== null) {
      const parts = fullName.split(/\s+/).filter(Boolean);
      newFname = parts[0] ?? "";
      newLname = parts.slice(1).join(" ") ?? "";
    } else {
      const { data: current } = await supabase
        .from("user")
        .select("fname, lname")
        .eq("user_id", user_id)
        .single();
      newFname = fname ?? current?.fname ?? "";
      newLname = lname ?? current?.lname ?? "";
    }

    if (!newFname.trim()) {
      return new Response(
        JSON.stringify({ success: false, message: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: nameUpdateErr } = await supabase
      .from("user")
      .update({ fname: newFname.trim(), lname: newLname.trim() })
      .eq("user_id", user_id);

    if (nameUpdateErr) {
      console.error("user name update error:", nameUpdateErr);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to update name" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayName = [newFname.trim(), newLname.trim()].filter(Boolean).join(" ");
    await supabase.from("profiles").update({ display_name: displayName || null }).eq("id", authUser.id);
  }

  return new Response(
    JSON.stringify({ success: true, message: "Profile updated" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
