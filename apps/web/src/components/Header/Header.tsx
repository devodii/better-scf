import { LINKS } from "shared/links";
import styles from "./Header.module.scss";

export function Header() {
  return (
    <header className={styles.root}>
      <div className={styles.inner}>
        <a className={styles.brand} href="/better-scf/">
          <img className={styles.logo} src="/better-scf/logo.png" alt="" />
          better-scf
        </a>
        <nav className={styles.nav} aria-label="Links">
          <a href="/better-scf/changelog/">Changelog</a>
          <a href={LINKS.feedback} target="_blank" rel="noreferrer noopener">
            Suggest a feature
          </a>
          <a
            className={styles.source}
            href={LINKS.github}
            target="_blank"
            rel="noreferrer noopener"
          >
            Open source on GitHub
          </a>
          <a
            className={styles.install}
            href={LINKS.chromeStore}
            target="_blank"
            rel="noreferrer noopener"
          >
            Add to Chrome
          </a>
        </nav>
      </div>
    </header>
  );
}
