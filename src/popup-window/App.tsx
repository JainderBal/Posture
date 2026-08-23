import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import PopupHeader from "./PopupHeader";
import WebcamFeed from "./WebcamFeed";
import LandmarkOverlay from "./LandmarkOverlay";
import CalibrateButton from "./CalibrateButton";
import ScoreBadge from "./ScoreBadge";
import Checklist from "./Checklist";
import CoachingText from "./CoachingText";
import QuitConfirm from "./QuitConfirm";
import { buildSample } from "../lib/posture";
import { insertSample } from "../lib/db";
import {
  ASSESSMENT_POLL_MS,
  SAMPLE_INTERVAL_MS,
  SCORE_SHOW_THRESHOLD,
  POPUP_SHOW_DELAY_MS,
  POPUP_HIDE_DELAY_MS,
  SCORE_RAMP_HOLD_MS,
} from "../lib/constants";
import type { PostureLandmarks, Baseline, PostureAssessment } from "../types/posture";
import styles from "./App.module.css";

// Popup card: pops up on sustained bad posture, hides once posture recovers.
export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarksRef = useRef<PostureLandmarks | null>(null);
  const baselineRef = useRef<Baseline | null>(null);
  const assessmentRef = useRef<PostureAssessment | null>(null);
  const popupVisibleRef = useRef(true); // visible on launch so the user can calibrate
  const confirmOpenRef = useRef(false); // pause auto show/hide while confirming quit
  const rampStartRef = useRef(100); // score the display ramps up from once posture is good
  const badSinceRef = useRef<number | null>(null); // when the current bad stretch began
  const goodSinceRef = useRef<number | null>(null); // when the current good stretch began

  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [assessment, setAssessment] = useState<PostureAssessment | null>(null);
  const [displayScore, setDisplayScore] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Keep the ref the overlay reads in sync with the baseline state.
  useEffect(() => {
    baselineRef.current = baseline;
  }, [baseline]);

  // Poll the assessment to drive the UI, and auto show/hide the popup window:
  // it appears on sustained bad posture and hides once posture recovers.
  useEffect(() => {
    const appWindow = getCurrentWindow();

    const id = window.setInterval(() => {
      const current = assessmentRef.current;
      setAssessment(current);
      if (!baselineRef.current || !current || confirmOpenRef.current) {
        setDisplayScore(current?.score ?? null);
        return;
      }

      const now = performance.now();
      if (current.score < SCORE_SHOW_THRESHOLD) {
        goodSinceRef.current = null;
        rampStartRef.current = current.score;
        setDisplayScore(current.score);
        if (badSinceRef.current === null) badSinceRef.current = now;
        if (!popupVisibleRef.current && now - badSinceRef.current >= POPUP_SHOW_DELAY_MS) {
          popupVisibleRef.current = true;
          void appWindow.show();
        }
      } else {
        badSinceRef.current = null;
        if (goodSinceRef.current === null) goodSinceRef.current = now;
        // Ramp the shown score up to 100 a touch before the hide, so it visibly
        // lands on 100% and holds rather than closing mid-count.
        const rampMs = Math.max(1, POPUP_HIDE_DELAY_MS - SCORE_RAMP_HOLD_MS);
        const progress = Math.min(1, (now - goodSinceRef.current) / rampMs);
        const start = rampStartRef.current;
        setDisplayScore(Math.round(start + (100 - start) * progress));
        if (popupVisibleRef.current && now - goodSinceRef.current >= POPUP_HIDE_DELAY_MS) {
          popupVisibleRef.current = false;
          void appWindow.hide();
        }
      }
    }, ASSESSMENT_POLL_MS);

    return () => window.clearInterval(id);
  }, []);

  // When reopened from the dashboard, treat the popup as freshly shown so it
  // restarts the show/hide timing (auto-hides ~1.2s later if posture is good).
  useEffect(() => {
    const unlisten = listen("coach-opened", () => {
      popupVisibleRef.current = true;
      goodSinceRef.current = performance.now();
      badSinceRef.current = null;
    });
    return () => {
      void unlisten.then((off) => off());
    };
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

  function requestQuit() {
    confirmOpenRef.current = true;
    setShowQuitConfirm(true);
  }
  function cancelQuit() {
    confirmOpenRef.current = false;
    setShowQuitConfirm(false);
  }
  async function confirmQuit() {
    await getCurrentWindow().close(); // closes only the popup; the dashboard stays open
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
      <PopupHeader onRequestQuit={requestQuit} />

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
          <ScoreBadge score={displayScore} />
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

      {showQuitConfirm && <QuitConfirm onCancel={cancelQuit} onConfirm={confirmQuit} />}
    </motion.div>
  );
}
