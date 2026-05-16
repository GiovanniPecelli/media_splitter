import { NextRequest, NextResponse } from "next/server";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as fsp from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { probeVideo, splitVideo, buildPartManifest } from "@/lib/ffmpeg";
import { createJob, updateJob, getJob } from "@/lib/jobStore";
import { scheduleCleanup } from "@/lib/cleanup";
import { Job, JobPart } from "@/lib/types";

export const runtime = "nodejs";
// Remove Next.js body size limit — we stream directly to disk
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES =
  parseInt(process.env.MAX_FILE_MB ?? "4096", 10) * 1024 * 1024;

const ALLOWED_TYPES = new Set(["video/mp4", "video/mpeg"]);

// ─── POST /api/upload ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const jobId = uuidv4();
  const jobDir = path.join(os.tmpdir(), "splitter", jobId);
  const outputDir = path.join(jobDir, "output");

  fs.mkdirSync(outputDir, { recursive: true });

  try {
    // ── Parse FormData ───────────────────────────────────────────────────────
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      cleanupDir(jobDir);
      return NextResponse.json(
        { error: "Failed to parse upload. Ensure you are sending multipart/form-data." },
        { status: 400 }
      );
    }

    const files = formData.getAll("file") as File[];
    const splitMinutesRaw = formData.get("splitMinutes");
    const rawBatchName = formData.get("batchName") as string;
    const optimizeForRAG = formData.get("optimizeForRAG") === "true";

    if (!files || files.length === 0) {
      cleanupDir(jobDir);
      return NextResponse.json({ error: "No video files received." }, { status: 400 });
    }

    const splitMinutes = parseFloat(String(splitMinutesRaw ?? "29"));
    const splitSec = Math.max(1, (isNaN(splitMinutes) ? 29 : splitMinutes) * 60);

    const fallbackBatchName = files.length > 0 ? sanitizeFilename(files[0].name.replace(/\.[^/.]+$/, "")) : "part";
    const batchName = rawBatchName ? sanitizeFilename(rawBatchName) : fallbackBatchName;

    const inputs = [];
    let totalDurationSec = 0;
    let expectedParts = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // ── MIME validation ──────────────────────────────────────────────────────
      if (!ALLOWED_TYPES.has(file.type)) {
        cleanupDir(jobDir);
        return NextResponse.json(
          { error: `Invalid file type for ${file.name}. Only MP4 files are accepted.` },
          { status: 400 }
        );
      }

      // ── Size validation ──────────────────────────────────────────────────────
      if (file.size > MAX_FILE_BYTES) {
        cleanupDir(jobDir);
        return NextResponse.json(
          { error: `File ${file.name} too large. Maximum allowed: ${MAX_FILE_BYTES / 1024 / 1024} MB.` },
          { status: 413 }
        );
      }

      // ── Write file to disk ───────────────────────────────────────────────────
      const currentInputPath = path.join(jobDir, `input_${i}.mp4`);
      const arrayBuffer = await file.arrayBuffer();
      await fsp.writeFile(currentInputPath, Buffer.from(arrayBuffer));

      // ── Probe video ──────────────────────────────────────────────────────────
      const probe = await probeVideo(currentInputPath);
      totalDurationSec += probe.durationSec;
      expectedParts += Math.ceil(probe.durationSec / splitSec);

      inputs.push({
        originalName: sanitizeFilename(file.name || `video_${i}.mp4`),
        inputPath: currentInputPath,
        durationSec: probe.durationSec,
        bitrate: probe.bitrate,
      });
    }

    // ── Create job ───────────────────────────────────────────────────────────
    const job: Job = {
      id: jobId,
      batchName,
      status: "splitting",
      optimizeForRAG,
      inputs,
      outputDir,
      totalDurationSec,
      splitSec,
      parts: [],
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    createJob(job);

    // ── Start async split ────────────────────────────────────────────────────
    startSplit(jobId);

    return NextResponse.json({
      jobId,
      totalDurationSec,
      splitSec,
      expectedParts,
    });
  } catch (err) {
    cleanupDir(jobDir);
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[Upload]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Async split runner ───────────────────────────────────────────────────────

function startSplit(jobId: string): void {
  const job = getJob(jobId);
  if (!job) return;

  const emitter = splitVideo(job);

  emitter.on("progress", ({ overallPercent }: { overallPercent: number }) => {
    updateJob(jobId, { progress: overallPercent });
  });

  emitter.on(
    "done",
    (partFiles: { filename: string; filePath: string; sizeBytes: number }[]) => {
      const currentJob = getJob(jobId);
      if (!currentJob) return;

      const manifest = buildPartManifest(currentJob);
      const parts: JobPart[] = manifest.map((p, i) => {
        const pf = partFiles[i];
        return {
          ...p,
          filePath: pf?.filePath ?? "",
          sizeBytes: pf?.sizeBytes ?? 0,
        };
      });

      updateJob(jobId, {
        status: "done",
        progress: 100,
        parts,
        completedAt: new Date().toISOString(),
      });

      scheduleCleanup(jobId, currentJob.outputDir);
    }
  );

  emitter.on("error", (err: Error) => {
    console.error(`[Split][${jobId}]`, err);
    updateJob(jobId, {
      status: "error",
      error: err.message,
      completedAt: new Date().toISOString(),
    });
    const j = getJob(jobId);
    if (j) scheduleCleanup(jobId, j.outputDir, 30_000);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\- ]/g, "_").slice(0, 200);
}

function cleanupDir(dir: string): void {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
}
