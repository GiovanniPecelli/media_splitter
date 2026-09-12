import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // for Docker minimal image
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "@ffprobe-installer/ffprobe", "fluent-ffmpeg", "archiver"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4gb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
