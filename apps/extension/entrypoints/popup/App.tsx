import { useCallback, useEffect, useRef, useState } from "react";
import { SERVER_URLS } from "shared";
import { browser } from "wxt/browser";
import { FeatureToggle } from "@/components/FeatureToggle";
import { type FeatureKey, type Settings, settingsItem } from "@/lib/settings";
import styles from "./App.module.scss";
import type { ExportFormat, RoundOption } from "./exportData";

const PRIVACY_URL =
  "https://github.com/devodii/better-scf/blob/main/docs/privacy.md";
const FEEDBACK_URL = "https://forms.gle/7kSGNQQVGbaiaKq9A";
const LONG_PRESS_MS = 700;

const GROUPS: readonly {
  label: string;
  description: string;
  keys: readonly FeatureKey[];
}[] = [
  {
    label: "Card badges and team",
    description:
      "Adds small labels to each proposal card: its track (Open, Integration or RFP), whether it won funding, how many comments it has, and who is on the team.",
    keys: ["trackChips", "awardedChip", "commentsChip", "avatarStack"],
  },
  {
    label: "Load tracks and teams",
    description:
      "To show tracks and teams on cards, the extension quietly opens each proposal in the background using your own login. Turn this off if you would rather it did not open pages for you. Cards then show less.",
    keys: ["loadProposalPages"],
  },
  {
    label: "Review tools",
    description:
      "Mark proposals as read, shortlist the ones you like and note whether you support them. Comes with a review bar and keyboard shortcuts. Everything stays on your device.",
    keys: [
      "readState",
      "shortlistAndStance",
      "reviewerBar",
      "keyboardShortcuts",
    ],
  },
  {
    label: "Search and filters",
    description:
      "Search the proposals in a round, then filter or sort them by track, status, budget or your own marks.",
    keys: ["gridTools"],
  },
  {
    label: "Proposal pages",
    description:
      "Makes a single proposal easier to read: a contents list, a tranche summary, tidy wallet addresses, team photos, click-to-enlarge images and a share button.",
    keys: [
      "tableOfContents",
      "trancheSummary",
      "addressPills",
      "teamAvatars",
      "imageLightbox",
      "shareButton",
      "coverNormalization",
      "hoverZoom",
    ],
  },
  {
    label: "Round page header",
    description:
      "Shows the round's key dates and numbers at the top of a round page.",
    keys: ["roundHeader"],
  },
  {
    label: "Return to where you left off",
    description:
      "When you go back to a list, it takes you to the exact spot you left, including the proposal you were on.",
    keys: ["navigationMemory"],
  },
  {
    label: "AI assistant",
    description:
      "A chat for asking questions about rounds and proposals. When you ask, your question and the text of the page you are on are sent to our server to get an answer. Turn it off to remove the chat.",
    keys: ["aiDock"],
  },
];

type Status = { text: string; error: boolean } | null;

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [rounds, setRounds] = useState<RoundOption[] | null>(null);
  const [roundId, setRoundId] = useState("");
  const [showServer, setShowServer] = useState(false);
  const [serverDraft, setServerDraft] = useState("");
  const pressTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    void settingsItem.get().then((value) => {
      setSettings(value);
      setServerDraft(value.serverUrlOverride);
    });
  }, []);

  const change = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((current) =>
        current ? { ...current, [key]: value } : current,
      );
      void settingsItem.update((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const setGroup = (keys: readonly FeatureKey[], value: boolean): void => {
    setSettings((current) =>
      current
        ? { ...current, ...Object.fromEntries(keys.map((key) => [key, value])) }
        : current,
    );
    void settingsItem.update((current) => ({
      ...current,
      ...Object.fromEntries(keys.map((key) => [key, value])),
    }));
  };

  const report = (text: string, error = false): void =>
    setStatus({ text, error });

  const openExport = async (): Promise<void> => {
    if (rounds) return;
    try {
      const { loadRounds } = await import("./exportData");
      const list = await loadRounds();
      setRounds(list);
      setRoundId(list[0]?.id ?? "");
    } catch {
      report("Could not read saved reviews.", true);
    }
  };

  const runExport = async (
    format: ExportFormat,
    action: "copy" | "download",
  ): Promise<void> => {
    if (!settings || !roundId) return;
    try {
      const data = await import("./exportData");
      const text = await data.buildExport(
        roundId,
        format,
        settings.includeRepositoryLink,
      );
      if (action === "copy") {
        await navigator.clipboard.writeText(text);
        report("Copied to clipboard.");
      } else {
        data.download(text, roundId, format);
        report("Download started.");
      }
    } catch {
      report("Export failed.", true);
    }
  };

  const saveServer = (): void => {
    const value = serverDraft.trim();
    if (value && !isHttpUrl(value)) {
      report("Enter a valid http(s) URL.", true);
      return;
    }
    change("serverUrlOverride", value.replace(/\/+$/, ""));
    report(value ? "Server URL saved." : "Server URL override removed.");
  };

  const startPress = (): void => {
    pressTimer.current = window.setTimeout(
      () => setShowServer(true),
      LONG_PRESS_MS,
    );
  };
  const endPress = (): void => window.clearTimeout(pressTimer.current);

  if (!settings) return null;

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <img className={styles.logo} src="/icon/48.png" alt="" />
          better-scf
        </h1>
        <span
          className={styles.version}
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
        >
          v{browser.runtime.getManifest().version}
        </span>
      </header>

      <section className={styles.features} aria-label="Features">
        {GROUPS.map(({ label, description, keys }) => (
          <FeatureToggle
            key={label}
            label={label}
            description={description}
            checked={keys.some((key) => settings[key])}
            onChange={(value) => setGroup(keys, value)}
          />
        ))}
      </section>

      <section className={styles.section} aria-label="Export">
        {rounds === null ? (
          <button type="button" className={styles.button} onClick={openExport}>
            Export my review
          </button>
        ) : rounds.length === 0 ? (
          <p className={styles.muted}>
            Nothing to export yet. Browse a round first.
          </p>
        ) : (
          <>
            <select
              className={styles.select}
              aria-label="Round"
              value={roundId}
              onChange={(event) => setRoundId(event.target.value)}
            >
              {rounds.map((round) => (
                <option key={round.id} value={round.id}>
                  {round.label}
                </option>
              ))}
            </select>
            <div className={styles.row}>
              <button
                type="button"
                className={styles.button}
                onClick={() => runExport("markdown", "copy")}
              >
                Copy markdown
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={() => runExport("csv", "download")}
              >
                Download CSV
              </button>
            </div>
          </>
        )}
        {showServer && (
          <div className={styles.row}>
            <input
              className={styles.input}
              aria-label="Server URL override"
              placeholder={SERVER_URLS.production}
              value={serverDraft}
              onChange={(event) => setServerDraft(event.target.value)}
            />
            <button
              type="button"
              className={styles.button}
              onClick={saveServer}
            >
              Save
            </button>
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        <p
          className={status?.error ? styles.error : styles.muted}
          role="status"
          aria-live="polite"
        >
          {status?.text}
        </p>
        <span className={styles.links}>
          <a href={FEEDBACK_URL} target="_blank" rel="noreferrer noopener">
            Suggest a feature
          </a>
          <a href={PRIVACY_URL} target="_blank" rel="noreferrer noopener">
            Privacy
          </a>
        </span>
      </footer>
    </main>
  );
}
