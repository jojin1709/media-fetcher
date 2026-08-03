import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { getYtDlpPath, getSharedYtDlpConfig } from "../../../lib/get-yt-dlp";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const rawFormat = searchParams.get("format") || "best";
  const rawFilename = searchParams.get("filename") || "download.mp4";

  if (!url) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Safe filename sanitization
  const safeFilename = rawFilename
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  const asciiFilename = safeFilename.replace(/[^\x20-\x7E]/g, "_") || "download.mp4";
  const encodedFilename = encodeURIComponent(safeFilename).replace(/['()]/g, escape).replace(/\*/g, '%2A');

  // If URL is already a direct media stream URL from CDN, proxy fetch directly
  if (
    url.includes(".googlevideo.com") ||
    url.includes(".cdninstagram.com") ||
    url.includes(".fbcdn.net") ||
    url.match(/\.(mp4|mp3|m4a|webm|mov|avi)(\?|$)/i)
  ) {
    try {
      const cdnRes = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "referer": "https://www.google.com/",
        },
      });

      if (cdnRes.ok && cdnRes.body) {
        return new Response(cdnRes.body, {
          headers: {
            "Content-Type": cdnRes.headers.get("content-type") || "application/octet-stream",
            "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
            "Cache-Control": "no-store",
          },
        });
      }
    } catch (e) {
      console.warn("[download] Direct CDN fetch failed, falling back to yt-dlp...", e.message);
    }
  }

  const binPath = await getYtDlpPath();

  // Resolve format argument cleanly
  let formatArg = rawFormat;
  if (rawFormat.startsWith("fb_")) {
    const resHeight = rawFormat.replace("fb_", "");
    if (resHeight === "audio") {
      formatArg = "bestaudio/best";
    } else {
      formatArg = `best[height<=${resHeight}]/bestvideo[height<=${resHeight}]+bestaudio/best`;
    }
  } else if (rawFormat === "best") {
    formatArg = "best[ext=mp4]/bestvideo+bestaudio/best";
  } else if (rawFormat === "bestaudio") {
    formatArg = "bestaudio/best";
  } else if (/^\d+$/.test(rawFormat.trim())) {
    formatArg = `${rawFormat.trim()}+bestaudio/best`;
  }

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const clientTiers = isYouTube
    ? ["android,ios,tv", "android_vr,tv_embedded,web_embedded", "web_embedded,mweb", ""]
    : [""];

  async function spawnWithClientTier(playerClient) {
    const { cookiesPath, proxyUrl } = getSharedYtDlpConfig(url, playerClient);

    const args = [
      url,
      "-f",
      formatArg,
      "-o",
      "-",
      "--no-warnings",
      "--no-check-certificates",
      "--no-part",
      "--no-playlist",
      "--geo-bypass",
      "--add-header",
      "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "--add-header",
      "referer:https://www.google.com/",
    ];

    if (playerClient) {
      args.push("--extractor-args", `youtube:player_client=${playerClient}`);
    }

    if (ffmpegPath) {
      args.push("--ffmpeg-location", ffmpegPath);
    }

    if (cookiesPath) {
      args.push("--cookies", cookiesPath);
    }

    if (proxyUrl) {
      args.push("--proxy", proxyUrl);
    }

    console.log(`[download] Executing yt-dlp (client: ${playerClient || 'default'}) with format: ${formatArg}`);

    const child = spawn(binPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderrTail = "";

    child.stderr.on("data", (chunk) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-2000);
    });

    const firstChunk = await new Promise((resolve, reject) => {
      let resolved = false;

      child.stdout.once("data", (chunk) => {
        if (!resolved) {
          resolved = true;
          resolve(chunk);
        }
      });

      child.on("error", (err) => {
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });

      child.on("close", (code) => {
        if (!resolved) {
          resolved = true;
          if (code !== 0) {
            reject(new Error(stderrTail || `yt-dlp exited with code ${code}`));
          } else {
            resolve(null);
          }
        }
      });
    });

    return { child, firstChunk, stderrTail };
  }

  let activeChild = null;
  let firstChunk = null;
  let lastError = null;

  for (const clientTier of clientTiers) {
    try {
      const res = await spawnWithClientTier(clientTier);
      if (res.firstChunk) {
        activeChild = res.child;
        firstChunk = res.firstChunk;
        break;
      }
    } catch (err) {
      lastError = err?.message || String(err);
      console.warn(`[download] Client tier "${clientTier}" failed:`, lastError);
    }
  }

  if (!firstChunk || !activeChild) {
    let userNotice = lastError || "Stream extraction failed.";
    if (userNotice.includes("Sign in to confirm you're not a bot")) {
      userNotice += " [Tip: Add YOUTUBE_COOKIES_B64 to Vercel Environment Variables to authorize cloud IP requests]";
    }

    return new Response(JSON.stringify({ error: "Download stream extraction failed.", debugError: userNotice }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const childProcess = activeChild;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(firstChunk);

      childProcess.stdout.on("data", (chunk) => {
        try {
          controller.enqueue(chunk);
        } catch {}
      });

      childProcess.stdout.on("end", () => {
        try {
          controller.close();
        } catch {}
      });

      childProcess.on("error", (err) => {
        try {
          controller.error(err);
        } catch {}
      });
    },
    cancel() {
      childProcess.kill("SIGKILL");
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
      "Cache-Control": "no-store",
    },
  });
}
