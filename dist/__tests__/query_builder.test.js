"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// query_builder.test.ts validates QueryBuilder behaviors for select and join configuration.
const query_builder_1 = require("../query-builder");
const query_settings_1 = require("../../../tests/config/query_settings");
describe("QueryBuilder", () => {
    it("persists the configured table and selection values", () => {
        const tableName = query_settings_1.test_table_name || "example_table";
        const builder = new query_builder_1.QueryBuilder()
            .from(tableName)
            .select(["id", "name"])
            .limit(25)
            .offset(5);
        expect(builder.getTable()).toBe(tableName);
        expect(builder.getSelectFields()).toEqual(["id", "name"]);
        expect(builder.getLimit()).toBe(25);
        expect(builder.getOffset()).toBe(5);
    });
    it("records join metadata using the configured values", () => {
        const tableName = query_settings_1.test_table_name || "example_table";
        const joinTable = query_settings_1.test_join_table || "related_items";
        const joinCondition = query_settings_1.test_join_condition || `${joinTable}.parent_id=${tableName}.id`;
        const builder = new query_builder_1.QueryBuilder()
            .from(tableName)
            .join(joinTable, joinCondition, "left");
        const joins = builder.getJoins();
        expect(joins).toHaveLength(1);
        expect(joins[0]).toEqual({
            table: joinTable,
            on: joinCondition,
            type: "left"
        });
    });
});
//# sourceMappingURL=query_builder.test.js.map