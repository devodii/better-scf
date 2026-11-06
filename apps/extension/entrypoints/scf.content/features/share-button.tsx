import { ShareButton, type ShareStatus } from '../../../components/ShareButton';
import { SITE_ORIGIN } from '../../../lib/site/routes';
import { SUBMISSION_SELECTORS as SEL } from '../../../lib/site/selectors/submission';
import type { Feature } from '../../../lib/ui/feature';
import { type MountedUi, OWN_ATTRIBUTE } from '../../../lib/ui/mount';

const SLOT = 'share-slot';
const FEEDBACK_MS = 2500;

function findHost(region: Element, isPublic: boolean): Element | null {
  if (isPublic)
    return region.querySelector('h2')?.parentElement?.parentElement?.lastElementChild ?? null;
  const title = region.querySelector(SEL.title);
  const block = title?.parentElement?.parentElement;
  return block?.nextElementSibling ?? block ?? null;
}

export const feature: Feature = {
  pages: ['submission', 'publicSubmission'],
  toggles: ['shareButton'],
  mount({ page, region, mount, onMutation, warn }) {
    if (page.kind !== 'submission' && page.kind !== 'publicSubmission') return;
    const isPublic = page.kind === 'publicSubmission';
    const url = `${SITE_ORIGIN}/submissions/${page.submissionId}`;
    let status: ShareStatus = 'idle';
    let timer: ReturnType<typeof setTimeout> | undefined;
    let slot: HTMLElement | null = null;
    let ui: MountedUi | null = null;

    const view = () => <ShareButton status={status} onShare={() => void share()} />;

    const share = async (): Promise<void> => {
      try {
        await navigator.clipboard.writeText(url);
        status = 'copied';
      } catch (error) {
        warn('copy public link', error);
        status = 'failed';
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        status = 'idle';
        ui?.render(view());
      }, FEEDBACK_MS);
      ui?.render(view());
    };

    const teardown = (): void => {
      ui?.remove();
      ui = null;
      slot?.remove();
      slot = null;
    };

    const sync = (): void => {
      const host = findHost(region, isPublic);
      if (!host) {
        teardown();
        warn('share host not found');
        return;
      }
      if (slot?.isConnected && slot.parentElement === host) return;
      teardown();
      const own = document.createElement('div');
      own.setAttribute(OWN_ATTRIBUTE, SLOT);
      own.style.marginTop = '1.5rem';
      host.append(own);
      slot = own;
      mount({ anchor: own, append: 'last', children: view() })
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
      clearTimeout(timer);
      teardown();
    };
  },
};
