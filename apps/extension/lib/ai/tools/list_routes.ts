import { z } from "zod";
import { routes } from "../../site/catalog/routes";
import { defineTool } from "./registry";

export const tool = defineTool({
  name: "list_routes",
  description:
    "Lists the pages of the site that navigate can open: id, path pattern, title and description. Optionally filter by a word. Pages with :params in the path need an id, so use a round number or a project name with navigate instead.",
  input: z.object({
    filter: z
      .string()
      .trim()
      .max(60)
      .optional()
      .describe("Keep routes mentioning this word"),
  }),
  run: ({ filter }) => {
    const needle = filter?.toLowerCase();
    return routes
      .filter(
        (route) =>
          !needle ||
          `${route.id} ${route.title} ${route.description} ${route.keywords.join(" ")}`
            .toLowerCase()
            .includes(needle),
      )
      .map(({ id, path, title, description, needsLogin }) => ({
        id,
        path,
        title,
        description,
        needsLogin,
      }));
  },
});
