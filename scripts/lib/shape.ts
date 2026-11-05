import { placeholderFor } from './url-pattern';

/** A response shape: keys and types only, never values. */
export type Shape = string | Shape[] | { [key: string]: Shape };

const MAX_DEPTH = 6;
const MAX_KEYS = 60;
const MAX_ARRAY_SAMPLE = 5;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function merge(shapes: Shape[]): Shape {
  const objects = shapes.filter((s): s is { [key: string]: Shape } => isRecord(s));
  if (objects.length === shapes.length && objects.length > 0) {
    const merged: { [key: string]: Shape } = {};
    for (const object of objects) {
      for (const [key, value] of Object.entries(object)) {
        if (!(key in merged)) merged[key] = value;
      }
    }
    return merged;
  }
  const types = [...new Set(shapes.map(typeName))];
  return types.length === 1 ? (shapes[0] ?? 'unknown') : types.join(' | ');
}

function typeName(shape: Shape): string {
  if (typeof shape === 'string') return shape;
  return Array.isArray(shape) ? 'array' : 'object';
}

/**
 * Describes the structure of a parsed JSON value as keys and primitive type names. Object keys
 * that are really ids (record ids, addresses, numbers) are replaced with their placeholder, so
 * the shape holds no value that identifies anything.
 */
export function describeShape(value: unknown, depth = 0): Shape {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    if (depth >= MAX_DEPTH) return ['array'];
    return [merge(value.slice(0, MAX_ARRAY_SAMPLE).map((item) => describeShape(item, depth + 1)))];
  }
  if (isRecord(value)) {
    if (depth >= MAX_DEPTH) return 'object';
    const shape: { [key: string]: Shape } = {};
    const entries = Object.entries(value);
    for (const [key, child] of entries.slice(0, MAX_KEYS)) {
      const safeKey = placeholderFor(key) ?? key;
      if (!(safeKey in shape)) shape[safeKey] = describeShape(child, depth + 1);
    }
    if (entries.length > MAX_KEYS) shape['...'] = `+${entries.length - MAX_KEYS} more keys`;
    return shape;
  }
  return typeof value;
}

/** Lists the dotted key paths in a shape whose key name matches the pattern. */
export function findKeyPaths(shape: Shape, pattern: RegExp, prefix = ''): string[] {
  if (typeof shape === 'string') return [];
  if (Array.isArray(shape)) {
    const [item] = shape;
    return item === undefined ? [] : findKeyPaths(item, pattern, `${prefix}[]`);
  }
  const found: string[] = [];
  for (const [key, child] of Object.entries(shape)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (pattern.test(key)) found.push(path);
    found.push(...findKeyPaths(child, pattern, path));
  }
  return found;
}
