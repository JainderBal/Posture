# Posture Coach

A desktop app that watches your posture through the webcam and nudges you to sit up straight — all processed **on-device**, nothing leaves your machine.

A small floating card appears in the corner **only when you slouch**, shows exactly what's wrong (head / shoulders / screen distance), and disappears once you correct. A dashboard tracks how your posture held up over the day.

**Repo:** https://github.com/JainderBal/Posture
**Download:** grab the installer from the [Releases](https://github.com/JainderBal/Posture/releases) page.

---

## What it does

- **On-device pose detection** — a webcam feed runs through Google's MediaPipe (Pose + Face landmarkers) locally. No frames are uploaded anywhere.
- **Personalized calibration** — you capture your own "good posture" baseline once; everything is judged against *your* build and camera angle, not a generic ideal.
- **Only nags when needed** — the floating coach pops up after you've been slouching for ~1.5s and hides ~1.2s after you recover.
- **Tells you the fix** — a red/green overlay on your webcam plus one coaching line ("Straighten your head", "Relax your shoulders", "Sit back from the screen").
- **History dashboard** — good-posture time, average & best good streaks, number of slouches, a score trend, and your most common issues, for Today or the last 7 days.
- **Runs in the background** — system tray with Show Dashboard / Show Coach / Quit, and an optional launch-at-startup.

## Privacy

Everything is **fully local**. The webcam stream is processed in-app via WebAssembly; posture history is stored in a local SQLite file. There is no server, no account, and no network calls at runtime (the ML models are bundled with the app).

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| App shell | **Tauri 2** (Rust backend, native webview) | Tiny binary, native window control, no Electron bloat |
| Frontend | **React + TypeScript + Vite** | Fast, typed UI |
| Styling | **CSS Modules** + a little Tailwind | Co-located, scoped component styles |
| Pose/CV | **MediaPipe Tasks Vision** (Pose Landmarker "lite" + Face Landmarker) | Pretrained, on-device, no training needed |
| Storage | **SQLite** via `tauri-plugin-sql` | Local posture history |
| Charts | **Recharts** | Dashboard trend chart |
| Animation | **Motion** (Framer Motion) | Spring transitions, the score count-up |
| Tray / startup | Tauri tray + `tauri-plugin-autostart` | Background-app behavior |
| Tests | **Vitest** | Unit tests for the pure geometry/scoring/stats |

---

## Architecture

Two independent windows that communicate **only through the shared SQLite database** — no cross-window event bus.

```
POPUP (webcam + MediaPipe + checks)  --writes-->  SQLite  <--reads--  DASHBOARD (charts)
```

- **Popup window** — frameless, always-on-top, bottom-right. Owns the webcam stream, runs detection continuously, evaluates posture, shows/hides itself, and writes a `PostureSample` row every ~2s.
- **Dashboard window** — a custom-chrome window that reads the same database and auto-refreshes, so it reflects what the popup logged even while it was closed.

All **posture math is pure and unit-tested** (`src/lib/posture.ts`, `src/lib/analytics.ts`) — no geometry or scoring lives inside React components. Components only render.

### Data model

One `posture_samples` row is written every ~2s while monitoring (created by a Rust migration; all access goes through `src/lib/db.ts`):

```sql
CREATE TABLE posture_samples (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     INTEGER NOT NULL,  -- epoch milliseconds
  score         INTEGER NOT NULL,  -- 0-100
  head_ok       INTEGER NOT NULL,  -- 0 / 1
  shoulders_ok  INTEGER NOT NULL,  -- 0 / 1
  distance_ok   INTEGER NOT NULL   -- 0 / 1
);
```

Stored at `%APPDATA%/com.jainderbal.posturecoach/posture.db` on Windows. Booleans are `0/1` integers; the dashboard aggregates these rows into the streak/trend stats.

---

## How the logic works

### Calibration
You sit up straight and hit **Calibrate**. It samples ~1.5s of landmarks and averages them into a `Baseline`:
- `eyeAngleDegrees` — the tilt of your eye line
- `shoulderGap` — the vertical gap from your shoulders up to your head, normalized by face size
- `eyeDistance` — the spacing between your eyes (a proxy for how close you are)

### The three checks (each vs. your baseline)
| Check | Metric | Fails when |
|---|---|---|
| **Head** | angle of the eye line | it deviates more than **5°** from baseline |
| **Shoulders** | shoulder-to-head gap (uses the *higher* shoulder, so a one-sided raise counts) | the gap shrinks below **90%** of baseline (hunch/shrug) |
| **Distance** | spacing between the eyes | it grows **>10%** wider than baseline (you leaned in) |

Facial points come from the precise **Face** mesh (iris centers, nose, ears); shoulders come from the **Pose** model and are smoothed more heavily because they're noisier.

### Score
A weighted sum of the passing checks, ×100:

```
score = 100 × (0.40·head + 0.35·shoulders + 0.25·distance)   // each term 1 if passing, else 0
```

All pass → **100**. Head fails → 60. Shoulders fail → 65. Distance fails → 75. "Good" = **score ≥ 80**, which (since any single failure drops below 80) means all three pass. That 80 line drives the show/hide.

### Show / hide + coaching
Time-based debounce: the popup shows after the score stays under 80 for ~1.5s and hides after it stays good for ~1.2s. A single coaching line is chosen by priority: **head → shoulders → distance**.

### Dashboard stats
Computed purely from the logged samples (`sessionStats`): total good-posture time, average and longest good streak, slouch count (one per good→bad episode), a time-bucketed score trend, and how often each check failed.

---

## Project structure

```
src/
├── main-window/     Dashboard UI (StatGrid, ScoreTrendChart, CommonIssuesList, TitleBar…)
├── popup-window/    Floating coach (WebcamFeed, LandmarkOverlay, Checklist, ScoreBadge…)
├── lib/
│   ├── posture.ts     pure geometry + calibration + checks + scoring  (unit-tested)
│   ├── analytics.ts   pure dashboard aggregation                       (unit-tested)
│   ├── mediapipe.ts   MediaPipe init + inference wrapper
│   ├── db.ts          all SQLite access
│   └── constants.ts   every threshold / timing, named — no magic numbers
├── types/           shared domain types
└── shared/          cross-window helpers
src-tauri/
├── src/
│   ├── lib.rs         app setup, SQL migration, tray, autostart
│   └── windows.rs     popup creation/positioning, show/open commands
scripts/
└── prepare-assets.mjs downloads MediaPipe models + copies the WASM runtime locally
```

---

## Running it yourself

**Prerequisites**
- Node.js 20+
- Rust (stable) + the Windows **"Desktop development with C++"** build tools (MSVC linker)

**Dev**
```bash
npm install
npm run tauri dev     # prepares MediaPipe assets automatically, then launches
```

**Build a release installer**
```bash
npm run tauri build   # outputs to src-tauri/target/release/bundle/
```

**Tests**
```bash
npm test              # Vitest: geometry, scoring, stats, and a real-SQLite round trip
npm run typecheck
```
