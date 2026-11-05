import { useCallback, useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { Toggle } from '@/components/Toggle';
import { createRpcClient, getClientId } from '@/lib/db';
import { type FeatureKey, type Settings, settingsItem } from '@/lib/settings';
import styles from './App.module.scss';
import type { ExportFormat, RoundOption } from './exportData';

const PRIVACY_URL = 'https://github.com/devodii/better-scf/blob/main/docs/privacy.md';
const LONG_PRESS_MS = 700;

const FEATURES: readonly { key: FeatureKey; label: string }[] = [
  { key: 'navigationMemory', label: 'Remember scroll and carousel position' },
  { key: 'trackChips', label: 'Track chips on cards' },
  { key: 'awardedChip', label: 'Previously awarded chip' },
  { key: 'commentsChip', label: 'Comments chip' },
  { key: 'avatarStack', label: 'Team avatars on cards' },
  { key: 'readState', label: 'Unread dot on cards' },
  { key: 'showOpenedInsteadOfUnread', label: 'Show opened instead of unread' },
  { key: 'shortlistAndStance', label: 'Shortlist star and stance' },
  { key: 'coverNormalization', label: 'Uniform cover images' },
  { key: 'hoverZoom', label: 'Hover zoom on covers' },
  { key: 'gridTools', label: 'Grid toolbar (filter, sort, search)' },
  { key: 'keyboardShortcuts', label: 'Keyboard shortcuts' },
  { key: 'roundHeader', label: 'Round header summary' },
  { key: 'tableOfContents', label: 'Table of contents' },
  { key: 'trancheSummary', label: 'Tranche summary' },
  { key: 'addressPills', label: 'Stellar address pills' },
  { key: 'reviewerBar', label: 'Reviewer bar' },
  { key: 'teamAvatars', label: 'Team section avatars' },
  { key: 'imageLightbox', label: 'Image lightbox' },
  { key: 'ownerMode', label: 'Owner self-check' },
  { key: 'aiDock', label: 'AI dock' },
];

type Status = { text: string; error: boolean } | null;

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [rounds, setRounds] = useState<RoundOption[] | null>(null);
  const [roundId, setRoundId] = useState('');
  const [showServer, setShowServer] = useState(false);
  const [serverDraft, setServerDraft] = useState('');
  const pressTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    void settingsItem.get().then((value) => {
      setSettings(value);
      setServerDraft(value.serverUrlOverride);
    });
    void getClientId().then(setClientId);
  }, []);

  const change = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
    void settingsItem.update((current) => ({ ...current, [key]: value }));
  }, []);

  const report = (text: string, error = false): void => setStatus({ text, error });

  const clearCache = async (): Promise<void> => {
    try {
      await createRpcClient().clearCache();
      report('Cache cleared.');
    } catch {
      report('Could not clear the cache.', true);
    }
  };

  const openExport = async (): Promise<void> => {
    if (rounds) return;
    try {
      const { loadRounds } = await import('./exportData');
      const list = await loadRounds();
      setRounds(list);
      setRoundId(list[0]?.id ?? '');
    } catch {
      report('Could not read saved reviews.', true);
    }
  };

  const runExport = async (format: ExportFormat, action: 'copy' | 'download'): Promise<void> => {
    if (!settings || !roundId) return;
    try {
      const data = await import('./exportData');
      const text = await data.buildExport(roundId, format, settings.includeRepositoryLink);
      if (action === 'copy') {
        await navigator.clipboard.writeText(text);
        report('Copied to clipboard.');
      } else {
        data.download(text, roundId, format);
        report('Download started.');
      }
    } catch {
      report('Export failed.', true);
    }
  };

  const saveServer = (): void => {
    const value = serverDraft.trim();
    if (value) {
      try {
        const { protocol } = new URL(value);
        if (protocol !== 'http:' && protocol !== 'https:') throw new Error('protocol');
      } catch {
        report('Enter a valid http(s) URL.', true);
        return;
      }
    }
    change('serverUrlOverride', value.replace(/\/+$/, ''));
    report(value ? 'Server URL saved.' : 'Server URL override removed.');
  };

  const startPress = (): void => {
    pressTimer.current = window.setTimeout(() => setShowServer(true), LONG_PRESS_MS);
  };
  const endPress = (): void => window.clearTimeout(pressTimer.current);

  if (!settings) return null;

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>better-scf</h1>
        <span
          className={styles.version}
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
        >
          v{browser.runtime.getManifest().version}
        </span>
      </header>

      <section className={styles.section} aria-label="Features">
        {FEATURES.map(({ key, label }) => (
          <Toggle
            key={key}
            label={label}
            checked={settings[key]}
            onChange={(value) => change(key, value)}
          />
        ))}
      </section>

      <section className={styles.section} aria-label="Export">
        {rounds === null ? (
          <button type="button" className={styles.button} onClick={openExport}>
            Export my review
          </button>
        ) : rounds.length === 0 ? (
          <p className={styles.muted}>Nothing to export yet. Browse a round on the site first.</p>
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
                onClick={() => runExport('markdown', 'copy')}
              >
                Copy markdown
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={() => runExport('markdown', 'download')}
              >
                Download .md
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={() => runExport('csv', 'copy')}
              >
                Copy CSV
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={() => runExport('csv', 'download')}
              >
                Download .csv
              </button>
            </div>
            <Toggle
              label="Add repository link to export"
              checked={settings.includeRepositoryLink}
              onChange={(value) => change('includeRepositoryLink', value)}
            />
          </>
        )}
      </section>

      <section className={styles.section} aria-label="Advanced">
        <Toggle
          label="Debug logging"
          checked={settings.debugLogging}
          onChange={(value) => change('debugLogging', value)}
        />
        <button type="button" className={styles.button} onClick={clearCache}>
          Clear cache
        </button>
        {showServer && (
          <div className={styles.row}>
            <input
              className={styles.input}
              aria-label="Server URL override"
              placeholder="http://localhost:8787"
              value={serverDraft}
              onChange={(event) => setServerDraft(event.target.value)}
            />
            <button type="button" className={styles.button} onClick={saveServer}>
              Save
            </button>
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        <span className={styles.muted}>Client ID: {clientId}</span>
        <a href={PRIVACY_URL} target="_blank" rel="noreferrer noopener">
          Privacy
        </a>
      </footer>

      <p className={status?.error ? styles.error : styles.muted} role="status" aria-live="polite">
        {status?.text}
      </p>
    </main>
  );
}
