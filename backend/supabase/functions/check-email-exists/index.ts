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
