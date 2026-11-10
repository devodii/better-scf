import { LINKS } from "shared/links";
import styles from "./Hero.module.scss";

export function Hero() {
  return (
    <section id="top" className={styles.root}>
      <h1 className={styles.title}>A better way to explore SCF.</h1>
      <p className={styles.lead}>
        better-scf is a browser extension that adds smarter tools to the Stellar
        Community Fund site. See every proposal at a glance, find what matters
        and ask questions in plain words. Made for reviewers, delegates, voters
        and anyone following the fund.
      </p>
      <div className={styles.actions}>
        <a
          className={styles.install}
          href={LINKS.chromeStore}
          target="_blank"
          rel="noreferrer noopener"
        >
          Add to browser
        </a>
        <a className={styles.secondary} href="#demo">
          Watch the 30-second demo
        </a>
        <a
          className={styles.secondary}
          href={LINKS.github}
          target="_blank"
          rel="noreferrer noopener"
        >
          Open source on GitHub
        </a>
      </div>
      <p className={styles.note}>
        Free and open source. Works in Chrome and other Chromium browsers.
      </p>
    </section>
  );
}
