export const SUBMISSION_SELECTORS = {
  title: 'h2',
  sectionHeading: 'h4',
  blocks: 'p, li, h1, h2, h3, h4, h5, h6, pre, blockquote',
  link: 'a[href]',
  githubIcon: 'img[alt="github-icon"]',
  teamCard: '.swiper-slide',
  teamName: 'p',
  paragraph: 'p',
  button: 'button',
  video: 'iframe[src]',
  projectLink: 'a[href^="/dashboard/projects/"]',
  leafDiv: 'div',
} as const;

export const SUBMISSION_TEXT = {
  byPrefix: /^by\s+/i,
  roundChip: /^SCF\s*#\s*(\d+)$/i,
  budgetChip: /^\$\s?\d[\d,]*(?:\.\d+)?\s?[KkMm]?$/,
  tranche: /^tranche\s*#?\s*(\d+)\b/i,
  onchainMetric: /\bon-?chain\s+metric\b/i,
  requestedBudget: /^requested budget$/i,
  team: /^team$/i,
  projectStats: /^project stats$/i,
  otherSubmissions: /^other submissions$/i,
  noOtherSubmissions: /^no other submissions\.?$/i,
  statTeamSize: /^team size$/i,
  statCategory: /^category$/i,
  statTotalAwarded: /^total awarded$/i,
  statAwardedSubmissions: /^awarded submissions$/i,
  linkWebsite: /^website$/i,
  linkArchitecture: /^architecture$/i,
  linkGithub: /^github$/i,
  linkVideo: /^(?:demo\s+)?video$/i,
} as const;

export const PARSER_VERSION = 4;
export const FIRST_TRACK_ROUND = 41;

export const RFP_LINK = /scf-handbook\/scf-awards\/build-award\/rfp-track/i;

export const RFP_PHRASES: readonly RegExp[] = [
  /(?:respon(?:ds?|se|ding)\s+(?:directly\s+)?to|in\s+response\s+to|built\s+(?:directly\s+)?for|answers?|addresses|fill|fulfil+s?)\b[^.\n]{0,90}?\bRFP\b/i,
  /\bRFP[\s-]*(?:track|requirements?|required|facing|scope|evaluation|ask)\b/i,
  /\b(?:this|the)\s+RFP\b/i,
  /request[\s-]for[\s-]proposals?/i,
];
