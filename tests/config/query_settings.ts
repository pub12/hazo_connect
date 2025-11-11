// query_settings.ts centralizes the query-specific defaults used in Jest tests.
// Set POSTGREST_TABLE_NAME / POSTGREST_JOIN_TABLE / POSTGREST_JOIN_CONDITION in .env.test.local for integration coverage.
export const test_table_name = process.env.POSTGREST_TABLE_NAME ?? "";
export const test_join_table = process.env.POSTGREST_JOIN_TABLE ?? "";
export const test_join_condition = process.env.POSTGREST_JOIN_CONDITION ?? "";

