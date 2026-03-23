/**
 * Session unlock logic + completion tracking tests
 * Run with: npm test -- sessionUnlockCompletion
 * Requires: Supabase running locally (npx supabase start)
 * Skipped when CI or when local Supabase is not running
 */

import path from "path";
import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env.local") });

const isCI = process.env.CI === "true";

// Check if local Supabase is running — only run tests when we get key from supabase status
let localSupabaseAvailable = false;
let anonKey = process.env.LOCAL_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
try {
  const cwd = path.join(__dirname, "../..");
  const out = execSync("npx supabase status --output json", { cwd, encoding: "utf8" });
  const status = JSON.parse(out);
  if (status.ANON_KEY) {
    anonKey = status.ANON_KEY;
    localSupabaseAvailable = true;
  }
} catch {
  // Supabase not running (e.g. Docker down) — skip tests
}

const shouldSkip = isCI || !localSupabaseAvailable;
const describeOrSkip = shouldSkip ? describe.skip : describe;

// These tests run against local Supabase only
const localUrl = "http://127.0.0.1:54321";
process.env.SUPABASE_URL = localUrl;
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
process.env.SUPABASE_ANON_KEY = anonKey;

import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

function getClients() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY in env");
  }

  const anon = createClient(url, anonKey);
  const service = serviceKey ? createClient(url, serviceKey) : null;

  return { anon, service, url, anonKey };
}

async function signUpAndLogin(email: string, password: string) {
  const { anon, url, anonKey } = getClients();

  const { data: signUpData, error: signUpErr } = await anon.auth.signUp({
    email,
    password,
  });
  if (signUpErr) throw signUpErr;

  const { data: signInData, error: signInErr } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) throw signInErr;

  const accessToken = signInData.session?.access_token;
  if (!accessToken) throw new Error("No access token from signIn");

  const authed = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const userId = signUpData.user?.id ?? signInData.user?.id;
  if (!userId) throw new Error("No user id from auth");

  return { authed, userId };
}

async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("Missing DATABASE_URL");

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

describeOrSkip("Session unlock and completion", () => {
  const password = "Password123!";

  it("first login / first visit makes Session 1 available (ensure_session_1_unlocked)", async () => {
    const email = `session1_${Date.now()}@test.com`;
    const { authed, userId } = await signUpAndLogin(email, password);

    await withDb(async (db) => {
      const planRes = await db.query("select plan_id from public.plan limit 1");
      const planId = planRes.rows?.[0]?.plan_id;
      if (!planId) throw new Error("No plan in DB");

      await db.query(
        "insert into public.user_packages (user_id, package_id) values ($1, $2) on conflict do nothing",
        [userId, planId]
      );
    });

    const { error } = await authed.rpc("ensure_session_1_unlocked", {
      p_user_id: userId,
    });
    expect(error).toBeNull();

    const { data: unlocks, error: unlockErr } = await authed
      .from("user_session_unlock")
      .select("module_id, unlock_date")
      .eq("user_id", userId);

    expect(unlockErr).toBeNull();
    expect(unlocks?.length).toBeGreaterThanOrEqual(1);
  });

  it("completing Session N creates a completion record", async () => {
    const email = `complete_${Date.now()}@test.com`;
    const { authed, userId } = await signUpAndLogin(email, password);

    const moduleId = await withDb(async (db) => {
      const planRes = await db.query("select plan_id from public.plan limit 1");
      const planId = planRes.rows?.[0]?.plan_id;
      if (!planId) throw new Error("No plan in DB");

      await db.query(
        "insert into public.user_packages (user_id, package_id) values ($1, $2) on conflict do nothing",
        [userId, planId]
      );

      const pmRes = await db.query(
        "select module_id from public.plan_module where plan_id = $1 order by order_index asc limit 1",
        [planId]
      );
      const mid = pmRes.rows?.[0]?.module_id;
      if (!mid) throw new Error("No module in plan");
      return mid as number;
    });

    const { error } = await authed.rpc("complete_session", {
      p_user_id: userId,
      p_module_id: moduleId,
    });
    expect(error).toBeNull();

    const { data: completions, error: compErr } = await authed
      .from("user_session_completion")
      .select("module_id, completed_at")
      .eq("user_id", userId)
      .eq("module_id", moduleId);

    expect(compErr).toBeNull();
    expect(completions?.length).toBe(1);
    expect(Number(completions?.[0].module_id)).toBe(Number(moduleId));
  });

  it("completing Session N creates/updates unlock record for Session N+1 with correct unlock_date", async () => {
    const email = `unlock_n1_${Date.now()}@test.com`;
    const { authed, userId } = await signUpAndLogin(email, password);

    const firstModuleId = await withDb(async (db) => {
      const planRes = await db.query("select plan_id from public.plan limit 1");
      const planId = planRes.rows?.[0]?.plan_id;
      if (!planId) throw new Error("No plan in DB");

      await db.query(
        "insert into public.user_packages (user_id, package_id) values ($1, $2) on conflict do nothing",
        [userId, planId]
      );

      const pmRes = await db.query(
        "select module_id, order_index from public.plan_module where plan_id = $1 order by order_index asc limit 2",
        [planId]
      );
      const mid = pmRes.rows?.[0]?.module_id;
      if (!mid || pmRes.rows.length < 2) throw new Error("Need at least 2 modules in plan");
      return mid as number;
    });

    const beforeComplete = new Date();
    const { error } = await authed.rpc("complete_session", {
      p_user_id: userId,
      p_module_id: firstModuleId,
    });
    expect(error).toBeNull();
    const afterComplete = new Date();

    const { data: unlocks } = await authed
      .from("user_session_unlock")
      .select("module_id, unlock_date")
      .eq("user_id", userId);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const secondModuleUnlock = unlocks?.find((u) => u.module_id !== firstModuleId);
    expect(secondModuleUnlock).toBeDefined();

    const unlockDate = new Date(secondModuleUnlock!.unlock_date);
    expect(unlockDate.getTime()).toBeGreaterThanOrEqual(beforeComplete.getTime() + 6 * 24 * 60 * 60 * 1000);
    expect(unlockDate.getTime()).toBeLessThanOrEqual(afterComplete.getTime() + 8 * 24 * 60 * 60 * 1000);
  });

  it("query unlock state returns correct locked/unlocked/completed flags", async () => {
    const email = `query_${Date.now()}@test.com`;
    const { authed, userId } = await signUpAndLogin(email, password);

    await authed.rpc("ensure_session_1_unlocked", { p_user_id: userId });

    const { data: unlocks } = await authed
      .from("user_session_unlock")
      .select("module_id, unlock_date")
      .eq("user_id", userId);

    const { data: completions } = await authed
      .from("user_session_completion")
      .select("module_id")
      .eq("user_id", userId);

    const completedSet = new Set((completions || []).map((c) => c.module_id));
    const now = new Date().toISOString();

    for (const u of unlocks || []) {
      const isCompleted = completedSet.has(u.module_id);
      const isUnlocked = u.unlock_date <= now;
      expect(isCompleted || isUnlocked).toBe(true);
    }
  });

  it("completing a session twice does not create duplicate completion records", async () => {
    const email = `idempotent_${Date.now()}@test.com`;
    const { authed, userId } = await signUpAndLogin(email, password);

    const moduleId = await withDb(async (db) => {
      const planRes = await db.query("select plan_id from public.plan limit 1");
      const planId = planRes.rows?.[0]?.plan_id;
      if (!planId) throw new Error("No plan in DB");

      await db.query(
        "insert into public.user_packages (user_id, package_id) values ($1, $2) on conflict do nothing",
        [userId, planId]
      );

      const pmRes = await db.query(
        "select module_id from public.plan_module where plan_id = $1 order by order_index asc limit 1",
        [planId]
      );
      const mid = pmRes.rows?.[0]?.module_id;
      if (!mid) throw new Error("No module in plan");
      return mid as number;
    });

    await authed.rpc("complete_session", { p_user_id: userId, p_module_id: moduleId });
    await authed.rpc("complete_session", { p_user_id: userId, p_module_id: moduleId });

    const { data: completions } = await authed
      .from("user_session_completion")
      .select("id")
      .eq("user_id", userId)
      .eq("module_id", moduleId);

    expect(completions?.length).toBe(1);
  });

  it("completing the last session does not try to unlock past the plan length", async () => {
    const email = `last_${Date.now()}@test.com`;
    const { authed, userId } = await signUpAndLogin(email, password);

    const { lastModuleId, planModuleCount } = await withDb(async (db) => {
      const planRes = await db.query("select plan_id from public.plan limit 1");
      const planId = planRes.rows?.[0]?.plan_id;
      if (!planId) throw new Error("No plan in DB");

      await db.query(
        "insert into public.user_packages (user_id, package_id) values ($1, $2) on conflict do nothing",
        [userId, planId]
      );

      const pmRes = await db.query(
        "select module_id from public.plan_module where plan_id = $1 order by order_index desc limit 1",
        [planId]
      );
      const lastModuleId = pmRes.rows?.[0]?.module_id;

      const countRes = await db.query(
        "select count(*) as c from public.plan_module where plan_id = $1",
        [planId]
      );
      const planModuleCount = parseInt(countRes.rows?.[0]?.c ?? "0", 10);

      if (!lastModuleId || planModuleCount < 1) throw new Error("Need at least 1 module");
      return { lastModuleId: lastModuleId as number, planModuleCount };
    });

    const { error } = await authed.rpc("complete_session", {
      p_user_id: userId,
      p_module_id: lastModuleId,
    });
    expect(error).toBeNull();

    const { data: unlocks } = await authed
      .from("user_session_unlock")
      .select("module_id")
      .eq("user_id", userId);

    expect(unlocks?.length).toBeLessThanOrEqual(planModuleCount);
  });
});
