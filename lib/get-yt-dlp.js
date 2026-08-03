import fs from "fs";
import path from "path";
import { chmod } from "fs/promises";
import { pipeline } from "stream/promises";
import youtubedl from "youtube-dl-exec";

export async function getYtDlpPath() {
  const isWin = process.platform === "win32";
  const binName = isWin ? "yt-dlp.exe" : "yt-dlp";
  const binDir = path.join(process.cwd(), "node_modules", "youtube-dl-exec", "bin");
  const binPath = path.join(binDir, binName);

  if (fs.existsSync(binPath)) {
    return binPath;
  }

  // Fallback: Download dynamically at runtime if missing
  console.log(`[get-yt-dlp] Binary missing at ${binPath}. Downloading for ${process.platform}...`);
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const downloadUrl = isWin
    ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
    : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";

  const res = await fetch(downloadUrl);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download yt-dlp binary from ${downloadUrl}: ${res.statusText}`);
  }

  const fileStream = fs.createWriteStream(binPath);
  // @ts-ignore
  await pipeline(res.body, fileStream);

  if (!isWin) {
    await chmod(binPath, 0o755);
  }

  console.log(`[get-yt-dlp] Downloaded binary to ${binPath}`);
  return binPath;
}

export async function runYtDlp(url, flags = {}) {
  const binPath = await getYtDlpPath();
  const instance = youtubedl.create(binPath);

  // Add bypass flags for cloud/Vercel IP blocking
  const mergedFlags = {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    preferFreeFormats: true,
    extractorArgs: "youtube:player_client=android,mweb,web",
    addHeader: [
      "referer:https://www.google.com/",
      "user-agent:Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    ],
    ...flags,
  };

  return instance(url, mergedFlags);
}
