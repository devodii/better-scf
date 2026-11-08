export interface ReleaseGroup {
  title: string;
  items: string[];
}

export interface Release {
  version: string;
  date: string | null;
  groups: ReleaseGroup[];
}

const GROUP_TITLES: Record<string, string> = {
  "Major Changes": "Big changes",
  "Minor Changes": "New",
  "Patch Changes": "Improvements and fixes",
  "Initial release": "What you get",
};

export function parseChangelog(raw: string): Release[] {
  const releases: Release[] = [];
  let group: ReleaseGroup | null = null;
  for (const line of raw.split("\n")) {
    const heading = /^## (\S+)(?: - (\d{4}-\d{2}-\d{2}))?/.exec(line);
    const version = heading?.[1];
    if (version) {
      releases.push({ version, date: heading?.[2] ?? null, groups: [] });
      group = null;
      continue;
    }
    const title = /^### (.+)/.exec(line)?.[1];
    const release = releases.at(-1);
    if (title && release) {
      group = { title: GROUP_TITLES[title] ?? title, items: [] };
      release.groups.push(group);
      continue;
    }
    const item = /^- (?:[0-9a-f]{7}: )?(.+)/.exec(line)?.[1];
    if (item && group && !/^[\w.-]+@\d/.test(item)) group.items.push(item);
  }
  return releases.filter((release) =>
    release.groups.some((entry) => entry.items.length > 0),
  );
}
