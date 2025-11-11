"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// factory.test.ts verifies the createHazoConnect factory behavior across configuration inputs.
const factory_1 = require("../factory");
const postgrest_adapter_1 = require("../adapters/postgrest-adapter");
describe("createHazoConnect", () => {
    it("returns a PostgrestAdapter when using a config provider", async () => {
        const base_url = process.env.POSTGREST_URL;
        const config_provider = {
            get: (section, key) => {
                if (section === "postgrest" && key === "base_url") {
                    return base_url;
                }
                return undefined;
            },
            getSection: (section) => {
                if (section === "postgrest") {
                    return { base_url };
                }
                return undefined;
            }
        };
        const adapter = (0, factory_1.createHazoConnect)({
            type: "postgrest",
            configProvider: config_provider
        });
        expect(adapter).toBeInstanceOf(postgrest_adapter_1.PostgrestAdapter);
        const adapter_config = await adapter.getConfig();
        expect(adapter_config.base_url).toBe(base_url);
        expect(adapter_config.api_key).toBe(process.env.POSTGREST_API_KEY);
    });
    it("merges direct config with environment API key", async () => {
        const base_url = process.env.POSTGREST_URL;
        const adapter = (0, factory_1.createHazoConnect)({
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
//# sourceMappingURL=factory.test.js.map