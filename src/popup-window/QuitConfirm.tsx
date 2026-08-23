import { motion } from "motion/react";
import styles from "./QuitConfirm.module.css";

interface QuitConfirmProps {
  onCancel: () => void;
  onConfirm: () => void;
}

// Confirmation shown before quitting: quitting stops the automatic posture popup.
export default function QuitConfirm({ onCancel, onConfirm }: QuitConfirmProps) {
  return (
    <div className={styles.overlay}>
      <motion.div
        className={styles.dialog}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 340, damping: 26 }}
      >
        <p className={styles.title}>Quit Posture Coach?</p>
        <p className={styles.message}>
          Posture monitoring will stop — it won't pop up to remind you when you start slouching.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.keep} onClick={onCancel}>
            Keep running
          </button>
          <button type="button" className={styles.quit} onClick={onConfirm}>
            Quit
          </button>
        </div>
      </motion.div>
    </div>
  );
}
