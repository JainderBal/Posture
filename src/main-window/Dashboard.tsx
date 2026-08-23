import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getSamplesInRange } from "../lib/db";
import { sessionStats, issueCounts, bucketAverageScores } from "../lib/analytics";
import { SAMPLE_INTERVAL_MS } from "../lib/constants";
import StatGrid from "./StatGrid";
import ScoreTrendChart from "./ScoreTrendChart";
import CommonIssuesList from "./CommonIssuesList";
import AutostartToggle from "./AutostartToggle";
import type { PostureSample } from "../types/posture";
import styles from "./Dashboard.module.css";

const MAX_SAMPLE_GAP_MS = SAMPLE_INTERVAL_MS * 3; // larger gaps = the app was closed
const DAY_MS = 24 * 60 * 60 * 1000;
const REFRESH_MS = 10000; // reload from the DB so the dashboard tracks the popup live

type PeriodKey = "today" | "week";

interface Period {
  key: PeriodKey;
  label: string;
  startMs: number;
  bucketMs: number;
  formatX: (ms: number) => string;
}

function buildPeriod(key: PeriodKey): Period {
  if (key === "week") {
    return {
      key,
      label: "7 days",
      startMs: Date.now() - 7 * DAY_MS,
      bucketMs: DAY_MS,
      formatX: (ms) => new Date(ms).toLocaleDateString([], { month: "short", day: "numeric" }),
    };
  }
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  return {
    key,
    label: "Today",
    startMs: midnight.getTime(),
    bucketMs: 10 * 60 * 1000,
    formatX: (ms) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

const PERIOD_KEYS: PeriodKey[] = ["today", "week"];

// Layout-only dashboard: loads samples for the chosen period and renders aggregates.
export default function Dashboard() {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("today");
  const [samples, setSamples] = useState<PostureSample[] | null>(null);

  const period = buildPeriod(periodKey);

  useEffect(() => {
    let active = true;
    const load = () => {
      getSamplesInRange(buildPeriod(periodKey).startMs, Date.now())
        .then((rows) => active && setSamples(rows))
        .catch((error) => {
          console.error("failed to load posture samples", error);
          if (active) setSamples([]);
        });
    };
    setSamples(null); // show loading only on a period switch, not on each refresh
    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [periodKey]);

  const toggle = (
    <div className={styles.toggle}>
      {PERIOD_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className={`${styles.toggleButton} ${key === periodKey ? styles.toggleActive : ""}`}
          onClick={() => setPeriodKey(key)}
        >
          {buildPeriod(key).label}
        </button>
      ))}
    </div>
  );

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.title}>
          <span className={styles.dot} />
          <h1 className={styles.kicker}>{period.label}</h1>
        </div>
        <div className={styles.actions}>
          <AutostartToggle />
          <button
            type="button"
            className={styles.openCoach}
            onClick={() => void invoke("open_popup")}
          >
            Open coach
          </button>
          {toggle}
        </div>
      </header>

      {samples === null ? (
        <p className={styles.state}>Loading…</p>
      ) : samples.length === 0 ? (
        <p className={styles.state}>
          No posture data for this period — calibrate in the popup and it'll start tracking.
        </p>
      ) : (
        <>
          <StatGrid stats={sessionStats(samples, SAMPLE_INTERVAL_MS, MAX_SAMPLE_GAP_MS)} />
          <ScoreTrendChart
            data={bucketAverageScores(samples, period.bucketMs)}
            formatX={period.formatX}
          />
          <CommonIssuesList counts={issueCounts(samples)} total={samples.length} />
        </>
      )}
    </div>
  );
}
