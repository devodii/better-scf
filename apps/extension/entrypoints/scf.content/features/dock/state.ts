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

const TEXT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTyping(event: KeyboardEvent): boolean {
  const target = event.composedPath()[0];
  return (
    target instanceof HTMLElement && (TEXT_TAGS.has(target.tagName) || target.isContentEditable)
  );
}

export function isToggleShortcut(event: KeyboardEvent): boolean {
  return (
    event.code === 'KeyA' &&
    event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.isComposing &&
    !isTyping(event)
  );
}
