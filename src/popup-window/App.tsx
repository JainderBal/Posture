import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import PopupHeader from "./PopupHeader";
import WebcamFeed from "./WebcamFeed";
import LandmarkOverlay from "./LandmarkOverlay";
import CalibrateButton from "./CalibrateButton";
import ScoreBadge from "./ScoreBadge";
import Checklist from "./Checklist";
import { ASSESSMENT_POLL_MS } from "../lib/constants";
import type { PostureLandmarks, Baseline, PostureAssessment } from "../types/posture";
import styles from "./App.module.css";

// Popup card window. Stage 4: live per-check score + checklist against the baseline.
export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarksRef = useRef<PostureLandmarks | null>(null);
  const baselineRef = useRef<Baseline | null>(null);
  const assessmentRef = useRef<PostureAssessment | null>(null);

  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [assessment, setAssessment] = useState<PostureAssessment | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Keep the ref the overlay reads in sync with the baseline state.
  useEffect(() => {
    baselineRef.current = baseline;
  }, [baseline]);

  // Poll the latest assessment (written each frame by the overlay) to drive the UI.
  useEffect(() => {
    const id = window.setInterval(() => setAssessment(assessmentRef.current), ASSESSMENT_POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  function handleCalibrated(next: Baseline) {
    setBaseline(next);
    setNotice(null);
  }

  const isCalibrated = baseline !== null;
  const statusText =
    notice ?? (isCalibrated ? "Calibrated" : "Sit up straight, then calibrate");

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
    >
      <PopupHeader />

      <div className={styles.viewfinder}>
        <WebcamFeed videoRef={videoRef}>
          <LandmarkOverlay
            videoRef={videoRef}
            landmarksRef={landmarksRef}
            baselineRef={baselineRef}
            assessmentRef={assessmentRef}
          />
        </WebcamFeed>
      </div>

      <div className={styles.panel}>
        <div className={`${styles.readouts} ${isCalibrated ? "" : styles.locked}`}>
          <ScoreBadge score={assessment?.score ?? null} />
          <Checklist assessment={assessment} />
        </div>

        <div className={styles.actions}>
          <CalibrateButton
            landmarksRef={landmarksRef}
            isCalibrated={isCalibrated}
            onCalibrated={handleCalibrated}
            onNoDetection={() => setNotice("No posture detected — move into frame and retry")}
          />
          <p className={styles.status}>{statusText}</p>
        </div>
      </div>
    </motion.div>
  );
}
