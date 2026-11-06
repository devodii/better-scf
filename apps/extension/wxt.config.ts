import { readFileSync } from "node:fs";
import { defineConfig } from "wxt";
import { EXTENSION_PUBLIC_KEY } from "../../packages/shared/src/extension-key";
import { SERVER_URLS } from "../../packages/shared/src/server-urls";

interface RootPackage {
  version: string;
}

const rootPackage = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as RootPackage;

function serverUrl(mode: string): string {
  return SERVER_URLS[mode === "development" ? "development" : "production"];
}

function serverHostPermission(url: string): string[] {
  const { protocol, hostname } = new URL(url);
  return [`${protocol}//${hostname}/*`];
}

export default defineConfig({
  outDir: "output",
  modules: ["@wxt-dev/module-react"],
  imports: { dirs: ["!components/**/*.stories.tsx"] },
  vite: ({ mode }) => ({
    define: {
      "import.meta.env.WXT_SERVER_URL": JSON.stringify(serverUrl(mode)),
    },
  }),
  manifest: ({ mode }) => ({
    name: "better-scf",
    version: rootPackage.version,
    description:
      "Smarter tools for communityfund.stellar.org: badges, filters, private notes and an AI assistant.",
    key: EXTENSION_PUBLIC_KEY,
    minimum_chrome_version: "111",
    permissions: ["storage", "scripting"],
    host_permissions: [
      "https://communityfund.stellar.org/*",
      ...serverHostPermission(serverUrl(mode)),
    ],
  }),
});
