import fs from "fs";
import path from "path";
import os from "os";
import { chmod } from "fs/promises";
import { pipeline } from "stream/promises";
import youtubedl from "youtube-dl-exec";

export function getCookiesFile() {
  const b64Cookies = process.env.YOUTUBE_COOKIES_B64;
  const rawCookies = process.env.YOUTUBE_COOKIES;

  if (!b64Cookies && !rawCookies) return null;

  try {
    const cookiesPath = path.join(os.tmpdir(), "youtube_cookies.txt");
    let content = "";

    if (b64Cookies) {
      content = Buffer.from(b64Cookies, "base64").toString("utf-8");
    } else if (rawCookies) {
      content = rawCookies;
    }

    if (content.trim()) {
      fs.writeFileSync(cookiesPath, content, "utf-8");
      return cookiesPath;
    }
  } catch (err) {
    console.warn("[getCookiesFile] Error writing cookies file:", err.message);
  }

  return null;
}

export function getProxyUrl() {
  return process.env.YTDLP_PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY || null;
}

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

  // 3. Download standalone binary (yt-dlp_linux is PyInstaller standalone, requiring NO system python3)
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

  const cookiesPath = getCookiesFile();
  const proxyUrl = getProxyUrl();

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

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

  if (isYouTube) {
    // Strategy 1: Primary attempt with cookies & default parameters
    try {
      return await instance(url, baseFlags);
    } catch (err1) {
      console.warn("[runYtDlp] Attempt 1 failed, trying Strategy 2 (android_vr,tv_embedded,web_embedded)...", err1?.message || err1);
    }

    // Strategy 2: Resistant client fallback (android_vr, tv_embedded, web_embedded)
    try {
      return await instance(url, {
        ...baseFlags,
        extractorArgs: "youtube:player_client=android_vr,tv_embedded,web_embedded",
      });
    } catch (err2) {
      console.warn("[runYtDlp] Attempt 2 failed, trying Strategy 3 (android,ios,tv)...", err2?.message || err2);
    }

    // Strategy 3: Mobile client fallback (android, ios, tv)
    try {
      return await instance(url, {
        ...baseFlags,
        extractorArgs: "youtube:player_client=android,ios,tv",
      });
    } catch (err3) {
      console.warn("[runYtDlp] Attempt 3 failed.", err3?.message || err3);
      throw err3;
    }
  }

  return instance(url, baseFlags);
}
