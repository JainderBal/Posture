// Pure posture geometry + calibration. No React, no DOM, no side effects.

import type {
  Point,
  PostureLandmarks,
  Baseline,
  CheckResult,
  PostureAssessment,
} from "../types/posture";
import {
  HEAD_TILT_TOLERANCE_DEGREES,
  SHOULDER_TILT_TOLERANCE_DEGREES,
  DISTANCE_TOO_CLOSE_RATIO,
  SCORE_WEIGHT_HEAD,
  SCORE_WEIGHT_SHOULDERS,
  SCORE_WEIGHT_DISTANCE,
} from "./constants";

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

// Checks head tilt: how far the eye-line angle has drifted from the baseline.
export function checkHead(landmarks: PostureLandmarks, baseline: Baseline): CheckResult {
  const angle = lineAngleDegrees(landmarks.leftEye, landmarks.rightEye);
  const delta = Math.abs(angle - baseline.eyeAngleDegrees);
  return { pass: delta <= HEAD_TILT_TOLERANCE_DEGREES, delta };
}

// Checks shoulder tilt: how far the shoulder-line angle has drifted from baseline.
export function checkShoulders(landmarks: PostureLandmarks, baseline: Baseline): CheckResult {
  const angle = lineAngleDegrees(landmarks.leftShoulder, landmarks.rightShoulder);
  const delta = Math.abs(angle - baseline.shoulderAngleDegrees);
  return { pass: delta <= SHOULDER_TILT_TOLERANCE_DEGREES, delta };
}

// Checks screen distance: the eyes appear farther apart as the face nears the screen.
export function checkDistance(landmarks: PostureLandmarks, baseline: Baseline): CheckResult {
  const distance = pointDistance(landmarks.leftEye, landmarks.rightEye);
  const ratio = distance / baseline.eyeDistance;
  return { pass: ratio <= DISTANCE_TOO_CLOSE_RATIO, delta: ratio };
}

// Combines the three checks into a weighted 0-100 posture score.
export function computeScore(
  head: CheckResult,
  shoulders: CheckResult,
  distance: CheckResult
): number {
  const weighted =
    SCORE_WEIGHT_HEAD * (head.pass ? 1 : 0) +
    SCORE_WEIGHT_SHOULDERS * (shoulders.pass ? 1 : 0) +
    SCORE_WEIGHT_DISTANCE * (distance.pass ? 1 : 0);
  return Math.round(100 * weighted);
}

// Runs all checks against the baseline and returns a full assessment.
export function assessPosture(landmarks: PostureLandmarks, baseline: Baseline): PostureAssessment {
  const head = checkHead(landmarks, baseline);
  const shoulders = checkShoulders(landmarks, baseline);
  const distance = checkDistance(landmarks, baseline);
  return { head, shoulders, distance, score: computeScore(head, shoulders, distance) };
}
