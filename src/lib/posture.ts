// Pure posture geometry + calibration. No React, no DOM, no side effects.

import type {
  Point,
  PostureLandmarks,
  Baseline,
  CheckResult,
  PostureAssessment,
  PostureSample,
} from "../types/posture";
import {
  HEAD_TILT_TOLERANCE_DEGREES,
  SHOULDER_HUNCH_MIN_RATIO,
  DISTANCE_TOO_CLOSE_RATIO,
  SCORE_WEIGHT_HEAD,
  SCORE_WEIGHT_SHOULDERS,
  SCORE_WEIGHT_DISTANCE,
} from "./constants";

// Euclidean distance between two points.
export function pointDistance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Linear interpolation between two points by factor t (0 = a, 1 = b).
function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// Exponential moving average of landmark positions to damp per-frame jitter.
// Shoulders (from the noisier Pose model) get their own, usually heavier, factor.
export function smoothLandmarks(
  previous: PostureLandmarks,
  current: PostureLandmarks,
  alpha: number,
  shoulderAlpha: number = alpha
): PostureLandmarks {
  return {
    leftEye: lerpPoint(previous.leftEye, current.leftEye, alpha),
    rightEye: lerpPoint(previous.rightEye, current.rightEye, alpha),
    leftEar: lerpPoint(previous.leftEar, current.leftEar, alpha),
    rightEar: lerpPoint(previous.rightEar, current.rightEar, alpha),
    nose: lerpPoint(previous.nose, current.nose, alpha),
    leftShoulder: lerpPoint(previous.leftShoulder, current.leftShoulder, shoulderAlpha),
    rightShoulder: lerpPoint(previous.rightShoulder, current.rightShoulder, shoulderAlpha),
  };
}

// Angle (degrees) of the line from a to b, measured from the horizontal.
export function lineAngleDegrees(a: Point, b: Point): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

// Vertical gap between the higher shoulder and the nose, normalized by eye
// distance. Uses the higher (smaller-gap) shoulder so a one-sided raise is
// caught as well as a symmetric hunch. Shrinks when either shoulder rises.
export function shoulderGap(landmarks: PostureLandmarks): number {
  const eyeDistance = pointDistance(landmarks.leftEye, landmarks.rightEye);
  const leftGap = (landmarks.leftShoulder.y - landmarks.nose.y) / eyeDistance;
  const rightGap = (landmarks.rightShoulder.y - landmarks.nose.y) / eyeDistance;
  return Math.min(leftGap, rightGap);
}

// Averages a list of numbers (returns 0 for an empty list).
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Averages posture samples into a Baseline capturing the user's good posture.
export function calibrate(samples: PostureLandmarks[]): Baseline {
  const eyeAngles = samples.map((s) => lineAngleDegrees(s.leftEye, s.rightEye));
  const shoulderGaps = samples.map((s) => shoulderGap(s));
  const eyeDistances = samples.map((s) => pointDistance(s.leftEye, s.rightEye));

  return {
    eyeAngleDegrees: average(eyeAngles),
    shoulderGap: average(shoulderGaps),
    eyeDistance: average(eyeDistances),
  };
}

// Checks head tilt: how far the eye-line angle has drifted from the baseline.
export function checkHead(landmarks: PostureLandmarks, baseline: Baseline): CheckResult {
  const angle = lineAngleDegrees(landmarks.leftEye, landmarks.rightEye);
  const delta = Math.abs(angle - baseline.eyeAngleDegrees);
  return { pass: delta <= HEAD_TILT_TOLERANCE_DEGREES, delta };
}

// Checks shoulder hunch: the shoulder-to-head gap shrinks as shoulders rise up.
export function checkShoulders(landmarks: PostureLandmarks, baseline: Baseline): CheckResult {
  const ratio = shoulderGap(landmarks) / baseline.shoulderGap;
  return { pass: ratio >= SHOULDER_HUNCH_MIN_RATIO, delta: ratio };
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

// Maps an assessment + timestamp into a flat sample for persistence.
export function buildSample(assessment: PostureAssessment, timestamp: number): PostureSample {
  return {
    timestamp,
    score: assessment.score,
    headOk: assessment.head.pass,
    shouldersOk: assessment.shoulders.pass,
    distanceOk: assessment.distance.pass,
  };
}

export type PostureIssue = "head" | "shoulders" | "distance";

// The most important failing check to coach on: head, then shoulders, then distance.
export function topPriorityIssue(assessment: PostureAssessment): PostureIssue | null {
  if (!assessment.head.pass) return "head";
  if (!assessment.shoulders.pass) return "shoulders";
  if (!assessment.distance.pass) return "distance";
  return null;
}
