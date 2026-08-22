import { Window } from "@tauri-apps/api/window";
import styles from "./App.module.css";

// Temporary dev control: re-show the popup card after it has been minimized.
// Stage 5 replaces this with automatic score-driven show/hide.
async function showPopupWindow() {
  const popup = await Window.getByLabel("popup");
  await popup?.show();
  await popup?.setFocus();
}

// Placeholder dashboard window. Real dashboard (charts, history) lands in Stage 7.
export default function App() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Posture Coach</h1>
      <p className={styles.subtitle}>Main window (dashboard) — scaffold placeholder.</p>
      <button type="button" className={styles.devButton} onClick={showPopupWindow}>
        Show popup
      </button>
    </div>
  );
}
