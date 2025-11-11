// main.ts configures Storybook for the hazo_connect component library workspace.
import type { StorybookConfig } from "@storybook/nextjs";

// storybook_config outlines the core Storybook settings and addon registrations.
const storybook_config: StorybookConfig = {
  stories: ["../stories/**/*.mdx", "../stories/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions"
  ],
  framework: {
    name: "@storybook/experimental-nextjs-vite",
    options: {}
  },
  docs: {
    autodocs: "tag"
  },
  staticDirs: ["../public"]
};

export default storybook_config;

