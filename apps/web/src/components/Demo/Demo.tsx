import styles from "./Demo.module.scss";

export function Demo() {
  return (
    <section id="demo" className={styles.root} aria-label="Demo">
      <div className={styles.frame}>
        <video
          className={styles.video}
          src="/better-scf/media/demo.mp4"
          poster="/better-scf/media/demo-poster.jpg"
          controls
          playsInline
          preload="metadata"
        >
          <track
            kind="captions"
            src="/better-scf/media/demo.vtt"
            srcLang="en"
            label="English"
          />
        </video>
      </div>
    </section>
  );
}
