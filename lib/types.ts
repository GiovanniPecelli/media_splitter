// ─── Job Status ───────────────────────────────────────────────────────────────

export type JobStatus = "pending" | "probing" | "splitting" | "done" | "error";

// ─── Part ─────────────────────────────────────────────────────────────────────

export interface JobPart {
  /** 1-indexed part number */
  index: number;
  /** Filename, e.g. part_001.mp4 */
  filename: string;
  /** Absolute path on disk */
  filePath: string;
  /** Duration of this segment in seconds */
  durationSec: number;
  /** File size in bytes (set after split completes) */
  sizeBytes: number;
  /** Start time in seconds within the original video */
  startSec: number;
  /** End time in seconds within the original video */
  endSec: number;
}

// ─── Job ──────────────────────────────────────────────────────────────────────

export interface Job {
  /** UUID v4 */
  id: string;
  /** Name for the batch, used for naming generated parts */
  batchName: string;
  status: JobStatus;
  /** Array of input files uploaded together */
  inputs: { originalName: string; inputPath: string; durationSec: number; bitrate: number }[];
  /** Directory where outputs are written */
  outputDir: string;
  /** Total video duration in seconds */
  totalDurationSec: number;
  /** Split interval in seconds (user-chosen) */
  splitSec: number;
  /** Parts once splitting begins */
  parts: JobPart[];
  /** Overall progress 0–100 */
  progress: number;
  /** Error message if status === 'error' */
  error?: string;
  /** Whether to re-encode to fit under 200MB limit per part */
  optimizeForRAG?: boolean;
  /** ISO timestamp of job creation */
  createdAt: string;
  /** ISO timestamp of job completion */
  completedAt?: string;
}

// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface UploadResponse {
  jobId: string;
  totalDurationSec: number;
  splitSec: number;
  expectedParts: number;
}

export interface ProgressEvent {
  status: JobStatus;
  progress: number;
  parts: JobPart[];
  error?: string;
}
