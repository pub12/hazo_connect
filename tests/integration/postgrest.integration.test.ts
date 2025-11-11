// postgrest.integration.test.ts exercises live PostgREST connectivity using environment-driven settings.
import { createHazoConnect } from "../../src/lib/factory";
import { QueryBuilder } from "../../src/lib/query-builder";
import {
  test_join_condition,
  test_join_table,
  test_table_name
} from "../config/query_settings";

const base_url = process.env.POSTGREST_URL;
const api_key = process.env.POSTGREST_API_KEY;

const placeholders = new Set([
  "https://example.supabase.co/rest/v1",
  "example-test-api-key",
  "test-api-key"
]);

const integration_enabled =
  process.env.POSTGREST_INTEGRATION === "true" &&
  base_url &&
  api_key &&
  !placeholders.has(base_url) &&
  !placeholders.has(api_key);

const describeIntegration = integration_enabled ? describe : describe.skip;

const ensure_config_present = () => {
  if (!base_url || !api_key) {
    throw new Error(
      "Integration tests require POSTGREST_URL and POSTGREST_API_KEY to be set to real values."
    );
  }
  if (!test_table_name) {
    throw new Error("Integration tests require POSTGREST_TABLE_NAME to be configured.");
  }
};

describeIntegration("PostgREST integration", () => {
  beforeAll(() => {
    ensure_config_present();
  });

  it("returns rows from the configured table", async () => {
    const adapter = createHazoConnect({
      type: "postgrest",
      postgrest: {
        base_url
      }
    });

    const builder = new QueryBuilder().from(test_table_name).select("*").limit(1);
    const results = await adapter.query(builder);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    const expectedField = process.env.POSTGREST_EXPECT_FIELD;
    if (expectedField) {
      expect(results[0]).toHaveProperty(expectedField);
    }
  });

  it("returns rows when applying join configuration", async () => {
    if (!test_join_table || !test_join_condition) {
      console.warn(
        "Skipping join integration because POSTGREST_JOIN_TABLE or POSTGREST_JOIN_CONDITION is not configured."
      );
      return;
    }

    const adapter = createHazoConnect({
      type: "postgrest",
      postgrest: {
        base_url
      }
    });

    const builder = new QueryBuilder()
      .from(test_table_name)
      .select("*")
      .join(test_join_table, test_join_condition, "left")
      .limit(1);

    const results = await adapter.query(builder);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("applies conditional filters provided via POSTGREST conditional env values", async () => {
    const conditionalField = process.env.POSTGREST_CONDITION_FIELD;
    const conditionalOperator = process.env.POSTGREST_CONDITION_OPERATOR ?? "lt";
    const conditionalValue = process.env.POSTGREST_CONDITION_VALUE;
    const joinTable = test_join_table;
    const joinCondition = test_join_condition;

    if (!conditionalField || !conditionalValue) {
      console.warn(
        "Skipping conditional filter integration because POSTGREST_CONDITION_FIELD or POSTGREST_CONDITION_VALUE is not configured."
      );
      return;
    }

    const adapter = createHazoConnect({
      type: "postgrest",
      postgrest: {
        base_url
      }
    });

    const builder = new QueryBuilder().from(test_table_name).select("*");

    // Automatically add join if the filter references another table and join details are provided.
    const conditionalTablePrefix = conditionalField.includes(".")
      ? conditionalField.split(".")[0]
      : undefined;

    if (
      conditionalTablePrefix &&
      conditionalTablePrefix !== test_table_name &&
      joinTable &&
      joinCondition
    ) {
      builder.join(joinTable, joinCondition, "left");
    }

    builder
      .where(conditionalField, conditionalOperator as any, conditionalValue)
      .limit(5);

    const results = await adapter.query(builder);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("throws when an invalid API key is used", async () => {
    const originalKey = process.env.POSTGREST_API_KEY;
    process.env.POSTGREST_API_KEY = "invalid-api-key";

    try {
      const adapter = createHazoConnect({
        type: "postgrest",
        postgrest: {
          base_url
        }
      });

      const builder = new QueryBuilder().from(test_table_name).limit(1);
      await expect(adapter.query(builder)).rejects.toThrow();
    } finally {
      process.env.POSTGREST_API_KEY = originalKey;
    }
  });

  it("surfaces join configuration for manual validation", () => {
    expect(typeof test_join_table).toBe("string");
    expect(typeof test_join_condition).toBe("string");
  });
});

if (!integration_enabled) {
  test.skip("PostgREST integration disabled", () => {});
}

