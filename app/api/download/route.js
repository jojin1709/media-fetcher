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
    formatArg = `${rawFormat.trim()}+bestaudio/best`;
  }

  const baseArgs = [
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
    baseArgs.push("--ffmpeg-location", ffmpegPath);
  }

  if (cookiesPath) {
    baseArgs.push("--cookies", cookiesPath);
  }

  if (proxyUrl) {
    baseArgs.push("--proxy", proxyUrl);
  }

  async function spawnYtDlp(extraArgs = []) {
    const fullArgs = [...baseArgs, ...extraArgs];
    console.log(`[download] Executing yt-dlp ${binPath} with args:`, fullArgs.join(" "));

    const child = spawn(binPath, fullArgs, { stdio: ["ignore", "pipe", "pipe"] });
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

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  let activeChild = null;
  let firstChunk = null;
  let lastError = null;

  // Attempt 1: Standard Execution
  try {
    const res1 = await spawnYtDlp([]);
    activeChild = res1.child;
    firstChunk = res1.firstChunk;
  } catch (err1) {
    lastError = err1?.message || String(err1);
    console.warn("[download] Attempt 1 failed:", lastError);
  }

  // Attempt 2 (YouTube Bot Challenge Fallback): Retry with web_embedded,android client
  if (!firstChunk && isYouTube) {
    try {
      console.log("[download] Retrying with extractorArgs (web_embedded,android)...");
      const res2 = await spawnYtDlp(["--extractor-args", "youtube:player_client=web_embedded,android"]);
      activeChild = res2.child;
      firstChunk = res2.firstChunk;
    } catch (err2) {
      lastError = err2?.message || String(err2);
      console.warn("[download] Attempt 2 failed:", lastError);
    }
  }

  // Attempt 3: Retry with tv_embedded,mweb client
  if (!firstChunk && isYouTube) {
    try {
      console.log("[download] Retrying with extractorArgs (tv_embedded,mweb)...");
      const res3 = await spawnYtDlp(["--extractor-args", "youtube:player_client=tv_embedded,mweb"]);
      activeChild = res3.child;
      firstChunk = res3.firstChunk;
    } catch (err3) {
      lastError = err3?.message || String(err3);
      console.warn("[download] Attempt 3 failed:", lastError);
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
