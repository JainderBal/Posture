import { getCurrentWindow } from "@tauri-apps/api/window";
import LiveDot from "./LiveDot";
import styles from "./PopupHeader.module.css";

// Hides the popup window (temporary manual control until Stage 5's auto show/hide).
async function hidePopupWindow() {
  await getCurrentWindow().hide();
}

// Draggable card header: wordmark, live indicator, and a minimize control.
export default function PopupHeader() {
  return (
    <header className={styles.header} data-tauri-drag-region>
      <span className={styles.wordmark}>Posture Coach</span>
      <div className={styles.controls}>
        <LiveDot />
        <button
          type="button"
          className={styles.minimize}
          onClick={hidePopupWindow}
          aria-label="Minimize"
        >
          <span className={styles.minimizeGlyph} />
        </button>
      </div>
    </header>
  );
}
