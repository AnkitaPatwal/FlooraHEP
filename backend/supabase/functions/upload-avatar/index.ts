// ATH-411: Profile Picture Upload — upload, replace, delete avatar
// Path format: avatars/{user_id}/{timestamp}.jpg
// Only authenticated users can manage their own avatar

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const BUCKET = "avatars";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function jsonResponse(data: object, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, message: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ success: false, message: "Unauthorized" }, 401);
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
    return jsonResponse({ success: false, message: "Invalid or expired session" }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const currentEmail = authUser.email.trim().toLowerCase();

  const { data: userRow, error: fetchErr } = await supabase
    .from("user")
    .select("user_id")
    .eq("email", currentEmail)
    .maybeSingle();

  if (fetchErr || !userRow) {
    return jsonResponse({ success: false, message: "User not found" }, 404);
  }

  const user_id = userRow.user_id;
  const contentType = req.headers.get("content-type") || "";

  // DELETE: body { action: "delete" }
  if (contentType.includes("application/json")) {
    try {
      const body = (await req.json()) as { action?: string };
      if (body.action !== "delete") {
        return jsonResponse({ success: false, message: "Invalid action" }, 400);
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user_id)
        .maybeSingle();

      if (!profileRow?.avatar_url) {
        return jsonResponse({ success: false, message: "No avatar to delete" }, 400);
      }

      // Extract object path from URL: .../avatars/{path}
      const match = profileRow.avatar_url.match(/\/avatars\/(.+)$/);
      if (match) {
        const objectPath = match[1];
        await supabase.storage.from(BUCKET).remove([objectPath]);
      }

      await supabase.from("profiles").update({ avatar_url: null }).eq("id", user_id);

      return jsonResponse({ success: true, message: "Avatar deleted", avatar_url: null }, 200);
    } catch (e) {
      console.error("delete avatar error:", e);
      return jsonResponse({ success: false, message: "Failed to delete avatar" }, 500);
    }
  }

  // UPLOAD: multipart/form-data with "file" field
  if (!contentType.includes("multipart/form-data")) {
    return jsonResponse({ success: false, message: "Send image as multipart/form-data" }, 400);
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return jsonResponse({ success: false, message: "No file provided" }, 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return jsonResponse(
        { success: false, message: "Invalid file type. Use JPEG, PNG, WebP, or GIF" },
        400
      );
    }

    if (file.size > MAX_SIZE) {
      return jsonResponse({ success: false, message: "File too large (max 5MB)" }, 400);
    }

    const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1] || "jpg";
    const objectPath = `${user_id}/${Date.now()}.${ext}`;

    // Replace: delete old avatar if exists to avoid orphaned files
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user_id)
      .maybeSingle();
    if (profileRow?.avatar_url) {
      const match = profileRow.avatar_url.match(/\/avatars\/(.+)$/);
      if (match) {
        await supabase.storage.from(BUCKET).remove([match[1]]);
      }
    }

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, file, { contentType: file.type, upsert: false });

    if (uploadErr) {
      console.error("storage upload error:", uploadErr);
      return jsonResponse({ success: false, message: "Upload failed" }, 500);
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    const avatarUrl = urlData.publicUrl;

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user_id);

    if (updateErr) {
      console.error("profiles update error:", updateErr);
      return jsonResponse({ success: false, message: "Failed to save avatar" }, 500);
    }

    return jsonResponse({ success: true, message: "Avatar updated", avatar_url: avatarUrl }, 200);
  } catch (e) {
    console.error("upload avatar error:", e);
    return jsonResponse({ success: false, message: "Upload failed" }, 500);
  }
});
