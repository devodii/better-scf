const OPEN_KEY = 'bscf:assistant-open';

export function readOpen(): boolean {
  try {
    return sessionStorage.getItem(OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeOpen(isOpen: boolean): void {
  try {
    if (isOpen) sessionStorage.setItem(OPEN_KEY, '1');
    else sessionStorage.removeItem(OPEN_KEY);
  } catch {
    return;
  }
}

export function isToggleShortcut(event: KeyboardEvent): boolean {
  return (
    event.code === 'KeyA' && event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey
  );
}
