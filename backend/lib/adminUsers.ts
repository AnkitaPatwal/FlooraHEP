import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.LOCAL_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL is not set");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export type AdminUser = {
  id: string;
  email: string;
  role: string | null;
  status: string | null;
  is_active: boolean;
  name: string | null;
};

export async function ensureAdminProfileForInvite(params: {
  email: string;
  name?: string | null;
}): Promise<AdminUser> {
  const rawEmail = params.email ?? "";
  const rawName = params.name ?? null;

  const email = rawEmail.trim().toLowerCase();
  if (!email) {
    throw new Error("email is required");
  }

  const name =
    typeof rawName === "string" && rawName.trim().length > 0
      ? rawName.trim()
      : null;

  const { data: existing, error: findError } = await supabaseAdmin
    .from("admin_users")
    .select("id, email, role, status, is_active, name")
    .ilike("email", email)
    .maybeSingle();

  if (findError && (findError as any).code !== "PGRST116") {
    throw findError;
  }

  const desiredRole = "admin";
  const desiredStatus = "approved";
  const desiredIsActive = true;

  if (existing) {
    const updatePayload: Record<string, any> = {
      role: desiredRole,
      status: desiredStatus,
      is_active: desiredIsActive,
    };

    if (name !== null) {
      updatePayload.name = name;
    }

    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .update(updatePayload)
      .eq("id", (existing as any).id)
      .select("id, email, role, status, is_active, name")
      .maybeSingle();

    if (error || !data) {
      throw error ?? new Error("Failed to update admin profile");
    }

    return data as AdminUser;
  }

  const randomPassword = `temp-${randomUUID()}`;

  const insertPayload: Record<string, any> = {
    email,
    password_hash: randomPassword,
    role: desiredRole,
    status: desiredStatus,
    is_active: desiredIsActive,
  };

  if (name !== null) {
    insertPayload.name = name;
  }

  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .insert(insertPayload)
    .select("id, email, role, status, is_active, name")
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error("Failed to create admin profile");
  }

  return data as AdminUser;
}

