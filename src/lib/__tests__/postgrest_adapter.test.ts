// postgrest_adapter.test.ts ensures PostgREST adapter surfaces helpful error messages.
import { PostgrestAdapter } from "../adapters/postgrest-adapter";

const originalFetch = global.fetch;

const buildAdapter = () =>
  new PostgrestAdapter({
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
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          message: "relation \"missing_table\" does not exist"
        })
      )
    };

    const fetchMock = jest.fn().mockResolvedValue(mockResponse as any);
    (global as any).fetch = fetchMock;

    const adapter = buildAdapter();

    await expect(adapter.rawQuery("/missing_table", { method: "GET" })).rejects.toThrow(
      "PostgREST could not find resource 'missing_table'"
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

