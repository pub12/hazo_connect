"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// postgrest_adapter.test.ts ensures PostgREST adapter surfaces helpful error messages.
const postgrest_adapter_1 = require("../adapters/postgrest-adapter");
const originalFetch = global.fetch;
const buildAdapter = () => new postgrest_adapter_1.PostgrestAdapter({
    postgrest: {
        base_url: "https://example.supabase.co/rest/v1",
        api_key: "valid-key"
    }
});
describe("PostgrestAdapter error handling", () => {
    afterEach(() => {
        global.fetch = originalFetch;
    });
    it("produces a descriptive message when the table is missing", async () => {
        const mockResponse = {
            ok: false,
            status: 404,
            statusText: "Not Found",
            text: jest.fn().mockResolvedValue(JSON.stringify({
                message: "relation \"missing_table\" does not exist"
            }))
        };
        const fetchMock = jest.fn().mockResolvedValue(mockResponse);
        global.fetch = fetchMock;
        const adapter = buildAdapter();
        await expect(adapter.rawQuery("/missing_table", { method: "GET" })).rejects.toThrow("PostgREST could not find resource 'missing_table'");
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
//# sourceMappingURL=postgrest_adapter.test.js.map