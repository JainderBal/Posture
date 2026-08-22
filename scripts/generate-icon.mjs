// Renders the app logo to a 1024px PNG that `tauri icon` turns into the full
// icon set. The mark: a red head over white shoulders + upright spine on black.

import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = join(projectRoot, "src-tauri", "icon-source.png");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#0a0a0a"/>
  <circle cx="512" cy="352" r="132" fill="#d71921"/>
  <rect x="268" y="486" width="488" height="92" rx="46" fill="#ffffff"/>
  <rect x="466" y="558" width="92" height="300" rx="46" fill="#ffffff"/>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(outputPath);
console.log(`Wrote ${outputPath}`);
