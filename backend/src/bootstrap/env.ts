import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prefer backend/.env, fallback to repo root .env
const candidates = [
  path.join(__dirname, "../.env"), // backend/.env
  path.join(__dirname, "../../.env"), // deem2/.env
];

let loadedFrom: string | null = null;

for (const p of candidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    loadedFrom = p;
    break;
  }
}

if (!loadedFrom) {
  console.warn("[env] No .env file found. Looked in:", candidates);
} else {
  // Optional: helpful one-time log
  // console.log("[env] Loaded env from:", loadedFrom);
}
