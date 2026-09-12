"use client";

import { ScissorsIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

interface JobPartClient {
  index: number;
  filename: string;
  blobUrl: string;
  sizeBytes: number;
  durationSec?: number;
}

interface ProgressPanelProps {
  status: string | null;
  progress: number;
  parts: JobPartClient[];
  totalDurationSec: number;
  expectedParts: number;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Queued…",
  probing: "Analyzing video…",
  splitting: "Splitting video…",
  done: "Complete!",
  error: "Failed",
};

export default function ProgressPanel({
  status,
  progress,
  parts,
  totalDurationSec,
  expectedParts,
}: ProgressPanelProps) {
  const isDone = status === "done";
  const isSplitting = status === "splitting" || status === "probing";

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header Status */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-5">
          <div
            className={`
            w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500
            ${isDone ? "bg-emerald-500/20" : "bg-violet-500/20"}
          `}
          >
            {isDone ? (
              <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
            ) : (
              <ScissorsIcon
                className={`w-6 h-6 text-violet-400 ${
                  isSplitting ? "animate-bounce" : ""
                }`}
              />
            )}
          </div>
          <div>
            <p className="text-lg font-semibold text-white">
              {STATUS_LABELS[status ?? "pending"] ?? "Processing…"}
            </p>
            <p className="text-sm text-slate-400">
              {isDone
                ? `${parts.length} part${parts.length !== 1 ? "s" : ""} ready`
                : `Total duration: ${formatDuration(totalDurationSec)}`}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p
              className={`text-3xl font-bold font-mono ${
                isDone ? "text-emerald-400" : "text-violet-400"
              }`}
            >
              {progress}%
            </p>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`
              h-full rounded-full transition-all duration-500 ease-out
              ${
                isDone
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
                  : "bg-gradient-to-r from-violet-700 to-violet-400"
              }
              ${isSplitting && !isDone ? "animate-pulse-subtle" : ""}
            `}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Expected Parts Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: expectedParts }).map((_, i) => {
          const part = parts[i];
          const isReady = !!part;
          const isCurrent =
            !isDone &&
            i === Math.floor((progress / 100) * expectedParts);

          return (
            <div
              key={i}
              className={`
                glass-card rounded-xl p-4 transition-all duration-500
                ${isReady ? "border border-emerald-500/30 bg-emerald-500/5" : ""}
                ${isCurrent ? "border border-violet-500/50 bg-violet-500/10 animate-pulse-subtle" : ""}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400">
                  Part {String(i + 1).padStart(3, "0")}
                </span>
                {isReady && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                )}
                {isCurrent && (
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                )}
                {!isReady && !isCurrent && (
                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                )}
              </div>
              {isReady ? (
                <p className="text-sm font-medium text-emerald-400">
                  {part.durationSec ? formatDuration(part.durationSec) : "Ready"}
                </p>
              ) : (
                <div className="h-4 bg-slate-700 rounded animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
