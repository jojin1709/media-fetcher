import { spawn } from "child_process";
import { getYtDlpPath, getCookiesFile, getProxyUrl } from "../../../lib/get-yt-dlp";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const rawFormat = searchParams.get("format") || "best";
  const rawFilename = searchParams.get("filename") || "download";

  if (!url) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const binPath = await getYtDlpPath();
  const cookiesPath = getCookiesFile();
  const proxyUrl = getProxyUrl();

  // Safe filename sanitization
  const safeFilename = rawFilename
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  let formatArg = rawFormat;
  if (rawFormat === "best") {
    formatArg = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
  } else if (rawFormat === "bestaudio") {
    formatArg = "bestaudio/best";
  } else if (/^\d+$/.test(rawFormat.trim())) {
    // If user selected a specific numeric video format ID, merge with best audio stream on demand
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

  if (cookiesPath) {
    args.push("--cookies", cookiesPath);
  }

  if (proxyUrl) {
    args.push("--proxy", proxyUrl);
  }

  const child = spawn(binPath, args, { stdio: ["ignore", "pipe", "pipe"] });

  let stderrTail = "";
  child.stderr.on("data", (chunk) => {
    stderrTail = (stderrTail + chunk.toString()).slice(-2000);
  });

  const stream = new ReadableStream({
    start(controller) {
      child.stdout.on("data", (chunk) => {
        try {
          controller.enqueue(chunk);
        } catch {
          // controller closed by cancel
        }
      });
      child.stdout.on("end", () => {
        try {
          controller.close();
        } catch {}
      });
      child.on("error", (err) => controller.error(err));
      child.on("close", (code) => {
        if (code !== 0) {
          try {
            controller.error(new Error(stderrTail || `yt-dlp exited with code ${code}`));
          } catch {}
        }
      });
    },
    cancel() {
      child.kill("SIGKILL");
    },
  });

  const encodedFilename = encodeURIComponent(safeFilename).replace(/['()]/g, escape).replace(/\*/g, '%2A');

  return new Response(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
      "Cache-Control": "no-store",
    },
  });
}
