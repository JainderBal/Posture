import { useEffect, useState, type ReactNode, type RefObject } from "react";
import styles from "./WebcamFeed.module.css";

type CameraStatus = "requesting" | "granted" | "denied";

interface WebcamFeedProps {
  videoRef: RefObject<HTMLVideoElement>;
  children?: ReactNode;
}

// Requests webcam access and renders the live video feed. The parent owns the
// video ref so overlays (e.g. LandmarkOverlay) can read the same frames.
export default function WebcamFeed({ videoRef, children }: WebcamFeedProps) {
  const [status, setStatus] = useState<CameraStatus>("requesting");
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startCamera() {
      setStatus("requesting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
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
  }, [videoRef, attempt]);

  // Match the frame to the camera's real aspect ratio so there are no letterbox bars.
  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (video && video.videoHeight > 0) {
      setAspectRatio(video.videoWidth / video.videoHeight);
    }
  }

  if (status === "denied") {
    return (
      <div className={styles.message}>
        <span>Camera unavailable</span>
        <button type="button" className={styles.retry} onClick={() => setAttempt((a) => a + 1)}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className={styles.frame}
      style={aspectRatio ? { aspectRatio: `${aspectRatio}` } : undefined}
    >
      <video
        ref={videoRef}
        className={styles.video}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={handleLoadedMetadata}
        aria-label="Live webcam feed"
      />
      {status === "requesting" && <div className={styles.starting}>Starting camera…</div>}
      {children}
    </div>
  );
}
