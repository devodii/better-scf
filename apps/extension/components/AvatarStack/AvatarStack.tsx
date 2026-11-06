import clsx from "clsx";
import { Avatar, type AvatarSize } from "../Avatar";
import { Tooltip } from "../Tooltip";
import styles from "./AvatarStack.module.scss";

export interface AvatarStackPerson {
  name: string;
  role?: string | null | undefined;
  src?: string | null | undefined;
  href?: string | null | undefined;
}

export interface AvatarStackProps {
  people: readonly AvatarStackPerson[];
  max?: number;
  size?: AvatarSize;
  label?: string;
  className?: string | undefined;
}

export function AvatarStack({
  people,
  max = 4,
  size = "sm",
  label = "Team",
  className,
}: AvatarStackProps) {
  if (people.length === 0) return null;
  const shown = people.slice(0, Math.max(max, 0));
  const rest = people.slice(shown.length);

  return (
    <ul
      className={clsx(styles.root, styles[size], className)}
      aria-label={label}
    >
      {shown.map((person) => (
        <li key={person.href ?? person.name} className={styles.item}>
          <Tooltip
            content={
              person.role ? `${person.name} · ${person.role}` : person.name
            }
          >
            <Avatar
              name={person.name}
              src={person.src}
              href={person.href}
              size={size}
            />
          </Tooltip>
        </li>
      ))}
      {rest.length > 0 && (
        <li className={styles.item}>
          <Tooltip content={rest.map((person) => person.name).join(", ")}>
            <span
              className={styles.more}
              role="img"
              aria-label={`${rest.length} more`}
            >
              +{rest.length}
            </span>
          </Tooltip>
        </li>
      )}
    </ul>
  );
}
