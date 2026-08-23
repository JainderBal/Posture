import { createRequire } from "node:module";
import { describe, expect, test } from "vitest";
import { CREATE_SAMPLES_TABLE_SQL, toSample, sampleToParams } from "./db";
import { calibrate, assessPosture, buildSample } from "./posture";
import type { PostureLandmarks } from "../types/posture";

// node:sqlite is a newer builtin the bundler can't resolve; load it at runtime.
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite");

interface StoredRow {
  timestamp: number;
  score: number;
  head_ok: number;
  shoulders_ok: number;
  distance_ok: number;
}

// Fabricate a pose by choosing the shoulder height (lower y = raised toward the head).
function poseWithShoulderY(shoulderY: number): PostureLandmarks {
  return {
    leftEye: { x: 0, y: 0 },
    rightEye: { x: 10, y: 0 },
    leftEar: { x: 0, y: 0 },
    rightEar: { x: 10, y: 0 },
    nose: { x: 5, y: 20 },
    leftShoulder: { x: 0, y: shoulderY },
    rightShoulder: { x: 10, y: shoulderY },
  };
}

describe("posture sample persistence (real sqlite round trip)", () => {
  test("seeds fabricated samples and reads back only the in-range rows, booleans intact", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(CREATE_SAMPLES_TABLE_SQL);

    const baseline = calibrate([poseWithShoulderY(100)]);
    const good = buildSample(assessPosture(poseWithShoulderY(100), baseline), 1000);
    const hunched = buildSample(assessPosture(poseWithShoulderY(70), baseline), 2000);
    const outOfRange = buildSample(assessPosture(poseWithShoulderY(100), baseline), 9000);

    const insert = db.prepare(
      "INSERT INTO posture_samples (timestamp, score, head_ok, shoulders_ok, distance_ok) VALUES (?, ?, ?, ?, ?)"
    );
    for (const sample of [good, hunched, outOfRange]) {
      insert.run(...sampleToParams(sample));
    }

    const rows = db
      .prepare(
        "SELECT timestamp, score, head_ok, shoulders_ok, distance_ok FROM posture_samples WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC"
      )
      .all(500, 3000) as StoredRow[];
    db.close();

    const result = rows.map(toSample);

    expect(result).toHaveLength(2); // the 9000ms row is filtered out
    expect(result[0]).toEqual(good);
    expect(result[1]).toEqual(hunched);
    expect(result[0].shouldersOk).toBe(true);
    expect(result[1].shouldersOk).toBe(false); // fabricated hunch stored + read back correctly
  });
});
