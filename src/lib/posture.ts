// Pure posture geometry + calibration. No React, no DOM, no side effects.

import type { Point, PostureLandmarks, Baseline } from "../types/posture";

// Euclidean distance between two points.
export function pointDistance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Angle (degrees) of the line from a to b, measured from the horizontal.
export function lineAngleDegrees(a: Point, b: Point): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

// Averages a list of numbers (returns 0 for an empty list).
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Averages posture samples into a Baseline capturing the user's good posture.
export function calibrate(samples: PostureLandmarks[]): Baseline {
  const eyeAngles = samples.map((s) => lineAngleDegrees(s.leftEye, s.rightEye));
  const shoulderAngles = samples.map((s) => lineAngleDegrees(s.leftShoulder, s.rightShoulder));
  const eyeDistances = samples.map((s) => pointDistance(s.leftEye, s.rightEye));

  return {
    eyeAngleDegrees: average(eyeAngles),
    shoulderAngleDegrees: average(shoulderAngles),
    eyeDistance: average(eyeDistances),
  };
}
