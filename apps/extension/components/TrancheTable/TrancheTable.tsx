import styles from './TrancheTable.module.scss';

export interface TrancheTableRow {
  id: string;
  title: string;
  total: string | null;
}

export interface TrancheTableProps {
  rows: readonly TrancheTableRow[];
}

export function TrancheTable({ rows }: TrancheTableProps) {
  if (rows.length === 0) {
    return <p className={styles.empty}>No tranches stated on this page.</p>;
  }
  return (
    <div className={styles.root}>
      <table className={styles.table}>
        <caption className={styles.caption}>Tranche summary</caption>
        <thead>
          <tr>
            <th scope="col" className={styles.head}>
              Tranche
            </th>
            <th scope="col" className={styles.headAmount}>
              Total as stated
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" className={styles.title}>
                {row.title}
              </th>
              <td className={styles.amount}>
                {row.total ?? <span className={styles.missing}>Not stated</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
