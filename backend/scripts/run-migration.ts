import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import fetch from "cross-fetch";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.LOCAL_SUPABASE_URL || "").replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env");
  process.exit(1);
}

async function runSQL(sql: string) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql_query: sql }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return await response.json();
}

async function main() {
  const migrationFile = "20260306000002_fix_created_by_admin_id_type.sql";
  const migrationPath = path.join(__dirname, "../supabase/migrations", migrationFile);
  
  console.log(`\n📄 Reading migration: ${migrationFile}`);
  const sql = fs.readFileSync(migrationPath, "utf-8");
  
  console.log(`\n🔄 Executing migration...\n`);
  
  try {
    await runSQL(sql);
    console.log("\n✅ Migration applied successfully!");
  } catch (err: any) {
    console.error("\n❌ Migration failed:");
    console.error(err.message);
    console.error("\n📋 Please apply manually via Supabase Dashboard SQL Editor");
    console.error(`   Migration file: ${migrationFile}`);
    process.exit(1);
  }
}

main();
