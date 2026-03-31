/**
 * ATH-426 integration — requires local Supabase (migrations applied) + auth API.
 *
 * Not run by `npm test` (see jest.config.js). From backend/:
 *   npm run test:integration:ath426
 *
 * Requires Postgres at DATABASE_URL (defaults to local Supabase :54322) and Supabase API
 * (SUPABASE_URL + anon key). Start: `npx supabase start` in `supabase/`, apply migrations + seed plan_module.
 */
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env.local") });

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
process.env.SUPABASE_ANON_KEY =
  process.env.LOCAL_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

function getClients() {
  const url = process.env.SUPABASE_URL!;
  const anonKey = process.env.SUPABASE_ANON_KEY!;
  if (!anonKey) {
    throw new Error("Missing SUPABASE_ANON_KEY / LOCAL_SUPABASE_ANON_KEY");
  }
  const anon = createClient(url, anonKey);
  return { anon, url, anonKey };
}

async function signUpAndLogin(email: string, password: string) {
  const { anon, url, anonKey } = getClients();

  const { data: signUpData, error: signUpErr } = await anon.auth.signUp({ email, password });
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

async function getTwoModulePlan(pg: Client): Promise<{
  plan_id: number;
  m1: number;
  m2: number;
} | null> {
  const res = await pg.query<{
    plan_id: string;
    m1: string;
    m2: string;
  }>(
    `select plan_id::text,
            (array_agg(module_id order by order_index))[1]::text as m1,
            (array_agg(module_id order by order_index))[2]::text as m2
     from plan_module
     group by plan_id
     having count(*) >= 2
     limit 1`
  );
  const row = res.rows[0];
  if (!row?.plan_id || !row.m1 || !row.m2) return null;
  return {
    plan_id: Number(row.plan_id),
    m1: Number(row.m1),
    m2: Number(row.m2),
  };
}

async function getSingleModulePlan(pg: Client): Promise<{ plan_id: number; m1: number } | null> {
  const res = await pg.query<{ plan_id: string; m1: string }>(
    `select plan_id::text,
            (array_agg(module_id order by order_index))[1]::text as m1
     from plan_module
     group by plan_id
     having count(*) = 1
     limit 1`
  );
  const row = res.rows[0];
  if (!row?.plan_id || !row.m1) return null;
  return { plan_id: Number(row.plan_id), m1: Number(row.m1) };
}

describe("ATH-426 session unlock + completion (integration)", () => {
  it("bootstrap unlocks session 1; completing N unlocks N+1 in ~7 days; idempotent; last session safe", async () => {
    const pg = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await pg.connect();
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "";
      const hostHint = process.env.DATABASE_URL?.includes("54322")
        ? "Default port 54322 = Supabase CLI Postgres. "
        : "";
      if (code === "ECONNREFUSED") {
        throw new Error(
          `${hostHint}Cannot connect to Postgres (ECONNREFUSED). ` +
            "Start local Supabase from the `supabase` folder: `npx supabase start`, " +
            "or set DATABASE_URL in backend/.env to your project DB (direct or pooler connection string from Supabase dashboard)."
        );
      }
      throw err;
    }
    const pair = await getTwoModulePlan(pg);
    if (!pair) {
      await pg.end();
      throw new Error("Need a plan with at least 2 modules in plan_module for this test");
    }

    const email = `ath426_${Date.now()}@test.com`;
    const password = "Password123!";
    const { authed, userId } = await signUpAndLogin(email, password);

    await pg.query(
      `insert into public.user_packages (user_id, package_id, start_date)
       values ($1::uuid, $2::bigint, current_date)
       on conflict (user_id, package_id) do nothing`,
      [userId, pair.plan_id]
    );

    const { error: bootErr } = await authed.rpc("ensure_first_session_unlock");
    if (bootErr) throw bootErr;

    const unlock1 = await pg.query(
      `select unlock_date from public.user_session_unlock
       where user_id = $1::uuid and module_id = $2`,
      [userId, pair.m1]
    );
    expect(unlock1.rows.length).toBe(1);

    const { error: c1Err } = await authed.rpc("complete_user_session", { p_module_id: pair.m1 });
    if (c1Err) throw c1Err;

    const done1 = await pg.query(
      `select completed_at from public.user_session_completion
       where user_id = $1::uuid and module_id = $2`,
      [userId, pair.m1]
    );
    expect(done1.rows.length).toBe(1);

    const unlock2 = await pg.query(
      `select unlock_date from public.user_session_unlock
       where user_id = $1::uuid and module_id = $2`,
      [userId, pair.m2]
    );
    expect(unlock2.rows.length).toBe(1);
    const completedAt = new Date(done1.rows[0].completed_at as string);
    const unlock2At = new Date(unlock2.rows[0].unlock_date as string);
    const expected = new Date(completedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    expect(Math.abs(unlock2At.getTime() - expected.getTime())).toBeLessThan(2000);

    const { error: c1AgainErr } = await authed.rpc("complete_user_session", {
      p_module_id: pair.m1,
    });
    if (c1AgainErr) throw c1AgainErr;
    const done1Count = await pg.query(
      `select count(*)::int as c from public.user_session_completion
       where user_id = $1::uuid and module_id = $2`,
      [userId, pair.m1]
    );
    expect(done1Count.rows[0].c).toBe(1);

    const single = await getSingleModulePlan(pg);
    if (single) {
      const email2 = `ath426_last_${Date.now()}@test.com`;
      const { authed: authed2, userId: uid2 } = await signUpAndLogin(email2, password);
      await pg.query(
        `insert into public.user_packages (user_id, package_id, start_date)
         values ($1::uuid, $2::bigint, current_date)
         on conflict (user_id, package_id) do nothing`,
        [uid2, single.plan_id]
      );
      const { error: b2 } = await authed2.rpc("ensure_first_session_unlock");
      if (b2) throw b2;
      const { error: lastErr } = await authed2.rpc("complete_user_session", {
        p_module_id: single.m1,
      });
      if (lastErr) throw lastErr;
      const extraUnlocks = await pg.query(
        `select count(*)::int as c from public.user_session_unlock where user_id = $1::uuid`,
        [uid2]
      );
      expect(extraUnlocks.rows[0].c).toBe(1);
    }

    await pg.end();
  });
});