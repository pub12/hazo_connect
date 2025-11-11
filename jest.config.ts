// jest.config.ts defines the Jest test runner configuration for hazo_connect.
import type { Config } from "jest";

// jest_config centralizes TypeScript support and test directory resolution.
const jest_config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  roots: ["<rootDir>/tests", "<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^hazo_connect$": "<rootDir>/src/lib/index.ts"
  },
  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "!src/lib/**/*.d.ts"
  ],
  setupFiles: ["<rootDir>/tests/setup_env.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }]
  }
};

export default jest_config;

