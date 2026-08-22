// MediaPipe setup + inference wrapper. Pure module: no React, no DOM rendering.
// Loads the Pose + Face landmarkers from local assets (no CDN at runtime).

import {
  FilesetResolver,
  PoseLandmarker,
  FaceLandmarker,
  type PoseLandmarkerResult,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

const WASM_BASE_PATH = "/wasm";
const POSE_MODEL_PATH = "/models/pose_landmarker_lite.task";
const FACE_MODEL_PATH = "/models/face_landmarker.task";

type Vision = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;

export interface Landmarkers {
  pose: PoseLandmarker;
  face: FaceLandmarker;
}

export interface FrameLandmarks {
  pose: PoseLandmarkerResult;
  face: FaceLandmarkerResult;
}

// Creates the pose landmarker, preferring the GPU delegate and falling back to CPU.
async function createPoseLandmarker(vision: Vision): Promise<PoseLandmarker> {
  const options = { modelAssetPath: POSE_MODEL_PATH } as const;
  try {
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { ...options, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
    });
  } catch {
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { ...options, delegate: "CPU" },
      runningMode: "VIDEO",
      numPoses: 1,
    });
  }
}

// Creates the face landmarker, preferring the GPU delegate and falling back to CPU.
async function createFaceLandmarker(vision: Vision): Promise<FaceLandmarker> {
  const options = { modelAssetPath: FACE_MODEL_PATH } as const;
  try {
    return await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { ...options, delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 1,
    });
  } catch {
    return await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { ...options, delegate: "CPU" },
      runningMode: "VIDEO",
      numFaces: 1,
    });
  }
}

// Initializes both landmarkers from the local WASM + model files.
export async function initLandmarkers(): Promise<Landmarkers> {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE_PATH);
  const pose = await createPoseLandmarker(vision);
  const face = await createFaceLandmarker(vision);
  return { pose, face };
}

// Runs pose + face inference on a single video frame at the given timestamp (ms).
export function detectFrame(
  landmarkers: Landmarkers,
  video: HTMLVideoElement,
  timestampMs: number
): FrameLandmarks {
  return {
    pose: landmarkers.pose.detectForVideo(video, timestampMs),
    face: landmarkers.face.detectForVideo(video, timestampMs),
  };
}

// Releases native resources held by the landmarkers.
export function closeLandmarkers(landmarkers: Landmarkers): void {
  landmarkers.pose.close();
  landmarkers.face.close();
}
