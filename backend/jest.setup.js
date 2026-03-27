const dotenv = require("dotenv");
dotenv.config({ path: ".env.test" });

// requireSuperAdmin (and similar) read env at import time; tests that import routes
// before setting env would otherwise fail if .env / .env.test omits these.
if (process.env.NODE_ENV === "test") {
  process.env.SUPABASE_URL =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.LOCAL_SUPABASE_URL ||
    "http://127.0.0.1:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY ||
    "test-service-role-key";
}

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});