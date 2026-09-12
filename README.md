# 🎬 Media Splitter

*Created as a personal tool by [giovannipecelli](https://github.com/giovannipecelli).*

[![Hosted on Vercel](https://img.shields.io/badge/Hosted_on-Vercel-black?logo=vercel)](https://media-splitter.vercel.app/)

Welcome to **Media Splitter**! This open-source web tool allows you to upload, trim, and split your videos into smaller clips easily and quickly, directly from your browser. **You can use the tool directly online without installing anything!**

Built with **Next.js**, **React**, and powered by **FFmpeg** for fast media processing, it guarantees accurate trimming and conversion without the need to download heavy software to your computer.

## ✨ Features & Utility

* **Intuitive Interface**: A simple design (built with Tailwind CSS) to upload your videos and select how you want to split them.
* **Fast Processing**: Uses FFmpeg (via `@ffmpeg-installer/ffmpeg`) to slice videos into fractions or based on custom time requirements.
* **Bulk Download**: Receive all your split clips bundled together in a convenient `.zip` archive, ready to be used.
* **Versatile**: Perfect for content creators who need to split long videos for TikTok, Instagram Reels, YouTube Shorts, or anyone managing large media files.

---

## 🚀 How to Host Online (Vercel)

You can easily host this project for free using **Vercel**, the official platform by the creators of Next.js. 

Thanks to the `@ffmpeg-installer/ffmpeg` and `@ffprobe-installer/ffprobe` packages, the FFmpeg binaries are automatically downloaded and configured during the build phase.

1. **Fork** this repository to your GitHub account.
2. Go to [Vercel](https://vercel.com/) and log in (or create an account).
3. Click on **Add New...** > **Project**.
4. Import the Media Splitter repository from your GitHub.
5. Leave the default settings (Framework Preset on *Next.js*) and click **Deploy**.
6. Within a couple of minutes, your site will be live with a shareable link!

---

## 💻 Local Development

If you prefer to run the tool on your own computer or want to modify the code, there are two main ways: using **Node.js** or using **Docker**.

### Option 1: Standard Installation (Node.js)

**Prerequisites:**
* [Node.js](https://nodejs.org/) (version 18 or higher)
* npm, yarn, pnpm, or bun
* (Optional) FFmpeg installed on your system (although the installer packages should handle this).

**Steps:**
1. Clone the repository:
   ```bash
   git clone https://github.com/giovannipecelli/media_splitter.git
   cd media_splitter
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: Installation with Docker

If you don't want to install Node.js or clutter your development environment, you can use Docker. This project already includes a `Dockerfile` and a `docker-compose.yml`.

**Prerequisites:**
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

**Steps:**
1. Open a terminal in the project folder.
2. Run the following command:
   ```bash
   docker-compose up -d
   ```
3. Wait for the image to build and the container to start. Then, go to [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Technologies Used

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **UI/Styling**: [React](https://reactjs.org/), [Tailwind CSS](https://tailwindcss.com/)
- **Media Processing**: `fluent-ffmpeg`, `@ffmpeg-installer/ffmpeg`, `@ffprobe-installer/ffprobe`
- **File Management**: `formidable` (for uploads), `archiver` (for generating zip files).

## 📄 License

This project is open-source and available under the **MIT** license. Feel free to use it, modify it, and distribute it as you like!
