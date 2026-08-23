import AnimatedNumber from "./AnimatedNumber";
import styles from "./ScoreBadge.module.css";

interface ScoreBadgeProps {
  score: number | null;
}

// Maps a score to a color band: green (good), near-black (ok), red (poor).
function scoreClass(score: number): string {
  if (score >= 80) return styles.good;
  if (score >= 50) return styles.mid;
  return styles.low;
}

// Renders the current posture score, color-coded, with tabular numerals.
export default function ScoreBadge({ score }: ScoreBadgeProps) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>Score</span>
      <span className={`${styles.value} ${score === null ? "" : scoreClass(score)}`}>
        {score === null ? "—" : <AnimatedNumber value={score} />}
        <span className={styles.unit}>%</span>
      </span>
    </div>
  );
}
