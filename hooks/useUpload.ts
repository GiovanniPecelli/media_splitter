"use client";

import { useCallback, useRef, useState } from "react";
import { UploadResponse } from "@/lib/types";

interface UploadState {
  uploadProgress: number; // 0–100 upload progress
  isUploading: boolean;
  error: string | null;
}

interface UseUploadReturn extends UploadState {
  upload: (
    files: File[],
    splitMinutes: number,
    batchName: string,
    optimizeForRAG: boolean
  ) => Promise<UploadResponse | null>;
  reset: () => void;
}

export function useUpload(): UseUploadReturn {
  const [state, setState] = useState<UploadState>({
    uploadProgress: 0,
    isUploading: false,
    error: null,
  });
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const upload = useCallback(
    async (files: File[], splitMinutes: number, batchName: string, optimizeForRAG: boolean): Promise<UploadResponse | null> => {
      setState({ uploadProgress: 0, isUploading: true, error: null });

      return new Promise((resolve) => {
        const formData = new FormData();
        files.forEach((file) => formData.append("file", file));
        formData.append("splitMinutes", String(splitMinutes));
        formData.append("batchName", batchName);
        formData.append("optimizeForRAG", String(optimizeForRAG));

        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setState((prev) => ({ ...prev, uploadProgress: pct }));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data: UploadResponse = JSON.parse(xhr.responseText);
              setState((prev) => ({
                ...prev,
                isUploading: false,
                uploadProgress: 100,
              }));
              resolve(data);
            } catch {
              setState({
                uploadProgress: 0,
                isUploading: false,
                error: "Server returned an invalid response",
              });
              resolve(null);
            }
          } else {
            let message = "Upload failed";
            try {
              const err = JSON.parse(xhr.responseText);
              message = err.error ?? message;
            } catch { /* ignore */ }
            setState({ uploadProgress: 0, isUploading: false, error: message });
            resolve(null);
          }
        });

        xhr.addEventListener("error", () => {
          setState({
            uploadProgress: 0,
            isUploading: false,
            error: "Network error — please check your connection",
          });
          resolve(null);
        });

        xhr.addEventListener("abort", () => {
          setState({ uploadProgress: 0, isUploading: false, error: null });
          resolve(null);
        });

        xhr.open("POST", "/api/upload");
        xhr.send(formData);
      });
    },
    []
  );

  const reset = useCallback(() => {
    xhrRef.current?.abort();
    setState({ uploadProgress: 0, isUploading: false, error: null });
  }, []);

  return { ...state, upload, reset };
}
