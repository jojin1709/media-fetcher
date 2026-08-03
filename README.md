<div align="center">

# ⚡ MediaFetcher Pro — Universal Media Extractor

> **An autonomous, multi-platform video & audio downloader powered by Next.js & yt-dlp.**  
> Extract original format streams across YouTube, Instagram, TikTok, X/Twitter, SoundCloud, Pinterest, Facebook, and 1000+ websites.

[![Live Demo](https://img.shields.io/badge/Live_Demo-mediafetcch.vercel.app-6366F1?style=for-the-badge&logo=vercel&logoColor=white)](https://mediafetcch.vercel.app/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-jojin1709%2Fmedia--fetcher-8B5CF6?style=for-the-badge&logo=github&logoColor=white)](https://github.com/jojin1709/media-fetcher)
[![License](https://img.shields.io/badge/License-MIT-06B6D4?style=for-the-badge)](LICENSE)

---

### 👨‍💻 Developed by **[JOJIN JOHN](https://github.com/jojin1709)**

---

</div>

> [!NOTE]
> **Live Web Application:** Test the app instantly at [**https://mediafetcch.vercel.app/**](https://mediafetcch.vercel.app/).

---

## 📋 Table of Contents

- [Features](#-features)
- [Supported Platforms](#-supported-platforms)
- [How It Works](#-how-it-works)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Deployment on Vercel](#-deployment-on-vercel)
- [Architecture](#-architecture)
- [Disclaimer & License](#-disclaimer--license)

---

## ✨ Features

- **🌐 Multi-Platform Auto-Detection**: Automatically identifies YouTube, Instagram, TikTok, Twitter/X, SoundCloud, Pinterest, and Facebook links as you paste them.
- **🎬 Full Resolution & Stream Listing**: Lists all individual video formats (4K 2160p, 2K 1440p, 1080p FHD, 720p HD, 480p, 360p, 240p) and audio bitrates (320kbps MP3, M4A).
- **⚡ 1-Click Instant Downloads**: Quick-download cards for the highest quality combined video+audio stream and best audio track.
- **🔄 On-Demand Stream Merging**: Automatically combines split DASH video-only streams with high-quality audio streams during download.
- **🛡️ Serverless & Bot Bypass Engine**: Powered by standalone PyInstaller Linux binary with YouTube oEmbed fallback, base64 cookie support, and proxy routing.
- **🎨 Premium SaaS Aesthetic**: Modern UI designed with Indigo/Violet dark mode glassmorphism, micro-animations, and dynamic tab counts.

---

## 🌐 Supported Platforms

| Platform | Supported Formats | Features |
| :--- | :--- | :--- |
| 🔴 **YouTube** | 4K, 2K, 1080p, 720p, Shorts, MP3 | On-demand audio merging, Shorts extraction |
| 📸 **Instagram** | Reels, Video Posts, Carousels | High-res MP4 extraction |
| 🎵 **TikTok** | HD Videos, Watermark-free | Clean video & MP3 audio tracks |
| 🐦 **Twitter / X** | Video clips, GIFs | Direct media stream links |
| 🎶 **SoundCloud** | High Quality Audio | Original format audio tracks |
| 📌 **Pinterest** | Pins, Idea Videos | Direct CDN MP4 downloads |
| 📘 **Facebook** | Public Videos, Reels | HD/SD video extraction |
| 🌐 **1000+ Sites** | Vimeo, Twitch, Reddit, etc. | Universal fallback extraction |

---

## ⚙️ How It Works

1. **`POST /api/info`**: Runs `yt-dlp` metadata extraction on the provided URL and returns video title, thumbnail, duration, uploader, and full stream formats array. If YouTube bot challenges trigger on datacenter IPs, it seamlessly falls back to YouTube's oEmbed API.
2. **`GET /api/download`**: Proxies media stream directly to the user's browser with proper `Content-Disposition` attachment headers for instant file saving.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** installed on your system.

### Run Locally

```bash
# Clone repository
git clone https://github.com/jojin1709/media-fetcher.git
cd media-fetcher

# Install dependencies
npm install

# Start local dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Environment Variables

You can configure optional environment variables in Vercel or `.env.local`:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `YOUTUBE_COOKIES_B64` | Base64-encoded `cookies.txt` from YouTube account | `I05ldHNjYXBlIEhUVFAgQ29va2llIEZpbGU...` |
| `YTDLP_PROXY_URL` | Rotating or residential proxy URL | `http://user:pass@proxy.example.com:8080` |

---

## ☁️ Deployment on Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy project
vercel
```

Or connect `https://github.com/jojin1709/media-fetcher` to Vercel for automatic deployments on push to `main`.

---

## 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                      Client UI                          │
│        Next.js App Router + SaaS Glassmorphism          │
└────────────────────────────┬────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌───────────────────────┐         ┌───────────────────────┐
│     POST /api/info    │         │   GET /api/download   │
│ (Metadata & Formats)  │         │ (Stream Proxy Fetch)  │
└───────────┬───────────┘         └───────────┬───────────┘
            │                                 │
            └────────────────┬────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│            yt-dlp_standalone PyInstaller Binary         │
│          (Stored in /tmp/yt-dlp_standalone)            │
└─────────────────────────────────────────────────────────┘
```

---

## 📜 Disclaimer & License

This tool is created for educational and personal use. Users are responsible for ensuring that downloads comply with platform Terms of Service and copyright laws.

Developed with ❤️ by **[JOJIN JOHN](https://github.com/jojin1709)**.  
Licensed under the [MIT License](LICENSE).
