import { NextResponse } from "next/server";
import youtubedl from "youtube-dl-exec";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  let url;
  try {
    ({ url } = await req.json());
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
    });

    const rawFormats = Array.isArray(info.formats) ? info.formats : [];

    const formats = rawFormats
      .filter((f) => f.url && (f.vcodec !== "none" || f.acodec !== "none"))
      .map((f) => ({
        formatId: f.format_id,
        ext: f.ext,
        resolution:
          f.vcodec && f.vcodec !== "none"
            ? f.resolution || (f.height ? `${f.height}p` : "video")
            : "audio only",
        note: f.format_note || "",
        filesize: f.filesize || f.filesize_approx || null,
        hasVideo: f.vcodec !== "none",
        hasAudio: f.acodec !== "none",
        directUrl: f.url,
      }))
      // De-dupe near-identical entries and put the meatiest formats first
      .sort((a, b) => (b.filesize || 0) - (a.filesize || 0));

    return NextResponse.json({
      title: info.title || "Untitled",
      thumbnail: info.thumbnail || null,
      durationSeconds: info.duration || null,
      uploader: info.uploader || info.channel || null,
      source: info.extractor_key || info.extractor || "unknown",
      originalUrl: url,
      formats,
    });
  } catch (err) {
    const message =
      err?.stderr?.toString?.().split("\n").filter(Boolean).pop() ||
      err?.message ||
      "Could not read that URL";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
