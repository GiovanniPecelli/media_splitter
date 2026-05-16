import * as fs from "fs";
import * as path from "path";
import { deleteJob } from "./jobStore";

const DEFAULT_TTL_MS = parseInt(
  process.env.CLEANUP_TTL_MS ?? "3600000",
  10
); // 1 hour

const scheduledTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Schedule deletion of a job's temp directory after `delayMs`.
 * Calling this again for the same jobId resets the timer.
 */
export function scheduleCleanup(
  jobId: string,
  jobDir: string,
  delayMs: number = DEFAULT_TTL_MS
): void {
  // Cancel any existing timer for this job
  const existing = scheduledTimers.get(jobId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    performCleanup(jobId, jobDir);
    scheduledTimers.delete(jobId);
  }, delayMs);

  // Don't keep the process alive just for cleanup
  if (timer.unref) timer.unref();

  scheduledTimers.set(jobId, timer);
}

/**
 * Immediately delete a job's files and remove from the store.
 */
export function performCleanup(
  jobId: string,
  jobDir: string
): void {
  try {
    if (fs.existsSync(jobDir)) {
      fs.rmSync(jobDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn(`[Cleanup] Failed to clean job ${jobId}:`, err);
  } finally {
    deleteJob(jobId);
  }
}

/**
 * Cancel a scheduled cleanup (e.g. if user is still downloading).
 */
export function cancelCleanup(jobId: string): void {
  const timer = scheduledTimers.get(jobId);
  if (timer) {
    clearTimeout(timer);
    scheduledTimers.delete(jobId);
  }
}
