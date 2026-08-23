import TitleBar from "./TitleBar";
import Dashboard from "./Dashboard";
import styles from "./App.module.css";

// Main dashboard window: title bar + posture history dashboard.
export default function App() {
  return (
    <div className={styles.app}>
      <TitleBar />
      <main className={styles.content}>
        <Dashboard />
      </main>
    </div>
  );
}
