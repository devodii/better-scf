import { useEffect, useRef } from "react";
import styles from "./GridNote.module.scss";

export interface GridNoteProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
}

export function GridNote({ title, value, onChange }: GridNoteProps) {
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => field.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className={styles.root}>
      <p className={styles.title}>{title}</p>
      <textarea
        ref={field}
        className={styles.field}
        aria-label={`Private note on ${title}`}
        rows={5}
        value={value}
        placeholder="Private note, saved when you close this"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
