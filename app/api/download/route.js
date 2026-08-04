import { spawn } from "child_process";
import ytdl from "@distube/ytdl-core";
import { getYtDlpPath, writeCookiesFile, cleanupCookiesFile, getProxyUrl } from "../../../lib/get-yt-dlp";

export const runtime = "nodejs";
export const maxDuration = 60;

// Known CDN domains whose URLs can be fetched directly
function looksLikeCdnUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    const cdnHosts = [
      "googlevideo.com",
      "cdninstagram.com",
      "fbcdn.net",
      "tiktokcdn.com",
      "sndcdn.com",
      "akamaized.net",
      "twimg.com",
      "pinimg.com",
      "cloudfront.net",
      "discordapp.net",
      "vimeocdn.com",
    ];
    if (cdnHosts.some((d) => u.hostname.endsWith(d))) return true;
    if (/\.(mp4|mp3|m4a|webm|mov|ogg|flv|ts)(\?|$)/i.test(u.pathname)) return true;
    return false;
  } catch {
    return false;
  }
}

function jsonError(msg, status = 500) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function resolveYouTubeCdnUrl(url, formatReq) {
  try {
    console.log("[download] Attempting fast JS stream resolution with @distube/ytdl-core...");
    const info = await ytdl.getInfo(url);
    if (!info || !info.formats || !info.formats.length) return null;

    let targetFormat = null;
    if (formatReq === "bestaudio" || formatReq === "fb_audio") {
      targetFormat = ytdl.chooseFormat(info.formats, { quality: "highestaudio" });
    } else {
      targetFormat = ytdl.chooseFormat(info.formats, { filter: "audioandvideo" })
        || info.formats.find((f) => f.hasVideo && f.hasAudio)
        || info.formats[0];
    }

    if (targetFormat?.url) {
      console.log("[download] @distube/ytdl-core successfully resolved stream URL!");
      return targetFormat.url;
    }
  } catch (e) {
    console.warn("[download] ytdl-core stream resolution warning:", e.message);
  }
  return null;
}

async function resolveCdnUrlWithYtDlp(binPath, url, formatArg, cookiesPath, proxyUrl, clientConfig = "android,mweb,ios") {
  const args = [
    url,
    "-f", formatArg,
    "--get-url",
    "--no-warnings",
    "--no-check-certificates",
    "--geo-bypass",
    "--no-playlist",
    "--extractor-args", `youtube:player_client=${clientConfig}`,
    "--add-header", "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "--add-header", "referer:https://www.google.com/",
  ];
  if (cookiesPath) args.push("--cookies", cookiesPath);
  if (proxyUrl) args.push("--proxy", proxyUrl);

  return new Promise((resolve, reject) => {
    const child = spawn(binPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      const lines = stdout.trim().split("\n").filter((l) => l.startsWith("http"));
      if (code === 0 && lines.length > 0) {
        resolve(lines[0].trim());
      } else {
        const errLine = stderr.split("\n").filter((l) => l.includes("ERROR:")).pop();
        reject(new Error(errLine?.replace(/^ERROR:\s*/, "") || stderr.slice(0, 400) || `yt-dlp exited ${code}`));
      }
    });
  });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const rawFormat = searchParams.get("format") || "best";
  const rawFilename = searchParams.get("filename") || "download.mp4";

  if (!url) {
    return jsonError("Missing url parameter", 400);
  }

  // Safe filename
  const safeFilename = rawFilename
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  const asciiFilename = safeFilename.replace(/[^\x20-\x7E]/g, "_") || "download.mp4";
  const encodedFilename = encodeURIComponent(safeFilename).replace(/['()]/g, escape).replace(/\*/g, "%2A");

  const contentDisposition = `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;

  // ── PATH 1: URL is already a CDN URL — proxy directly, no yt-dlp needed ──
  if (looksLikeCdnUrl(url) || rawFormat === "direct") {
    console.log("[download] Direct CDN proxy:", url.slice(0, 80));
    try {
      const cdnRes = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "referer": "https://www.google.com/",
        },
      });
      if (cdnRes.ok && cdnRes.body) {
        const headers = {
          "Content-Type": cdnRes.headers.get("content-type") || "application/octet-stream",
          "Content-Disposition": contentDisposition,
          "Cache-Control": "no-store",
        };
        const len = cdnRes.headers.get("content-length");
        if (len) headers["Content-Length"] = len;
        return new Response(cdnRes.body, { headers });
      }
      console.warn("[download] CDN fetch returned non-OK:", cdnRes.status);
    } catch (e) {
      console.warn("[download] Direct CDN fetch failed:", e.message);
    }
    return jsonError("Could not fetch from source CDN. The stream URL may have expired. Please extract again.", 502);
  }

  // ── PATH 2: YouTube URL — Try fast pure JS resolution with ytdl-core first ──
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  let cdnUrl = null;

  if (isYouTube) {
    cdnUrl = await resolveYouTubeCdnUrl(url, rawFormat);
  }

  // ── PATH 3: If not YouTube or ytdl-core failed — use yt-dlp binary ──
  if (!cdnUrl) {
    let formatArg = "best[ext=mp4]/best/18";

    if (rawFormat === "bestaudio" || rawFormat === "fb_audio") {
      formatArg = "bestaudio[ext=m4a]/bestaudio/best";

    } else if (rawFormat.startsWith("fb_")) {
      const h = rawFormat.replace("fb_", "");
      formatArg = `best[height<=${h}][ext=mp4]/best[height<=${h}]/best[ext=mp4]/best/18`;

    } else if (rawFormat === "best") {
      formatArg = "best[ext=mp4]/best/18";

    } else if (/^\d+$/.test(rawFormat.trim())) {
      const num = rawFormat.trim();
      formatArg = `${num}/best[ext=mp4]/best/18`;

    } else {
      const heightMatch = rawFormat.match(/height<=?(\d+)/i);
      if (heightMatch) {
        const h = heightMatch[1];
        formatArg = `best[height<=${h}][ext=mp4]/best[height<=${h}]/best[ext=mp4]/best/18`;
      } else {
        formatArg = "best[ext=mp4]/best/18";
      }
    }

    console.log(`[download] Resolving CDN URL via yt-dlp binary | format: ${formatArg}`);

    let resolveError = "Could not resolve download URL.";
    let binPath = null;
    let cookiesPath = null;
    let proxyUrl = null;

    try {
      binPath = await getYtDlpPath();
      cookiesPath = writeCookiesFile();
      proxyUrl = getProxyUrl();

      try {
        cdnUrl = await resolveCdnUrlWithYtDlp(binPath, url, formatArg, cookiesPath, proxyUrl, "android,mweb,ios");
      } catch (err1) {
        console.warn("[download] Primary client resolution failed, retrying fallback client...", err1.message);
        try {
          cdnUrl = await resolveCdnUrlWithYtDlp(binPath, url, formatArg, cookiesPath, proxyUrl, "tv,mweb");
        } catch (err2) {
          console.warn("[download] Fallback client resolution failed, retrying universal format...", err2.message);
          try {
            cdnUrl = await resolveCdnUrlWithYtDlp(binPath, url, "best[ext=mp4]/best/18", cookiesPath, proxyUrl, "android,web");
          } catch (err3) {
            let msg = err3?.message || String(err3);
            if (msg.includes("Private") || msg.includes("login")) {
              resolveError = "This content is private or requires login.";
            } else if (msg.includes("unavailable") || msg.includes("404")) {
              resolveError = "Media not found or has been removed.";
            } else {
              resolveError = "Unable to fetch video stream from platform. Please try again or use the Stream button.";
            }
            console.error("[download] All resolution attempts failed:", msg);
          }
        }
      }
    } catch (binErr) {
      console.error("[download] Error setting up yt-dlp binary:", binErr.message);
      resolveError = "Server process initialization error. Please try the Stream button.";
    } finally {
      cleanupCookiesFile(cookiesPath);
    }
  }

  if (!cdnUrl) {
    return jsonError("Unable to fetch video stream from platform. Please try again or use the Stream button.", 500);
  }

  // ── PATH 4: Proxy-stream from resolved CDN URL ──
  try {
    const cdnRes = await fetch(cdnUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "referer": "https://www.google.com/",
      },
    });

    if (cdnRes.ok && cdnRes.body) {
      const headers = {
        "Content-Type": cdnRes.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition": contentDisposition,
        "Cache-Control": "no-store",
      };
      const len = cdnRes.headers.get("content-length");
      if (len) headers["Content-Length"] = len;
      console.log(`[download] Streaming from CDN proxy (${len ? Math.round(len / 1024 / 1024) + " MB" : "unknown size"})`);
      return new Response(cdnRes.body, { headers });
    }

    console.warn(`[download] CDN proxy returned ${cdnRes.status}, falling back to redirect`);
  } catch (e) {
    console.warn("[download] CDN proxy fetch error:", e.message, "— falling back to redirect");
  }

  // ── PATH 5: Redirect to CDN URL as last resort ──
  console.log("[download] Redirecting to CDN URL:", cdnUrl.slice(0, 80));
  return new Response(null, {
    status: 302,
    headers: {
      Location: cdnUrl,
      "Cache-Control": "no-store",
    },
  });
}
