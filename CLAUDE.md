# PostureCoach

A Tauri desktop app that uses on-device pose detection (MediaPipe) to monitor
posture via webcam and shows a floating alert card when posture is bad.

## Stack
- Tauri 2.x (Rust backend, React + TypeScript frontend)
- MediaPipe Tasks Vision (Pose Landmarker + Face Landmarker) — runs client-side
- Tailwind for layout utility classes; CSS Modules for component styling
- SQLite (tauri-plugin-sql) for local posture history
- Recharts for dashboard charts
- Vitest for unit-testing the pure geometry/scoring functions

## Architecture
- Two windows: `main` (dashboard) and `popup` (floating always-on-top card,
  bottom-right corner, frameless, ~320x400px)
- MediaPipe detection runs inside the popup window. The popup window is always
  loaded and running — it owns the webcam stream and writes PostureSample rows
  to local SQLite on an interval, even while hidden. Only its visibility
  toggles: hidden while posture is good, shown when the score drops.
- Main window is read-only against the same SQLite db — no cross-window
  event bus needed for v1.

## MediaPipe assets
- Models run fully local — no CDN at runtime (packaged app runs under strict
  CSP). WASM runtime + the two `.task` model files are bundled locally and
  loaded via local asset paths from src/lib/mediapipe.ts.
- Pose Landmarker "lite" + Face Landmarker; GPU delegate when available, CPU
  fallback otherwise.

## Geometry logic lives in src/lib/posture.ts
Pure, testable functions only — no React, no side effects. See functions:
calibrate(), checkHead(), checkShoulders(), checkDistance(), computeScore().
Thresholds are named constants in src/lib/constants.ts, not inline magic numbers.

## Data model
PostureSample { timestamp, score, headOk, shouldersOk, distanceOk }
One sample every 1-2s, not per-frame.

## Code quality standard
- No magic numbers or strings anywhere — every threshold, size, timing value,
  or repeated string is a named constant in constants.ts (or a local named
  const if it's genuinely file-scoped and not reused).
- Variable and function names are descriptive and unabbreviated
  (e.g. `shoulderAngleDegrees`, not `sAng` or `x1`).
- One component = one responsibility. If a component is doing layout, state,
  AND styling, split it.
- Styles are never inline and never in the same file as component logic.
  Every component `Foo.tsx` gets a co-located `Foo.module.css`. Tailwind
  utility classes are fine inside JSX, but any repeated long className
  combination gets extracted into a shared helper — no duplicated class
  strings across files.
- Business logic (geometry, scoring, calibration math) never lives inside a
  React component — it lives in src/lib/ as pure functions, imported and
  called from components. Components only handle rendering + wiring.
- Types live in src/types/, not inlined ad-hoc in component files.
- Every exported function has a one-line comment above it stating what it
  does, if the name alone doesn't make it obvious.
- No function longer than ~30-40 lines — extract helpers if it grows past that.

## Git discipline
- Commit after each logical unit of work (a coherent, self-contained change),
  not necessarily every single function.
- Commit messages: `feat(scope): description` (or fix/chore/test as fitting).
- Never `git add .` — stage explicit files.
- Push at the end of each build stage.

## Build order (do not skip ahead)
0. Install Rust + Windows build prerequisites (WebView2, C++ Build Tools)
1. Tauri scaffold, two windows, popup positioned + always-on-top, webcam permission
2. MediaPipe wired up in popup, landmarks drawn on canvas, no logic yet
3. Calibration flow
4. Geometry checks + score + checklist UI
5. Show/hide popup based on score threshold
6. SQLite sample logging
7. Main window dashboard
8. Polish (coaching text refinement, tray, autostart)

## Non-goals for v1
- No gamification/XP/leaderboard (needs backend+auth, separate scope)
- No cloud sync — fully local
- No mobile build
