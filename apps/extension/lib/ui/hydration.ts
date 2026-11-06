const REQUEST = 'bscf-hydration-request';
const HYDRATED = 'bscf-hydrated';
const CEILING_MS = 6000;

export interface HydrationGate {
  isHydrated(): boolean;
  recheck(): void;
  stop(): void;
}

interface HydrationOptions {
  onHydrated(): void;
  onTimeout(): void;
}

export function watchHydration({ onHydrated, onTimeout }: HydrationOptions): HydrationGate {
  let hydrated = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const settle = (): void => {
    if (hydrated) return;
    hydrated = true;
    clearTimeout(timer);
    onHydrated();
  };

  const arm = (): void => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (hydrated) return;
      onTimeout();
      settle();
    }, CEILING_MS);
  };

  document.addEventListener(HYDRATED, settle);
  arm();

  return {
    isHydrated: () => hydrated,
    recheck() {
      hydrated = false;
      arm();
      document.dispatchEvent(new Event(REQUEST));
    },
    stop() {
      clearTimeout(timer);
      document.removeEventListener(HYDRATED, settle);
    },
  };
}
