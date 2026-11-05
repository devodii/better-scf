import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'wxt';

interface RootPackage {
  version: string;
}

// WXT loads `.env` only after this file is evaluated, so read it here for the server URL.
// Variables already set in the environment (CI) win over the file.
const envFile = fileURLToPath(new URL('.env', import.meta.url));
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

// The single source of truth for the extension version is the root package.json.
const rootPackage = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as RootPackage; // JSON.parse returns unknown-shaped data; only `version` is read.

// Our own server. Public build-time value (WXT_ prefix), never a secret.
const serverUrl = new URL(process.env.WXT_SERVER_URL ?? 'http://localhost:8787');
// Match patterns carry no port, so the origin is reduced to scheme and host.
const serverHostPermission = `${serverUrl.protocol}//${serverUrl.hostname}/*`;

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'better-scf',
    version: rootPackage.version,
    description: 'A reviewer-grade UX layer on communityfund.stellar.org.',
    permissions: ['storage'],
    host_permissions: [
      'https://communityfund.stellar.org/*',
      'https://horizon.stellar.org/*',
      'https://api.github.com/*',
      'https://unavatar.io/*',
      serverHostPermission,
    ],
  },
});
