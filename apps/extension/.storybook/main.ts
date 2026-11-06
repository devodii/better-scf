import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import react from "@vitejs/plugin-react";
import { mergeConfig } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../components/**/*.stories.tsx"],
  addons: ["@storybook/addon-mcp"],
  features: { componentsManifest: true },
  core: { disableTelemetry: true },
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      plugins: [react()],
      resolve: { alias: { "@/": root, "~/": root } },
    }),
};

export default config;
