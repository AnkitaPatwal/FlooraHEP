import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.33.0";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
// Edge function to handle reset password requests
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
    const parsed = (await req.json()) as { token?: string; password?: string };
    const token = typeof parsed.token === "string" ? parsed.token.trim() : "";
    const password = typeof parsed.password === "string" ? parsed.password : "";

    if (!token || !password) {
      return new Response(
        JSON.stringify({ message: "Token and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ message: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Get the Supabase URL and service key from the environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the current date and time
    const now = new Date().toISOString();
    // Fetch the reset row from the password_resets table
    const { data: resetRow, error: fetchErr } = await supabase
      .from("password_resets")
      .select("email")
      .eq("token", token)
      .gt("expires_at", now)
      .maybeSingle();

    if (fetchErr) {
      console.error("password_resets fetch error:", fetchErr);
      return new Response(
        JSON.stringify({ message: "Could not process request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If the reset row is not found, return a 400 error
    if (!resetRow) {
      return new Response(
        JSON.stringify({ message: "Invalid or expired token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Get the email from the reset row
    const email = resetRow.email;
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Update the password in the user table
    const { error: updateErr } = await supabase
      .from("user")
      .update({ password: hashedPassword })
      .eq("email", email);

    if (updateErr) {
      console.error("user update error:", updateErr);
      return new Response(
        JSON.stringify({ message: "Could not update password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Delete the reset row from the password_resets table
    const { error: deleteErr } = await supabase
      .from("password_resets")
      .delete()
      .eq("token", token);

    // If there is an error, return a 500 error
    if (deleteErr) {
      console.error("password_resets delete error:", deleteErr);
    }
    // Return a 200 response
    return new Response(
      JSON.stringify({ message: "Password has been reset successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    // If there is an error, return a 500 error
    console.error("reset-password error:", err);
    return new Response(
      JSON.stringify({ message: "Something went wrong" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
