import { useEffect, useRef, useState, type RefObject } from "react";
import { motion } from "motion/react";
import { calibrate } from "../lib/posture";
import { CALIBRATION_DURATION_MS, CALIBRATION_SAMPLE_INTERVAL_MS } from "../lib/constants";
import type { PostureLandmarks, Baseline } from "../types/posture";
import styles from "./CalibrateButton.module.css";

interface CalibrateButtonProps {
  landmarksRef: RefObject<PostureLandmarks | null>;
  isCalibrated: boolean;
  onCalibrated: (baseline: Baseline) => void;
  onNoDetection: () => void;
}

// Captures posture samples for a short window, then averages them into a Baseline.
export default function CalibrateButton({
  landmarksRef,
  isCalibrated,
  onCalibrated,
  onNoDetection,
}: CalibrateButtonProps) {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [justDone, setJustDone] = useState(false);
  const timers = useRef<number[]>([]);

  // Clear any pending timers if the component unmounts mid-calibration.
  useEffect(() => {
    return () => timers.current.forEach((id) => window.clearTimeout(id));
  }, []);

  function runCalibration() {
    if (isCalibrating) return;
    setIsCalibrating(true);
    setJustDone(false);
    setProgress(0);
    const samples: PostureLandmarks[] = [];
    const startedAt = performance.now();

    const samplerId = window.setInterval(() => {
      if (landmarksRef.current) samples.push(landmarksRef.current);
      setProgress(Math.min(1, (performance.now() - startedAt) / CALIBRATION_DURATION_MS));
    }, CALIBRATION_SAMPLE_INTERVAL_MS);

    const stopId = window.setTimeout(() => {
      window.clearInterval(samplerId);
      setIsCalibrating(false);
      setProgress(0);
      console.log(`[calibrate] captured ${samples.length} samples`);
      if (samples.length === 0) {
        onNoDetection();
        return;
      }
      const baseline = calibrate(samples);
      console.log("[calibrate] baseline", baseline);
      onCalibrated(baseline);
      setJustDone(true);
      const resetId = window.setTimeout(() => setJustDone(false), 1600);
      timers.current = [resetId];
    }, CALIBRATION_DURATION_MS);

    timers.current = [samplerId, stopId];
  }

  // Pulse the button while it is the primary action (uncalibrated, not running).
  const shouldPulse = !isCalibrated && !isCalibrating && !justDone;
  const label = isCalibrating
    ? `Hold still… ${Math.round(progress * 100)}%`
    : justDone
      ? "Recalibrated ✓"
      : isCalibrated
        ? "Recalibrate"
        : "Calibrate";

  return (
    <motion.button
      type="button"
      className={`${styles.button} ${isCalibrated ? styles.secondary : styles.primary}`}
      onClick={runCalibration}
      disabled={isCalibrating}
      animate={
        shouldPulse
          ? { boxShadow: ["0 0 0 rgba(215,25,33,0)", "0 0 16px rgba(215,25,33,0.55)", "0 0 0 rgba(215,25,33,0)"] }
          : { boxShadow: "0 0 0 rgba(215,25,33,0)" }
      }
      transition={shouldPulse ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
    >
      {label}
    </motion.button>
  );
}
