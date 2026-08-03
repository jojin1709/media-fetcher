import fs from "fs";
import path from "path";
import os from "os";
import { chmod } from "fs/promises";
import { pipeline } from "stream/promises";
import youtubedl from "youtube-dl-exec";

export async function getYtDlpPath() {
  const isWin = process.platform === "win32";
  const binName = isWin ? "yt-dlp.exe" : "yt-dlp";

  // 1. Check node_modules vendor path
  const nodeModulesPath = path.join(process.cwd(), "node_modules", "youtube-dl-exec", "bin", binName);
  if (fs.existsSync(nodeModulesPath)) {
    return nodeModulesPath;
  }

  // 2. Check OS temp directory (always writable on Vercel / AWS Lambda)
  const tmpPath = path.join(os.tmpdir(), binName);
  if (fs.existsSync(tmpPath)) {
    return tmpPath;
  }

  // 3. Download standalone binary (yt-dlp_linux is PyInstaller standalone)
  console.log(`[get-yt-dlp] Downloading ${binName} to ${tmpPath}...`);
  const downloadUrl = isWin
    ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
    : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux";

  const res = await fetch(downloadUrl);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download yt-dlp binary from ${downloadUrl}: ${res.statusText}`);
  }

  const fileStream = fs.createWriteStream(tmpPath);
  // @ts-ignore
  await pipeline(res.body, fileStream);

  if (!isWin) {
    try {
      await chmod(tmpPath, 0o755);
    } catch {}
  }

  console.log(`[get-yt-dlp] Successfully stored yt-dlp binary at ${tmpPath}`);
  return tmpPath;
}

export async function runYtDlp(url, flags = {}) {
  const binPath = await getYtDlpPath();
  const instance = youtubedl.create(binPath);

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

  if (isYouTube) {
    // Attempt 1: iOS / Mobile client strategy (bypasses bot challenge on cloud IPs)
    try {
      return await instance(url, {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificates: true,
        preferFreeFormats: true,
        geoBypass: true,
        extractorArgs: "youtube:player_client=ios,mweb",
        addHeader: [
          "referer:https://www.google.com/",
          "user-agent:Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
        ],
        ...flags,
      });
    } catch (err1) {
      console.warn("[runYtDlp] Attempt 1 (ios,mweb) failed, trying Android client strategy...", err1?.message || err1);
    }

    // Attempt 2: Android / TV client strategy
    try {
      return await instance(url, {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificates: true,
        preferFreeFormats: true,
        geoBypass: true,
        extractorArgs: "youtube:player_client=android,tv",
        addHeader: [
          "referer:https://www.google.com/",
          "user-agent:Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        ],
        ...flags,
      });
    } catch (err2) {
      console.warn("[runYtDlp] Attempt 2 (android,tv) failed, trying default fallback strategy...", err2?.message || err2);
    }
  }

  // Fallback for all other platforms or YouTube fallback
  return instance(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    preferFreeFormats: true,
    geoBypass: true,
    addHeader: [
      "referer:https://www.google.com/",
      "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    ],
    ...flags,
  });
}
