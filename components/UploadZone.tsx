"use client";

import { useCallback, useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";
import { CloudArrowUpIcon, FilmIcon, ListBulletIcon } from "@heroicons/react/24/outline";

const MAX_FILE_MB = 4096;
const ALLOWED_TYPES = ["video/mp4", "video/mpeg"];

interface UploadZoneProps {
  onUpload: (files: File[], splitMinutes: number, batchName: string, optimizeForRAG: boolean) => void;
  isUploading: boolean;
  uploadProgress: number;
  disabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function UploadZone({
  onUpload,
  isUploading,
  uploadProgress,
  disabled = false,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [splitMinutes, setSplitMinutes] = useState(29);
  const [batchName, setBatchName] = useState("");
  const [optimizeForRAG, setOptimizeForRAG] = useState(true);
  const [fileDurations, setFileDurations] = useState<Record<string, number>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload an MP4 file.";
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      return `File too large. Maximum size is ${MAX_FILE_MB} MB.`;
    }
    return null;
  };

  const handleFiles = useCallback((files: FileList | File[]) => {
    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      const err = validate(file);
      if (err) {
        setValidationError(err);
        setSelectedFiles([]);
        return;
      }
      validFiles.push(file);
    }
    setValidationError(null);
    setSelectedFiles(validFiles);
    
    // Probe durations
    validFiles.forEach(file => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        setFileDurations(prev => ({ ...prev, [file.name]: video.duration }));
        URL.revokeObjectURL(video.src);
      };
      video.src = URL.createObjectURL(file);
    });
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleSubmit = () => {
    if (selectedFiles.length === 0 || isUploading || disabled || !batchName.trim()) return;
    onUpload(selectedFiles, splitMinutes, batchName.trim(), optimizeForRAG);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Drop Zone */}
      <div
        onClick={() => !isUploading && !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
          ${isUploading || disabled ? "cursor-not-allowed opacity-60" : ""}
          ${
            isDragging
              ? "border-violet-400 bg-violet-500/10 scale-[1.01]"
              : selectedFiles.length > 0
              ? "border-violet-500/50 bg-violet-50"
              : "border-neutral-200 bg-neutral-100/40 hover:border-violet-500/50 hover:bg-violet-50"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/mpeg"
          multiple
          className="hidden"
          onChange={handleInputChange}
          disabled={isUploading || disabled}
          id="file-input"
        />

        <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
          {selectedFiles.length > 0 ? (
            <div className="w-full text-left max-w-sm mx-auto">
              <div className="flex items-center gap-3 mb-4 justify-center">
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                  <FilmIcon className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-neutral-900 truncate max-w-[200px]">
                    {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} videos selected`}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {formatBytes(selectedFiles.reduce((acc, f) => acc + f.size, 0))} total
                  </p>
                </div>
              </div>
              
              {selectedFiles.length > 1 && (
                <div className="bg-neutral-100/50 rounded-xl p-3 max-h-40 overflow-y-auto mb-4 border border-neutral-200">
                  <p className="text-xs text-neutral-500 mb-2 font-medium">PROCESSING ORDER:</p>
                  <ul className="space-y-2">
                    {selectedFiles.map((file, idx) => (
                      <li key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-neutral-700 truncate pr-2 flex items-center gap-2">
                          <span className="bg-violet-100 text-violet-300 text-xs py-0.5 px-1.5 rounded font-mono">{idx + 1}</span>
                          <span className="truncate">{file.name}</span>
                        </span>
                        <span className="text-neutral-500 font-mono text-[10px] whitespace-nowrap">{formatBytes(file.size)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <p className="text-xs text-violet-600 text-center hover:text-violet-300 transition-colors">
                Click here or drop to replace files
              </p>
            </div>
          ) : (
            <>
              <div
                className={`
                  w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300
                  ${isDragging ? "bg-violet-500/30 scale-110" : "bg-neutral-200/60"}
                `}
              >
                <CloudArrowUpIcon
                  className={`w-8 h-8 transition-colors duration-300 ${
                    isDragging ? "text-violet-300" : "text-neutral-500"
                  }`}
                />
              </div>
              <p className="text-lg font-semibold text-neutral-900">
                {isDragging ? "Drop it here!" : "Drop your MP4 here"}
              </p>
              <p className="text-sm text-neutral-500 mt-2">
                or{" "}
                <span className="text-violet-600 font-medium">
                  click to browse
                </span>
              </p>
              <p className="text-xs text-neutral-500 mt-3">
                MP4 only · Max {MAX_FILE_MB / 1024} GB
              </p>
            </>
          )}
        </div>

        {/* Drag overlay glow */}
        {isDragging && (
          <div className="absolute inset-0 rounded-2xl pointer-events-none ring-2 ring-violet-400 ring-offset-2 ring-offset-slate-900 animate-pulse" />
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {validationError}
        </div>
      )}

      {/* Options Container */}
      <div className="flex flex-col space-y-6 w-full mt-4">
        {/* Batch Name Control */}
        <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden shadow-sm">
          <div className="p-5 sm:p-6">
            <label
              htmlFor="batch-name"
              className="block text-base font-semibold text-neutral-900"
            >
              Batch Name <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-neutral-500 mt-1 mb-4">
              Required. The base name used to prefix all generated video clips.
            </p>
            <input
              id="batch-name"
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g. My_Vacation_Video"
              disabled={isUploading || disabled}
              className="w-full sm:max-w-md bg-white border border-neutral-300 rounded-lg px-4 py-2.5 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent disabled:opacity-50 transition-all shadow-sm"
            />
          </div>
          <div className="bg-neutral-50 border-t border-neutral-200 px-5 sm:px-6 py-3">
            <p className="text-[13px] text-neutral-500 font-mono">
              Output preview: {batchName.trim() || "Video"}_001.mp4
            </p>
          </div>
        </div>

        {/* Split Duration Control */}
        <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden shadow-sm">
          <div className="p-5 sm:p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <label
                  htmlFor="split-minutes"
                  className="block text-base font-semibold text-neutral-900"
                >
                  Split Duration
                </label>
                <p className="text-sm text-neutral-500 mt-1">
                  Set the maximum length for each video chunk.
                </p>
              </div>
              <span className="bg-neutral-100 border border-neutral-200 text-neutral-900 text-sm py-1 px-3 rounded-md font-medium">
                {splitMinutes} min
              </span>
            </div>
            
            <div className="pt-2 pb-2 w-full sm:max-w-md">
              <input
                id="split-minutes"
                type="range"
                min={10}
                max={29}
                step={1}
                value={splitMinutes}
                onChange={(e) => setSplitMinutes(Number(e.target.value))}
                disabled={isUploading || disabled}
                className="w-full accent-neutral-900 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-xs text-neutral-400 font-medium mt-2">
                <span>10m</span>
                <span>29m</span>
              </div>
            </div>
          </div>
          <div className="bg-neutral-50 border-t border-neutral-200 px-5 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-[13px] text-neutral-600">
              <strong className="text-neutral-900">Recommendation:</strong> Use 29 min for free AI transcription tools.
            </p>
            {splitMinutes > 30 && (
              <span className="text-[12px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                May exceed free limits
              </span>
            )}
          </div>
        </div>
      </div>
      {selectedFiles.length > 0 && Object.keys(fileDurations).length === selectedFiles.length && (
        <div className="glass-card rounded-2xl p-5 border-violet-500/20 bg-violet-50 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <ListBulletIcon className="w-5 h-5 text-violet-600" />
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">Split Preview (Projected)</h3>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {(() => {
              let overallIndex = 1;
              return selectedFiles.map((file) => {
                const duration = fileDurations[file.name] || 0;
                let effectiveSplitSec = splitMinutes * 60;
                
                // If RAG optimization is on, we calculate the safe duration to stay under 200MB
                if (optimizeForRAG && file.size > 0) {
                  const limitBytes = 195 * 1024 * 1024;
                  if (file.size > limitBytes) {
                    // Safe duration = (limit / totalSize) * totalDuration
                    const maxSafeSec = Math.floor((limitBytes / file.size) * duration);
                    effectiveSplitSec = Math.min(effectiveSplitSec, maxSafeSec);
                  }
                }

                const partCount = Math.ceil(duration / effectiveSplitSec);
                const parts = [];
                
                for (let i = 0; i < partCount; i++) {
                  const partDuration = Math.min(effectiveSplitSec, duration - i * effectiveSplitSec);
                  // Estimate size: strictly proportional to duration
                  const estSize = (file.size * (partDuration / duration));
                  
                  parts.push({
                    index: overallIndex++,
                    size: estSize,
                    duration: partDuration
                  });
                }
                
                return (
                  <div key={file.name} className="border-b border-neutral-200/50 pb-3 last:border-0 last:pb-0">
                    <p className="text-[10px] text-neutral-500 font-mono mb-2 truncate">FROM: {file.name}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {parts.map(p => (
                        <div key={p.index} className="flex items-center justify-between bg-neutral-100/40 rounded-lg px-3 py-2 border border-neutral-200/30">
                          <span className="text-xs font-medium text-neutral-700">Part {p.index}</span>
                          <div className="text-right">
                            <span className="block text-[10px] font-mono text-violet-600">{formatBytes(p.size)}</span>
                            <span className="block text-[9px] text-neutral-500">{Math.floor(p.duration / 60)}m {Math.floor(p.duration % 60)}s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          
          <div className="mt-4 pt-4 border-t border-neutral-200/50 flex justify-between items-center text-[11px]">
            <span className="text-neutral-500">TOTAL PROJECTED PARTS:</span>
            <span className="text-violet-600 font-bold">
              {selectedFiles.reduce((acc, f) => {
                const duration = fileDurations[f.name] || 0;
                let effectiveSplitSec = splitMinutes * 60;
                if (optimizeForRAG && f.size > 195 * 1024 * 1024) {
                   const maxSafeSec = Math.floor((195 * 1024 * 1024 / f.size) * duration);
                   effectiveSplitSec = Math.min(effectiveSplitSec, maxSafeSec);
                }
                return acc + Math.ceil(duration / effectiveSplitSec);
              }, 0)}
            </span>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-700">Uploading…</span>
            <span className="text-violet-600 font-mono">{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={selectedFiles.length === 0 || isUploading || disabled || !batchName.trim()}
        id="upload-submit-btn"
        className="
          w-full py-4 rounded-2xl font-semibold text-base transition-all duration-300
          bg-gradient-to-r from-violet-600 to-violet-500
          hover:from-violet-500 hover:to-violet-400
          disabled:from-neutral-200 disabled:to-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed
          text-white shadow-lg shadow-violet-900/30 hover:shadow-violet-900/50
          active:scale-[0.98]
        "
      >
        {isUploading
          ? `Uploading… ${uploadProgress}%`
          : "Split Video"}
      </button>
    </div>
  );
}
