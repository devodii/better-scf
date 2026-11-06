const MAX_ITEMS = 12;
const MAX_NAME_CHARS = 40;
const SHAPE_EXAMPLE_CHARS = 260;
const MAX_SHAPES = 6;

const items = new Map<string, unknown>();

export function saveItem(name: string, value: unknown): string {
  const key =
    name
      .replace(/[^A-Za-z0-9_]/g, '_')
      .replace(/^(\d)/, '_$1')
      .slice(0, MAX_NAME_CHARS) || 'item';
  items.delete(key);
  items.set(key, value);
  while (items.size > MAX_ITEMS) {
    const oldest = items.keys().next();
    if (oldest.done) break;
    items.delete(oldest.value);
  }
  return key;
}

export function readItems(): Record<string, unknown> {
  return Object.fromEntries(items);
}

export function describeShapes(objects: readonly Record<string, unknown>[]): unknown[] {
  const groups = new Map<
    string,
    { keys: string[]; count: number; example: Record<string, unknown> }
  >();
  for (const object of objects) {
    const keys = Object.keys(object).slice(0, 12);
    const signature = keys.join(',');
    const group = groups.get(signature);
    if (group) group.count += 1;
    else groups.set(signature, { keys, count: 1, example: object });
  }
  return [...groups.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_SHAPES)
    .map(({ keys, count, example }) => ({
      count,
      keys,
      example: JSON.stringify(example).slice(0, SHAPE_EXAMPLE_CHARS),
    }));
}
