import { useEffect, useState } from "react";
import { getSamplesInRange } from "../lib/db";
import { sessionStats, issueCounts, bucketAverageScores } from "../lib/analytics";
import { SAMPLE_INTERVAL_MS } from "../lib/constants";
import StatGrid from "./StatGrid";
import ScoreTrendChart from "./ScoreTrendChart";
import CommonIssuesList from "./CommonIssuesList";
import type { PostureSample } from "../types/posture";
import styles from "./Dashboard.module.css";

const TREND_BUCKET_MS = 10 * 60 * 1000; // average scores into 10-minute buckets
const MAX_SAMPLE_GAP_MS = SAMPLE_INTERVAL_MS * 3; // larger gaps = app was closed

function startOfTodayMs(): number {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// Layout-only dashboard: loads today's samples and renders the aggregates.
export default function Dashboard() {
  const [samples, setSamples] = useState<PostureSample[] | null>(null);

  useEffect(() => {
    let active = true;
    getSamplesInRange(startOfTodayMs(), Date.now())
      .then((rows) => active && setSamples(rows))
      .catch((error) => {
        console.error("failed to load posture samples", error);
        if (active) setSamples([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (samples === null) {
    return <p className={styles.state}>Loading…</p>;
  }
  if (samples.length === 0) {
    return (
      <p className={styles.state}>
        No posture data yet today — calibrate in the popup and it'll start tracking.
      </p>
    );
  }

  const stats = sessionStats(samples, SAMPLE_INTERVAL_MS, MAX_SAMPLE_GAP_MS);
  const issues = issueCounts(samples);
  const trend = bucketAverageScores(samples, TREND_BUCKET_MS);

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <span className={styles.dot} />
        <h1 className={styles.kicker}>Today</h1>
      </header>

      <StatGrid stats={stats} />
      <ScoreTrendChart data={trend} />
      <CommonIssuesList counts={issues} total={samples.length} />
    </div>
  );
}
