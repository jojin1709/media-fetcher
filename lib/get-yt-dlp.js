import fs from "fs";
import path from "path";
import os from "os";
import { chmod } from "fs/promises";
import { pipeline } from "stream/promises";
import youtubedl from "youtube-dl-exec";

export async function getYtDlpPath() {
  const isWin = process.platform === "win32";
  const binName = isWin ? "yt-dlp.exe" : "yt-dlp";

  // 1. Try node_modules vendor path
  const nodeModulesPath = path.join(process.cwd(), "node_modules", "youtube-dl-exec", "bin", binName);
  if (fs.existsSync(nodeModulesPath)) {
    return nodeModulesPath;
  }

  // 2. Try OS temp directory (always writable on Vercel / AWS Lambda)
  const tmpPath = path.join(os.tmpdir(), binName);
  if (fs.existsSync(tmpPath)) {
    return tmpPath;
  }

  // 3. Download dynamically to OS temp directory
  console.log(`[get-yt-dlp] Downloading ${binName} to ${tmpPath}...`);
  const downloadUrl = isWin
    ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
    : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";

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

  console.log(`[get-yt-dlp] Successfully downloaded yt-dlp to ${tmpPath}`);
  return tmpPath;
}

export async function runYtDlp(url, flags = {}) {
  const binPath = await getYtDlpPath();
  const instance = youtubedl.create(binPath);

  const baseFlags = {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    preferFreeFormats: true,
    addHeader: [
      "referer:https://www.google.com/",
      "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    ],
    ...flags,
  };

  // If YouTube URL, include player client fallback
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    baseFlags.extractorArgs = "youtube:player_client=android,mweb,web";
  }

  try {
    return await instance(url, baseFlags);
  } catch (err) {
    // Retry without extractorArgs if initial attempt fails
    if (baseFlags.extractorArgs) {
      delete baseFlags.extractorArgs;
      return await instance(url, baseFlags);
    }
    throw err;
  }
}
