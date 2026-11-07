const OPEN_KEY = "bscf:assistant-open";
const CONVERSATION_KEY = "bscf:conversation";
const WIDTH_KEY = "bscf:assistant-width";

export function readWidth(): number | null {
  try {
    const width = Number(localStorage.getItem(WIDTH_KEY));
    return Number.isFinite(width) && width > 0 ? width : null;
  } catch {
    return null;
  }
}

export function writeWidth(width: number | null): void {
  try {
    if (width === null) localStorage.removeItem(WIDTH_KEY);
    else localStorage.setItem(WIDTH_KEY, String(width));
  } catch {
    return;
  }
}

export function readOpen(): boolean {
  try {
    return sessionStorage.getItem(OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeOpen(isOpen: boolean): void {
  try {
    if (isOpen) sessionStorage.setItem(OPEN_KEY, "1");
    else sessionStorage.removeItem(OPEN_KEY);
  } catch {
    return;
  }
}

export function readConversation(): string | null {
  try {
    return sessionStorage.getItem(CONVERSATION_KEY);
  } catch {
    return null;
  }
}

export function writeConversation(id: string): void {
  try {
    sessionStorage.setItem(CONVERSATION_KEY, id);
  } catch {
    return;
  }
}

const TEXT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTyping(event: KeyboardEvent): boolean {
  const target = event.composedPath()[0];
  return (
    target instanceof HTMLElement &&
    (TEXT_TAGS.has(target.tagName) || target.isContentEditable)
  );
}

export function isToggleShortcut(event: KeyboardEvent): boolean {
  return (
    event.code === "KeyA" &&
    event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.isComposing &&
    !isTyping(event)
  );
}
