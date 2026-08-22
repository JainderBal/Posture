import { describe, expect, test } from "vitest";
import {
  pointDistance,
  lineAngleDegrees,
  calibrate,
  checkHead,
  checkShoulders,
  checkDistance,
  computeScore,
  smoothLandmarks,
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

// Builds a sample with explicit head + shoulder heights for shoulder-gap tests.
// shoulderGap = (shoulderY - noseY) / eyeDistance; smaller = shoulders hunched up.
function poseWith(eyeDistance: number, noseY: number, shoulderY: number): PostureLandmarks {
  return {
    leftEye: { x: 0, y: 0 },
    rightEye: { x: eyeDistance, y: 0 },
    leftEar: { x: 0, y: 0 },
    rightEar: { x: eyeDistance, y: 0 },
    nose: { x: eyeDistance / 2, y: noseY },
    leftShoulder: { x: 0, y: shoulderY },
    rightShoulder: { x: eyeDistance, y: shoulderY },
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

  test("captures a level eye line as ~0 degrees", () => {
    const baseline = calibrate([makeSample(10, 0), makeSample(10, 0)]);
    expect(baseline.eyeAngleDegrees).toBeCloseTo(0);
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
  const baseline = calibrate([poseWith(10, 20, 100)]); // shoulderGap = 8

  test("passes when shoulders stay near their calibrated height", () => {
    expect(checkShoulders(poseWith(10, 20, 96), baseline).pass).toBe(true); // gap 7.6, ratio 0.95
  });

  test("fails when the shoulders are hunched up toward the head", () => {
    expect(checkShoulders(poseWith(10, 20, 78), baseline).pass).toBe(false); // gap 5.8, ratio 0.725
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

describe("smoothLandmarks", () => {
  test("with alpha 1 returns the current sample unchanged", () => {
    const current = makeSample(20, 30);
    expect(smoothLandmarks(makeSample(10, 0), current, 1)).toEqual(current);
  });

  test("with alpha 0.5 blends halfway between previous and current", () => {
    const smoothed = smoothLandmarks(makeSample(10, 0), makeSample(20, 0), 0.5);
    expect(smoothed.rightEye.x).toBeCloseTo(15);
  });

  test("applies a separate, heavier smoothing factor to the shoulders", () => {
    // Face snaps fully to current; shoulders are frozen at previous.
    const smoothed = smoothLandmarks(makeSample(10, 0), makeSample(20, 0), 1, 0);
    expect(smoothed.rightEye.x).toBeCloseTo(20);
    expect(smoothed.rightShoulder.x).toBeCloseTo(10);
  });
});
