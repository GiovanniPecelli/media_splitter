import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // for Docker minimal image
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "@ffprobe-installer/ffprobe", "fluent-ffmpeg", "archiver"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4gb",
    },
  },
};

export default nextConfig;
