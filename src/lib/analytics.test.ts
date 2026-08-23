import { describe, expect, test } from "vitest";
import {
  averageScore,
  postureSplit,
  issueCounts,
  bucketAverageScores,
  sessionStats,
  formatDuration,
} from "./analytics";
import type { PostureSample } from "../types/posture";

function sample(
  timestamp: number,
  score: number,
  headOk: boolean,
  shouldersOk: boolean,
  distanceOk: boolean
): PostureSample {
  return { timestamp, score, headOk, shouldersOk, distanceOk };
}

describe("averageScore", () => {
  test("is 0 for no samples", () => {
    expect(averageScore([])).toBe(0);
  });

  test("averages and rounds the scores", () => {
    expect(averageScore([sample(0, 80, true, true, true), sample(1, 61, true, true, true)])).toBe(71);
  });
});

describe("postureSplit", () => {
  test("counts good vs bad against the score threshold", () => {
    const split = postureSplit([
      sample(0, 100, true, true, true),
      sample(1, 50, false, false, true),
      sample(2, 90, true, true, true),
    ]);
    expect(split.good).toBe(2);
    expect(split.bad).toBe(1);
    expect(split.goodPct).toBeCloseTo(66.7, 1);
  });
});

describe("issueCounts", () => {
  test("counts how often each check failed", () => {
    const counts = issueCounts([
      sample(0, 50, false, true, true),
      sample(1, 50, false, false, true),
    ]);
    expect(counts).toEqual({ head: 2, shoulders: 1, distance: 0 });
  });
});

describe("sessionStats", () => {
  test("computes good time, streaks, and slouch count", () => {
    // interval 2000ms, gap cap 6000ms; good = score >= 80
    const samples = [
      sample(0, 100, true, true, true),
      sample(2000, 100, true, true, true),
      sample(4000, 50, false, false, true), // slouch begins
      sample(6000, 50, false, false, true),
      sample(8000, 90, true, true, true),
      sample(10000, 90, true, true, true),
      sample(12000, 90, true, true, true),
    ];
    const stats = sessionStats(samples, 2000, 6000);
    expect(stats.goodTimeMs).toBe(10000); // 5 good samples * 2000
    expect(stats.totalTimeMs).toBe(14000); // 7 samples * 2000
    expect(stats.averageGoodStreakMs).toBe(5000); // (4000 + 6000) / 2
    expect(stats.longestGoodStreakMs).toBe(6000);
    expect(stats.slouchCount).toBe(1);
  });

  test("is all-zero for no samples", () => {
    expect(sessionStats([], 2000, 6000)).toEqual({
      goodTimeMs: 0,
      totalTimeMs: 0,
      averageGoodStreakMs: 0,
      longestGoodStreakMs: 0,
      slouchCount: 0,
    });
  });
});

describe("formatDuration", () => {
  test("formats seconds, minutes, and hours", () => {
    expect(formatDuration(45000)).toBe("45s");
    expect(formatDuration(6 * 60000)).toBe("6m");
    expect(formatDuration(84 * 60000)).toBe("1h 24m");
  });
});

describe("bucketAverageScores", () => {
  test("groups samples into time buckets and averages each, oldest first", () => {
    const buckets = bucketAverageScores(
      [
        sample(0, 100, true, true, true),
        sample(500, 80, true, true, true),
        sample(2000, 60, true, true, true),
      ],
      1000
    );
    expect(buckets).toEqual([
      { bucketStart: 0, averageScore: 90 },
      { bucketStart: 2000, averageScore: 60 },
    ]);
  });
});
