import { describe, expect, test } from "vitest";
import { averageScore, postureSplit, issueCounts, bucketAverageScores } from "./analytics";
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
