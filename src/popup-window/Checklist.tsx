import type { PostureAssessment } from "../types/posture";
import styles from "./Checklist.module.css";

interface ChecklistProps {
  assessment: PostureAssessment | null;
}

const CHECKS = [
  { key: "head", label: "Head" },
  { key: "shoulders", label: "Shoulders" },
  { key: "distance", label: "Screen distance" },
] as const;

// Renders the three posture checks with a green tick, red cross, or pending dot.
export default function Checklist({ assessment }: ChecklistProps) {
  return (
    <ul className={styles.list}>
      {CHECKS.map(({ key, label }) => {
        const result = assessment?.[key];
        const state = result === undefined ? "pending" : result.pass ? "pass" : "fail";
        return (
          <li key={key} className={styles.row}>
            <span className={styles.label}>{label}</span>
            <span className={`${styles.mark} ${styles[state]}`}>
              {state === "pass" ? "✓" : state === "fail" ? "✕" : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
