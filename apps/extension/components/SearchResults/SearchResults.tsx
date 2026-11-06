import { type KeyboardEvent, useRef, useState } from "react";
import { SearchResultCard, type SearchResultMatch } from "../SearchResultCard";
import styles from "./SearchResults.module.scss";

export type SearchResultsStatus = "loading" | "ready" | "error";

export interface SearchResultsProps {
  status: SearchResultsStatus;
  matches: readonly SearchResultMatch[];
  query: string;
  hasMore?: boolean;
  onRetry: () => void;
  onEscape?: (() => void) | undefined;
  onLeaveUp?: (() => void) | undefined;
}

function countText(
  status: SearchResultsStatus,
  count: number,
  hasMore: boolean,
): string {
  if (status === "loading") return "Searching projects";
  if (status === "error") return "";
  return `${count}${hasMore ? "+" : ""} ${count === 1 && !hasMore ? "project" : "projects"}`;
}

export function SearchResults({
  status,
  matches,
  query,
  hasMore = false,
  onRetry,
  onEscape,
  onLeaveUp,
}: SearchResultsProps) {
  const list = useRef<HTMLUListElement>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const active = matches.some(({ project }) => project.slug === activeSlug)
    ? activeSlug
    : (matches[0]?.project.slug ?? null);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onEscape?.();
      return;
    }
    const links = Array.from(list.current?.querySelectorAll("a") ?? []);
    const index = links.findIndex((link) => link === event.target);
    if (index < 0) return;
    let next: number;
    switch (event.key) {
      case "ArrowDown":
        next = Math.min(index + 1, links.length - 1);
        break;
      case "ArrowUp":
        if (index === 0) {
          event.preventDefault();
          onLeaveUp?.();
          return;
        }
        next = index - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = links.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    links[next]?.focus();
  };

  return (
    <section
      className={styles.root}
      aria-label="Project search results"
      onKeyDown={handleKeyDown}
    >
      <p className={styles.count} role="status" aria-live="polite">
        {countText(status, matches.length, hasMore)}
      </p>
      {status === "error" && (
        <div className={styles.message} role="alert">
          <p className={styles.messageTitle}>
            The project list could not be loaded.
          </p>
          <p className={styles.messageHint}>
            Check your connection and try again.
          </p>
          <button type="button" className={styles.retry} onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
      {status === "ready" && matches.length === 0 && (
        <div className={styles.message}>
          <p className={styles.messageTitle}>
            No projects match &ldquo;{query}&rdquo;.
          </p>
          <p className={styles.messageHint}>
            Try fewer words, or search by a category such as Developer Tooling.
          </p>
        </div>
      )}
      {matches.length > 0 && (
        <ul ref={list} className={styles.list}>
          {matches.map((match) => (
            <li key={match.project.slug} className={styles.item}>
              <SearchResultCard
                match={match}
                isActive={match.project.slug === active}
                onFocus={() => setActiveSlug(match.project.slug)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
