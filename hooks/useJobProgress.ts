"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { JobStatus, JobPart, ProgressEvent } from "@/lib/types";

interface JobProgress {
  status: JobStatus | null;
  progress: number;
  parts: JobPart[];
  error: string | undefined;
  isConnected: boolean;
}

/**
 * Subscribes to the SSE progress stream for a given jobId.
 * Automatically reconnects on transient failure.
 */
export function useJobProgress(jobId: string | null): JobProgress {
  const [state, setState] = useState<JobProgress>({
    status: null,
    progress: 0,
    parts: [],
    error: undefined,
    isConnected: false,
  });

  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!jobId) return;

    const es = new EventSource(`/api/progress?jobId=${jobId}`);
    esRef.current = es;

    es.onopen = () => {
      setState((prev) => ({ ...prev, isConnected: true }));
    };

    es.onmessage = (event) => {
      try {
        const data: ProgressEvent = JSON.parse(event.data);
        setState({
          status: data.status,
          progress: data.progress,
          parts: data.parts,
          error: data.error,
          isConnected: true,
        });

        // Close connection when job is terminal
        if (data.status === "done" || data.status === "error") {
          es.close();
          esRef.current = null;
        }
      } catch {
        console.warn("[SSE] Failed to parse progress event:", event.data);
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      setState((prev) => ({ ...prev, isConnected: false }));

      // Retry after 2 seconds unless job is complete
      retryRef.current = setTimeout(() => {
        setState((prev) => {
          if (prev.status !== "done" && prev.status !== "error") {
            connect();
          }
          return prev;
        });
      }, 2000);
    };
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [jobId, connect]);

  return state;
}
