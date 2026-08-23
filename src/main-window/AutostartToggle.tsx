import { useEffect, useState } from "react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import styles from "./AutostartToggle.module.css";

// Toggles launch-on-startup via the autostart plugin.
export default function AutostartToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    isEnabled()
      .then(setEnabled)
      .catch(() => setEnabled(false));
  }, []);

  async function toggle() {
    try {
      if (enabled) {
        await disable();
        setEnabled(false);
      } else {
        await enable();
        setEnabled(true);
      }
    } catch (error) {
      console.error("autostart toggle failed", error);
    }
  }

  if (enabled === null) return null;

  return (
    <button
      type="button"
      className={`${styles.toggle} ${enabled ? styles.on : ""}`}
      onClick={toggle}
      aria-pressed={enabled}
    >
      <span className={styles.dot} />
      Launch at startup
    </button>
  );
}
