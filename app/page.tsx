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
    <main className="min-h-screen flex flex-col bg-[#fafafa]">
      
      <nav className="sticky top-0 z-50 w-full border-b border-neutral-200/60 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-neutral-900 font-bold text-lg tracking-tight typewriter-text">
              MediaSplitter
            </span>
          </div>

          <div className="flex items-center gap-4">
            {!isIdle && (
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-900 transition-all border border-neutral-200"
              >
                Start Over
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Modern Soft Minimal Hero Section */}
      <div className="w-full relative overflow-hidden">
        {/* Ultra-soft ambient background glow */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] opacity-40 bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-300 blur-[120px] pointer-events-none rounded-[100%]" />
        
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-28 flex flex-col gap-12 relative z-10">
          
          <div className="text-center space-y-6">
            <h1 className="text-x1 md:text-4xl font-normal text-neutral-900 tracking-tight text-center whitespace-nowrap">
              data = split.<span className="text-neutral-400 mx-1.5">instantly</span>(media)
            </h1>
            
            
            {/* Minimal Intro text */}
            <p className="text-neutral-500 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto text-center font-light tracking-wide">
              Prepare your massive video and audio files for LLMs and RAG pipelines in seconds. Process entirely in your browser without uploading to any server, saving time and bypassing free tier limits.
            </p>
          </div>
        </div>
      </div>

      {/* App Section */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-6 pb-24 flex flex-col relative z-20">
        <div className="w-full">
          <div className="bg-white/70 backdrop-blur-3xl rounded-[2.5rem] p-8 sm:p-14 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] border border-white relative z-20 transition-all">
            {isLoadingFFmpeg && (
              <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mb-4" />
                <h2 className="text-lg font-bold text-neutral-900 mb-1">Loading Engine...</h2>
                <p className="text-neutral-500 text-sm">Downloading FFmpeg for your browser.</p>
              </div>
            )}

            {isIdle && (
              <div className="animate-fade-in-up">
                <UploadZone
                  onUpload={handleUpload}
                  isUploading={false}
                  uploadProgress={0}
                  disabled={false}
                />
              </div>
            )}

            {isProcessing && (
              <div className="animate-fade-in-up py-10">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold text-neutral-900 mb-2 tracking-tight">Processing Media</h2>
                  <p className="text-neutral-500 text-sm">{originalName}</p>
                </div>
                <ProgressPanel
                  status="splitting"
                  progress={progress}
                  parts={parts as any}
                  totalDurationSec={0}
                  expectedParts={expectedParts}
                />
              </div>
            )}

            {isDone && (
              <div className="animate-fade-in-up py-10">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold text-neutral-900 mb-2 tracking-tight">Clips Ready</h2>
                  <p className="text-neutral-500 text-sm">
                    Clips generated successfully on your device.
                  </p>
                </div>
                <ResultsPanel
                  jobId="local"
                  parts={parts as any}
                  originalName={originalName}
                />
              </div>
            )}

            {isError && (
              <div className="space-y-6 animate-fade-in-up py-10">
                {globalError && (
                  <ErrorBanner
                    message={globalError}
                    onDismiss={() => setGlobalError(null)}
                  />
                )}
                <div className="text-center">
                  <button
                    onClick={handleReset}
                    className="px-8 py-3 rounded-xl font-medium text-sm bg-neutral-900 hover:bg-neutral-800 text-white transition-colors"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
