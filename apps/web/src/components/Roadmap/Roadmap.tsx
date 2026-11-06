import styles from "./Roadmap.module.scss";

export function Roadmap() {
  return (
    <section className={styles.root} aria-label="Coming next">
      <div className={styles.card}>
        <span className={styles.tag}>Coming next</span>
        <h2 className={styles.title}>Builder track records</h2>
        <p className={styles.text}>
          Team avatars will link to each builder&apos;s Stellarlight profile, so
          you can see their history across the Stellar ecosystem before you
          decide.
        </p>
      </div>
    </section>
  );
}
