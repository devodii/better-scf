import styles from "./Showcase.module.scss";

export function Showcase() {
  return (
    <section id="demo" className={styles.root} aria-label="Demo">
      <figure className={styles.frame}>
        <img
          className={styles.image}
          src="/better-scf/showcase.png"
          alt="The better-scf assistant open on an SCF #46 proposal, answering reviewer questions."
          width={1800}
          height={1125}
        />
      </figure>
    </section>
  );
}
