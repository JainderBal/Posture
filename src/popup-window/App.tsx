import WebcamFeed from "./WebcamFeed";
import styles from "./App.module.css";

// Popup card window. Stage 1: just the raw webcam feed. Detection/checklist come later.
export default function App() {
  return (
    <div className={styles.card}>
      <WebcamFeed />
    </div>
  );
}
