// eslint.config.mjs defines linting rules tailored for hazo_connect development.
import nextPlugin from "eslint-config-next";

// eslint_config aggregates Next.js defaults with project-specific overrides.
export default [
  {
    ignores: ["node_modules", ".next", "dist"]
  },
  ...nextPlugin(),
  {
    rules: {
      "react/jsx-props-no-spreading": "off"
    }
  }
];

