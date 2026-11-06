import { LINKS } from "shared/links";
import styles from "./Header.module.scss";

export function Header() {
  return (
    <header className={styles.root}>
      <div className={styles.inner}>
        <a className={styles.brand} href="#top">
          <img className={styles.logo} src="/better-scf/logo.png" alt="" />
          better-scf
        </a>
        <nav className={styles.nav} aria-label="Links">
          <a href={LINKS.feedback} target="_blank" rel="noreferrer noopener">
            Suggest a feature
          </a>
          <a href={LINKS.github} target="_blank" rel="noreferrer noopener">
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
