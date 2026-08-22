import { useRef, useState } from "react";
import { motion } from "motion/react";
import PopupHeader from "./PopupHeader";
import WebcamFeed from "./WebcamFeed";
import LandmarkOverlay from "./LandmarkOverlay";
import CalibrateButton from "./CalibrateButton";
import type { PostureLandmarks, Baseline } from "../types/posture";
import styles from "./App.module.css";

// Posture checks shown in the card. Stage 4 replaces these placeholders with live results.
const POSTURE_CHECKS = ["Head", "Shoulders", "Screen distance"] as const;

// Popup card window. Stage 3: adds calibration capturing a good-posture baseline.
export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarksRef = useRef<PostureLandmarks | null>(null);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function handleCalibrated(next: Baseline) {
    setBaseline(next);
    setNotice(null);
  }

  const isCalibrated = baseline !== null;
  const statusText =
    notice ??
    (baseline
      ? `Baseline · eye ${baseline.eyeAngleDegrees.toFixed(1)}° · shoulder ${baseline.shoulderAngleDegrees.toFixed(1)}° · dist ${baseline.eyeDistance.toFixed(3)}`
      : "Sit up straight, then calibrate");

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
          <LandmarkOverlay videoRef={videoRef} landmarksRef={landmarksRef} calibrated={isCalibrated} />
        </WebcamFeed>
      </div>

      <div className={styles.panel}>
        <div className={`${styles.readouts} ${isCalibrated ? "" : styles.locked}`}>
          <div className={styles.scoreRow}>
            <span className={styles.scoreLabel}>Score</span>
            <span className={styles.scoreValue}>
              —<span className={styles.scoreUnit}>%</span>
            </span>
          </div>

          <ul className={styles.checklist}>
            {POSTURE_CHECKS.map((check) => (
              <li key={check} className={styles.checkRow}>
                <span className={styles.checkLabel}>{check}</span>
                <span className={styles.checkPending} aria-label="pending" />
              </li>
            ))}
          </ul>
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
