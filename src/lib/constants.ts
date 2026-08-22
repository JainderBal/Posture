// Central place for tunable constants — no magic numbers in components or lib code.

// Throttle landmark detection to keep CPU reasonable (~20 detections/sec).
export const DETECT_INTERVAL_MS = 50;

// Calibration captures posture samples over a short window, then averages them.
export const CALIBRATION_DURATION_MS = 1500;
export const CALIBRATION_SAMPLE_INTERVAL_MS = 100;

// Landmark dot + connector rendering on the overlay canvas.
export const POSE_DOT_RADIUS = 3.5;
export const FACE_DOT_RADIUS = 2.5;
export const CONNECTOR_WIDTH = 1.5;

// Overlay colors switch by state: red before calibration, green once calibrated.
export const OVERLAY_DOT_UNCALIBRATED = "#d71921";
export const OVERLAY_CONNECTOR_UNCALIBRATED = "rgba(215, 25, 33, 0.65)";
export const OVERLAY_DOT_GOOD = "#16a34a";
export const OVERLAY_CONNECTOR_GOOD = "rgba(22, 163, 74, 0.65)";

// Shoulders come from the Pose model (it has no face precision but tracks the body).
export const POSE_LEFT_SHOULDER_INDEX = 11;
export const POSE_RIGHT_SHOULDER_INDEX = 12;
export const POSTURE_POSE_INDICES = [POSE_LEFT_SHOULDER_INDEX, POSE_RIGHT_SHOULDER_INDEX];

// Facial reference points come from the precise Face Landmarker mesh (478 points
// incl. iris). Iris centers sit on the pupils; the tragion points mark the ears.
export const FACE_NOSE_TIP_INDEX = 1;
export const FACE_LEFT_IRIS_INDEX = 468;
export const FACE_RIGHT_IRIS_INDEX = 473;
export const FACE_LEFT_EAR_INDEX = 234;
export const FACE_RIGHT_EAR_INDEX = 454;
export const POSTURE_FACE_INDICES = [
  FACE_NOSE_TIP_INDEX,
  FACE_LEFT_IRIS_INDEX,
  FACE_RIGHT_IRIS_INDEX,
  FACE_LEFT_EAR_INDEX,
  FACE_RIGHT_EAR_INDEX,
];
