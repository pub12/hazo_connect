"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.test_join_condition = exports.test_join_table = exports.test_table_name = void 0;
// query_settings.ts centralizes the query-specific defaults used in Jest tests.
// Set POSTGREST_TABLE_NAME / POSTGREST_JOIN_TABLE / POSTGREST_JOIN_CONDITION in .env.test.local for integration coverage.
exports.test_table_name = process.env.POSTGREST_TABLE_NAME ?? "";
exports.test_join_table = process.env.POSTGREST_JOIN_TABLE ?? "";
exports.test_join_condition = process.env.POSTGREST_JOIN_CONDITION ?? "";
//# sourceMappingURL=query_settings.js.map