const PARAM = /:([A-Za-z][A-Za-z0-9]*)/g;

export type PathParams = Record<string, string>;

export function patternToRegex(pattern: string): RegExp {
  const source = pattern
    .split(PARAM)
    .map((part, i) =>
      i % 2 === 1 ? `(?<${part}>[A-Za-z0-9_-]+)` : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('');
  return new RegExp(`^${source}$`);
}

export function matchPath(regex: RegExp, path: string): PathParams | null {
  const match = regex.exec(path);
  return match ? { ...match.groups } : null;
}

export function fillPattern(pattern: string, params: PathParams): string | null {
  let missing = false;
  const path = pattern.replace(PARAM, (_, name: string) => {
    const value = params[name];
    if (!value) missing = true;
    return encodeURIComponent(value ?? '');
  });
  return missing ? null : path;
}
