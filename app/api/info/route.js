import { NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";
import { runYtDlp, getCookieAgent } from "../../../lib/get-yt-dlp";

export const runtime = "nodejs";
export const maxDuration = 60;

function detectPlatform(url, extractorKey) {
  const lowerUrl = url.toLowerCase();
  const lowerExtractor = (extractorKey || "").toLowerCase();

  if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be") || lowerExtractor.includes("youtube")) {
    return { id: "youtube", name: "YouTube", icon: "🔴" };
  }
  if (lowerUrl.includes("instagram.com") || lowerExtractor.includes("instagram")) {
    return { id: "instagram", name: "Instagram", icon: "📸" };
  }
  if (lowerUrl.includes("tiktok.com") || lowerExtractor.includes("tiktok")) {
    return { id: "tiktok", name: "TikTok", icon: "🎵" };
  }
  if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com") || lowerExtractor.includes("twitter")) {
    return { id: "twitter", name: "Twitter / X", icon: "🐦" };
  }
  if (lowerUrl.includes("soundcloud.com") || lowerExtractor.includes("soundcloud")) {
    return { id: "soundcloud", name: "SoundCloud", icon: "🎶" };
  }
  if (lowerUrl.includes("pinterest.com") || lowerUrl.includes("pin.it") || lowerExtractor.includes("pinterest")) {
    return { id: "pinterest", name: "Pinterest", icon: "📌" };
  }
  if (lowerUrl.includes("facebook.com") || lowerUrl.includes("fb.watch") || lowerExtractor.includes("facebook")) {
    return { id: "facebook", name: "Facebook", icon: "📘" };
  }
  if (lowerUrl.includes("vimeo.com") || lowerExtractor.includes("vimeo")) {
    return { id: "vimeo", name: "Vimeo", icon: "🎬" };
  }
  if (lowerUrl.includes("twitch.tv") || lowerExtractor.includes("twitch")) {
    return { id: "twitch", name: "Twitch", icon: "🟣" };
  }
  if (lowerUrl.includes("reddit.com") || lowerExtractor.includes("reddit")) {
    return { id: "reddit", name: "Reddit", icon: "🤖" };
  }

  return { id: "general", name: extractorKey || "Web Stream", icon: "🌐" };
}

function formatResolutionString(f) {
  const vcodec = f.vcodec || f.videoCodec;
  const hasVideo = f.hasVideo !== undefined ? f.hasVideo : (vcodec && vcodec !== "none");
  if (!hasVideo) {
    const abr = f.abr || f.audioBitrate;
    const abrStr = abr ? `${Math.round(abr)}kbps` : "";
    return abrStr ? `Audio (${abrStr})` : "Audio Track";
  }
  if (f.height) {
    if (f.height >= 2160) return `${f.height}p (4K)`;
    if (f.height >= 1440) return `${f.height}p (2K)`;
    if (f.height >= 1080) return `${f.height}p (FHD)`;
    if (f.height >= 720) return `${f.height}p (HD)`;
    return `${f.height}p`;
  }
  return f.resolution || f.qualityLabel || "Video";
}

export async function POST(req) {
  let url;
  try {
    ({ url } = await req.json());
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const cleanUrl = url.trim();
  const isYouTube = cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be");

  // ── STRATEGY 1: For YouTube, try fast pure JS extraction with @distube/ytdl-core first ──
  if (isYouTube) {
    try {
      console.log("[api/info] Extracting YouTube metadata via @distube/ytdl-core...");
      const agent = getCookieAgent();
      const info = await ytdl.getInfo(cleanUrl, agent ? { agent } : undefined);
      if (info && info.videoDetails && info.formats && info.formats.length) {
        const details = info.videoDetails;
        const platform = detectPlatform(cleanUrl, "youtube");
        const title = details.title || "YouTube Video";
        const thumbnail = details.thumbnails?.[details.thumbnails.length - 1]?.url || null;
        const uploader = details.author?.name || null;
        const durationSeconds = parseInt(details.lengthSeconds, 10) || null;
        const viewCount = parseInt(details.viewCount, 10) || null;

        const processedFormats = info.formats
          .filter((f) => f.url && (f.hasVideo || f.hasAudio))
          .map((f) => {
            const hasVideo = Boolean(f.hasVideo);
            const hasAudio = Boolean(f.hasAudio);
            const isCombined = hasVideo && hasAudio;
            const resolution = formatResolutionString(f);
            const filesize = f.contentLength ? parseInt(f.contentLength, 10) : null;

            let typeLabel = "Combined";
            if (hasVideo && !hasAudio) typeLabel = "Video Only";
            if (!hasVideo && hasAudio) typeLabel = "Audio Only";

            return {
              formatId: String(f.itag || f.format_id),
              downloadSpec: String(f.itag || f.format_id),
              ext: f.container || (hasVideo ? "mp4" : "mp3"),
              resolution,
              height: f.height || 0,
              fps: f.fps || null,
              vcodec: f.videoCodec || (hasVideo ? "h264" : "none"),
              acodec: f.audioCodec || (hasAudio ? "aac" : "none"),
              note: f.qualityLabel || (hasAudio ? "Audio Stream" : ""),
              filesize,
              hasVideo,
              hasAudio,
              isCombined,
              typeLabel,
              directUrl: f.url,
              tbr: f.bitrate || 0,
              abr: f.audioBitrate || 0,
            };
          })
          .sort((a, b) => (b.height || b.tbr || 0) - (a.height || a.tbr || 0));

        if (processedFormats.length < 5) {
          throw new Error(`Only found ${processedFormats.length} formats. Falling back to yt-dlp.`);
        }

        const combinedFormats = processedFormats.filter((f) => f.isCombined);
        const videoFormats = processedFormats.filter((f) => f.hasVideo);
        const audioFormats = processedFormats.filter((f) => f.hasAudio && !f.hasVideo);

        const bestCombined = combinedFormats[0] || videoFormats[0] || processedFormats[0];
        const bestAudio = audioFormats[0] || processedFormats.find((f) => f.hasAudio) || null;
        const bestVideo = videoFormats[0] || null;

        return NextResponse.json({
          title,
          description: details.description ? (details.description.length > 200 ? details.description.slice(0, 200) + "..." : details.description) : null,
          thumbnail,
          durationSeconds,
          uploader,
          viewCount,
          likeCount: null,
          platform,
          originalUrl: cleanUrl,
          quickOptions: {
            bestCombined,
            bestVideo,
            bestAudio,
          },
          formats: processedFormats,
        });
      }
    } catch (ytdlErr) {
      console.warn("[api/info] ytdl-core extraction warning:", ytdlErr.message, "— falling back to yt-dlp binary");
    }
  }

  // ── STRATEGY 2: Use yt-dlp binary for all platforms (Instagram, TikTok, X, SoundCloud, Pinterest, Facebook, YouTube fallback) ──
  try {
    const info = await runYtDlp(cleanUrl);

    const rawFormats = Array.isArray(info.formats) ? info.formats : [];

    const processedFormats = rawFormats
      .filter((f) => f.url && (f.vcodec !== "none" || f.acodec !== "none") && f.ext !== "mhtml")
      .map((f) => {
        const hasVideo = Boolean(f.vcodec && f.vcodec !== "none");
        const hasAudio = Boolean(f.acodec && f.acodec !== "none");
        const isCombined = hasVideo && hasAudio;
        const resolution = formatResolutionString(f);
        const filesize = f.filesize || f.filesize_approx || null;

        let typeLabel = "Combined";
        if (hasVideo && !hasAudio) typeLabel = "Video Only";
        if (!hasVideo && hasAudio) typeLabel = "Audio Only";

        const downloadSpec = (hasVideo && !hasAudio && f.height)
          ? `best[height<=${f.height}][ext=mp4]/best[height<=${f.height}][vcodec!*=av01]/best[height<=${f.height}]`
          : f.format_id;

        return {
          formatId: f.format_id,
          downloadSpec,
          ext: f.ext || (hasVideo ? "mp4" : "mp3"),
          resolution,
          height: f.height || 0,
          fps: f.fps || null,
          vcodec: f.vcodec,
          acodec: f.acodec,
          note: f.format_note || "",
          filesize,
          hasVideo,
          hasAudio,
          isCombined,
          typeLabel,
          directUrl: f.url,
          tbr: f.tbr || 0,
          abr: f.abr || 0,
        };
      })
      .sort((a, b) => (b.height || b.tbr || b.filesize || 0) - (a.height || a.tbr || a.filesize || 0));

    const platform = detectPlatform(cleanUrl, info.extractor_key || info.extractor);

    const combinedFormats = processedFormats.filter((f) => f.isCombined);
    const videoFormats = processedFormats.filter((f) => f.hasVideo);
    const audioFormats = processedFormats.filter((f) => f.hasAudio && !f.hasVideo);

    const bestCombined = combinedFormats[0] || videoFormats[0] || null;
    const bestAudio = audioFormats.sort((a, b) => (b.abr || b.filesize || 0) - (a.abr || a.filesize || 0))[0] || null;
    const bestVideo = videoFormats[0] || null;

    return NextResponse.json({
      title: info.title || "Untitled Media",
      description: info.description ? (info.description.length > 200 ? info.description.slice(0, 200) + "..." : info.description) : null,
      thumbnail: info.thumbnail || (info.thumbnails && info.thumbnails.length ? info.thumbnails[info.thumbnails.length - 1].url : null),
      durationSeconds: info.duration || null,
      uploader: info.uploader || info.channel || info.uploader_id || null,
      viewCount: info.view_count || null,
      likeCount: info.like_count || null,
      platform,
      originalUrl: cleanUrl,
      quickOptions: {
        bestCombined,
        bestVideo,
        bestAudio,
      },
      formats: processedFormats,
    });
  } catch (err) {
    const rawError = err?.stderr?.toString?.() || err?.message || String(err);

    // ── STRATEGY 3: oEmbed Fallback for YouTube ──
    if (isYouTube) {
      try {
        console.log("[api/info] yt-dlp failed, falling back to YouTube oEmbed metadata extraction...");
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`);
        if (oembedRes.ok) {
          const oembed = await oembedRes.json();
          const platform = detectPlatform(cleanUrl, "youtube");
          const title = oembed.title || "YouTube Video";
          const thumbnail = oembed.thumbnail_url || null;
          const uploader = oembed.author_name || null;

          const fallbackResolutions = [
            { res: "720p (HD)", height: 720, note: "HD Video Stream", spec: "best" },
            { res: "360p", height: 360, note: "Mobile Video Stream", spec: "18" },
          ];

          const formats = fallbackResolutions.map((r) => ({
            formatId: r.spec,
            downloadSpec: r.spec,
            ext: "mp4",
            resolution: r.res,
            height: r.height,
            fps: 30,
            vcodec: "h264",
            acodec: "aac",
            note: r.note,
            filesize: null,
            hasVideo: true,
            hasAudio: true,
            isCombined: true,
            typeLabel: "Combined",
            directUrl: null,
            tbr: 0,
            abr: 0,
          }));

          formats.push({
            formatId: "bestaudio",
            downloadSpec: "bestaudio",
            ext: "mp3",
            resolution: "Audio (320kbps)",
            height: 0,
            fps: null,
            vcodec: "none",
            acodec: "mp3",
            note: "High Quality Audio Track",
            filesize: null,
            hasVideo: false,
            hasAudio: true,
            isCombined: false,
            typeLabel: "Audio Only",
            directUrl: null,
            tbr: 0,
            abr: 320,
          });

          return NextResponse.json({
            title,
            description: "Extracted via YouTube Stream Engine",
            thumbnail,
            durationSeconds: null,
            uploader,
            viewCount: null,
            likeCount: null,
            platform,
            originalUrl: cleanUrl,
            quickOptions: {
              bestCombined: formats[0],
              bestVideo: formats[0],
              bestAudio: formats[formats.length - 1],
            },
            formats,
          });
        }
      } catch (fallbackErr) {
        console.warn("[api/info] oEmbed fallback error:", fallbackErr);
      }
    }

    let message = "Could not extract media from that URL. Please verify the link and try again.";

    if (rawError.includes("Private video") || rawError.includes("login")) {
      message = "This video or post appears to be private or requires login.";
    } else if (rawError.includes("Incomplete YouTube ID") || rawError.includes("Not a valid URL")) {
      message = "Invalid URL syntax. Please check the link structure.";
    } else if (rawError.includes("Video unavailable") || rawError.includes("404")) {
      message = "Media not found or has been removed by creator.";
    } else {
      const line = rawError.split("\n").filter((l) => l.startsWith("ERROR:")).pop();
      if (line) message = line.replace(/^ERROR:\s*/, "");
      else if (rawError) message = rawError.slice(0, 300);
    }

    return NextResponse.json({ error: message, debugError: rawError }, { status: 422 });
  }
}
