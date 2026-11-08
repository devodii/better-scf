import dayjs from "dayjs";
import raw from "../../../../extension/CHANGELOG.md?raw";
import styles from "./Changelog.module.scss";
import { parseChangelog } from "./parse";

const RELEASES = parseChangelog(raw);

export function Changelog() {
  return (
    <section className={styles.root} aria-label="Changelog">
      <h1 className={styles.title}>Changelog</h1>
      <p className={styles.lead}>What changed in each version of better-scf.</p>
      <ol className={styles.list}>
        {RELEASES.map((release) => (
          <li key={release.version} className={styles.release}>
            <h2 className={styles.version}>
              {release.version}
              {release.date && (
                <time className={styles.date} dateTime={release.date}>
                  {dayjs(release.date).format("D MMM YYYY")}
                </time>
              )}
            </h2>
            {release.groups.map((group) => (
              <div key={group.title}>
                <h3 className={styles.group}>{group.title}</h3>
                <ul className={styles.items}>
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </li>
        ))}
      </ol>
    </section>
  );
}
