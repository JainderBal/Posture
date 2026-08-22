import styles from "./App.module.css";

// Placeholder dashboard window. Real dashboard (charts, history) lands in Stage 7.
export default function App() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Posture Coach</h1>
      <p className={styles.subtitle}>Main window (dashboard) — scaffold placeholder.</p>
    </div>
  );
}
