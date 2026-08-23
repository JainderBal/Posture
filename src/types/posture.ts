// Shared posture domain types. No logic here — just shapes.

export interface Point {
  x: number;
  y: number;
}

// The posture-relevant landmarks extracted from a single detection frame.
export interface PostureLandmarks {
  leftEye: Point;
  rightEye: Point;
  leftEar: Point;
  rightEar: Point;
  nose: Point;
  leftShoulder: Point;
  rightShoulder: Point;
}

// The user's captured "good posture" reference, produced by calibrate().
export interface Baseline {
  eyeAngleDegrees: number; // head-tilt reference (angle of the eye line)
  shoulderGap: number; // shoulder-height reference (shoulder-to-nose gap / eye distance)
  eyeDistance: number; // screen-distance reference (distance between the eyes)
}

// The result of a single posture check against the baseline.
export interface CheckResult {
  pass: boolean;
  delta: number; // how far from baseline (degrees, or distance ratio)
}

// A full posture evaluation for one frame.
export interface PostureAssessment {
  head: CheckResult;
  shoulders: CheckResult;
  distance: CheckResult;
  score: number; // 0-100
}

// A logged posture reading persisted to local SQLite (one every ~2s).
export interface PostureSample {
  timestamp: number;
  score: number;
  headOk: boolean;
  shouldersOk: boolean;
  distanceOk: boolean;
}
