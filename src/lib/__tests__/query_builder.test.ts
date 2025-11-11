// query_builder.test.ts validates QueryBuilder behaviors for select and join configuration.
import { QueryBuilder } from "../query-builder";
import { test_join_condition, test_join_table, test_table_name } from "../../../tests/config/query_settings";

describe("QueryBuilder", () => {
  it("persists the configured table and selection values", () => {
    const tableName = test_table_name || "example_table";
    const builder = new QueryBuilder()
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
    const tableName = test_table_name || "example_table";
    const joinTable = test_join_table || "related_items";
    const joinCondition =
      test_join_condition || `${joinTable}.parent_id=${tableName}.id`;

    const builder = new QueryBuilder()
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

