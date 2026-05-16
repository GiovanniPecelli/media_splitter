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
              ? "border-violet-500/50 bg-violet-500/5"
              : "border-slate-600 bg-slate-800/40 hover:border-violet-500/50 hover:bg-violet-500/5"
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
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <FilmIcon className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white truncate max-w-[200px]">
                    {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} videos selected`}
                  </p>
                  <p className="text-sm text-slate-400">
                    {formatBytes(selectedFiles.reduce((acc, f) => acc + f.size, 0))} total
                  </p>
                </div>
              </div>
              
              {selectedFiles.length > 1 && (
                <div className="bg-slate-800/50 rounded-xl p-3 max-h-40 overflow-y-auto mb-4 border border-slate-700">
                  <p className="text-xs text-slate-400 mb-2 font-medium">PROCESSING ORDER:</p>
                  <ul className="space-y-2">
                    {selectedFiles.map((file, idx) => (
                      <li key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-300 truncate pr-2 flex items-center gap-2">
                          <span className="bg-violet-500/20 text-violet-300 text-xs py-0.5 px-1.5 rounded font-mono">{idx + 1}</span>
                          <span className="truncate">{file.name}</span>
                        </span>
                        <span className="text-slate-500 font-mono text-[10px] whitespace-nowrap">{formatBytes(file.size)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <p className="text-xs text-violet-400 text-center hover:text-violet-300 transition-colors">
                Click here or drop to replace files
              </p>
            </div>
          ) : (
            <>
              <div
                className={`
                  w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300
                  ${isDragging ? "bg-violet-500/30 scale-110" : "bg-slate-700/60"}
                `}
              >
                <CloudArrowUpIcon
                  className={`w-8 h-8 transition-colors duration-300 ${
                    isDragging ? "text-violet-300" : "text-slate-400"
                  }`}
                />
              </div>
              <p className="text-lg font-semibold text-white">
                {isDragging ? "Drop it here!" : "Drop your MP4 here"}
              </p>
              <p className="text-sm text-slate-400 mt-2">
                or{" "}
                <span className="text-violet-400 font-medium">
                  click to browse
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-3">
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

      {/* Batch Name Control */}
      <div className="glass-card rounded-2xl p-5">
        <label
          htmlFor="batch-name"
          className="block text-sm font-medium text-slate-300 mb-3"
        >
          Batch Name <span className="text-red-400">*</span>
        </label>
        <input
          id="batch-name"
          type="text"
          value={batchName}
          onChange={(e) => setBatchName(e.target.value)}
          placeholder="e.g. My_Vacation_Video"
          disabled={isUploading || disabled}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 disabled:opacity-50 transition-colors"
        />
        <p className="text-xs text-slate-500 mt-2">
          Required. This name will be used to prefix all generated clips (e.g. {batchName.trim() || "My_Vacation_Video"}_001.mp4).
        </p>
      </div>

      {/* Split Duration Control */}
      <div className="glass-card rounded-2xl p-5">
        <label
          htmlFor="split-minutes"
          className="block text-sm font-medium text-slate-300 mb-3"
        >
          Split Duration
        </label>
        <div className="flex items-center gap-4">
          <input
            id="split-minutes"
            type="range"
            min={10}
            max={29}
            value={splitMinutes}
            onChange={(e) => setSplitMinutes(Number(e.target.value))}
            disabled={isUploading || disabled}
            className="flex-1 accent-violet-500 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={10}
              max={29}
              value={splitMinutes}
              onChange={(e) =>
                setSplitMinutes(
                  Math.max(10, Math.min(29, Number(e.target.value)))
                )
              }
              disabled={isUploading || disabled}
              className="w-16 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-center text-white text-sm focus:outline-none focus:border-violet-500 disabled:opacity-50"
            />
            <span className="text-slate-400 text-sm whitespace-nowrap">
              min
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Video will be split into ~{splitMinutes}-minute segments · Default: 29
          min (safe for most platforms)
        </p>
      </div>

      {/* RAG Optimization Toggle */}
      <div className="glass-card rounded-2xl p-5">
        <label className="flex items-center justify-between cursor-pointer group">
          <div className="space-y-1">
            <span className="block text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
              Optimize for RAG (Force &lt; 200MB)
            </span>
            <span className="block text-xs text-slate-500">
              Reduces quality if needed to ensure each part is under 200MB.
            </span>
          </div>
          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              checked={optimizeForRAG}
              onChange={(e) => setOptimizeForRAG(e.target.checked)}
              disabled={isUploading || disabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
          </div>
        </label>
      </div>

      {/* Split Preview */}
      {selectedFiles.length > 0 && Object.keys(fileDurations).length === selectedFiles.length && (
        <div className="glass-card rounded-2xl p-5 border-violet-500/20 bg-violet-500/5 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <ListBulletIcon className="w-5 h-5 text-violet-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Split Preview (Projected)</h3>
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
                  <div key={file.name} className="border-b border-slate-700/50 pb-3 last:border-0 last:pb-0">
                    <p className="text-[10px] text-slate-500 font-mono mb-2 truncate">FROM: {file.name}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {parts.map(p => (
                        <div key={p.index} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-700/30">
                          <span className="text-xs font-medium text-slate-300">Part {p.index}</span>
                          <div className="text-right">
                            <span className="block text-[10px] font-mono text-violet-400">{formatBytes(p.size)}</span>
                            <span className="block text-[9px] text-slate-500">{Math.floor(p.duration / 60)}m {Math.floor(p.duration % 60)}s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center text-[11px]">
            <span className="text-slate-500">TOTAL PROJECTED PARTS:</span>
            <span className="text-violet-400 font-bold">
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
            <span className="text-slate-300">Uploading…</span>
            <span className="text-violet-400 font-mono">{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
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
          disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed
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
