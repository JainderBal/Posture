import { getCurrentWindow } from "@tauri-apps/api/window";
import styles from "./TitleBar.module.css";

const appWindow = getCurrentWindow();

function MinimizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="1.5" y="1.5" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

// Custom frameless title bar (draggable) with brand mark and window controls.
export default function TitleBar() {
  return (
    <div className={styles.bar} data-tauri-drag-region>
      <div className={styles.brand}>
        <span className={styles.wordmark}>Posture Coach</span>
      </div>
      <div className={styles.controls}>
        <button className={styles.control} onClick={() => appWindow.minimize()} aria-label="Minimize">
          <MinimizeIcon />
        </button>
        <button className={styles.control} onClick={() => appWindow.toggleMaximize()} aria-label="Maximize">
          <MaximizeIcon />
        </button>
        <button
          className={`${styles.control} ${styles.close}`}
          onClick={() => appWindow.close()}
          aria-label="Close"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
