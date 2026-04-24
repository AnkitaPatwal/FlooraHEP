// supabase/functions/signup/index.ts
/// <reference path="../deno.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
};

// Validation functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPassword(password: string): boolean {
  if (typeof password !== "string" || password.length < 8) return false;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasLetter && hasNumber;
}

function isValidName(name: string): boolean {
  const t = name.trim();
  return t.length > 0 && t.length <= 50;
}

serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { firstName, lastName, email, password } = await req.json();

    if (!firstName || !lastName || !email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required fields",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedEmail = String(email).trim();
    if (!isValidEmail(trimmedEmail)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid email format. Use an address like name@example.com.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const passwordStr = String(password);
    if (!isValidPassword(passwordStr)) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "Invalid password. It must be at least 8 characters long and contain at least one letter and one number.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if email exists (ignore "no rows" errors)
    const { data: existing } = await supabase
      .from("user")
      .select("user_id")
      .eq("email", trimmedEmail.toLowerCase())
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Email already registered",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert ONLY allowed fields — NO user_id
    const { data: newUser, error: dbError } = await supabase
      .from("user")
      .insert([
        {
          email: trimmedEmail.toLowerCase(),
          password: password,
          fname: firstName,
          lname: lastName,
          status: false,  // default = pending
        },
      ])
      .select()
      .single();

    if (dbError) {
      return new Response(
        JSON.stringify({ success: false, message: dbError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase Auth user so they can sign in once approved
    const { error: authError } = await supabase.auth.admin.createUser({
      email: trimmedEmail.toLowerCase(),
      password,
      email_confirm: true,
    });

    if (authError) {
      await supabase.from("user").delete().eq("user_id", newUser.user_id);
      return new Response(
        JSON.stringify({ success: false, message: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account created! Pending admin approval.",
        data: newUser,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

