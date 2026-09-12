"use client";

import { useState, useCallback, useEffect } from "react";
import UploadZone from "@/components/UploadZone";
import ProgressPanel from "@/components/ProgressPanel";
import ResultsPanel from "@/components/ResultsPanel";
import ErrorBanner from "@/components/ErrorBanner";
import { useFFmpegSplitter } from "@/hooks/useFFmpegSplitter";

export default function HomePage() {
  const [originalName, setOriginalName] = useState<string>("");
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { isLoaded, load, status, progress, parts, expectedParts, errorMsg, processFiles, reset } = useFFmpegSplitter();

  useEffect(() => {
    // Load FFmpeg on mount
    load();
  }, [load]);

  useEffect(() => {
    if (errorMsg) setGlobalError(errorMsg);
  }, [errorMsg]);

  const handleUpload = useCallback(
    async (files: File[], splitMinutes: number, batchName: string, optimizeForRAG: boolean) => {
      setGlobalError(null);
      setOriginalName(files.length === 1 ? files[0].name : `${files.length} videos`);
      
      const safeBatchName = batchName || "part";
      await processFiles(files, splitMinutes, safeBatchName);
    },
    [processFiles]
  );

  const handleReset = useCallback(() => {
    reset();
    setGlobalError(null);
    setOriginalName("");
  }, [reset]);

  const isLoadingFFmpeg = status === "loading" || (!isLoaded && status === "idle");
  const isIdle = status === "idle" && isLoaded;
  const isProcessing = status === "processing";
  const isDone = status === "done";
  const isError = status === "error" || globalError;

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center shadow-lg shadow-violet-900/40">
            <span className="text-white text-sm font-bold">✂</span>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">
            Media Splitter
          </span>
        </div>

        {!isIdle && (
          <button
            onClick={handleReset}
            className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
            id="reset-btn"
          >
            ↺ Start over
          </button>
        )}
      </header>

      {isLoadingFFmpeg && (
        <section className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="text-center animate-pulse">
            <h2 className="text-xl font-bold text-white mb-2">Loading Core Engine...</h2>
            <p className="text-slate-400 text-sm">Downloading FFmpeg for the browser.</p>
          </div>
        </section>
      )}

      {isIdle && (
        <section className="flex-1 flex flex-col items-center justify-center px-4 py-12 stagger">
          <div className="text-center mb-10 max-w-lg">
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
              Split long videos{" "}
              <span className="bg-gradient-to-r from-violet-400 to-violet-300 bg-clip-text text-transparent">
                Instantly
              </span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Upload any MP4 video and automatically slice it into smaller clips. Processed 100% locally in your browser. Fast, private, and secure.
            </p>
          </div>

          <UploadZone
            onUpload={handleUpload}
            isUploading={false}
            uploadProgress={0}
            disabled={false}
          />
        </section>
      )}

      {isProcessing && (
        <section className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-2xl animate-fade-in-up">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                Splitting your video locally...
              </h2>
              <p className="text-slate-400 text-sm">{originalName}</p>
            </div>
            {/* Pass props mapped to new hook */}
            <ProgressPanel
              status="splitting"
              progress={progress}
              parts={parts as any}
              totalDurationSec={0}
              expectedParts={expectedParts}
            />
          </div>
        </section>
      )}

      {isDone && (
        <section className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-2xl animate-fade-in-up">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                Ready to download
              </h2>
              <p className="text-slate-400 text-sm">
                Clips generated successfully on your device.
              </p>
            </div>
            <ResultsPanel
              jobId="local"
              parts={parts as any}
              originalName={originalName}
            />
          </div>
        </section>
      )}

      {isError && (
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
                className="px-8 py-3 rounded-xl font-medium text-sm bg-violet-600 hover:bg-violet-500 text-white transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
