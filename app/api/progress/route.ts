import { NextRequest, NextResponse } from "next/server";
import { getJob, subscribe, unsubscribe } from "@/lib/jobStore";

export const runtime = "nodejs";

// ─── GET /api/progress?jobId=xxx ─────────────────────────────────────────────
// Server-Sent Events stream for real-time job progress

export async function GET(req: NextRequest): Promise<Response> {
  const jobId = req.nextUrl.searchParams.get("jobId");

  if (!jobId || !/^[0-9a-f-]{36}$/.test(jobId)) {
    return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();

  // If the job is already done, send a single event and close
  if (job.status === "done" || job.status === "error") {
    const payload = JSON.stringify({
      status: job.status,
      progress: job.progress,
      parts: job.parts,
      error: job.error,
    });
    const body = `data: ${payload}\n\n`;
    return new Response(encoder.encode(body), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // Create a live SSE stream
  let controller!: ReadableStreamDefaultController;
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;

      // Send current state immediately
      const current = getJob(jobId);
      if (current) {
        const payload = JSON.stringify({
          status: current.status,
          progress: current.progress,
          parts: current.parts,
          error: current.error,
        });
        ctrl.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }

      subscribe(jobId, ctrl);
    },
    cancel() {
      unsubscribe(jobId, controller);
    },
  });

  // Keep-alive ping every 15s to prevent proxy timeouts
  const pingInterval = setInterval(() => {
    try {
      controller.enqueue(encoder.encode(": ping\n\n"));
    } catch {
      clearInterval(pingInterval);
    }
  }, 15_000);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
