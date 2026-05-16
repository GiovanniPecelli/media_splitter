import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as path from "path";
import { EventEmitter } from "events";
import { Job, JobPart } from "./types";

// ─── FFmpeg Binary Resolution ─────────────────────────────────────────────────
// Use environment variable if set (Docker), otherwise let fluent-ffmpeg
// auto-detect from system PATH. Avoids @ffmpeg-installer bundling issues.

if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
} else {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    ffmpeg.setFfmpegPath(ffmpegPath);
  } catch { /* ignore */ }
}

if (process.env.FFPROBE_PATH) {
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
} else {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffprobePath = require('@ffprobe-installer/ffprobe').path;
    ffmpeg.setFfprobePath(ffprobePath);
  } catch { /* ignore */ }
}

// ─── Probe ────────────────────────────────────────────────────────────────────

export interface ProbeResult {
  durationSec: number;
  codec: string;
  width: number;
  height: number;
  bitrate: number;
}

export function probeVideo(filePath: string): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(new Error(`FFprobe failed: ${err.message}`));
        return;
      }

      const stream = metadata.streams?.find((s) => s.codec_type === "video");
      const durationSec = parseFloat(String(metadata.format?.duration ?? "0"));
      const bitrate = parseInt(String(metadata.format?.bit_rate ?? "0"), 10);

      if (!durationSec || isNaN(durationSec)) {
        reject(
          new Error("Could not read video duration — file may be corrupt or unsupported")
        );
        return;
      }

      resolve({
        durationSec,
        codec: stream?.codec_name ?? "unknown",
        width: stream?.width ?? 0,
        height: stream?.height ?? 0,
        bitrate,
      });
    });
  });
}

// ─── Build Part Manifest ──────────────────────────────────────────────────────

export function buildPartManifest(
  job: Job
): Omit<JobPart, "sizeBytes" | "filePath">[] {
  const parts: Omit<JobPart, "sizeBytes" | "filePath">[] = [];
  let index = 1;

  for (const input of job.inputs) {
    let splitSec = job.splitSec;
    
    // If optimizing for RAG, adjust duration down if bitrate is high
    if (job.optimizeForRAG && input.durationSec > 0) {
      const totalSizeBytes = input.durationSec * (input.bitrate / 8);
      const limitBytes = 195 * 1024 * 1024;
      
      if (totalSizeBytes > limitBytes) {
        // Max seconds to stay under limit = (limit / bitrate)
        const maxSafeSec = Math.floor((limitBytes * 8) / input.bitrate);
        splitSec = Math.min(splitSec, maxSafeSec);
      }
    }

    let start = 0;
    while (start < input.durationSec) {
      const end = Math.min(start + splitSec, input.durationSec);
      parts.push({
        index,
        filename: `${job.batchName}_${String(index).padStart(3, "0")}.mp4`,
        durationSec: end - start,
        startSec: start,
        endSec: end,
      });
      start = end;
      index++;
    }
  }

  return parts;
}

// ─── Split Engine ─────────────────────────────────────────────────────────────

/**
 * Splits the input video into parts using FFmpeg segment muxer with stream copy.
 * Zero quality loss, very CPU-efficient.
 *
 * Emits:
 *   'progress'  → { timeSec: number, overallPercent: number }
 *   'done'      → PartFile[]
 *   'error'     → Error
 */
export function splitVideo(job: Job): EventEmitter {
  const emitter = new EventEmitter();
  const outputPattern = path.join(job.outputDir, `${job.batchName}_%03d.mp4`);

  fs.mkdirSync(job.outputDir, { recursive: true });

  const totalSec = job.totalDurationSec;

  (async () => {
    let currentPartIndex = 1;
    let accumulatedSec = 0;

    for (const input of job.inputs) {
      let splitSec = job.splitSec;

      // Calculate safe split time for this specific file to stay under 200MB
      if (job.optimizeForRAG && input.durationSec > 0) {
        const limitBytes = 195 * 1024 * 1024;
        const maxSafeSec = Math.floor((limitBytes * 8) / input.bitrate);
        if (maxSafeSec < splitSec) {
          console.log(`[FFmpeg][${job.id}] High bitrate detected for ${input.originalName}. Adjusting split duration to ${maxSafeSec}s to stay under 200MB.`);
          splitSec = maxSafeSec;
        }
      }

      await new Promise<void>((resolve, reject) => {
        const outputOptions = [
          "-c copy",                          // stream copy — zero re-encoding (FAST)
          "-map 0",                           // include all streams (video + audio)
          "-f segment",                       // segment muxer
          `-segment_time ${splitSec}`,        // split interval in seconds
          `-segment_start_number ${currentPartIndex}`,
          "-reset_timestamps 1",              // each segment starts at 0
          "-avoid_negative_ts make_zero",
          "-movflags +faststart",             // optimize for web streaming
        ];

        ffmpeg(input.inputPath)
          .outputOptions(outputOptions)
          .output(outputPattern)
          .on("start", (cmd: string) => {
            console.log(`[FFmpeg][${job.id}] Starting input ${input.originalName}:`, cmd);
          })
          .on("progress", (info: { timemark?: string }) => {
            if (info.timemark) {
              const [hh, mm, ss] = info.timemark.split(":");
              const secs = parseFloat(hh) * 3600 + parseFloat(mm) * 60 + parseFloat(ss);
              const overallPercent = Math.min(
                Math.round(((accumulatedSec + secs) / totalSec) * 100),
                99
              );
              emitter.emit("progress", { timeSec: accumulatedSec + secs, overallPercent });
            }
          })
          .on("end", () => {
            accumulatedSec += input.durationSec;
            // Use the same adjusted splitSec for counting
            currentPartIndex += Math.ceil(input.durationSec / splitSec);
            resolve();
          })
          .on("error", (err: Error) => {
            reject(err);
          })
          .run();
      });
    }

    const partFiles = collectPartFiles(job.outputDir, job.batchName);
    emitter.emit("done", partFiles);
  })().catch((err) => {
    emitter.emit("error", err);
  });

  return emitter;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface PartFile {
  filename: string;
  filePath: string;
  sizeBytes: number;
}

function collectPartFiles(outputDir: string, batchName: string): PartFile[] {
  try {
    return fs
      .readdirSync(outputDir)
      .filter((f) => f.startsWith(`${batchName}_`) && f.endsWith(".mp4"))
      .sort()
      .map((filename) => {
        const filePath = path.join(outputDir, filename);
        const stat = fs.statSync(filePath);
        return { filename, filePath, sizeBytes: stat.size };
      });
  } catch {
    return [];
  }
}
