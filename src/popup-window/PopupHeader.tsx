import { getCurrentWindow, Window } from "@tauri-apps/api/window";
import LiveDot from "./LiveDot";
import styles from "./PopupHeader.module.css";

// Hides the popup temporarily; it re-appears automatically when posture drops.
async function hidePopupWindow() {
  await getCurrentWindow().hide();
}

// Quits the whole app: close the dashboard then this popup (stops monitoring).
async function quitApp() {
  const main = await Window.getByLabel("main");
  await main?.close();
  await getCurrentWindow().close();
}

// Draggable card header: wordmark, live indicator, minimize (hide) and quit.
export default function PopupHeader() {
  return (
    <header className={styles.header} data-tauri-drag-region>
      <span className={styles.wordmark}>Posture Coach</span>
      <div className={styles.controls}>
        <LiveDot />
        <button
          type="button"
          className={styles.iconButton}
          onClick={hidePopupWindow}
          aria-label="Hide"
          title="Hide (re-appears when you slouch)"
        >
          <span className={styles.minimizeGlyph} />
        </button>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.quit}`}
          onClick={quitApp}
          aria-label="Quit"
          title="Quit Posture Coach"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="currentColor" strokeWidth="1.3" />
            <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
      </div>
    </header>
  );
}
