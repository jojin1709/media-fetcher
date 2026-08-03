import { spawn } from "child_process";
import { getYtDlpPath } from "../../../lib/get-yt-dlp";

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
    "--extractor-args",
    "youtube:player_client=ios,mweb",
    "--add-header",
    "user-agent:Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
    "--add-header",
    "referer:https://www.google.com/",
  ];

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

