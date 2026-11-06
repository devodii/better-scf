import { z } from "zod";
import { buildPath } from "../../site/catalog/routes";
import { loadProjectsIndex, searchProjects } from "../../site/projects-index";
import { defineTool } from "./registry";

export const tool = defineTool({
  name: "search_projects",
  description:
    "Searches the funded projects directory by name or category. Returns title, category, the last round that awarded it and its page path.",
  input: z.object({
    query: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .describe("Words of the project name or category"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("Maximum results, default 5"),
  }),
  run: async ({ query, limit }) => {
    await loadProjectsIndex();
    const { matches, ready, error } = searchProjects(query, limit ?? 5);
    return {
      ready,
      error: error?.toToolResult() ?? null,
      matches: matches.map(({ project }) => ({
        title: project.title,
        category: project.category,
        lastAwardedRound: project.lastAwardedRound,
        path: buildPath("project", { slug: project.slug }),
      })),
    };
  },
});
