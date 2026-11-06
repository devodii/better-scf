import type { BuildersLoaderStatus } from '../../components/BuildersLoader';

export interface LoaderSnapshot {
  status: BuildersLoaderStatus;
  done: number;
  total: number;
  message: string | null;
}

export interface LoaderActions {
  start(): void;
  cancel(): void;
}

export interface LoaderState extends LoaderSnapshot, LoaderActions {}

let snapshot: LoaderSnapshot | null = null;
let actions: LoaderActions | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function publishLoader(next: LoaderSnapshot, handlers: LoaderActions): void {
  snapshot = next;
  actions = handlers;
  notify();
}

export function clearLoader(): void {
  snapshot = null;
  actions = null;
  notify();
}

export function readLoader(): LoaderState | null {
  return snapshot && actions ? { ...snapshot, ...actions } : null;
}

export function onLoader(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
