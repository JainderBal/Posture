// Prepares local MediaPipe assets so nothing is fetched from a CDN at runtime.
// Copies the WASM runtime out of node_modules and downloads the .task models.
// Idempotent: skips work that is already done.

import { mkdir, copyFile, readdir, access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const wasmSourceDir = join(projectRoot, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmTargetDir = join(projectRoot, "public", "wasm");
const modelsTargetDir = join(projectRoot, "public", "models");

// Pretrained model files (lite pose for low CPU cost, plus face landmarker).
const MODELS = [
  {
    fileName: "pose_landmarker_lite.task",
    url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
  },
  {
    fileName: "face_landmarker.task",
    url: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
  },
];

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Copies every WASM runtime file into public/wasm so it ships with the app.
async function copyWasmRuntime() {
  await mkdir(wasmTargetDir, { recursive: true });
  const files = await readdir(wasmSourceDir);
  for (const file of files) {
    await copyFile(join(wasmSourceDir, file), join(wasmTargetDir, file));
  }
  console.log(`✓ Copied ${files.length} WASM runtime files to public/wasm`);
}

// Downloads a single model file if it is not already present.
async function downloadModel({ fileName, url }) {
  await mkdir(modelsTargetDir, { recursive: true });
  const targetPath = join(modelsTargetDir, fileName);
  if (await fileExists(targetPath)) {
    const { size } = await stat(targetPath);
    console.log(`• ${fileName} already present (${(size / 1e6).toFixed(1)} MB), skipping`);
    return;
  }
  console.log(`↓ Downloading ${fileName} ...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${fileName}: HTTP ${response.status}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(targetPath));
  const { size } = await stat(targetPath);
  console.log(`✓ ${fileName} (${(size / 1e6).toFixed(1)} MB)`);
}

async function main() {
  await copyWasmRuntime();
  for (const model of MODELS) {
    await downloadModel(model);
  }
  console.log("All MediaPipe assets ready.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
