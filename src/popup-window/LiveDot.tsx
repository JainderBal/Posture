import { motion } from "motion/react";
import styles from "./LiveDot.module.css";

// A pulsing red "live" indicator dot — signals the detector is actively running.
export default function LiveDot() {
  return (
    <span className={styles.wrapper}>
      <motion.span
        className={styles.dot}
        animate={{ opacity: [1, 0.35, 1], scale: [1, 0.8, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className={styles.label}>Live</span>
    </span>
  );
}
