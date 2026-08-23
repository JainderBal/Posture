import type { IssueCounts } from "../lib/analytics";
import styles from "./CommonIssuesList.module.css";

interface CommonIssuesListProps {
  counts: IssueCounts;
  total: number;
}

const ISSUES = [
  { key: "head", label: "Head tilt" },
  { key: "shoulders", label: "Shoulders" },
  { key: "distance", label: "Too close" },
] as const;

// Ranks the posture issues by how often they occurred, with a share bar.
export default function CommonIssuesList({ counts, total }: CommonIssuesListProps) {
  const rows = ISSUES.map((issue) => ({
    ...issue,
    count: counts[issue.key],
    percent: total === 0 ? 0 : (counts[issue.key] / total) * 100,
  })).sort((a, b) => b.count - a.count);

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Common issues</h2>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.key} className={styles.row}>
            <div className={styles.head}>
              <span className={styles.label}>{row.label}</span>
              <span className={styles.count}>{row.count}</span>
            </div>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: `${row.percent}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
