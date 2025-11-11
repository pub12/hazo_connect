// preview.ts defines Storybook-wide parameters and decorators for hazo_connect.
import type { Preview } from "@storybook/react";
import "../app/globals.css";

// preview_config harmonizes controls and backgrounds across stories.
const preview_config: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    }
  }
};

export default preview_config;

