import { spawn } from "child_process";
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
      "sndcdn.com",       // SoundCloud
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

async function resolveCdnUrl(binPath, url, formatArg, cookiesPath, proxyUrl) {
  const args = [
    url,
    "-f", formatArg,
    "--get-url",
    "--no-warnings",
    "--no-check-certificates",
    "--geo-bypass",
    "--no-playlist",
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

  // ── PATH 2: Page URL — use yt-dlp --get-url to resolve CDN URL ──

  // Resolve format to a pre-muxed format where possible (avoid FFmpeg merges)
  let formatArg = rawFormat;

  if (rawFormat.startsWith("fb_")) {
    const h = rawFormat.replace("fb_", "");
    formatArg = h === "audio"
      ? "bestaudio[ext=m4a]/bestaudio/best"
      : `best[height<=${h}][ext=mp4]/best[height<=${h}]/bestvideo[height<=${h}]+bestaudio/best`;

  } else if (rawFormat === "best") {
    formatArg = "best[ext=mp4]/best[vcodec!*=av01]/best";

  } else if (rawFormat === "bestaudio") {
    formatArg = "bestaudio[ext=m4a]/bestaudio/best";

  } else if (/^\d+$/.test(rawFormat.trim())) {
    // Single numeric format ID — assume pre-muxed
    formatArg = rawFormat.trim();

  } else if (rawFormat.includes("+")) {
    // Merged DASH spec (e.g. "315+bestaudio/best") — rewrite to prefer pre-muxed
    const heightMatch = rawFormat.match(/\[height<=(\d+)\]/);
    if (heightMatch) {
      formatArg = `best[height<=${heightMatch[1]}][ext=mp4]/best[height<=${heightMatch[1]}][vcodec!*=av01]/best[height<=${heightMatch[1]}]`;
    } else {
      // Try to get best pre-muxed mp4
      formatArg = "best[ext=mp4]/best[vcodec!*=av01]/best";
    }
  }

  console.log(`[download] Resolving CDN URL via yt-dlp | format: ${formatArg}`);

  const binPath = await getYtDlpPath();
  const cookiesPath = writeCookiesFile();
  const proxyUrl = getProxyUrl();

  let cdnUrl = null;
  let resolveError = "Could not resolve download URL.";

  try {
    cdnUrl = await resolveCdnUrl(binPath, url, formatArg, cookiesPath, proxyUrl);
    console.log(`[download] Resolved CDN URL: ${cdnUrl.slice(0, 80)}...`);
  } catch (err) {
    let msg = err?.message || String(err);
    if (msg.includes("Sign in") || msg.includes("bot") || msg.includes("confirm")) {
      resolveError = "YouTube requires authentication. Please configure YOUTUBE_COOKIES_B64 in your Vercel environment variables.";
    } else if (msg.includes("Private") || msg.includes("login")) {
      resolveError = "This content is private or requires login.";
    } else if (msg.includes("unavailable") || msg.includes("404")) {
      resolveError = "Media not found or has been removed.";
    } else {
      resolveError = msg.slice(0, 300);
    }
    console.error("[download] yt-dlp --get-url failed:", resolveError);
  } finally {
    cleanupCookiesFile(cookiesPath);
  }

  if (!cdnUrl) {
    return jsonError(resolveError, 500);
  }

  // ── PATH 2b: Proxy-stream from resolved CDN URL ──
  // (server fetches from CDN and streams to user — works for small/medium files)
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

    // CDN responded but not OK — fallback to redirect
    console.warn(`[download] CDN proxy returned ${cdnRes.status}, falling back to redirect`);
  } catch (e) {
    console.warn("[download] CDN proxy fetch error:", e.message, "— falling back to redirect");
  }

  // ── PATH 2c: Redirect to CDN URL as last resort ──
  // Works for non-IP-restricted CDNs (Instagram, TikTok, SoundCloud, etc.)
  // May not work for YouTube (IP-bound CDN URLs) but worth trying
  console.log("[download] Redirecting to CDN URL");
  return new Response(null, {
    status: 302,
    headers: {
      Location: cdnUrl,
      "Cache-Control": "no-store",
    },
  });
}
