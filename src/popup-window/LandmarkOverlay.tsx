import { useEffect, useRef, type RefObject } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import {
  initLandmarkers,
  detectFrame,
  closeLandmarkers,
  type Landmarkers,
  type FrameLandmarks,
} from "../lib/mediapipe";
import {
  DETECT_INTERVAL_MS,
  POSE_DOT_RADIUS,
  FACE_DOT_RADIUS,
  POSE_DOT_COLOR,
  FACE_DOT_COLOR,
  CONNECTOR_COLOR,
  CONNECTOR_WIDTH,
  POSTURE_POSE_INDICES,
  POSTURE_FACE_INDICES,
} from "../lib/constants";
import styles from "./LandmarkOverlay.module.css";

interface LandmarkOverlayProps {
  videoRef: RefObject<HTMLVideoElement>;
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
  height: number
) {
  if (landmarks.length < 2) return;
  const ordered = [...landmarks].sort((a, b) => a.x - b.x);
  ctx.strokeStyle = CONNECTOR_COLOR;
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
  frame: FrameLandmarks | null
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
    drawConnector(ctx, facePoints, width, height);
    drawDots(ctx, facePoints, width, height, FACE_DOT_RADIUS, FACE_DOT_COLOR);
  }

  const [poseLandmarks] = frame.pose.landmarks;
  if (poseLandmarks) {
    const shoulderPoints = selectLandmarks(poseLandmarks, POSTURE_POSE_INDICES);
    drawConnector(ctx, shoulderPoints, width, height);
    drawDots(ctx, shoulderPoints, width, height, POSE_DOT_RADIUS, POSE_DOT_COLOR);
  }
}

// Overlays a canvas on the webcam feed and renders live MediaPipe landmark dots.
export default function LandmarkOverlay({ videoRef }: LandmarkOverlayProps) {
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
      }
      drawFrame(canvas, video, latestFrame);
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
  }, [videoRef]);

  return <canvas ref={canvasRef} className={styles.overlay} />;
}
