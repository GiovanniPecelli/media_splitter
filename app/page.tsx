"use client";

import { useState, useCallback } from "react";
import UploadZone from "@/components/UploadZone";
import ProgressPanel from "@/components/ProgressPanel";
import ResultsPanel from "@/components/ResultsPanel";
import ErrorBanner from "@/components/ErrorBanner";
import { useJobProgress } from "@/hooks/useJobProgress";
import { useUpload } from "@/hooks/useUpload";
import { UploadResponse } from "@/lib/types";

// ─── App State Machine ────────────────────────────────────────────────────────
type AppState = "idle" | "uploading" | "processing" | "done" | "error";

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobMeta, setJobMeta] = useState<UploadResponse | null>(null);
  const [originalName, setOriginalName] = useState<string>("");
  const [globalError, setGlobalError] = useState<string | null>(null);

  // ── Upload hook ─────────────────────────────────────────────────────────────
  const { upload, uploadProgress, isUploading, reset: resetUpload } = useUpload();

  // ── SSE progress hook ────────────────────────────────────────────────────────
  const { status, progress, parts, error: progressError } = useJobProgress(jobId);

  // Sync processing state from SSE
  if (appState === "processing" && status === "done") {
    setAppState("done");
  }
  if (appState === "processing" && status === "error" && progressError) {
    setGlobalError(progressError);
    setAppState("error");
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleUpload = useCallback(
    async (files: File[], splitMinutes: number, batchName: string, optimizeForRAG: boolean) => {
      setGlobalError(null);
      setAppState("uploading");
      setOriginalName(files.length === 1 ? files[0].name : `${files.length} videos`);

      const result = await upload(files, splitMinutes, batchName, optimizeForRAG);

      if (!result) {
        setAppState("error");
        setGlobalError("Upload failed. Please try again.");
        return;
      }

      setJobId(result.jobId);
      setJobMeta(result);
      setAppState("processing");
    },
    [upload]
  );

  const handleReset = useCallback(() => {
    resetUpload();
    setAppState("idle");
    setJobId(null);
    setJobMeta(null);
    setGlobalError(null);
    setOriginalName("");
  }, [resetUpload]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-5 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center shadow-lg shadow-violet-900/40">
            <span className="text-white text-sm font-bold">✂</span>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">
            VideoSplitter
          </span>
        </div>

        {appState !== "idle" && (
          <button
            onClick={handleReset}
            className="text-sm text-slate-400 hover:text-white transition-colors duration-200 flex items-center gap-1.5"
            id="reset-btn"
          >
            ↺ Start over
          </button>
        )}
      </header>

      {/* ── Hero & Uploading ───────────────────────────────────────────────────────────── */}
      {(appState === "idle" || appState === "uploading") && (
        <section className="flex-1 flex flex-col items-center justify-center px-4 py-12 stagger">
          {appState === "idle" && (
            <>
              <div className="text-center mb-10 max-w-lg">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  Powered by FFmpeg · Stream copy · Zero quality loss
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
                  Split long videos{" "}
                  <span className="bg-gradient-to-r from-violet-400 to-violet-300 bg-clip-text text-transparent">
                    for RAG & AI
                  </span>
                </h1>
                <p className="text-slate-400 text-lg leading-relaxed">
                  Upload any MP4. Get clean clips under 29 minutes — ready to
                  transcribe with{" "}
                  <span className="text-slate-300">Whisper</span> or feed into your{" "}
                  <span className="text-slate-300">RAG pipeline</span>.
                </p>
              </div>

              {/* Feature pills */}
              <div className="flex flex-wrap justify-center gap-2 mb-10 text-xs">
                {[
                  "✂ Stream copy — no re-encoding",
                  "⚡ Processes at full disk speed",
                  "📦 Download as ZIP",
                  "🤖 RAG-ready clips",
                  "🎙 Whisper-compatible",
                ].map((f) => (
                  <span
                    key={f}
                    className="px-3 py-1.5 rounded-full glass-card text-slate-400 border-slate-700/50"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </>
          )}

          {appState === "uploading" && (
            <div className="text-center mb-6 animate-fade-in-up">
              <h2 className="text-2xl font-bold text-white mb-2">Uploading…</h2>
              <p className="text-slate-400 text-sm">{originalName}</p>
            </div>
          )}

          <UploadZone
            onUpload={handleUpload}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            disabled={appState === "uploading"}
          />

          {/* Guide */}
          {appState === "idle" && (
            <div className="mt-16 w-full max-w-2xl mx-auto text-left animate-fade-in-up">
              <h2 className="text-xl font-bold text-white mb-6 text-center">How it works</h2>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="glass-card rounded-xl p-5 border-t-2 border-t-violet-500 hover:-translate-y-1 transition-transform duration-300">
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center font-bold mb-4 shadow-lg shadow-violet-500/10">1</div>
                  <h3 className="font-semibold text-white mb-2 text-sm">Upload Files</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">Select one or multiple MP4 videos. We will process them sequentially in the order shown.</p>
                </div>
                <div className="glass-card rounded-xl p-5 border-t-2 border-t-violet-500 hover:-translate-y-1 transition-transform duration-300">
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center font-bold mb-4 shadow-lg shadow-violet-500/10">2</div>
                  <h3 className="font-semibold text-white mb-2 text-sm">Configure</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">Enter a <strong>Batch Name</strong> to prefix all files, and set the duration (10-29 mins) for each clip.</p>
                </div>
                <div className="glass-card rounded-xl p-5 border-t-2 border-t-violet-500 hover:-translate-y-1 transition-transform duration-300">
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center font-bold mb-4 shadow-lg shadow-violet-500/10">3</div>
                  <h3 className="font-semibold text-white mb-2 text-sm">Download</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">Download clips individually or click 'Download ZIP' to get everything at once.</p>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Processing ─────────────────────────────────────────────────────── */}
      {appState === "processing" && jobMeta && (
        <section className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-2xl animate-fade-in-up">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                Splitting your video…
              </h2>
              <p className="text-slate-400 text-sm">
                {originalName} · {jobMeta.expectedParts} part
                {jobMeta.expectedParts !== 1 ? "s" : ""} expected
              </p>
            </div>
            <ProgressPanel
              status={status}
              progress={progress}
              parts={parts}
              totalDurationSec={jobMeta.totalDurationSec}
              expectedParts={jobMeta.expectedParts}
            />
          </div>
        </section>
      )}

      {/* ── Done ───────────────────────────────────────────────────────────── */}
      {appState === "done" && jobId && (
        <section className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-2xl animate-fade-in-up">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                Ready to download
              </h2>
              <p className="text-slate-400 text-sm">
                Your clips are ready. Files expire in 1 hour.
              </p>
            </div>
            <ResultsPanel
              jobId={jobId}
              parts={parts}
              originalName={originalName}
            />
          </div>
        </section>
      )}

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {(appState === "error" || globalError) && (
        <section className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-2xl space-y-6 animate-fade-in-up">
            {globalError && (
              <ErrorBanner
                message={globalError}
                onDismiss={() => setGlobalError(null)}
              />
            )}
            <div className="text-center">
              <button
                onClick={handleReset}
                id="try-again-btn"
                className="px-8 py-3 rounded-xl font-medium text-sm bg-violet-600 hover:bg-violet-500 text-white transition-colors duration-200"
              >
                Try again
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="py-6 text-center text-xs text-slate-600">
        VideoSplitter · FFmpeg stream copy · Files auto-deleted after 1 hour
      </footer>
    </main>
  );
}
