import clsx from 'clsx';
import type { ComponentPropsWithoutRef, Ref } from 'react';
import { Chip } from '../Chip';
import { SearchHighlight, type SearchHighlightRange } from '../SearchHighlight';
import { SearchThumbnail } from '../SearchThumbnail';
import styles from './SearchResultCard.module.scss';

export interface SearchResultProject {
  slug: string;
  title: string;
  category: string;
  thumbnail: string | null;
  lastAwardedRound: number | null;
}

export interface SearchResultMatch {
  project: SearchResultProject;
  titleRanges: readonly SearchHighlightRange[];
  categoryRanges: readonly SearchHighlightRange[];
}

export interface SearchResultCardProps
  extends Omit<ComponentPropsWithoutRef<'a'>, 'children' | 'href'> {
  match: SearchResultMatch;
  isActive?: boolean;
  ref?: Ref<HTMLAnchorElement>;
}

export function SearchResultCard({
  match,
  isActive = true,
  className,
  ref,
  ...rest
}: SearchResultCardProps) {
  const { project, titleRanges, categoryRanges } = match;

  return (
    <a
      ref={ref}
      href={`/project/${encodeURIComponent(project.slug)}`}
      tabIndex={isActive ? 0 : -1}
      className={clsx(styles.root, className)}
      {...rest}
    >
      <SearchThumbnail className={styles.cover} src={project.thumbnail} fallback={project.title} />
      <span className={styles.body}>
        <span className={styles.title} title={project.title}>
          <SearchHighlight text={project.title} ranges={titleRanges} />
        </span>
        <span className={styles.chips}>
          {project.category && (
            <Chip variant="purple">
              <SearchHighlight text={project.category} ranges={categoryRanges} />
            </Chip>
          )}
          {project.lastAwardedRound !== null && (
            <Chip variant="yellow">Last awarded SCF #{project.lastAwardedRound}</Chip>
          )}
        </span>
      </span>
    </a>
  );
}
