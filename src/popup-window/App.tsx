import { useRef } from "react";
import { motion } from "motion/react";
import PopupHeader from "./PopupHeader";
import WebcamFeed from "./WebcamFeed";
import LandmarkOverlay from "./LandmarkOverlay";
import styles from "./App.module.css";

// Posture checks shown in the card. Stage 4 replaces these placeholders with live results.
const POSTURE_CHECKS = ["Head", "Shoulders", "Screen distance"] as const;

// Popup card window. Stage 2: header, viewfinder with live landmark dots, pending panel.
export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);

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
          <LandmarkOverlay videoRef={videoRef} />
        </WebcamFeed>
      </div>

      <div className={styles.panel}>
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

        <p className={styles.status}>Calibration pending</p>
      </div>
    </motion.div>
  );
}
