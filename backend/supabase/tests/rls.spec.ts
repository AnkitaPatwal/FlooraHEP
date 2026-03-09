import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

function getClients() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY in env");
  }

  const anon = createClient(url, anonKey);

  return { anon, url, anonKey };
}

async function seedUserPackages(userAId: string, userBId: string) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("Missing DATABASE_URL in env.test");

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const planRes = await client.query(`select plan_id from public.plan limit 1;`);
  const planId = planRes.rows?.[0]?.plan_id;
  if (!planId) throw new Error("No plan found to attach user_packages");

  await client.query(
    `insert into public.user_packages (user_id, package_id)
     values ($1, $3), ($2, $3)
     on conflict do nothing;`,
    [userAId, userBId, planId]
  );

  await client.end();
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

describe("RLS policies", () => {
  test("non-admin cannot insert into module", async () => {
    const email = `user_${Date.now()}@test.com`;
    const password = "Password123!";

    const { authed } = await signUpAndLogin(email, password);

    const { error } = await authed.from("module").insert({
      title: "Should fail",
      description: "Should fail",
      session_number: 1,
    });

    expect(error).toBeTruthy();
  });

  test("user can only read their own user_packages", async () => {
    const password = "Password123!";
    const emailA = `userA_${Date.now()}@test.com`;
    const emailB = `userB_${Date.now()}@test.com`;

    const { authed: authedA, userId: userAId } = await signUpAndLogin(emailA, password);
    const { userId: userBId } = await signUpAndLogin(emailB, password);

    // Seed via SQL (bypasses RLS) so we can test RLS on SELECT.
    await seedUserPackages(userAId, userBId);

    const { data, error } = await authedA
      .from("user_packages")
      .select("user_id, package_id");

    if (error) throw error;

    expect(data?.length).toBeGreaterThan(0);
    expect(data?.every((row) => String(row.user_id) === String(userAId))).toBe(true);
  });
});