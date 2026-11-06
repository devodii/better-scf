import { useEffect, useState } from "react";
import { LINKS } from "shared";
import { browser } from "wxt/browser";
import { FeatureToggle } from "@/components/FeatureToggle";
import { type FeatureKey, type Settings, settingsItem } from "@/lib/settings";
import styles from "./App.module.scss";
import type { ExportFormat, RoundOption } from "./exportData";

const GROUPS: readonly {
  label: string;
  description: string;
  keys: readonly FeatureKey[];
}[] = [
  {
    label: "Review tools",
    description:
      "Keep your place and your opinions in one spot: mark what you have read, shortlist your favourites and note who you support. Private to you.",
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
      "Find the right proposals in seconds. Search a round and narrow it down by track, status, budget or your own marks.",
    keys: ["gridTools"],
  },
  {
    label: "AI assistant",
    description:
      "Ask questions about any round or proposal and get clear answers in seconds, instead of reading everything yourself.",
    keys: ["aiDock"],
  },
  {
    label: "UX improvements",
    description:
      "Small touches that save you time: track and team badges on every proposal card, easier-to-read proposal pages, a round's key numbers up top, and going back to a list lands you exactly where you left off.",
    keys: [
      "trackChips",
      "awardedChip",
      "commentsChip",
      "avatarStack",
      "loadProposalPages",
      "tableOfContents",
      "trancheSummary",
      "addressPills",
      "teamAvatars",
      "imageLightbox",
      "shareButton",
      "coverNormalization",
      "hoverZoom",
      "roundHeader",
      "navigationMemory",
    ],
  },
];

type Status = { text: string; error: boolean } | null;

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [rounds, setRounds] = useState<RoundOption[] | null>(null);
  const [roundId, setRoundId] = useState("");

  useEffect(() => {
    void settingsItem.get().then(setSettings);
  }, []);

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

  if (!settings) return null;

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <img className={styles.logo} src="/icon/48.png" alt="" />
          better-scf
        </h1>
        <span className={styles.version}>
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
          <a href={LINKS.feedback} target="_blank" rel="noreferrer noopener">
            Suggest a feature
          </a>
          <a href={LINKS.privacy} target="_blank" rel="noreferrer noopener">
            Privacy
          </a>
        </span>
      </footer>
    </main>
  );
}
