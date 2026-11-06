import { EntryChoice } from '../../../components/EntryChoice';
import { readSignedInState } from '../../../lib/site/signed-in';
import type { Feature } from '../../../lib/ui/feature';
import { type MountedUi, OWN_ATTRIBUTE } from '../../../lib/ui/mount';

const SLOT = 'landing-choice-slot';
const HIDDEN = 'data-bscf-landing-hidden';
const LOGIN = /^go to dashboard$/i;
const APPLY = /^i don.t have an account$/i;

const clean = (text: string | null): string => (text ?? '').replace(/\s+/g, ' ').trim();

function findButton(region: Element, pattern: RegExp): HTMLElement | null {
  for (const button of region.querySelectorAll<HTMLElement>('button')) {
    if (pattern.test(clean(button.textContent))) return button;
  }
  return null;
}

export const feature: Feature = {
  pages: ['landing'],
  toggles: ['landingChoice'],
  mount({ region, mount, onMutation, warn }) {
    const style = document.createElement('style');
    style.setAttribute(OWN_ATTRIBUTE, 'landing-choice');
    style.textContent = `[${HIDDEN}] { display: none !important; }`;
    (document.head ?? document.documentElement).append(style);

    let slot: HTMLElement | null = null;
    let ui: MountedUi | null = null;
    let row: Element | null = null;
    let intro: Element | null = null;

    const restore = (): void => {
      row?.removeAttribute(HIDDEN);
      intro?.removeAttribute(HIDDEN);
      row = null;
      intro = null;
    };

    const teardown = (): void => {
      ui?.remove();
      ui = null;
      slot?.remove();
      slot = null;
      restore();
    };

    let session: 'signed-in' | 'signed-out' | 'unknown' | null = null;
    let closed = false;

    const sync = (): void => {
      if (session === null) return;
      const login = findButton(region, LOGIN);
      const apply = findButton(region, APPLY);
      if (!login || !apply) {
        teardown();
        return;
      }
      const buttons = login.parentElement;
      if (!buttons || buttons !== apply.parentElement) {
        warn('landing buttons not found');
        teardown();
        return;
      }
      if (slot?.isConnected && slot.nextElementSibling === buttons) return;
      teardown();
      const own = document.createElement('div');
      own.setAttribute(OWN_ATTRIBUTE, SLOT);
      buttons.before(own);
      slot = own;
      mount({
        name: 'landing-choice',
        anchor: own,
        append: 'last',
        children: (
          <EntryChoice
            signedIn={session === 'signed-in'}
            onLogin={() => login.click()}
            onApply={() => apply.click()}
          />
        ),
      })
        .then((handle) => {
          if (!handle) return;
          if (slot !== own) {
            handle.remove();
            return;
          }
          ui = handle;
          row = buttons;
          intro = buttons.previousElementSibling === own ? own.previousElementSibling : null;
          row.setAttribute(HIDDEN, '');
          if (intro?.tagName === 'P') intro.setAttribute(HIDDEN, '');
          else intro = null;
        })
        .catch((error: unknown) => warn('mount', error));
    };

    onMutation(sync);
    readSignedInState().then((state) => {
      if (closed) return;
      session = state;
      sync();
    });

    return () => {
      closed = true;
      teardown();
      style.remove();
    };
  },
};
