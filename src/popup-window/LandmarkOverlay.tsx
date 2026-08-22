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
import type { PostureLandmarks } from "../types/posture";
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

const UNCALIBRATED_COLORS: OverlayColors = {
  dot: OVERLAY_DOT_UNCALIBRATED,
  connector: OVERLAY_CONNECTOR_UNCALIBRATED,
};
const GOOD_COLORS: OverlayColors = {
  dot: OVERLAY_DOT_GOOD,
  connector: OVERLAY_CONNECTOR_GOOD,
};

interface LandmarkOverlayProps {
  videoRef: RefObject<HTMLVideoElement>;
  landmarksRef: MutableRefObject<PostureLandmarks | null>;
  calibrated: boolean;
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

// Clears the canvas and draws the latest face + pose landmarks over the video.
function drawFrame(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  frame: FrameLandmarks | null,
  colors: OverlayColors
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
    drawConnector(ctx, facePoints, width, height, colors.connector);
    drawDots(ctx, facePoints, width, height, FACE_DOT_RADIUS, colors.dot);
  }

  const [poseLandmarks] = frame.pose.landmarks;
  if (poseLandmarks) {
    const shoulderPoints = selectLandmarks(poseLandmarks, POSTURE_POSE_INDICES);
    drawConnector(ctx, shoulderPoints, width, height, colors.connector);
    drawDots(ctx, shoulderPoints, width, height, POSE_DOT_RADIUS, colors.dot);
  }
}

// Overlays a canvas on the webcam feed and renders live MediaPipe landmark dots.
export default function LandmarkOverlay({ videoRef, landmarksRef, calibrated }: LandmarkOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorsRef = useRef<OverlayColors>(UNCALIBRATED_COLORS);

  // Flip dot/line colors green once a baseline exists.
  useEffect(() => {
    colorsRef.current = calibrated ? GOOD_COLORS : UNCALIBRATED_COLORS;
  }, [calibrated]);

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
        landmarksRef.current = extractPostureLandmarks(latestFrame);
      }
      drawFrame(canvas, video, latestFrame, colorsRef.current);
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
  }, [videoRef, landmarksRef]);

  return <canvas ref={canvasRef} className={styles.overlay} />;
}
