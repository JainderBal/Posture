import { useEffect, useRef, useState } from "react";
import styles from "./WebcamFeed.module.css";

type CameraStatus = "requesting" | "granted" | "denied";

// Requests webcam access and renders the raw video feed. No MediaPipe yet (Stage 1).
export default function WebcamFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<CameraStatus>("requesting");

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus("granted");
      } catch {
        setStatus("denied");
      }
    }

    startCamera();

    return () => {
      activeStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  if (status === "denied") {
    return (
      <div className={styles.message}>
        Camera access is blocked. Please grant webcam permission and reopen.
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className={styles.video}
      autoPlay
      playsInline
      muted
      aria-label="Live webcam feed"
    />
  );
}
