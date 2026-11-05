import { TrancheTable, type TrancheTableRow } from '../../../components/TrancheTable';
import { SUBMISSION_TEXT as TXT } from '../../../lib/site/selectors/submission';
import { findSubmissionSections } from '../../../lib/site/submission';
import type { Feature } from '../../../lib/ui/feature';
import { type MountedUi, OWN_ATTRIBUTE } from '../../../lib/ui/mount';
import trancheCss from '../styles/tranche-summary.scss?inline';

const SLOT = 'data-bscf-tranche';
const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const feature: Feature = {
  pages: ['submission'],
  toggles: ['trancheSummary'],
  mount({ page, region, mount, onMutation, warn }) {
    if (page.kind !== 'submission' || !page.page) return;
    const rows: TrancheTableRow[] = page.page.submission.tranches.map((tranche, index) => ({
      id: `${index}:${tranche.title}`,
      title: tranche.title,
      total: tranche.totalUsd === null ? null : USD.format(tranche.totalUsd),
    }));
    if (rows.length === 0) return;

    const style = document.createElement('style');
    style.setAttribute(OWN_ATTRIBUTE, 'tranche-summary');
    style.textContent = trancheCss;
    (document.head ?? document.documentElement).append(style);

    let slot: HTMLElement | null = null;
    let ui: MountedUi | null = null;

    const teardown = (): void => {
      ui?.remove();
      ui = null;
      slot?.remove();
      slot = null;
    };

    const sync = (): void => {
      const sections = findSubmissionSections(region);
      const target =
        sections.find((section) => TXT.requestedBudget.test(section.title)) ??
        sections.find((section) => TXT.tranche.test(section.title));
      if (!target) {
        teardown();
        warn('budget section not found');
        return;
      }
      if (slot?.isConnected && slot.previousElementSibling === target.heading) return;
      teardown();
      const own = document.createElement('div');
      own.setAttribute(OWN_ATTRIBUTE, 'tranche-slot');
      own.setAttribute(SLOT, '');
      target.heading.after(own);
      slot = own;
      mount({ anchor: own, append: 'last', children: <TrancheTable rows={rows} /> })
        .then((handle) => {
          if (!handle) return;
          if (slot === own) ui = handle;
          else handle.remove();
        })
        .catch((error: unknown) => warn('mount', error));
    };

    sync();
    onMutation(sync);

    return () => {
      teardown();
      style.remove();
    };
  },
};
