// setup_env.ts loads environment variables required for Jest test execution.
import path from "path";
import dotenv from "dotenv";

// load_test_env prioritizes .env.test.local and falls back to .env.local values.
const load_test_env = () => {
  const test_env_path = path.resolve(process.cwd(), ".env.test.local");
  const fallback_env_path = path.resolve(process.cwd(), ".env.local");

  const test_result = dotenv.config({ path: test_env_path });
  if (test_result.error) {
    dotenv.config({ path: fallback_env_path });
  }

  process.env.POSTGREST_API_KEY = process.env.POSTGREST_API_KEY ?? "test-api-key";
  process.env.POSTGREST_URL = process.env.POSTGREST_URL ?? "https://example.supabase.co/rest/v1";
};

load_test_env();

