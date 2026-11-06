import styles from "./Features.module.scss";

const FEATURES = [
  {
    title: "Review tools",
    text: "Keep your place and your opinions in one spot: mark what you have read, shortlist your favourites and note who you support. Private to you.",
  },
  {
    title: "Search and filters",
    text: "Find the right proposals in seconds. Search a round and narrow it down by track, status, budget or your own marks.",
  },
  {
    title: "AI assistant",
    text: "Ask questions about any round or proposal and get clear answers in seconds, instead of reading everything yourself.",
  },
  {
    title: "UX improvements",
    text: "Small touches that save you time: track and team badges on every proposal card, easier-to-read proposal pages, a round's key numbers up top, and going back to a list lands you exactly where you left off.",
  },
];

export function Features() {
  return (
    <section className={styles.root} aria-label="Features">
      <ul className={styles.grid}>
        {FEATURES.map((feature) => (
          <li key={feature.title} className={styles.card}>
            <h2 className={styles.title}>{feature.title}</h2>
            <p className={styles.text}>{feature.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
