"use client";

import { useState, useRef, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export interface JobPartClient {
  index: number;
  filename: string;
  blobUrl: string;
  sizeBytes: number;
}

export function useFFmpegSplitter() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "processing" | "done" | "error">("idle");
  const [parts, setParts] = useState<JobPartClient[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [expectedParts, setExpectedParts] = useState(0);

  const load = async () => {
    if (isLoaded) return;
    setStatus("loading");
    
    // Only instantiate FFmpeg on the client side
    if (!ffmpegRef.current) {
      ffmpegRef.current = new FFmpeg();
    }
    
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    const ffmpeg = ffmpegRef.current;
    
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      setIsLoaded(true);
      setStatus("idle");
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to load FFmpeg. Check console for details.");
      setStatus("error");
    }
  };

  const processFiles = async (files: File[], splitMinutes: number, batchName: string) => {
    if (!isLoaded) await load();
    setStatus("processing");
    setProgress(0);
    setParts([]);
    setErrorMsg("");

    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) {
        setErrorMsg("FFmpeg failed to initialize.");
        setStatus("error");
        return;
    }
    const splitSec = splitMinutes * 60;
    const allParts: JobPartClient[] = [];

    let overallIndex = 1;

    try {
      setExpectedParts(files.length); // Placeholder

      for (let f = 0; f < files.length; f++) {
        const file = files[f];
        const inputName = `input_${f}.mp4`;
        
        await ffmpeg.writeFile(inputName, await fetchFile(file));

        ffmpeg.on('progress', ({ progress }) => {
            setProgress(Math.round(progress * 100));
        });

        const outPattern = `out_${f}_%03d.mp4`;
        
        await ffmpeg.exec([
          '-i', inputName,
          '-c', 'copy',
          '-f', 'segment',
          '-segment_time', String(splitSec),
          '-reset_timestamps', '1',
          outPattern
        ]);

        const dir = await ffmpeg.listDir('/');
        const outputFiles = dir.filter(d => (d.name as string).startsWith(`out_${f}_`) && (d.name as string).endsWith('.mp4'));
        
        for (let i = 0; i < outputFiles.length; i++) {
          const outName = outputFiles[i].name as string;
          const data = await ffmpeg.readFile(outName);
          const blob = new Blob([data], { type: 'video/mp4' });
          const url = URL.createObjectURL(blob);
          
          allParts.push({
            index: overallIndex,
            filename: `${batchName}_${overallIndex.toString().padStart(3, '0')}.mp4`,
            blobUrl: url,
            sizeBytes: blob.size
          });
          overallIndex++;
          
          await ffmpeg.deleteFile(outName);
        }
        
        await ffmpeg.deleteFile(inputName);
      }
      
      setParts(allParts);
      setExpectedParts(allParts.length);
      setStatus("done");
      setProgress(100);
      
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to process videos.");
      setStatus("error");
    }
  };

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setParts([]);
    setErrorMsg("");
  }, []);

  return { isLoaded, load, status, progress, parts, expectedParts, errorMsg, processFiles, reset };
}
