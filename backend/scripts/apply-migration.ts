import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.LOCAL_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function applyMigration(migrationFile: string) {
  console.log(`\n📄 Applying migration: ${migrationFile}`);
  
  const migrationPath = path.join(__dirname, "../supabase/migrations", migrationFile);
  const sql = fs.readFileSync(migrationPath, "utf-8");

  console.log("Executing SQL...");
  const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });

  if (error) {
    // If exec_sql doesn't exist, try direct query
    console.log("Trying direct SQL execution...");
    const queries = sql.split(";").filter(q => q.trim() && !q.trim().match(/^(begin|commit)$/i));
    
    for (const query of queries) {
      if (!query.trim()) continue;
      
      const { error: queryError } = await (supabase as any).rpc("query", { 
        query_text: query.trim() + ";"
      });
      
      if (queryError) {
        console.error(`❌ Error executing query:`, queryError);
        console.error(`Query:`, query.trim().substring(0, 100));
        throw queryError;
      }
    }
  }

  console.log("✅ Migration applied successfully");
}

// Apply the specific migration
applyMigration("20260306000002_fix_created_by_admin_id_type.sql")
  .then(() => {
    console.log("\n✅ All migrations applied successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  });
