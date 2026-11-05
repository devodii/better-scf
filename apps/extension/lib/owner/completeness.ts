import { NOT_APPLICABLE, type OwnerInput, type OwnerResult } from './types';

export type CompletenessStatus = 'present' | 'missing' | 'not-applicable' | 'cannot-check';

export interface CompletenessItem {
  id: 'website' | 'architecture' | 'github' | 'video' | 'onchain-metric' | 'tranche-evidence';
  label: string;
  status: CompletenessStatus;
  trancheIndex?: number;
}

export interface CompletenessCheck {
  items: CompletenessItem[];
}

const hasText = (value: string | null): boolean => value !== null && value.trim() !== '';

const EVIDENCE_LINE =
  /^[ \t>*_-]*(evidence|proof|how to verify|verification|measure of completion)\b/im;

const HEADING_PREFIX = /^[ \t>*_#-]*(?:\d{1,3}[.)][ \t]+)?/;
const WORD_CHAR = /\w/;

function trancheSegments(text: string, titles: readonly string[]): (string | null)[] {
  const wanted = titles.map((t) => t.trim().toLowerCase());
  const found: number[][] = wanted.map(() => []);
  let pos = 0;
  for (const line of text.split('\n')) {
    const rest = line.toLowerCase().replace(HEADING_PREFIX, '');
    wanted.forEach((t, i) => {
      if (t !== '' && rest.startsWith(t) && !WORD_CHAR.test(rest.charAt(t.length))) {
        found[i]?.push(pos);
      }
    });
    pos += line.length + 1;
  }
  const anchored = found.flat();
  const starts = found.map((f) => (f.length === 1 ? (f[0] ?? null) : null));
  return starts.map((start, i) => {
    if (start === null) return null;
    if (starts.slice(0, i).some((s) => s !== null && s > start)) return null;
    const end = Math.min(text.length, ...anchored.filter((p) => p > start));
    return text.slice(start, end);
  });
}

export function checkCompleteness(
  { isOwner, submission }: OwnerInput,
  bodyText: string,
): OwnerResult<CompletenessCheck> {
  if (!isOwner) return NOT_APPLICABLE;
  const { links } = submission;
  const present = (v: string | null): CompletenessStatus => (hasText(v) ? 'present' : 'missing');

  const items: CompletenessItem[] = [
    { id: 'website', label: 'Website', status: present(links.website) },
    { id: 'architecture', label: 'Architecture document', status: present(links.architecture) },
    { id: 'github', label: 'GitHub', status: present(links.github) },
    { id: 'video', label: 'Video', status: present(links.video) },
    {
      id: 'onchain-metric',
      label: 'On-chain metric',
      status:
        submission.track === 'integration' ? present(submission.onchainMetric) : 'not-applicable',
    },
  ];

  const segments = trancheSegments(
    bodyText,
    submission.tranches.map((t) => t.title),
  );
  submission.tranches.forEach((tranche, i) => {
    const segment = segments[i] ?? null;
    let status: CompletenessStatus = 'cannot-check';
    if (segment !== null) status = EVIDENCE_LINE.test(segment) ? 'present' : 'missing';
    items.push({
      id: 'tranche-evidence',
      label: `Evidence line for ${tranche.title}`,
      trancheIndex: tranche.index,
      status,
    });
  });

  return { applicable: true, items };
}
