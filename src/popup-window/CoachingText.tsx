import { topPriorityIssue } from "../lib/posture";
import { COACHING_HEAD, COACHING_SHOULDERS, COACHING_DISTANCE, COACHING_GOOD } from "../lib/constants";
import type { PostureAssessment } from "../types/posture";
import styles from "./CoachingText.module.css";

const MESSAGES = {
  head: COACHING_HEAD,
  shoulders: COACHING_SHOULDERS,
  distance: COACHING_DISTANCE,
} as const;

interface CoachingTextProps {
  assessment: PostureAssessment | null;
}

// One coaching line for the highest-priority failing check (head > shoulders > distance).
export default function CoachingText({ assessment }: CoachingTextProps) {
  if (!assessment) return null;
  const issue = topPriorityIssue(assessment);
  const message = issue ? MESSAGES[issue] : COACHING_GOOD;
  return <p className={`${styles.text} ${issue ? styles.warn : styles.good}`}>{message}</p>;
}
