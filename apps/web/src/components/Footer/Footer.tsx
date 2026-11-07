import { LINKS } from "shared/links";
import styles from "./Footer.module.scss";

export function Footer() {
  return (
    <footer className={styles.root}>
      <div className={styles.inner}>
        <p className={styles.note}>
          Built for the Stellar community. Independent and not affiliated with
          the Stellar Development Foundation.
        </p>
        <nav className={styles.nav} aria-label="Footer">
          <a href="/better-scf/changelog/">Changelog</a>
          <a href={LINKS.feedback} target="_blank" rel="noreferrer noopener">
            Suggest a feature
          </a>
          <a href={LINKS.privacy} target="_blank" rel="noreferrer noopener">
            Privacy
          </a>
          <a href={LINKS.github} target="_blank" rel="noreferrer noopener">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
