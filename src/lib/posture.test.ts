import { describe, expect, test } from "vitest";
import { pointDistance, lineAngleDegrees, calibrate } from "./posture";
import type { PostureLandmarks, Point } from "../types/posture";

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
