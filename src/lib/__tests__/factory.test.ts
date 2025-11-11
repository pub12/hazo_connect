// factory.test.ts verifies the createHazoConnect factory behavior across configuration inputs.
import { createHazoConnect } from "../factory";
import { PostgrestAdapter } from "../adapters/postgrest-adapter";

describe("createHazoConnect", () => {
  it("returns a PostgrestAdapter when using a config provider", async () => {
    const base_url = process.env.POSTGREST_URL as string;

    const config_provider = {
      get: (section: string, key: string) => {
        if (section === "postgrest" && key === "base_url") {
          return base_url;
        }
        return undefined;
      },
      getSection: (section: string) => {
        if (section === "postgrest") {
          return { base_url };
        }
        return undefined;
      }
    };

    const adapter = createHazoConnect({
      type: "postgrest",
      configProvider: config_provider as any
    });

    expect(adapter).toBeInstanceOf(PostgrestAdapter);
    const adapter_config = await adapter.getConfig();
    expect(adapter_config.base_url).toBe(base_url);
    expect(adapter_config.api_key).toBe(process.env.POSTGREST_API_KEY);
  });

  it("merges direct config with environment API key", async () => {
    const base_url = process.env.POSTGREST_URL as string;

    const adapter = createHazoConnect({
      type: "postgrest",
      postgrest: {
        base_url
      }
    });

    const adapter_config = await adapter.getConfig();
    expect(adapter_config.base_url).toBe(base_url);
    expect(adapter_config.api_key).toBe(process.env.POSTGREST_API_KEY);
  });
});

