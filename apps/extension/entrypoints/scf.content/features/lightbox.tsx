import { Lightbox } from '../../../components/Lightbox';
import type { Feature } from '../../../lib/ui/feature';
import { type MountedUi, OWN_ATTRIBUTE } from '../../../lib/ui/mount';
import lightboxCss from '../styles/lightbox.scss?inline';

const COVER = 'img[alt^="submission-image-"]';
const MARK = 'data-bscf-lightbox';
const SLOT = 'lightbox-slot';
const SAVED_ATTRIBUTES = ['tabindex', 'role', 'aria-label'] as const;

export const feature: Feature = {
  pages: ['submission'],
  toggles: ['imageLightbox'],
  mount(context) {
    const { page, region, onMutation, warn } = context;
    if (page.kind !== 'submission') return;
    const title = page.page?.submission.title ?? '';

    const style = document.createElement('style');
    style.setAttribute(OWN_ATTRIBUTE, 'lightbox');
    style.textContent = lightboxCss;
    (document.head ?? document.documentElement).append(style);

    let cover: HTMLImageElement | null = null;
    let release: (() => void) | null = null;
    let slot: HTMLElement | null = null;
    let ui: MountedUi | null = null;
    let opening = false;
    let closed = false;

    const hide = (): void => {
      ui?.remove();
      ui = null;
      slot?.remove();
      slot = null;
    };

    const show = async (image: HTMLImageElement): Promise<void> => {
      const src = image.currentSrc || image.src;
      if (opening || ui || !src) return;
      opening = true;
      const host = document.createElement('div');
      host.setAttribute(OWN_ATTRIBUTE, SLOT);
      document.body.append(host);
      slot = host;
      const handle = await context.mount({
        anchor: host,
        children: (
          <Lightbox
            src={src}
            label={title ? `Cover image of ${title}` : 'Cover image'}
            caption={title || undefined}
            onClose={hide}
          />
        ),
      });
      opening = false;
      if (!handle || closed) {
        handle?.remove();
        host.remove();
        if (slot === host) slot = null;
        return;
      }
      ui = handle;
    };

    const bind = (image: HTMLImageElement): (() => void) => {
      const control = new AbortController();
      const saved = SAVED_ATTRIBUTES.map((name) => [name, image.getAttribute(name)] as const);
      image.setAttribute(MARK, '');
      image.setAttribute('tabindex', '0');
      image.setAttribute('role', 'button');
      image.setAttribute('aria-label', 'Expand cover image');
      image.addEventListener('click', () => void show(image), { signal: control.signal });
      image.addEventListener(
        'keydown',
        (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          void show(image);
        },
        { signal: control.signal },
      );
      return () => {
        control.abort();
        image.removeAttribute(MARK);
        for (const [name, value] of saved) {
          if (value === null) image.removeAttribute(name);
          else image.setAttribute(name, value);
        }
      };
    };

    const sync = (): void => {
      const next = region.querySelector<HTMLImageElement>(COVER);
      if (next === cover) return;
      release?.();
      release = null;
      cover = next;
      if (next) release = bind(next);
      else warn('cover image not found');
    };

    onMutation(sync);
    sync();

    return () => {
      closed = true;
      hide();
      release?.();
      style.remove();
    };
  },
};
