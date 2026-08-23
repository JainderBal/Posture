// All SQLite access for posture history. No raw SQL anywhere else.

import Database from "@tauri-apps/plugin-sql";
import type { PostureSample } from "../types/posture";

const DB_URL = "sqlite:posture.db";
let databasePromise: Promise<Database> | null = null;

// Schema for the samples table. Mirrors the Rust migration in src-tauri/src/lib.rs
// (kept here too so the store/retrieve logic can be tested against a real sqlite).
export const CREATE_SAMPLES_TABLE_SQL = `CREATE TABLE IF NOT EXISTS posture_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  score INTEGER NOT NULL,
  head_ok INTEGER NOT NULL,
  shoulders_ok INTEGER NOT NULL,
  distance_ok INTEGER NOT NULL
);`;

const INSERT_SAMPLE_SQL =
  "INSERT INTO posture_samples (timestamp, score, head_ok, shoulders_ok, distance_ok) VALUES ($1, $2, $3, $4, $5)";

const SELECT_SAMPLES_IN_RANGE_SQL =
  "SELECT timestamp, score, head_ok, shoulders_ok, distance_ok FROM posture_samples WHERE timestamp >= $1 AND timestamp <= $2 ORDER BY timestamp ASC";

// Row shape as stored (booleans are 0/1 integers in SQLite).
interface SampleRow {
  timestamp: number;
  score: number;
  head_ok: number;
  shoulders_ok: number;
  distance_ok: number;
}

// Converts a stored row back into a PostureSample (0/1 -> boolean).
export function toSample(row: SampleRow): PostureSample {
  return {
    timestamp: row.timestamp,
    score: row.score,
    headOk: row.head_ok === 1,
    shouldersOk: row.shoulders_ok === 1,
    distanceOk: row.distance_ok === 1,
  };
}

// Flattens a sample into positional insert params (boolean -> 0/1).
export function sampleToParams(sample: PostureSample): number[] {
  return [
    sample.timestamp,
    sample.score,
    sample.headOk ? 1 : 0,
    sample.shouldersOk ? 1 : 0,
    sample.distanceOk ? 1 : 0,
  ];
}

// Loads (and caches) the SQLite database. The table is created by a Rust migration.
function getDatabase(): Promise<Database> {
  if (!databasePromise) databasePromise = Database.load(DB_URL);
  return databasePromise;
}

// Persists a single posture sample.
export async function insertSample(sample: PostureSample): Promise<void> {
  const db = await getDatabase();
  await db.execute(INSERT_SAMPLE_SQL, sampleToParams(sample));
}

// Returns samples with a timestamp in [startMs, endMs], oldest first.
export async function getSamplesInRange(startMs: number, endMs: number): Promise<PostureSample[]> {
  const db = await getDatabase();
  const rows = await db.select<SampleRow[]>(SELECT_SAMPLES_IN_RANGE_SQL, [startMs, endMs]);
  return rows.map(toSample);
}
