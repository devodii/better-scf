import { AssistantLauncher } from '../../../../components/AssistantLauncher';
import type { Feature } from '../../../../lib/ui/feature';
import { isToggleShortcut, readOpen } from './state';

const IDLE_TIMEOUT_MS = 3000;

export const feature: Feature = {
  pages: ['roundList', 'round', 'submission', 'myProjects', 'other'],
  toggles: ['aiDock'],
  async mount(context) {
    const { warn } = context;
    const handle = await context.mount({
      anchor: document.body,
      children: <AssistantLauncher isOpen={readOpen()} onClick={() => load(true)} />,
    });
    if (!handle) return;

    let panel: (() => void) | undefined;
    let isLoading = false;
    let isRemoved = false;
    let idle = 0;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (!isToggleShortcut(event)) return;
      event.preventDefault();
      load(true);
    };

    const load = (openAfterMount: boolean): void => {
      if (isLoading) return;
      isLoading = true;
      cancelIdleCallback(idle);
      window.removeEventListener('keydown', onKeyDown);
      import('./panel').then(
        ({ mountPanel }) => {
          const cleanup = mountPanel(context, handle, openAfterMount);
          if (isRemoved) cleanup();
          else panel = cleanup;
        },
        (error: unknown) => warn('load panel', error),
      );
    };

    window.addEventListener('keydown', onKeyDown);
    if (readOpen()) load(false);
    else idle = requestIdleCallback(() => load(false), { timeout: IDLE_TIMEOUT_MS });

    return () => {
      isRemoved = true;
      cancelIdleCallback(idle);
      window.removeEventListener('keydown', onKeyDown);
      panel?.();
      handle.remove();
    };
  },
};
