import path from "path";
import { spawn } from "child_process";

export const runtime = "nodejs";
export const maxDuration = 60;

function resolveBinary() {
  const bin = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  return path.join(process.cwd(), "node_modules", "youtube-dl-exec", "bin", bin);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const format = searchParams.get("format") || "best";
  const filename = (searchParams.get("filename") || "download").replace(/[^\w.\- ]/g, "_");

  if (!url) {
    return new Response(JSON.stringify({ error: "Missing url" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const args = [
    url,
    "-f",
    format,
    "-o",
    "-",
    "--no-warnings",
    "--no-check-certificates",
    "--no-part",
    "--no-playlist",
  ];

  const child = spawn(resolveBinary(), args, { stdio: ["ignore", "pipe", "pipe"] });

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
          // controller already closed by cancel()
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

  return new Response(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
