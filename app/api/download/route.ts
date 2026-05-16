import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { getJob } from "@/lib/jobStore";

export const runtime = "nodejs";

// ─── GET /api/download?jobId=xxx&part=1 ──────────────────────────────────────
// Streams a single split part as an MP4 download

export async function GET(req: NextRequest): Promise<Response> {
  const jobId = req.nextUrl.searchParams.get("jobId");
  const partParam = req.nextUrl.searchParams.get("part");

  // Validate parameters
  if (!jobId || !/^[0-9a-f-]{36}$/.test(jobId)) {
    return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
  }

  const partIndex = parseInt(partParam ?? "", 10);
  if (isNaN(partIndex) || partIndex < 1) {
    return NextResponse.json({ error: "Invalid part number" }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job || job.status !== "done") {
    return NextResponse.json(
      { error: "Job not found or not yet completed" },
      { status: 404 }
    );
  }

  const part = job.parts.find((p) => p.index === partIndex);
  if (!part) {
    return NextResponse.json({ error: "Part not found" }, { status: 404 });
  }

  // Security: ensure the file path is within the job's output directory
  const resolvedPath = path.resolve(part.filePath);
  const resolvedOutputDir = path.resolve(job.outputDir);
  if (!resolvedPath.startsWith(resolvedOutputDir)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!fs.existsSync(resolvedPath)) {
    return NextResponse.json(
      { error: "File no longer available (expired)" },
      { status: 410 }
    );
  }

  const stat = fs.statSync(resolvedPath);
  const fileStream = fs.createReadStream(resolvedPath);

  // Convert Node stream → Web ReadableStream
  const webStream = new ReadableStream({
    start(controller) {
      fileStream.on("data", (chunk: Buffer | string) => {
        controller.enqueue(
          typeof chunk === "string" ? Buffer.from(chunk) : chunk
        );
      });
      fileStream.on("end", () => controller.close());
      fileStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      fileStream.destroy();
    },
  });

  return new Response(webStream, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="${part.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
