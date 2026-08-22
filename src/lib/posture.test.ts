import { describe, expect, test } from "vitest";
import {
  pointDistance,
  lineAngleDegrees,
  calibrate,
  checkHead,
  checkShoulders,
  checkDistance,
  computeScore,
} from "./posture";
import type { PostureLandmarks, Point, CheckResult } from "../types/posture";

// Builds a PostureLandmarks sample from the two metrics calibrate cares about:
// an eye/shoulder line angle and an eye separation distance.
function makeSample(eyeDistance: number, angleDegrees: number): PostureLandmarks {
  const radians = (angleDegrees * Math.PI) / 180;
  const rightEye: Point = {
    x: eyeDistance * Math.cos(radians),
    y: eyeDistance * Math.sin(radians),
  };
  const origin: Point = { x: 0, y: 0 };
  return {
    leftEye: origin,
    rightEye,
    leftEar: origin,
    rightEar: rightEye,
    nose: { x: eyeDistance / 2, y: eyeDistance / 2 },
    leftShoulder: origin,
    rightShoulder: rightEye,
  };
}

describe("pointDistance", () => {
  test("computes the euclidean distance between two points", () => {
    expect(pointDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe("lineAngleDegrees", () => {
  test("is 0 for a horizontal line", () => {
    expect(lineAngleDegrees({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(0);
  });

  test("is 45 for a line sloping down to the right", () => {
    expect(lineAngleDegrees({ x: 0, y: 0 }, { x: 10, y: 10 })).toBeCloseTo(45);
  });
});

describe("calibrate", () => {
  test("averages the eye distance across samples", () => {
    const baseline = calibrate([makeSample(10, 0), makeSample(20, 0)]);
    expect(baseline.eyeDistance).toBeCloseTo(15);
  });

  test("captures a level pose as ~0 degrees for eyes and shoulders", () => {
    const baseline = calibrate([makeSample(10, 0), makeSample(10, 0)]);
    expect(baseline.eyeAngleDegrees).toBeCloseTo(0);
    expect(baseline.shoulderAngleDegrees).toBeCloseTo(0);
  });

  test("averages the eye-line angle across samples", () => {
    const baseline = calibrate([makeSample(10, 0), makeSample(10, 30)]);
    expect(baseline.eyeAngleDegrees).toBeCloseTo(15);
  });
});

describe("checkHead", () => {
  const baseline = calibrate([makeSample(10, 0)]);

  test("passes when head tilt is within tolerance", () => {
    expect(checkHead(makeSample(10, 3), baseline).pass).toBe(true);
  });

  test("fails when head tilt exceeds tolerance", () => {
    expect(checkHead(makeSample(10, 12), baseline).pass).toBe(false);
  });
});

describe("checkShoulders", () => {
  const baseline = calibrate([makeSample(10, 0)]);

  test("passes when shoulder tilt is within tolerance", () => {
    expect(checkShoulders(makeSample(10, 4), baseline).pass).toBe(true);
  });

  test("fails when shoulder tilt exceeds tolerance", () => {
    expect(checkShoulders(makeSample(10, 12), baseline).pass).toBe(false);
  });
});

describe("checkDistance", () => {
  const baseline = calibrate([makeSample(10, 0)]);

  test("passes when the face is at roughly the baseline distance", () => {
    expect(checkDistance(makeSample(11, 0), baseline).pass).toBe(true);
  });

  test("fails when the face is much closer than baseline", () => {
    expect(checkDistance(makeSample(13, 0), baseline).pass).toBe(false);
  });
});

describe("computeScore", () => {
  const pass: CheckResult = { pass: true, delta: 0 };
  const fail: CheckResult = { pass: false, delta: 99 };

  test("is 100 when all checks pass", () => {
    expect(computeScore(pass, pass, pass)).toBe(100);
  });

  test("is 0 when all checks fail", () => {
    expect(computeScore(fail, fail, fail)).toBe(0);
  });

  test("drops by the head weight when only the head check fails", () => {
    expect(computeScore(fail, pass, pass)).toBe(60);
  });
});
