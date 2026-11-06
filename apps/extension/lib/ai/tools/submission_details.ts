import { z } from "zod";
import { SITE_ORIGIN } from "../../site/routes";
import { parseSubmissionPage } from "../../site/submission";
import { buildSubmissionContext } from "../context";
import { defineTool } from "./registry";

const MAX_CHARS = 11000;

export const tool = defineTool({
  name: "submission_details",
  description:
    "Reads one submission in full by its id (from round_submissions): round, status, requested budget, track, tranches with deliverables, on-chain metric, team and their links, the project's funding history and the proposal text. Use it to answer detailed questions about any proposal, not only the one on screen.",
  input: z.object({
    id: z
      .string()
      .trim()
      .regex(/^rec[A-Za-z0-9]{14}$/)
      .describe("Submission id such as recXXXXXXXXXXXXXX"),
  }),
  run: async ({ id }) => {
    const response = await fetch(`${SITE_ORIGIN}/dashboard/submissions/${id}`, {
      credentials: "include",
      headers: { Accept: "text/html" },
    });
    if (!response.ok || new URL(response.url).pathname.includes("login")) {
      return {
        found: false,
        reason: "The submission could not be read. The user may be signed out.",
      };
    }
    const doc = new DOMParser().parseFromString(
      await response.text(),
      "text/html",
    );
    const page = await parseSubmissionPage(doc, { id });
    if (!page)
      return {
        found: false,
        reason: "The page did not look like a submission.",
      };
    const { submission, otherSubmissions, sectionTexts } = page;
    return {
      source: `Submission page ${id}`,
      track: submission.track === "unknown" ? null : submission.track,
      trackSource: submission.trackSource,
      otherSubmissionsByTheProject: (otherSubmissions ?? [])
        .slice(0, 8)
        .map((other) => ({
          title: other.title,
          status: other.status,
          round: other.roundName,
          budgetUsd: other.budgetUsd,
        })),
      document: buildSubmissionContext(submission, sectionTexts, MAX_CHARS),
    };
  },
});
