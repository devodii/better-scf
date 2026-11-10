import styles from "./Gallery.module.scss";

const SHOTS = [
  { file: "badges.jpg", caption: "Tracks and teams on every card" },
  { file: "round-header.jpg", caption: "A round at a glance" },
  { file: "tranche.jpg", caption: "Tranche totals, summarised" },
  { file: "review.jpg", caption: "Your private notes and shortlist" },
  { file: "ai.jpg", caption: "Answers with the numbers and their scope" },
  { file: "permission.jpg", caption: "It asks before it acts" },
];

export function Gallery() {
  return (
    <section className={styles.root} aria-label="Screenshots">
      <h2 className={styles.title}>And many more.. 🚀</h2>
      <ul className={styles.grid}>
        {SHOTS.map((shot) => (
          <li key={shot.file}>
            <figure className={styles.card}>
              <img
                className={styles.image}
                src={`/better-scf/features/${shot.file}`}
                alt={shot.caption}
                loading="lazy"
                width={1920}
                height={1200}
              />
              <figcaption className={styles.caption}>{shot.caption}</figcaption>
            </figure>
          </li>
        ))}
        <li>
          <figure className={styles.card}>
            <div className={styles.popup}>
              <img
                className={styles.popupImage}
                src="/better-scf/features/popup.png"
                alt="The better-scf popup with four switches"
                loading="lazy"
              />
            </div>
            <figcaption className={styles.caption}>
              Four switches. Turn anything off.
            </figcaption>
          </figure>
        </li>
      </ul>
    </section>
  );
}
