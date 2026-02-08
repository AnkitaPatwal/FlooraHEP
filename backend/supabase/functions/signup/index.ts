// supabase/functions/signup/index.ts
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
  return password && password.length >= 8;
}

function isValidName(name: string): boolean {
  return name && name.trim().length > 0 && name.trim().length <= 50;
}

serve(async (req) => {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if email exists
    const { data: existing } = await supabase
      .from("user")
      .select("user_id")
      .eq("email", email.toLowerCase())
      .single();

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
          email: email.toLowerCase(),
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

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account created! Pending admin approval.",
        data: newUser,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

