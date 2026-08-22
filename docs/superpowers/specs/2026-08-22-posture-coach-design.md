# Posture Coach — Design Doc

Date: 2026-08-22
Repo: https://github.com/JainderBal/Posture.git
Status: Approved, ready for implementation

This doc records the decisions made during brainstorming. It sits on top of the
original spec (`posture-app-system-design.md`) and captures the resolved
technical choices and the deltas from the literal spec. The full coding
standard and build order live in the repo-root `CLAUDE.md`.

## 1. What we're building

A Tauri desktop app that watches the user via webcam, detects slouching with
on-device MediaPipe pose/face detection, and shows a small always-on-top
floating card (bottom-right) that appears when posture is bad and disappears
when it's good. All processing is local — nothing leaves the machine. Posture
state is logged to local SQLite and shown in a dashboard.

## 2. Architecture (two windows, DB as the only link)

- **`main` window** — dashboard. Read-only against SQLite. Opened manually /
  visible at launch. Never touches the camera.
- **`popup` window** — the floating card. Frameless, always-on-top,
  transparent, non-resizable, ~320x400, positioned bottom-right with ~20px
  margin, created hidden.

The popup window is **always loaded and running** — webcam + MediaPipe +
DB writes happen continuously from app start, even while the popup is hidden.
Only its *visibility* toggles: hidden while posture is good, shown when the
score drops. The main window reads the same SQLite DB. No cross-window event
bus.

```
POPUP (webcam + AI + checks)  --writes-->  SQLite  <--reads--  MAIN (dashboard)
```

Lifecycle:
- App launches -> main visible (dashboard), popup created hidden but already
  detecting + logging.
- User slouches -> popup becomes visible to nag.
- User corrects -> popup hides again, still logging.

## 3. Resolved technical decisions

### MediaPipe asset strategy (fully local, no CDN)
A packaged Tauri app runs under a strict CSP with no network access to models
by design. So we bundle everything locally:
- A setup script downloads the MediaPipe **WASM runtime** and the two `.task`
  model files into local app assets (`public/` or `src-tauri` assets).
- `src/lib/mediapipe.ts` loads them from local `asset://` paths.
- Models: **Pose Landmarker "lite"** + **Face Landmarker** (lite is plenty for
  posture, easy on CPU). GPU delegate when available, CPU fallback otherwise.

### Two windows in one Vite build
- Two HTML entry points: `main.html` -> `src/main-window/App.tsx`,
  `popup.html` -> `src/popup-window/App.tsx`.
- `tauri.conf.json` declares both windows. Popup: `decorations: false`,
  `alwaysOnTop: true`, `resizable: false`, `transparent: true`,
  `visible: false`.
- Bottom-right positioning computed in Rust (`windows.rs`) from the primary
  monitor work area.

### Posture math — pure and testable
All geometry/scoring lives in `src/lib/posture.ts` as pure functions (no React,
no DOM, no side effects):
- `calibrate(samples)` -> `Baseline { eyeAngle, shoulderAngle, eyeDistance }`
- `checkHead / checkShoulders / checkDistance(landmarks, baseline)` ->
  `CheckResult { pass, delta }`
- `computeScore(head, shoulders, distance)` -> 0-100

All thresholds are named constants in `src/lib/constants.ts`. Types in
`src/types/posture.ts`. **Vitest unit tests** cover these pure functions
(synthetic landmark data -> assert pass/fail + score). This is how the
non-visual stages are self-verified without hardware.

### Data model & error handling
`PostureSample { timestamp, score, headOk, shouldersOk, distanceOk }`, one row
every `SAMPLE_INTERVAL_MS` (~1-2s). All DB access via `src/lib/db.ts`
(`insertSample`, `getSamplesInRange`, plus aggregation helpers). Handled
failure modes:
- Camera denied / no camera -> popup shows a clear "grant camera access" state.
- No baseline yet -> checks skipped, UI prompts "Calibrate first".
- DB write fails -> log and keep detecting; one bad insert never kills the
  detector.

## 4. Deltas from the literal spec

- **Git:** commit per *logical unit* (not per function), push at end of each
  stage (not after every commit). AI attribution is fine (portfolio project).
  Still: explicit file staging, no `git add .`.
- **Build cadence:** grouped. Self-verify plumbing (scaffold, geometry math,
  DB) with typecheck + Vitest; hard-stop at three on-camera checkpoints.
- **Rust install:** deferred to Stage 0, done right before the scaffold needs
  to compile.

## 5. Build plan

| Stage | What | Verification |
|---|---|---|
| 0 | Install Rust + Windows prereqs (WebView2, C++ Build Tools) | `cargo tauri` works |
| 1 | Tauri scaffold, two windows, popup positioned/always-on-top, raw webcam | CHECKPOINT 1 — webcam shows in popup |
| 2 | MediaPipe wired, landmark dots on canvas | CHECKPOINT 2 — dots track live |
| 3 | Calibration -> Baseline | Vitest + glance at debug values |
| 4 | Geometry checks + score + checklist UI | Vitest -> confirm checklist updates live |
| 5 | Show/hide popup on score threshold + coaching text | CHECKPOINT 3 — popup appears/hides on slouch |
| 6 | SQLite logging | Query DB, assert rows |
| 7 | Main window dashboard (Recharts) | Review with real data |
| 8 | Polish — tray, autostart, coaching refinement | Final review |

## 6. Non-goals for v1

- No gamification/XP/leaderboard (needs backend + auth, separate scope).
- No cloud sync — fully local.
- No mobile build.

## Developer's responsibilities

The human developer must:
1. **Stage 0:** install Rust + Windows build prerequisites (interactive,
   system-level).
2. **Checkpoints 1-3:** physically run the app and confirm the camera-/display-
   dependent behavior works (webcam feed, landmark tracking, popup show/hide).
3. Review the dashboard (Stage 7) and final polish (Stage 8).
