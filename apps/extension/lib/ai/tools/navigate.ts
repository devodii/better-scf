import { z } from "zod";
import { buildPath, resolveRoute, routes } from "../../site/catalog/routes";
import { loadProjectsIndex, searchProjects } from "../../site/projects-index";
import { readInlineScripts } from "../../site/round";
import { parseRoundsPayload } from "../../site/rounds";
import { defineTool } from "./registry";

const ROUND_TARGET = /^(?:(?:scf|round)\s*)*#?\s*(\d{1,3})$/i;
const DECISIVE_CONFIDENCE = 0.9;
const DECISIVE_LEAD = 0.15;
const CANDIDATES = 5;

function go(path: string | null, title: string) {
  if (path === null || !path.startsWith("/") || path.startsWith("//")) {
    return {
      navigated: false,
      reason: `${title} needs an id; use a round number or a project name.`,
    };
  }
  window.location.assign(path);
  return { navigated: true, to: path, title };
}

function goToRound(number: number) {
  const rounds = parseRoundsPayload(readInlineScripts(document));
  if (rounds.length === 0) {
    return {
      navigated: false,
      reason:
        'Round data is not on this page. Navigate to "award-rounds" first, then ask again.',
    };
  }
  const round = rounds.find((record) => record.roundNumber === number);
  if (!round) {
    return {
      navigated: false,
      reason: `No round ${number} found.`,
      availableRounds: rounds
        .map((record) => record.roundNumber)
        .sort((a, b) => b - a)
        .slice(0, 15),
    };
  }
  return go(
    buildPath("round", { roundId: round.id }),
    round.name || `SCF #${number}`,
  );
}

export const tool = defineTool({
  name: "navigate",
  description:
    'Takes the user to a page of the site. target is a route id (see list_routes), plain words such as "voting history", a round such as "SCF 46", or a funded project name. Before calling, tell the user where you are taking them. If unsure it returns ranked candidates and does not move; ask the user or call again with a clearer target.',
  input: z.object({
    target: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .describe("Route id, free text, round or project name"),
  }),
  run: async ({ target }) => {
    const round = ROUND_TARGET.exec(target)?.[1];
    if (round) return goToRound(Number(round));

    const exact = routes.find((route) => route.id === target.toLowerCase());
    if (exact) return go(buildPath(exact.id), exact.title);

    const found = resolveRoute(target);
    const [top, second] = found;
    if (
      top &&
      top.confidence >= DECISIVE_CONFIDENCE &&
      (!second || top.confidence - second.confidence >= DECISIVE_LEAD)
    ) {
      return go(buildPath(top.route.id), top.route.title);
    }

    await loadProjectsIndex();
    const { matches } = searchProjects(target, CANDIDATES);
    const named = matches.filter(
      ({ project }) => project.title.toLowerCase() === target.toLowerCase(),
    );
    const only =
      matches.length === 1 && (matches[0]?.titleRanges.length ?? 0) > 0
        ? matches[0]
        : undefined;
    const project = named.length === 1 ? named[0] : only;
    if (project && (!top || top.confidence < DECISIVE_CONFIDENCE)) {
      return go(
        buildPath("project", { slug: project.project.slug }),
        project.project.title,
      );
    }

    return {
      navigated: false,
      reason: "No single clear match.",
      routes: found.map(({ route, confidence }) => ({
        id: route.id,
        title: route.title,
        confidence: Math.round(confidence * 100) / 100,
      })),
      projects: matches.map(({ project: match }) => ({
        title: match.title,
        category: match.category,
      })),
    };
  },
});
