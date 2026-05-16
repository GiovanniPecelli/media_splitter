import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VideoSplitter — Split MP4 files for RAG & Transcription",
  description:
    "Upload a long MP4 video and automatically split it into clips under 29 minutes. Perfect for Whisper transcription, RAG pipelines, and AI workflows.",
  keywords: ["video splitter", "mp4", "RAG", "transcription", "whisper", "ffmpeg"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
