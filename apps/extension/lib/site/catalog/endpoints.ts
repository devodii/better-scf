import { z } from 'zod';
import { fillPattern, matchPath, type PathParams, patternToRegex } from './pattern';

export interface TrimRule {
  strip: readonly string[];
  maxItems: number;
}

export interface EndpointEntry {
  id: string;
  path: string;
  description: string;
  params: z.ZodType<PathParams>;
  response: string;
  personal: boolean;
  trim: TrimRule;
}

export type WriteMethod = 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface BlockedEntry {
  id: string;
  method: 'GET' | WriteMethod;
  path: string;
  reason: string;
}

const noParams = z.object({});

const round = z.object({
  round: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,32}$/)
    .describe('Round identifier as the site uses it in the path'),
});

const roundNumber = z.object({
  round: z
    .string()
    .regex(/^[0-9]{1,3}$/)
    .describe('Round number, for example 45 for SCF #45'),
});

const plain: TrimRule = { strip: [], maxItems: 50 };
const ownList: TrimRule = { strip: [], maxItems: 25 };

export const endpoints = [
  {
    id: 'user',
    path: '/backend/dashboard/user',
    description: 'The logged-in account: Airtable user record and Sanity user.',
    params: noParams,
    response:
      'airtableUser{id, name, companyName, type, country, email, discord, siteUrls, votingPowers, latestRoundVotingPower} and sanityUser',
    personal: true,
    trim: { strip: ['email', 'discord', 'siteUrls', 'sanityUser'], maxItems: 10 },
  },
  {
    id: 'user-email-status',
    path: '/backend/dashboard/user/email_status',
    description: 'Email verification status of the logged-in account.',
    params: noParams,
    response: '{ emailStatus }',
    personal: true,
    trim: plain,
  },
  {
    id: 'form-items-essential',
    path: '/backend/dashboard/form_items/essential',
    description: 'Rounds, plus the projects the user has an interest form for or is assigned to.',
    params: noParams,
    response:
      'rounds[{key, value, type, phase, roundNumber}], interestFormProjects[{key, value, buildTrack, category, hasInterestForm, teamDescription}], assignedProjects[{key, value, eligible, category, hasInterestForm, teamDescription}]',
    personal: true,
    trim: { strip: ['teamDescription'], maxItems: 50 },
  },
  {
    id: 'tier-request',
    path: '/backend/dashboard/tier/request',
    description: 'Whether the user can request a higher tier and what blocks them.',
    params: noParams,
    response:
      '{ buttonLabel, disabled, blockingReasons[], votingPowerThreshold, requestType, targetTier }',
    personal: true,
    trim: ownList,
  },
  {
    id: 'tier-nomination',
    path: '/backend/dashboard/tier_nomination',
    description: 'Tier nominations received and made by the user, with the thresholds.',
    params: noParams,
    response: '{ tierNominations[], selfTierNominations[], threshold{navigator, pilot, round} }',
    personal: true,
    trim: ownList,
  },
  {
    id: 'vote-trust',
    path: '/backend/dashboard/vote/trust',
    description: 'The users the logged-in user trusts, on the Delegates and Trust page.',
    params: noParams,
    response: 'An array of the trusted users; its item shape has not been inspected.',
    personal: true,
    trim: ownList,
  },
  {
    id: 'vote-delegate',
    path: '/backend/dashboard/vote/delegate',
    description: 'The delegates of the logged-in user on the vote page.',
    params: noParams,
    response: 'An array of delegate ids.',
    personal: true,
    trim: ownList,
  },
  {
    id: 'vote-category-delegate',
    path: '/backend/dashboard/vote/category_delegate',
    description: 'Delegation of the logged-in user per category.',
    params: noParams,
    response: 'An object keyed by category; empty when the user delegates nothing per category.',
    personal: true,
    trim: ownList,
  },
  {
    id: 'vote-quarterly-category-delegate',
    path: '/backend/dashboard/vote/quarterly_category_delegate',
    description: 'Quarterly delegation of the logged-in user per track.',
    params: noParams,
    response: '{ integration_track[], open_track[], rfp_track[] }',
    personal: true,
    trim: ownList,
  },
  {
    id: 'nqg-graph',
    path: '/backend/dashboard/vote_history/nqg_graph',
    description: 'NQG score over time, per round.',
    params: noParams,
    response: '{ nqgOverTime[[round, ...]] }',
    personal: true,
    trim: plain,
  },
  {
    id: 'voting-statistics',
    path: '/backend/dashboard/vote_history/your_voting_statistics/:round',
    description: 'The user voting statistics for one round.',
    params: round,
    response: 'Neuron scores and totalNQGScore for that round.',
    personal: true,
    trim: ownList,
  },
  {
    id: 'analytics-rounds',
    path: '/backend/dashboard/analytics/rounds',
    description: 'The rounds that have analytics, with when each was computed.',
    params: noParams,
    response: '{ rounds[{ round, computedAt }] }',
    personal: false,
    trim: plain,
  },
  {
    id: 'analytics-round',
    path: '/backend/dashboard/analytics/round/:round',
    description:
      'Analytics of one round: awarded count, budgets, categories, community, voters, delegation, Lorenz curve and neurons.',
    params: roundNumber,
    response:
      'Awarded count, average and median budget, budget buckets, category breakdown, community size, voters, delegation network, Lorenz curve, neuron breakdown and deep dive, and submissionDetails[] in older rounds. It has no track field.',
    personal: false,
    trim: { strip: ['submissionDetails'], maxItems: 30 },
  },
  {
    id: 'analytics-insights',
    path: '/backend/dashboard/analytics/insights',
    description:
      'Generated written insights across rounds: global trends, anomalies, alerts and per round highlights.',
    params: noParams,
    response:
      '{ generatedAt, global{headline, trends[], anomalies[], alerts[]}, perRound[{round, summary, highlights[], concerns[], tags[]}], roundsIncluded[] }',
    personal: false,
    trim: { strip: [], maxItems: 20 },
  },
  {
    id: 'analytics-all-rounds',
    path: '/backend/dashboard/analytics/all-rounds',
    description:
      'Chart series over all included rounds: funding, participation, delegation, voting and funnel.',
    params: noParams,
    response:
      '{ computedAt, roundsIncluded[], series{categoryMix, delegationHealth, fundingTrends[{round, avgBudget, medianBudget, totalAwardedUSD}], neuronBreakdown, participation, powerConcentration, projectFunnel[{round, submissionsCount, awardedCount}], repeatSubmitters, reputationTrend, trustGraphTrend, trustLossTrend, voteQualityTrend, voterCohort, votingHistoryTrend} }',
    personal: false,
    trim: plain,
  },
] as const satisfies readonly EndpointEntry[];

const blocked = [
  {
    id: 'form-items-users',
    method: 'GET',
    path: '/backend/dashboard/form_items/users',
    reason: 'A directory of about 6000 users: bulk personal data, never exposed to the model.',
  },
  {
    id: 'tier-request-submit',
    method: 'POST',
    path: '/backend/dashboard/tier/request',
    reason: 'Write: submits a tier request.',
  },
  {
    id: 'tier-nomination-create',
    method: 'POST',
    path: '/backend/dashboard/tier_nomination',
    reason: 'Write: creates a tier nomination.',
  },
  {
    id: 'tier-nomination-update',
    method: 'POST',
    path: '/backend/dashboard/tier_nomination/:id',
    reason: 'Write: changes a tier nomination.',
  },
  {
    id: 'tier-upgrade',
    method: 'POST',
    path: '/backend/dashboard/tier_upgrade',
    reason: 'Write: upgrades the tier.',
  },
  {
    id: 'vote-delegate-set',
    method: 'POST',
    path: '/backend/dashboard/vote/delegate',
    reason: 'Write: changes the delegation.',
  },
  {
    id: 'user-update',
    method: 'PATCH',
    path: '/backend/dashboard/user',
    reason: 'Write: changes the account.',
  },
  {
    id: 'project-update',
    method: 'POST',
    path: '/backend/dashboard/project/:id',
    reason: 'Write: changes a project.',
  },
  {
    id: 'media-signature',
    method: 'POST',
    path: '/backend/dashboard/media/signature',
    reason: 'Write: requests a media upload signature.',
  },
  {
    id: 'wallet-address-set',
    method: 'POST',
    path: '/backend/dashboard/wallet_address',
    reason: 'Write: sets the wallet address.',
  },
  {
    id: 'wallet-address-challenge',
    method: 'POST',
    path: '/backend/dashboard/wallet_address/challenge',
    reason: 'Write: starts a wallet address challenge.',
  },
] as const satisfies readonly BlockedEntry[];

const BACKEND_PREFIX = '/backend/dashboard/';

const compiled = endpoints.map((endpoint: EndpointEntry) => ({
  endpoint,
  regex: patternToRegex(endpoint.path),
}));

const compiledBlocked = blocked.map((entry: BlockedEntry) => ({
  method: entry.method,
  regex: patternToRegex(entry.path),
}));

function findEndpoint(id: string): EndpointEntry | undefined {
  return compiled.find((item) => item.endpoint.id === id)?.endpoint;
}

export function buildEndpointPath(id: string, params: PathParams = {}): string | null {
  const endpoint = findEndpoint(id);
  if (!endpoint?.params.safeParse(params).success) return null;
  return fillPattern(endpoint.path, params);
}

function isBlockedBackendRequest(method: string, path: string): boolean {
  const upper = method.toUpperCase();
  return compiledBlocked.some((item) => item.method === upper && item.regex.test(path));
}

export function isAllowedBackendPath(path: string): boolean {
  if (!path.startsWith(BACKEND_PREFIX)) return false;
  if (isBlockedBackendRequest('GET', path)) return false;
  for (const { endpoint, regex } of compiled) {
    const params = matchPath(regex, path);
    if (params && endpoint.params.safeParse(params).success) return true;
  }
  return false;
}
