import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { getYtDlpPath, getCookiesFile, getProxyUrl } from "../../../lib/get-yt-dlp";

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
  const cookiesPath = getCookiesFile();
  const proxyUrl = getProxyUrl();

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
    // Specific numeric format ID (e.g. video-only DASH stream), combine with bestaudio on demand
    formatArg = `${rawFormat.trim()}+bestaudio/best`;
  }

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

  if (ffmpegPath) {
    args.push("--ffmpeg-location", ffmpegPath);
  }

  if (cookiesPath) {
    args.push("--cookies", cookiesPath);
  }

  if (proxyUrl) {
    args.push("--proxy", proxyUrl);
  }

  console.log(`[download] Executing yt-dlp ${binPath} with args:`, args.join(" "));

  const child = spawn(binPath, args, { stdio: ["ignore", "pipe", "pipe"] });

  let stderrTail = "";
  child.stderr.on("data", (chunk) => {
    stderrTail = (stderrTail + chunk.toString()).slice(-2000);
  });

  // Wait for first data chunk OR error event before returning HTTP response headers
  const firstChunkPromise = new Promise((resolve, reject) => {
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

  let firstChunk;
  try {
    firstChunk = await firstChunkPromise;
  } catch (err) {
    const errorMsg = err?.message || String(err);
    console.error("[download] Stream extraction failed:", errorMsg);
    return new Response(JSON.stringify({ error: "Download stream extraction failed.", debugError: errorMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!firstChunk) {
    console.error("[download] 0 bytes produced by yt-dlp. stderr:", stderrTail);
    return new Response(JSON.stringify({ error: "Download stream produced 0 bytes.", debugError: stderrTail || "Empty output stream" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(firstChunk);

      child.stdout.on("data", (chunk) => {
        try {
          controller.enqueue(chunk);
        } catch {}
      });

      child.stdout.on("end", () => {
        try {
          controller.close();
        } catch {}
      });

      child.on("error", (err) => {
        try {
          controller.error(err);
        } catch {}
      });
    },
    cancel() {
      child.kill("SIGKILL");
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
