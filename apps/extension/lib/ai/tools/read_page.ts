import { z } from "zod";
import { isReadable, pageRoot, readPageSnapshot } from "../context";
import { defineTool } from "./registry";

const DEFAULT_CHARS = 6000;
const MAX_CHARS = 10000;

function visibleText(
  root: Element,
  maxChars: number,
): { text: string; truncated: boolean } {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
        return node instanceof Element && isReadable(node)
          ? NodeFilter.FILTER_SKIP
          : NodeFilter.FILTER_REJECT;
      },
    },
  );
  const parts: string[] = [];
  let length = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.replace(/\s+/g, " ").trim();
    if (!text) continue;
    parts.push(text);
    length += text.length + 1;
    if (length > maxChars)
      return { text: parts.join(" ").slice(0, maxChars), truncated: true };
  }
  return { text: parts.join(" "), truncated: false };
}

export const tool = defineTool({
  name: "read_page",
  description:
    "Reads the page the user is looking at: page kind, title, headings and the visible main text. Form field values are never included. Use it when the answer depends on what is on screen and the context you already have is not enough.",
  input: z.object({
    maxChars: z
      .number()
      .int()
      .min(500)
      .max(MAX_CHARS)
      .optional()
      .describe(`Cap on the text, default ${DEFAULT_CHARS}`),
  }),
  run: ({ maxChars }) => {
    const snapshot = readPageSnapshot();
    const { text, truncated } = visibleText(
      pageRoot(document),
      maxChars ?? DEFAULT_CHARS,
    );
    return {
      pageKind: snapshot.kind,
      path: snapshot.path,
      title: snapshot.title,
      headings: snapshot.headings,
      text,
      truncated,
    };
  },
});
