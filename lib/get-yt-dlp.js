import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { chmod } from "fs/promises";
import { pipeline } from "stream/promises";
import youtubedl from "youtube-dl-exec";

export function writeCookiesFile() {
  const b64Cookies = process.env.YOUTUBE_COOKIES_B64;
  const rawCookies = process.env.YOUTUBE_COOKIES;

  if (!b64Cookies && !rawCookies) {
    console.log("[get-yt-dlp] No YOUTUBE_COOKIES_B64 or YOUTUBE_COOKIES environment variable found.");
    return null;
  }

  try {
    const randomId = crypto.randomBytes(6).toString("hex");
    const cookiesPath = path.join(os.tmpdir(), `cookies-${randomId}.txt`);
    let content = "";

    if (b64Cookies) {
      content = Buffer.from(b64Cookies.trim(), "base64").toString("utf-8");
    } else if (rawCookies) {
      content = rawCookies.trim();
    }

    if (content) {
      fs.writeFileSync(cookiesPath, content, "utf-8");
      const stat = fs.statSync(cookiesPath);
      console.log(`[get-yt-dlp] Wrote cookies file to ${cookiesPath} (${stat.size} bytes)`);
      return cookiesPath;
    }
  } catch (err) {
    console.warn("[get-yt-dlp] Error writing cookies file:", err.message);
  }

  return null;
}

export function cleanupCookiesFile(cookiesPath) {
  if (cookiesPath && fs.existsSync(cookiesPath)) {
    try {
      fs.unlinkSync(cookiesPath);
      console.log(`[get-yt-dlp] Cleaned up temporary cookies file ${cookiesPath}`);
    } catch (e) {
      console.warn(`[get-yt-dlp] Failed to cleanup cookies file ${cookiesPath}:`, e.message);
    }
  }
}

export function getProxyUrl() {
  return process.env.YTDLP_PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY || null;
}

export async function getYtDlpPath() {
  const isWin = process.platform === "win32";
  const primaryBin = isWin ? "yt-dlp.exe" : "yt-dlp";
  const tmpExecPath = path.join(os.tmpdir(), `exec-${primaryBin}`);

  // Return cached executable binary in /tmp if present
  if (fs.existsSync(tmpExecPath)) {
    return tmpExecPath;
  }

  // 1. Copy pre-bundled binary to /tmp (AWS Lambda / Vercel requires binaries in /tmp for execution permissions)
  const candidatePaths = [
    path.join(process.cwd(), "node_modules/youtube-dl-exec/bin", primaryBin),
    path.join(process.cwd(), "node_modules/youtube-dl-exec/bin", "yt-dlp"),
    path.join(process.cwd(), "node_modules/youtube-dl-exec/bin", "yt-dlp.exe"),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      console.log(`[getYtDlpPath] Copying pre-bundled binary from ${p} to ${tmpExecPath}...`);
      try {
        fs.copyFileSync(p, tmpExecPath);
        if (!isWin) {
          fs.chmodSync(tmpExecPath, 0o755);
        }
        console.log(`[getYtDlpPath] Successfully prepared executable binary at ${tmpExecPath}`);
        return tmpExecPath;
      } catch (e) {
        console.warn(`[getYtDlpPath] Failed copying binary from ${p} to ${tmpExecPath}:`, e.message);
      }
    }
  }

  // 2. Download standalone binary to /tmp directory if pre-bundled binary not found
  console.log(`[getYtDlpPath] Downloading standalone binary to ${tmpExecPath}...`);
  const downloadUrl = isWin
    ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
    : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux";

  const res = await fetch(downloadUrl);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download yt-dlp binary from ${downloadUrl}: ${res.statusText}`);
  }

  const fileStream = fs.createWriteStream(tmpExecPath);
  // @ts-ignore
  await pipeline(res.body, fileStream);

  if (!isWin) {
    try {
      await chmod(tmpExecPath, 0o755);
    } catch (e) {
      console.warn("[getYtDlpPath] chmod warning:", e.message);
    }
  }

  console.log(`[getYtDlpPath] Successfully downloaded binary to ${tmpExecPath}`);
  return tmpExecPath;
}

export async function runYtDlp(url, flags = {}) {
  const binPath = await getYtDlpPath();
  const instance = youtubedl.create(binPath);

  const cookiesPath = writeCookiesFile();
  const proxyUrl = getProxyUrl();

  const baseFlags = {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    preferFreeFormats: true,
    geoBypass: true,
    extractorArgs: "youtube:player_client=android,mweb,ios",
    addHeader: [
      "referer:https://www.google.com/",
      "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    ],
    ...(cookiesPath ? { cookies: cookiesPath } : {}),
    ...(proxyUrl ? { proxy: proxyUrl } : {}),
    ...flags,
  };

  if (cookiesPath) {
    console.log(`[runYtDlp] Extracting metadata using authenticated cookies file: ${cookiesPath}`);
  }

  try {
    return await instance(url, baseFlags);
  } finally {
    if (cookiesPath) {
      cleanupCookiesFile(cookiesPath);
    }
  }
}
