import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing access token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const {
    data: { user: authUser },
    error: userErr,
  } = await supabase.auth.getUser(token);

  if (userErr || !authUser) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authUserId = String(authUser.id).trim();
  const authEmail = String(authUser.email ?? "").trim().toLowerCase();

  if (!authUserId) {
    return new Response(JSON.stringify({ error: "Invalid user session" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let publicUserId: number | null = null;
  if (authEmail) {
    const { data: userRow, error: userRowErr } = await supabase
      .from("user")
      .select("user_id")
      .ilike("email", authEmail)
      .maybeSingle();

    if (userRowErr) {
      return new Response(JSON.stringify({ error: `Failed to load account: ${userRowErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userRow?.user_id != null) {
      publicUserId = Number(userRow.user_id);
    }
  }

  if (publicUserId != null && Number.isFinite(publicUserId)) {
    const { error: videoErr } = await supabase.from("video").delete().eq("uploader_user_id", publicUserId);
    if (videoErr) {
      return new Response(JSON.stringify({ error: `Failed to delete videos: ${videoErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: photoErr } = await supabase.from("photo").delete().eq("uploader_user_id", publicUserId);
    if (photoErr) {
      return new Response(JSON.stringify({ error: `Failed to delete photos: ${photoErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: userDeleteErr } = await supabase.from("user").delete().eq("user_id", publicUserId);
    if (userDeleteErr) {
      return new Response(JSON.stringify({ error: `Failed to delete user record: ${userDeleteErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const { error: profileErr } = await supabase.from("profiles").delete().eq("id", authUserId);
  if (profileErr) {
    return new Response(JSON.stringify({ error: `Failed to delete profile: ${profileErr.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: authDeleteErr } = await supabase.auth.admin.deleteUser(authUserId);
  if (authDeleteErr) {
    return new Response(JSON.stringify({ error: `Failed to delete auth user: ${authDeleteErr.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
