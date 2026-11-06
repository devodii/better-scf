import { LINKS } from "shared/links";
import styles from "./Hero.module.scss";

export function Hero() {
  return (
    <section id="top" className={styles.root}>
      <h1 className={styles.title}>Review SCF proposals faster.</h1>
      <p className={styles.lead}>
        better-scf is a browser extension for the Stellar Community Fund. It
        adds review tools, search and an AI assistant to the site you already
        use.
      </p>
      <div className={styles.actions}>
        <a className={styles.primary} href="#demo">
          See it in action
        </a>
        <a
          className={styles.secondary}
          href={LINKS.github}
          target="_blank"
          rel="noreferrer noopener"
        >
          View on GitHub
        </a>
      </div>
    </section>
  );
}
