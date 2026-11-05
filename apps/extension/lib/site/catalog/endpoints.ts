import { z } from 'zod';
import { fillPattern, matchPath, type PathParams, patternToRegex } from './pattern';

export interface EndpointEntry {
  id: string;
  path: string;
  description: string;
  params: z.ZodType<PathParams>;
  response: string;
  personal: boolean;
}

const noParams = z.object({});

const round = z.object({
  round: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,32}$/)
    .describe('Round identifier as the site uses it in the path'),
});

export const endpoints = [
  {
    id: 'user',
    path: '/backend/dashboard/user',
    description: 'The logged-in account: Airtable user record and Sanity user.',
    params: noParams,
    response:
      'airtableUser{id, name, companyName, type, country, email, discord, siteUrls, votingPowers, latestRoundVotingPower} and sanityUser',
    personal: true,
  },
  {
    id: 'user-email-status',
    path: '/backend/dashboard/user/email_status',
    description: 'Email verification status of the logged-in account.',
    params: noParams,
    response: '{ emailStatus }',
    personal: true,
  },
  {
    id: 'form-items-essential',
    path: '/backend/dashboard/form_items/essential',
    description: 'Rounds, plus the projects the user has an interest form for or is assigned to.',
    params: noParams,
    response:
      'rounds[{key, value, type, phase, roundNumber}], interestFormProjects[{key, value, buildTrack, category, hasInterestForm, teamDescription}], assignedProjects[{key, value, eligible, category, hasInterestForm, teamDescription}]',
    personal: true,
  },
  {
    id: 'tier-request',
    path: '/backend/dashboard/tier/request',
    description: 'Whether the user can request a higher tier and what blocks them.',
    params: noParams,
    response:
      '{ buttonLabel, disabled, blockingReasons[], votingPowerThreshold, requestType, targetTier }',
    personal: true,
  },
  {
    id: 'tier-nomination',
    path: '/backend/dashboard/tier_nomination',
    description: 'Tier nominations received and made by the user, with the thresholds.',
    params: noParams,
    response: '{ tierNominations[], selfTierNominations[], threshold{navigator, pilot, round} }',
    personal: true,
  },
  {
    id: 'vote-trust',
    path: '/backend/dashboard/vote/trust',
    description: 'Trust relations of the user on the Delegates and Trust page.',
    params: noParams,
    response: 'An array; its item shape has not been inspected.',
    personal: true,
  },
  {
    id: 'vote-delegate',
    path: '/backend/dashboard/vote/delegate',
    description: 'Delegates of the user on the vote page.',
    params: noParams,
    response: 'An array; its item shape has not been inspected.',
    personal: true,
  },
  {
    id: 'nqg-graph',
    path: '/backend/dashboard/vote_history/nqg_graph',
    description: 'NQG score over time, per round.',
    params: noParams,
    response: '{ nqgOverTime[[round, ...]] }',
    personal: true,
  },
  {
    id: 'voting-statistics',
    path: '/backend/dashboard/vote_history/your_voting_statistics/:round',
    description: 'The user voting statistics for one round.',
    params: round,
    response: 'Neuron scores and totalNQGScore for that round.',
    personal: true,
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
  },
] as const satisfies readonly EndpointEntry[];

export type EndpointId = (typeof endpoints)[number]['id'];

const BACKEND_PREFIX = '/backend/dashboard/';

const compiled = endpoints.map((endpoint: EndpointEntry) => ({
  endpoint,
  regex: patternToRegex(endpoint.path),
}));

export function findEndpoint(id: string): EndpointEntry | undefined {
  return compiled.find((item) => item.endpoint.id === id)?.endpoint;
}

export function buildEndpointPath(id: string, params: PathParams = {}): string | null {
  const endpoint = findEndpoint(id);
  if (!endpoint?.params.safeParse(params).success) return null;
  return fillPattern(endpoint.path, params);
}

export function isAllowedBackendPath(path: string): boolean {
  if (!path.startsWith(BACKEND_PREFIX)) return false;
  for (const { endpoint, regex } of compiled) {
    const params = matchPath(regex, path);
    if (params && endpoint.params.safeParse(params).success) return true;
  }
  return false;
}
