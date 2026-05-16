import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { getJob } from "@/lib/jobStore";
import { PassThrough } from "stream";

export const runtime = "nodejs";

// ─── GET /api/download-zip?jobId=xxx ─────────────────────────────────────────

export async function GET(req: NextRequest): Promise<Response> {
  const jobId = req.nextUrl.searchParams.get("jobId");

  if (!jobId || !/^[0-9a-f-]{36}$/.test(jobId)) {
    return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job || job.status !== "done") {
    return NextResponse.json(
      { error: "Job not found or not yet completed" },
      { status: 404 }
    );
  }

  if (job.parts.length === 0) {
    return NextResponse.json({ error: "No parts available" }, { status: 404 });
  }

  // Verify all files exist and paths are safe
  for (const part of job.parts) {
    if (!fs.existsSync(part.filePath)) {
      return NextResponse.json(
        { error: "Some parts have expired. Please re-upload." },
        { status: 410 }
      );
    }
    const resolved = path.resolve(part.filePath);
    const resolvedDir = path.resolve(job.outputDir);
    if (!resolved.startsWith(resolvedDir)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // In Archiver 8.0+ (pure ESM), we must use dynamic import
  // @ts-ignore
  const { ZipArchive } = await import("archiver");
  const archive = new ZipArchive({ zlib: { level: 0 } });
  const passThrough = new PassThrough();
  archive.pipe(passThrough);

  for (const part of job.parts) {
    archive.file(part.filePath, { name: part.filename });
  }

  archive.finalize();

  const webStream = new ReadableStream({
    start(controller) {
      passThrough.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      passThrough.on("end", () => controller.close());
      passThrough.on("error", (err) => controller.error(err));
    },
    cancel() {
      archive.abort();
    },
  });

  const baseName = job.batchName;
  const zipFilename = `${baseName}_parts.zip`;

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
