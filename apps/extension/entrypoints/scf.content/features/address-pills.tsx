import dayjs from 'dayjs';
import type { HorizonSummary } from 'shared';
import { type AddressKind, AddressPill } from '../../../components/AddressPill';
import type { AddressSummaryRow, AddressSummaryState } from '../../../components/AddressSummary';
import type { SiteStore } from '../../../lib/site/store';
import { findSubmissionSections } from '../../../lib/site/submission';
import { isValidAccountId, isValidContractId } from '../../../lib/stellar/detect';
import { daysSince, fetchHorizonSummary } from '../../../lib/stellar/horizon';
import type { Feature } from '../../../lib/ui/feature';
import { type MountedUi, OWN_ATTRIBUTE } from '../../../lib/ui/mount';
import pillsCss from '../styles/address-pills.scss?inline';

const SLOT = 'address-pills-slot';
const EXPLORER = 'https://stellar.expert/explorer/public';
const CANDIDATE = /(?<![A-Za-z0-9])[GC][A-Z2-7]{55}(?![A-Za-z0-9])/g;
const ADDRESS_LENGTH = 56;
const SKIP =
  'a,code,pre,kbd,samp,input,textarea,select,button,script,style,[contenteditable],[data-bscf]';

interface Restore {
  node: Text;
  data: string;
  created: Node[];
}

const kindOf = (address: string): AddressKind => (address.startsWith('G') ? 'account' : 'contract');

function rowsOf(summary: HorizonSummary): AddressSummaryRow[] {
  const rows: AddressSummaryRow[] = [];
  const created = summary.createdAt ? dayjs(summary.createdAt) : null;
  if (created?.isValid()) rows.push({ label: 'Created', value: created.format('MMM D, YYYY') });
  if (summary.lastModifiedLedger !== null) {
    rows.push({
      label: 'Last modified ledger',
      value: summary.lastModifiedLedger.toLocaleString('en-US'),
    });
  }
  const balance = summary.xlmBalance === null ? Number.NaN : Number(summary.xlmBalance);
  if (Number.isFinite(balance)) {
    rows.push({
      label: 'XLM balance',
      value: `${balance.toLocaleString('en-US', { maximumFractionDigits: 2 })} XLM`,
    });
  }
  if (summary.trustlines !== null) {
    rows.push({ label: 'Trustlines', value: String(summary.trustlines) });
  }
  const days = daysSince(summary.lastActiveAt, Date.now());
  if (days !== null) {
    rows.push({
      label: 'Active',
      value: days === 0 ? 'today' : `${days} ${days === 1 ? 'day' : 'days'} ago`,
    });
  }
  return rows;
}

async function loadSummary(
  store: SiteStore,
  address: string,
  warn: (scope: string, error?: unknown) => void,
): Promise<HorizonSummary | null> {
  const cached = await store.rpc.getHorizon(address).catch(() => null);
  if (cached && !cached.stale) return cached.value;
  const fresh = await fetchHorizonSummary(address, fetch);
  if (!fresh) return cached?.value ?? null;
  store.rpc.putHorizon(fresh).catch((error: unknown) => warn('cache summary', error));
  return fresh;
}

export const feature: Feature = {
  pages: ['submission'],
  toggles: ['addressPills'],
  mount({ region, store, signal, mount, onMutation, warn }) {
    const handled = new WeakSet<Text>();
    const restores: Restore[] = [];
    const uis = new Map<string, Set<MountedUi>>();
    const states = new Map<string, AddressSummaryState>();

    const style = document.createElement('style');
    style.setAttribute(OWN_ATTRIBUTE, 'address-pills');
    style.textContent = pillsCss;
    (document.head ?? document.documentElement).append(style);

    const view = (address: string) => {
      const kind = kindOf(address);
      return (
        <AddressPill
          address={address}
          kind={kind}
          href={`${EXPLORER}/${kind}/${address}`}
          summary={states.get(address) ?? { status: 'loading' }}
          onPreview={() => preview(address)}
        />
      );
    };

    const setState = (address: string, state: AddressSummaryState): void => {
      states.set(address, state);
      for (const ui of uis.get(address) ?? []) ui.render(view(address));
    };

    function preview(address: string): void {
      const current = states.get(address)?.status;
      if (current === 'loading' || current === 'success') return;
      setState(address, { status: 'loading' });
      loadSummary(store, address, warn).then(
        (summary) => {
          if (signal.aborted) return;
          const rows = summary ? rowsOf(summary) : [];
          setState(
            address,
            rows.length > 0 ? { status: 'success', rows } : { status: 'unavailable' },
          );
        },
        (error: unknown) => {
          warn('load summary', error);
          if (!signal.aborted) setState(address, { status: 'unavailable' });
        },
      );
    }

    const place = async (slot: HTMLElement, text: Text, address: string): Promise<void> => {
      const ui = await mount({ anchor: slot, children: view(address) });
      if (!ui) return;
      text.remove();
      const set = uis.get(address);
      if (set) set.add(ui);
      else uis.set(address, new Set([ui]));
    };

    const pillNode = (node: Text): void => {
      const matches = [...node.data.matchAll(CANDIDATE)].filter((match) =>
        match[0].startsWith('G') ? isValidAccountId(match[0]) : isValidContractId(match[0]),
      );
      if (matches.length === 0) return;
      handled.add(node);
      const restore: Restore = { node, data: node.data, created: [] };
      restores.push(restore);
      let current = node;
      let consumed = 0;
      for (const match of matches) {
        const address = match[0];
        const text = current.splitText(match.index - consumed);
        const rest = text.splitText(ADDRESS_LENGTH);
        handled.add(text);
        handled.add(rest);
        const slot = document.createElement('span');
        slot.setAttribute(OWN_ATTRIBUTE, SLOT);
        text.after(slot);
        restore.created.push(text, slot, rest);
        consumed = match.index + ADDRESS_LENGTH;
        current = rest;
        void place(slot, text, address);
      }
    };

    const sync = (): void => {
      const sections = findSubmissionSections(region);
      if (sections.length === 0) {
        warn('section body not found');
        return;
      }
      const nodes: Text[] = [];
      for (const { body } of sections) {
        const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
        for (let next = walker.nextNode(); next; next = walker.nextNode()) {
          if (
            next instanceof Text &&
            next.data.length >= ADDRESS_LENGTH &&
            !handled.has(next) &&
            !next.parentElement?.closest(SKIP)
          ) {
            nodes.push(next);
          }
        }
      }
      for (const node of nodes) pillNode(node);
    };

    sync();
    onMutation(sync);

    return () => {
      for (const set of uis.values()) for (const ui of set) ui.remove();
      for (const { node, data, created } of restores) {
        for (const item of created) item.parentNode?.removeChild(item);
        node.data = data;
      }
      style.remove();
    };
  },
};
