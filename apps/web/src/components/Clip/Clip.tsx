import { useEffect, useRef } from "react";
import styles from "./Clip.module.scss";

export interface ClipProps {
  name: string;
  label: string;
}

export function Clip({ name, label }: ClipProps) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void element.play().catch(() => undefined);
        else element.pause();
      },
      { threshold: 0.4 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.frame}>
      <video
        ref={video}
        className={styles.video}
        src={`/better-scf/media/${name}.mp4`}
        aria-label={label}
        muted
        loop
        playsInline
        preload="metadata"
      />
    </div>
  );
}
