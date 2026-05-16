import { Job, JobStatus, JobPart } from "./types";

/**
 * In-memory job registry.
 * For a production multi-process setup, replace this with Redis or SQLite.
 * Jobs survive the request lifecycle but are lost on server restart.
 */
const jobs = new Map<string, Job>();

// SSE subscriber registry: jobId → array of response controllers
const subscribers = new Map<string, Set<ReadableStreamDefaultController>>();

// ─── Job CRUD ─────────────────────────────────────────────────────────────────

export function createJob(job: Job): void {
  jobs.set(job.id, job);
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<Job>): Job | undefined {
  const existing = jobs.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch };
  jobs.set(id, updated);
  // Notify SSE subscribers
  notifySubscribers(id, updated);
  return updated;
}

export function deleteJob(id: string): boolean {
  subscribers.delete(id);
  return jobs.delete(id);
}

export function getAllJobs(): Job[] {
  return Array.from(jobs.values());
}

// ─── SSE Pub/Sub ──────────────────────────────────────────────────────────────

export function subscribe(
  jobId: string,
  controller: ReadableStreamDefaultController
): void {
  if (!subscribers.has(jobId)) {
    subscribers.set(jobId, new Set());
  }
  subscribers.get(jobId)!.add(controller);
}

export function unsubscribe(
  jobId: string,
  controller: ReadableStreamDefaultController
): void {
  subscribers.get(jobId)?.delete(controller);
}

function notifySubscribers(jobId: string, job: Job): void {
  const subs = subscribers.get(jobId);
  if (!subs || subs.size === 0) return;

  const payload =
    `data: ${JSON.stringify({
      status: job.status,
      progress: job.progress,
      parts: job.parts,
      error: job.error,
    })}\n\n`;

  const encoder = new TextEncoder();
  const dead: ReadableStreamDefaultController[] = [];

  for (const ctrl of subs) {
    try {
      ctrl.enqueue(encoder.encode(payload));
      // Close stream when the job is terminal
      if (job.status === "done" || job.status === "error") {
        try {
          ctrl.close();
        } catch {
          // already closed
        }
        dead.push(ctrl);
      }
    } catch {
      dead.push(ctrl);
    }
  }

  for (const ctrl of dead) {
    subs.delete(ctrl);
  }
}
