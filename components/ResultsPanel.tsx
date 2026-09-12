"use client";

import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  ArrowDownTrayIcon,
  ArchiveBoxArrowDownIcon,
  FilmIcon,
} from "@heroicons/react/24/outline";

interface JobPartClient {
  index: number;
  filename: string;
  blobUrl: string;
  sizeBytes: number;
  durationSec?: number;
}

interface ResultsPanelProps {
  jobId: string;
  parts: JobPartClient[];
  originalName: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function ResultsPanel({
  jobId,
  parts,
  originalName,
}: ResultsPanelProps) {
  const totalSize = parts.reduce((acc, p) => acc + p.sizeBytes, 0);
  const [isZipping, setIsZipping] = useState(false);

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      
      for (const part of parts) {
        const response = await fetch(part.blobUrl);
        const blob = await response.blob();
        zip.file(part.filename, blob);
      }
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${originalName.replace(/\.[^/.]+$/, "")}_splits.zip`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate ZIP");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              ✂️ Split Complete
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {parts.length} part{parts.length !== 1 ? "s" : ""} ·{" "}
              {formatBytes(totalSize)} total ·{" "}
              <span className="text-slate-500 truncate max-w-xs inline-block align-bottom">
                {originalName}
              </span>
            </p>
          </div>
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            id="download-zip-btn"
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
              ${isZipping ? 'bg-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400'}
              text-white transition-all duration-200
              shadow-lg shadow-violet-900/30 hover:shadow-violet-900/50
              whitespace-nowrap active:scale-95
            `}
          >
            <ArchiveBoxArrowDownIcon className="w-4 h-4" />
            {isZipping ? "Zipping..." : "Download ZIP"}
          </button>
        </div>

        <p className="text-xs text-slate-500 bg-slate-800/60 rounded-lg px-3 py-2">
          ⏱️ Files are stored locally in your browser and will be lost if you refresh. Download your parts now.
        </p>
      </div>

      {/* Parts Grid */}
      <div className="space-y-3">
        {parts.map((part, idx) => (
          <div
            key={part.index}
            className="glass-card rounded-2xl p-5 flex items-center gap-4 group hover:border-violet-500/30 transition-all duration-200"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-slate-700/60 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/15 transition-colors duration-200">
              <FilmIcon className="w-6 h-6 text-slate-400 group-hover:text-violet-400 transition-colors duration-200" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white font-mono">
                {part.filename}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span>{formatBytes(part.sizeBytes)}</span>
              </div>
            </div>

            {/* Download Button */}
            <a
              href={part.blobUrl}
              download={part.filename}
              id={`download-part-${part.index}`}
              className="
                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                bg-slate-700/60 hover:bg-violet-500/20
                text-slate-300 hover:text-violet-300
                border border-slate-600/50 hover:border-violet-500/40
                transition-all duration-200 active:scale-95 flex-shrink-0
              "
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
