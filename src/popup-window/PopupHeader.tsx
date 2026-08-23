import LiveDot from "./LiveDot";
import styles from "./PopupHeader.module.css";

interface PopupHeaderProps {
  onRequestQuit: () => void;
}

// Draggable card header: wordmark, live indicator, and a quit control.
export default function PopupHeader({ onRequestQuit }: PopupHeaderProps) {
  return (
    <header className={styles.header} data-tauri-drag-region>
      <span className={styles.wordmark}>Posture Coach</span>
      <div className={styles.controls}>
        <LiveDot />
        <button
          type="button"
          className={`${styles.iconButton} ${styles.quit}`}
          onClick={onRequestQuit}
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
