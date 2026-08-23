import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import PopupHeader from "./PopupHeader";
import WebcamFeed from "./WebcamFeed";
import LandmarkOverlay from "./LandmarkOverlay";
import CalibrateButton from "./CalibrateButton";
import ScoreBadge from "./ScoreBadge";
import Checklist from "./Checklist";
import CoachingText from "./CoachingText";
import { buildSample } from "../lib/posture";
import { insertSample } from "../lib/db";
import {
  ASSESSMENT_POLL_MS,
  SAMPLE_INTERVAL_MS,
  SCORE_SHOW_THRESHOLD,
  POPUP_SHOW_DELAY_MS,
  POPUP_HIDE_DELAY_MS,
} from "../lib/constants";
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

  // Poll the latest assessment to drive the UI, and auto show/hide the popup:
  // it appears when the score stays low, and hides once posture recovers.
  // Time-based debounce keeps it stable even when the hidden window is throttled.
  useEffect(() => {
    const appWindow = getCurrentWindow();
    let badSince: number | null = null;
    let goodSince: number | null = null;
    let popupShown = true; // visible on launch so the user can calibrate

    const id = window.setInterval(() => {
      const current = assessmentRef.current;
      setAssessment(current);
      if (!baselineRef.current || !current) return; // no auto show/hide until calibrated

      const now = performance.now();
      if (current.score < SCORE_SHOW_THRESHOLD) {
        goodSince = null;
        if (badSince === null) badSince = now;
        if (!popupShown && now - badSince >= POPUP_SHOW_DELAY_MS) {
          popupShown = true;
          void appWindow.show();
        }
      } else {
        badSince = null;
        if (goodSince === null) goodSince = now;
        if (popupShown && now - goodSince >= POPUP_HIDE_DELAY_MS) {
          popupShown = false;
          void appWindow.hide();
        }
      }
    }, ASSESSMENT_POLL_MS);

    return () => window.clearInterval(id);
  }, []);

  // Persist one posture sample every SAMPLE_INTERVAL_MS while calibrated.
  // A failed write is logged but never interrupts detection.
  useEffect(() => {
    const id = window.setInterval(() => {
      const current = assessmentRef.current;
      if (!baselineRef.current || !current) return;
      void insertSample(buildSample(current, Date.now())).catch((error) =>
        console.error("posture sample insert failed", error)
      );
    }, SAMPLE_INTERVAL_MS);
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
          <CoachingText assessment={assessment} />
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
