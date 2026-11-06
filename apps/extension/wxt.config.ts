import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'wxt';

interface RootPackage {
  version: string;
}

// WXT loads `.env` only after this file is evaluated, so read it here for the server URL.
const envFile = fileURLToPath(new URL('.env', import.meta.url));
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const rootPackage = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as RootPackage;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function serverHostPermission(mode: string): string[] {
  const configured = process.env.WXT_SERVER_URL?.trim();
  if (!configured) return mode === 'development' ? ['http://localhost/*'] : [];
  const { protocol, hostname } = new URL(configured);
  if (mode !== 'development' && LOOPBACK_HOSTS.has(hostname)) {
    console.warn(
      `WXT_SERVER_URL points at ${hostname}; no server host permission in a ${mode} build.`,
    );
    return [];
  }
  // Match patterns carry no port, so the origin is reduced to scheme and host.
  return [`${protocol}//${hostname}/*`];
}

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  imports: { dirs: ['!components/**/*.stories.tsx'] },
  manifest: ({ mode }) => ({
    name: 'better-scf',
    version: rootPackage.version,
    description: 'A reviewer-grade UX layer on communityfund.stellar.org.',
    minimum_chrome_version: '111',
    permissions: ['storage', 'scripting'],
    host_permissions: ['https://communityfund.stellar.org/*', ...serverHostPermission(mode)],
  }),
});
