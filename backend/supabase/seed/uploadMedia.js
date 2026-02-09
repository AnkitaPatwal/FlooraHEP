// uploadMedia.js (clean/professional logging)

const path = require("node:path");
const fs = require("node:fs/promises");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

// Load exactly one env file based on SUPABASE_ENV
const envName = process.env.SUPABASE_ENV === "prod" ? ".env.prod" : ".env.local";
const envPath = path.resolve(__dirname, `../../${envName}`);
dotenv.config({ path: envPath });
console.log(`Env file: ${envPath}`);

// Read envs (support local and prod names)
const supabaseUrl =
  (process.env.SUPABASE_URL || process.env.LOCAL_SUPABASE_URL || "").trim();

const supabaseServiceRole =
  (process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.LOCAL_SUPABASE_SERVICE_ROLE ||
    "").trim();

const bucketName = (process.env.SUPABASE_BUCKET || "exercise-videos").trim();

const mask = (v) => (v ? v.slice(0, 6) + "…" + v.slice(-6) : "");
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Service key: ${mask(supabaseServiceRole)}`);
console.log(`Bucket: ${bucketName}`);

if (!supabaseUrl) {
  console.error("ERROR: Missing SUPABASE_URL (prod) or LOCAL_SUPABASE_URL (local).");
  process.exit(1);
}
if (!supabaseServiceRole) {
  console.error(
    "ERROR: Missing service role key (SUPABASE_SERVICE_ROLE / _KEY or LOCAL_SUPABASE_SERVICE_ROLE)."
  );
  process.exit(1);
}

// Client
const supabase = createClient(supabaseUrl, supabaseServiceRole);

// Paths
const mediaDir = path.resolve(process.cwd(), "backend/supabase/seed/media");

// Utilities
async function ensureBucket(name) {
  console.log(`Checking storage bucket: ${name}`);
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) throw new Error(`listBuckets failed: ${listErr.message}`);

  const exists = buckets?.some((b) => b.name === name);
  if (!exists) {
    console.log(`Creating storage bucket: ${name}`);
    const { error } = await supabase.storage.createBucket(name, { public: true });
    if (error) throw new Error(`createBucket failed: ${error.message}`);
    console.log(`Bucket created: ${name}`);
  } else {
    console.log(`Bucket exists: ${name}`);
  }
}

async function* walkDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDirectory(fullPath);
    } else {
      yield fullPath;
    }
  }
}

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".webm": "video/webm",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
  };
  return types[ext] ?? "application/octet-stream";
}

async function uploadFile(filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const relativePath = path.relative(mediaDir, filePath).replace(/\\/g, "/");
    const contentType = getContentType(filePath);

    console.log(`Uploading: ${relativePath}`);
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(relativePath, fileBuffer, { upsert: true, contentType });

    if (error) {
      console.error(`Upload failed (${relativePath}): ${error.message}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Upload error (${filePath}): ${err.message}`);
    return false;
  }
}

// Main
async function main() {
  console.log("Starting media upload to Supabase Storage");
  console.log(`Media directory: ${mediaDir}`);

  try {
    await fs.access(mediaDir);
  } catch {
    console.error(`ERROR: Media directory not found: ${mediaDir}`);
    process.exit(1);
  }

  await ensureBucket(bucketName);

  let successCount = 0;
  let failCount = 0;

  for await (const filePath of walkDirectory(mediaDir)) {
    (await uploadFile(filePath)) ? successCount++ : failCount++;
  }

  console.log("--------------------------------------------------");
  console.log("Upload Summary");
  console.log("--------------------------------------------------");
  console.log(`Successful uploads: ${successCount}`);
  console.log(`Failed uploads:     ${failCount}`);
  console.log(`Bucket:             ${bucketName}`);
  console.log("--------------------------------------------------");

  if (failCount > 0) process.exitCode = 2;
}

main().catch((e) => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});
