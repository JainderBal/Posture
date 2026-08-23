// Pure aggregation of posture samples for the dashboard. No React, no I/O.

import type { PostureSample } from "../types/posture";
import { SCORE_SHOW_THRESHOLD } from "./constants";

// Rounded average of the sample scores (0 for an empty list).
export function averageScore(samples: PostureSample[]): number {
  if (samples.length === 0) return 0;
  return Math.round(samples.reduce((sum, s) => sum + s.score, 0) / samples.length);
}

export interface PostureSplit {
  good: number;
  bad: number;
  goodPct: number;
}

// Splits samples into good vs bad by the score threshold.
export function postureSplit(samples: PostureSample[]): PostureSplit {
  const good = samples.filter((s) => s.score >= SCORE_SHOW_THRESHOLD).length;
  const bad = samples.length - good;
  const goodPct = samples.length === 0 ? 0 : (good / samples.length) * 100;
  return { good, bad, goodPct };
}

export interface IssueCounts {
  head: number;
  shoulders: number;
  distance: number;
}

// Counts how often each check failed across the samples.
export function issueCounts(samples: PostureSample[]): IssueCounts {
  return {
    head: samples.filter((s) => !s.headOk).length,
    shoulders: samples.filter((s) => !s.shouldersOk).length,
    distance: samples.filter((s) => !s.distanceOk).length,
  };
}

export interface SessionStats {
  goodTimeMs: number;
  averageGoodStreakMs: number;
  longestGoodStreakMs: number;
  slouchCount: number;
}

// Duration/streak stats: total good time, average & longest good streak, and how
// many times posture dropped. Samples more than maxGapMs apart break a streak
// (e.g. the app was closed), so absences aren't counted as posture time.
export function sessionStats(
  samples: PostureSample[],
  intervalMs: number,
  maxGapMs: number
): SessionStats {
  const goodStreaksMs: number[] = [];
  let goodCount = 0;
  let currentRun = 0;
  let slouchCount = 0;
  let prevGood = false;
  let prevTimestamp: number | null = null;

  for (const s of samples) {
    const good = s.score >= SCORE_SHOW_THRESHOLD;
    const contiguous = prevTimestamp !== null && s.timestamp - prevTimestamp <= maxGapMs;
    if (good) goodCount += 1;

    if (good && contiguous && prevGood) {
      currentRun += 1;
    } else if (good) {
      if (currentRun > 0) goodStreaksMs.push(currentRun * intervalMs);
      currentRun = 1;
    } else {
      if (prevGood && contiguous) slouchCount += 1;
      if (currentRun > 0) {
        goodStreaksMs.push(currentRun * intervalMs);
        currentRun = 0;
      }
    }

    prevGood = good;
    prevTimestamp = s.timestamp;
  }
  if (currentRun > 0) goodStreaksMs.push(currentRun * intervalMs);

  const totalStreakMs = goodStreaksMs.reduce((sum, ms) => sum + ms, 0);
  return {
    goodTimeMs: goodCount * intervalMs,
    averageGoodStreakMs: goodStreaksMs.length ? Math.round(totalStreakMs / goodStreaksMs.length) : 0,
    longestGoodStreakMs: goodStreaksMs.length ? Math.max(...goodStreaksMs) : 0,
    slouchCount,
  };
}

// Human-friendly duration: "45s", "6m", or "1h 24m".
export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export interface ScoreBucket {
  bucketStart: number;
  averageScore: number;
}

// Groups samples into fixed time buckets and averages each, oldest first.
export function bucketAverageScores(samples: PostureSample[], bucketMs: number): ScoreBucket[] {
  const buckets = new Map<number, { sum: number; count: number }>();
  for (const s of samples) {
    const key = Math.floor(s.timestamp / bucketMs) * bucketMs;
    const bucket = buckets.get(key) ?? { sum: 0, count: 0 };
    bucket.sum += s.score;
    bucket.count += 1;
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bucketStart, { sum, count }]) => ({
      bucketStart,
      averageScore: Math.round(sum / count),
    }));
}
