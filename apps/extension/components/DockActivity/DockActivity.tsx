import { Spinner } from '../Spinner';
import styles from './DockActivity.module.scss';

export interface DockActivityProps {
  text: string;
}

export function DockActivity({ text }: DockActivityProps) {
  return (
    <p className={styles.root}>
      <Spinner size="sm" label={text} />
      <span aria-hidden="true">{text}</span>
    </p>
  );
}
