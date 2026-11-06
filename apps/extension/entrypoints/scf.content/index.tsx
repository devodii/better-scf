import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { DEFAULT_SETTINGS, type Settings, settingsItem } from '../../lib/settings';
import { setRoundDebug } from '../../lib/site/round';
import { pageKey, watchRoutes } from '../../lib/site/route-watcher';
import { parseRoute, type Route } from '../../lib/site/routes';
import { createSiteStore, type SiteStore } from '../../lib/site/store';
import type { FeatureCleanup, FeatureContext } from '../../lib/ui/feature';
import {
  type MountedUi,
  mountShadowUi,
  OWN_ATTRIBUTE,
  preloadStyles,
  releaseStyles,
} from '../../lib/ui/mount';
import { featuresFor } from '../../lib/ui/registry';

const READY_TIMEOUT_MS = 30_000;

type Warn = (scope: string, error?: unknown) => void;

interface Session {
  readonly region: Element;
  notify(): void;
  stop(): void;
}

interface SessionInput {
  route: Route;
  region: Element;
  settings: Settings;
  store: SiteStore;
  warn: Warn;
}

function startSession({ route, region, settings, store, warn }: SessionInput): Session {
  const controller = new AbortController();
  const { signal } = controller;
  const listeners = new Set<() => void>();
  const cleanups: FeatureCleanup[] = [];
  const mounted = new Set<MountedUi>();

  const run = async (): Promise<void> => {
    const page = await store.load(route, region, settings.debugLogging);
    if (signal.aborted) return;
    if (page.kind === 'submission') {
      if (page.page) store.save(page.page).catch((error: unknown) => warn('store: save', error));
      else warn('submission: page not parsed');
    }
    for (const { name, feature } of featuresFor(route.kind, settings)) {
      const fail = (scope: string, error?: unknown): void => warn(`${name}: ${scope}`, error);
      const context: FeatureContext = {
        name,
        page,
        settings,
        store,
        region,
        signal,
        async mount({ name: part, ...options }) {
          if (signal.aborted) return null;
          try {
            const ui = await mountShadowUi({
              ...options,
              name: part ? `${name}-${part}` : name,
            });
            if (signal.aborted) {
              ui.remove();
              return null;
            }
            const handle: MountedUi = {
              host: ui.host,
              shadow: ui.shadow,
              render: ui.render,
              remove() {
                mounted.delete(handle);
                ui.remove();
              },
            };
            mounted.add(handle);
            return handle;
          } catch (error) {
            fail('mount', error);
            return null;
          }
        },
        onMutation(listener) {
          if (!signal.aborted) listeners.add(listener);
        },
        warn: fail,
      };
      Promise.resolve()
        .then(() => feature.mount(context))
        .then(
          (cleanup) => {
            if (typeof cleanup !== 'function') return;
            if (signal.aborted) cleanup();
            else cleanups.push(cleanup);
          },
          (error: unknown) => fail('failed', error),
        )
        .catch((error: unknown) => fail('cleanup', error));
    }
  };

  run().catch((error: unknown) => warn(`${route.kind}: load`, error));

  return {
    region,
    notify() {
      for (const listener of listeners) {
        try {
          listener();
        } catch (error) {
          warn('mutation listener', error);
        }
      }
    },
    stop() {
      controller.abort();
      listeners.clear();
      for (const cleanup of cleanups.splice(0)) {
        try {
          cleanup();
        } catch (error) {
          warn('cleanup', error);
        }
      }
      for (const ui of [...mounted]) ui.remove();
    },
  };
}

function sameSettings(a: Settings, b: Settings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function start(ctx: ContentScriptContext): void {
  preloadStyles();
  let settings = DEFAULT_SETTINGS;

  const warned = new Set<string>();
  const warn: Warn = (scope, error) => {
    if (!settings.debugLogging || warned.has(scope)) return;
    warned.add(scope);
    if (error === undefined) console.warn(`[better-scf] ${scope}`);
    else console.warn(`[better-scf] ${scope}`, error);
  };

  let route = parseRoute(location.href);
  const store = createSiteStore(route);
  let session: Session | null = null;
  let waiting = false;
  let stale = false;
  let waitTimer: ReturnType<typeof setTimeout> | undefined;

  const attempt = (): void => {
    if (session || !waiting || stale) return;
    const region = watcher.region();
    if (!region || !store.isReady(route, region)) return;
    waiting = false;
    clearTimeout(waitTimer);
    session = startSession({ route, region, settings, store, warn });
  };

  const restart = (): void => {
    session?.stop();
    session = null;
    waiting = true;
    clearTimeout(waitTimer);
    waitTimer = setTimeout(() => {
      if (!waiting) return;
      waiting = false;
      warn(`${route.kind}: page not ready`);
    }, READY_TIMEOUT_MS);
    attempt();
  };

  const watcher = watchRoutes({
    onRoute() {
      const next = parseRoute(location.href);
      if (pageKey(next) === pageKey(route)) return;
      route = next;
      stale = true;
      restart();
    },
    onMutation(replaced) {
      if (replaced) stale = false;
      if (!session) attempt();
      else if (session.region !== watcher.region()) restart();
      else session.notify();
    },
  });

  const applySettings = (next: Settings): void => {
    if (ctx.isInvalid || sameSettings(next, settings)) return;
    settings = next;
    setRoundDebug(next.debugLogging);
    restart();
  };

  let changed = false;
  settingsItem.get().then(
    (next) => {
      if (!changed) applySettings(next);
    },
    () => {},
  );
  const unsubscribe = settingsItem.subscribe((next) => {
    changed = true;
    applySettings(next);
  });

  document.addEventListener('readystatechange', attempt);
  document.documentElement.setAttribute(OWN_ATTRIBUTE, 'ready');
  ctx.onInvalidated(() => {
    session?.stop();
    session = null;
    waiting = false;
    clearTimeout(waitTimer);
    document.removeEventListener('readystatechange', attempt);
    watcher.stop();
    unsubscribe();
    releaseStyles();
    document.documentElement.removeAttribute(OWN_ATTRIBUTE);
  });

  restart();
}

export default defineContentScript({
  matches: ['https://communityfund.stellar.org/*'],
  runAt: 'document_start',
  cssInjectionMode: 'ui',
  main(ctx) {
    start(ctx);
  },
});
