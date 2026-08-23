import { formatDuration, type SessionStats } from "../lib/analytics";
import styles from "./StatGrid.module.css";

interface StatGridProps {
  stats: SessionStats;
}

// The headline duration/streak stats as a technical, hairline-separated grid.
export default function StatGrid({ stats }: StatGridProps) {
  const tiles = [
    { label: "Good posture", value: formatDuration(stats.goodTimeMs), accent: false },
    { label: "Avg streak", value: formatDuration(stats.averageGoodStreakMs), accent: false },
    { label: "Best streak", value: formatDuration(stats.longestGoodStreakMs), accent: false },
    { label: "Slouches", value: String(stats.slouchCount), accent: true },
  ];

  return (
    <div className={styles.grid}>
      {tiles.map((tile) => (
        <div key={tile.label} className={styles.tile}>
          <span className={`${styles.value} ${tile.accent ? styles.accent : ""}`}>{tile.value}</span>
          <span className={styles.label}>{tile.label}</span>
        </div>
      ))}
    </div>
  );
}
