import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { chmod } from "fs/promises";
import { pipeline } from "stream/promises";
import youtubedl from "youtube-dl-exec";

let cachedProxyPool = [];

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

export async function getProxyUrl() {
  if (process.env.YTDLP_PROXY_URL) return process.env.YTDLP_PROXY_URL;
  if (process.env.HTTP_PROXY) return process.env.HTTP_PROXY;
  if (process.env.HTTPS_PROXY) return process.env.HTTPS_PROXY;

  // Auto-fetch free working proxies if no env var is configured
  try {
    if (cachedProxyPool.length === 0) {
      const res = await fetch("https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all");
      if (res.ok) {
        const text = await res.text();
        cachedProxyPool = text
          .trim()
          .split("\r\n")
          .filter((p) => p.includes(":"))
          .map((p) => `http://${p.trim()}`);
      }
    }

    if (cachedProxyPool.length > 0) {
      const randomProxy = cachedProxyPool[Math.floor(Math.random() * cachedProxyPool.length)];
      console.log(`[get-yt-dlp] Using auto-rotated free proxy pool: ${randomProxy}`);
      return randomProxy;
    }
  } catch (err) {
    console.warn("[get-yt-dlp] Auto proxy fetch warning:", err.message);
  }

  return null;
}

export async function getYtDlpPath() {
  const isWin = process.platform === "win32";
  const binName = isWin ? "yt-dlp.exe" : "yt-dlp_standalone";
  const tmpPath = path.join(os.tmpdir(), binName);

  if (fs.existsSync(tmpPath)) {
    return tmpPath;
  }

  console.log(`[getYtDlpPath] Downloading standalone ${binName} to ${tmpPath}...`);
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
    } catch (e) {
      console.warn("[getYtDlpPath] chmod warning:", e.message);
    }
  }

  console.log(`[getYtDlpPath] Successfully stored standalone binary at ${tmpPath}`);
  return tmpPath;
}

export async function runYtDlp(url, flags = {}) {
  const binPath = await getYtDlpPath();
  const instance = youtubedl.create(binPath);

  const cookiesPath = writeCookiesFile();
  const proxyUrl = await getProxyUrl();

  const baseFlags = {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    preferFreeFormats: true,
    geoBypass: true,
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
