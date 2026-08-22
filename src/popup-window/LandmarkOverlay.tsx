import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import {
  initLandmarkers,
  detectFrame,
  closeLandmarkers,
  extractPostureLandmarks,
  type Landmarkers,
  type FrameLandmarks,
} from "../lib/mediapipe";
import { assessPosture } from "../lib/posture";
import type { PostureLandmarks, Baseline, PostureAssessment } from "../types/posture";
import {
  DETECT_INTERVAL_MS,
  POSE_DOT_RADIUS,
  FACE_DOT_RADIUS,
  CONNECTOR_WIDTH,
  OVERLAY_DOT_UNCALIBRATED,
  OVERLAY_CONNECTOR_UNCALIBRATED,
  OVERLAY_DOT_GOOD,
  OVERLAY_CONNECTOR_GOOD,
  POSTURE_POSE_INDICES,
  POSTURE_FACE_INDICES,
} from "../lib/constants";
import styles from "./LandmarkOverlay.module.css";

interface OverlayColors {
  dot: string;
  connector: string;
}

const GOOD_COLORS: OverlayColors = { dot: OVERLAY_DOT_GOOD, connector: OVERLAY_CONNECTOR_GOOD };
const BAD_COLORS: OverlayColors = {
  dot: OVERLAY_DOT_UNCALIBRATED,
  connector: OVERLAY_CONNECTOR_UNCALIBRATED,
};

interface LandmarkOverlayProps {
  videoRef: RefObject<HTMLVideoElement>;
  landmarksRef: MutableRefObject<PostureLandmarks | null>;
  baselineRef: MutableRefObject<Baseline | null>;
  assessmentRef: MutableRefObject<PostureAssessment | null>;
}

// Draws a set of normalized landmarks as filled dots on the canvas context.
function drawDots(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  radius: number,
  color: string
) {
  ctx.fillStyle = color;
  for (const landmark of landmarks) {
    ctx.beginPath();
    ctx.arc(landmark.x * width, landmark.y * height, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Picks a subset of landmarks by index, skipping any that are missing.
function selectLandmarks(landmarks: NormalizedLandmark[], indices: number[]): NormalizedLandmark[] {
  return indices.map((index) => landmarks[index]).filter(Boolean);
}

// Draws a thin line through the given landmarks in left-to-right order.
function drawConnector(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  color: string
) {
  if (landmarks.length < 2) return;
  const ordered = [...landmarks].sort((a, b) => a.x - b.x);
  ctx.strokeStyle = color;
  ctx.lineWidth = CONNECTOR_WIDTH;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ordered.forEach((landmark, index) => {
    const x = landmark.x * width;
    const y = landmark.y * height;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

// Clears the canvas and draws the face + shoulder landmarks, each in its own color.
function drawFrame(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  frame: FrameLandmarks | null,
  faceColors: OverlayColors,
  shoulderColors: OverlayColors
) {
  const width = video.clientWidth;
  const height = video.clientHeight;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  if (!frame) return;

  const [faceLandmarks] = frame.face.faceLandmarks;
  if (faceLandmarks) {
    const facePoints = selectLandmarks(faceLandmarks, POSTURE_FACE_INDICES);
    drawConnector(ctx, facePoints, width, height, faceColors.connector);
    drawDots(ctx, facePoints, width, height, FACE_DOT_RADIUS, faceColors.dot);
  }

  const [poseLandmarks] = frame.pose.landmarks;
  if (poseLandmarks) {
    const shoulderPoints = selectLandmarks(poseLandmarks, POSTURE_POSE_INDICES);
    drawConnector(ctx, shoulderPoints, width, height, shoulderColors.connector);
    drawDots(ctx, shoulderPoints, width, height, POSE_DOT_RADIUS, shoulderColors.dot);
  }
}

// Overlays a canvas on the webcam feed: live landmark dots colored by posture checks.
export default function LandmarkOverlay({
  videoRef,
  landmarksRef,
  baselineRef,
  assessmentRef,
}: LandmarkOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let landmarkers: Landmarkers | null = null;
    let animationId = 0;
    let lastDetectAt = 0;
    let latestFrame: FrameLandmarks | null = null;
    let cancelled = false;

    function renderLoop() {
      animationId = requestAnimationFrame(renderLoop);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !landmarkers || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return;
      }

      const now = performance.now();
      if (now - lastDetectAt >= DETECT_INTERVAL_MS) {
        lastDetectAt = now;
        latestFrame = detectFrame(landmarkers, video, now);
        const landmarks = extractPostureLandmarks(latestFrame);
        landmarksRef.current = landmarks;
        const baseline = baselineRef.current;
        assessmentRef.current = landmarks && baseline ? assessPosture(landmarks, baseline) : null;
      }

      const assessment = assessmentRef.current;
      const faceColors = assessment?.head.pass ? GOOD_COLORS : BAD_COLORS;
      const shoulderColors = assessment?.shoulders.pass ? GOOD_COLORS : BAD_COLORS;
      drawFrame(canvas, video, latestFrame, faceColors, shoulderColors);
    }

    async function start() {
      landmarkers = await initLandmarkers();
      if (cancelled) {
        closeLandmarkers(landmarkers);
        return;
      }
      renderLoop();
    }

    start().catch((error) => console.error("MediaPipe initialization failed", error));

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationId);
      if (landmarkers) closeLandmarkers(landmarkers);
    };
  }, [videoRef, landmarksRef, baselineRef, assessmentRef]);

  return <canvas ref={canvasRef} className={styles.overlay} />;
}
