import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response("Missing or invalid authorization header", {
      status: 401,
    });
  }

 
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const path = url.pathname;

  // GET /api/admin/clients (pending users)
  if (req.method === "GET" && path.endsWith("/clients")) {
    const { data, error } = await supabase
      .from("user")
      .select("*")
      .eq("status", false);

    if (error) return new Response(error.message, { status: 400 });
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse POST JSON
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // POST /api/admin/approve
  if (req.method === "POST" && path.endsWith("/approve")) {
    const { admin_id, user_id } = body;

    if (!admin_id || !user_id)
      return new Response("Missing admin_id or user_id", { status: 400 });

    // Approve user
    const { error } = await supabase
      .from("user")
      .update({ status: true })
      .eq("user_id", user_id);

    if (error) return new Response(error.message, { status: 400 });

    await supabase.from("audit_log").insert({
      admin_id,
      target_user_id: user_id,
      action: "approve",
    });

    return new Response("User approved", { status: 200 });
  }


  // POST /api/admin/deny
if (req.method === "POST" && path.endsWith("/deny")) {
    const { admin_id, user_id } = body;
  
    if (!admin_id || !user_id)
      return new Response("Missing admin_id or user_id", { status: 400 });
  
    // Set user status to false
    const { error } = await supabase
      .from("user")
      .update({ status: false })
      .eq("user_id", user_id);
  
    if (error) return new Response(error.message, { status: 400 });
  
    await supabase.from("audit_log").insert({
      admin_id,
      target_user_id: user_id,
      action: "deny",
    });
  
    return new Response("User denied", { status: 200 });
  }

  return new Response("Not Found", { status: 404 });
}

);
