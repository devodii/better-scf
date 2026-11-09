import { LINKS } from "shared/links";
import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { registerBackgroundFetch } from "../lib/ai/background-fetch";
import {
  createRepoProvider,
  createRpcHandlers,
  getClientId,
  registerRpcHandlers,
} from "../lib/db";

const SITE_PATTERN = "https://communityfund.stellar.org/*";

const SCRIPTS = [
  { file: "/content-scripts/scf.js", world: "ISOLATED" },
  { file: "/content-scripts/swiper-bridge.js", world: "MAIN" },
] as const;

async function injectIntoOpenTabs(): Promise<void> {
  const tabs = await browser.tabs.query({ url: SITE_PATTERN });
  for (const tab of tabs) {
    if (tab.id === undefined) continue;
    for (const { file, world } of SCRIPTS) {
      browser.scripting
        .executeScript({ target: { tabId: tab.id }, files: [file], world })
        .catch(() => {});
    }
  }
}

function originOf(value: string): string[] {
  try {
    return value === "" ? [] : [new URL(value).origin];
  } catch {
    return [];
  }
}

export default defineBackground(() => {
  registerBackgroundFetch(async () =>
    originOf(import.meta.env.WXT_SERVER_URL ?? ""),
  );
  registerRpcHandlers(
    createRpcHandlers({ getRepo: createRepoProvider(), getClientId }),
  );
  browser.storage.session
    .setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" })
    .catch(() => {});
  browser.runtime.setUninstallURL(LINKS.uninstallSurvey).catch(() => {});
  browser.runtime.onInstalled.addListener(() => void injectIntoOpenTabs());
});
