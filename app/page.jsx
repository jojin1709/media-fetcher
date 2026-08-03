"use client";

import { useState, useEffect } from "react";

const PLATFORMS = [
  {
    id: "all",
    name: "All-in-One",
    icon: "🌐",
    placeholder: "Paste any link (YouTube, Instagram, TikTok, X, SoundCloud...)",
    hint: "Supports 1000+ platforms with auto-detection",
    sample: "https://www.youtube.com/watch?v=ycKVUHSYpys",
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "🔴",
    placeholder: "https://www.youtube.com/watch?v=... or https://youtu.be/...",
    hint: "Download 4K, 1080p HD Videos, Shorts & MP3 Audio tracks",
    sample: "https://www.youtube.com/watch?v=ycKVUHSYpys",
    match: (url) => url.includes("youtube.com") || url.includes("youtu.be"),
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "📸",
    placeholder: "https://www.instagram.com/reel/... or /p/...",
    hint: "Extract Instagram Reels, Video posts & IGTV content",
    sample: "https://www.instagram.com/reel/C3_sample/",
    match: (url) => url.includes("instagram.com"),
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "🎵",
    placeholder: "https://www.tiktok.com/@user/video/... or vt.tiktok.com/...",
    hint: "Save TikTok HD videos & extract background audio",
    sample: "https://www.tiktok.com/@user/video/1234567890",
    match: (url) => url.includes("tiktok.com"),
  },
  {
    id: "twitter",
    name: "Twitter / X",
    icon: "🐦",
    placeholder: "https://x.com/username/status/...",
    hint: "Download X/Twitter videos, clips, and GIFs",
    sample: "https://x.com/user/status/1234567890",
    match: (url) => url.includes("twitter.com") || url.includes("x.com"),
  },
  {
    id: "soundcloud",
    name: "SoundCloud",
    icon: "🎶",
    placeholder: "https://soundcloud.com/artist/track-name",
    hint: "Extract original audio streams and tracks",
    sample: "https://soundcloud.com/artist/track",
    match: (url) => url.includes("soundcloud.com"),
  },
  {
    id: "pinterest",
    name: "Pinterest",
    icon: "📌",
    placeholder: "https://www.pinterest.com/pin/... or pin.it/...",
    hint: "Download Pinterest videos, ideas, and animated pins",
    sample: "https://www.pinterest.com/pin/12345678/",
    match: (url) => url.includes("pinterest.com") || url.includes("pin.it"),
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "📘",
    placeholder: "https://www.facebook.com/watch/?v=...",
    hint: "Download public Facebook videos & reels",
    sample: "https://www.facebook.com/watch/?v=12345",
    match: (url) => url.includes("facebook.com") || url.includes("fb.watch"),
  },
];

function formatBytes(bytes) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 10 ? 0 : 1)} ${units[i]}`;
}

function formatDuration(seconds) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (v) => String(v).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export default function Page() {
  const [activePlatformTab, setActivePlatformTab] = useState("all");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all"); // 'all' | 'combined' | 'video' | 'audio'
  const [detectedPlatform, setDetectedPlatform] = useState(null);

  const activePlatform = PLATFORMS.find((p) => p.id === activePlatformTab) || PLATFORMS[0];

  // Auto detect platform when URL changes
  useEffect(() => {
    const trimmed = url.trim().toLowerCase();
    if (!trimmed) {
      setDetectedPlatform(null);
      return;
    }
    const matched = PLATFORMS.find((p) => p.match && p.match(trimmed));
    if (matched) {
      setDetectedPlatform(matched);
    } else {
      setDetectedPlatform(null);
    }
  }, [url]);

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
      }
    } catch {
      // Permission denied or unavailable
    }
  }

  function handleClear() {
    setUrl("");
    setError(null);
    setResult(null);
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not read or extract media from that URL.");
      } else {
        setResult(data);
        setFilterCategory("all");
      }
    } catch {
      setError("Network error — extraction request could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  function getDownloadHref(formatId, ext) {
    if (!result) return "#";
    const filename = `${(result.title || "media").slice(0, 60)}.${ext || "mp4"}`;
    const params = new URLSearchParams({
      url: result.originalUrl,
      format: formatId || "best",
      filename,
    });
    return `/api/download?${params.toString()}`;
  }

  // Filter formats based on active category
  const filteredFormats = (result?.formats || []).filter((f) => {
    if (filterCategory === "combined") return f.isCombined;
    if (filterCategory === "video") return f.hasVideo && !f.hasAudio;
    if (filterCategory === "audio") return f.hasAudio && !f.hasVideo;
    return true;
  });

  return (
    <div className="shell">
      {/* Topbar branding */}
      <header className="topbar">
        <div className="wordmark">
          <span className="logo-icon">⚡</span>
          SIGNAL<span className="slash">/</span>GRAB
        </div>
        <div className={`waveform ${loading ? "active" : ""}`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} />
          ))}
        </div>
        <div className="tag">yt-dlp v2026.08</div>
      </header>

      {/* Hero section */}
      <section className="hero">
        <h1>
          Multi-Platform <em>Media Downloader</em>
        </h1>
        <p>
          Extract highest quality video and audio streams from YouTube, Instagram, TikTok, X, SoundCloud, and 1000+ platforms.
        </p>

        {/* Platform Selection Tabs */}
        <div className="platform-nav" role="tablist">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`platform-btn ${activePlatformTab === p.id ? "active" : ""}`}
              onClick={() => setActivePlatformTab(p.id)}
            >
              <span className="p-icon">{p.icon}</span>
              <span className="p-name">{p.name}</span>
            </button>
          ))}
        </div>

        {/* Dynamic platform info tip */}
        <div className="platform-tip">
          <span className="tip-badge">{activePlatform.icon} {activePlatform.name}</span>
          <span className="tip-text">{activePlatform.hint}</span>
        </div>

        {/* Input prompt form */}
        <form className="prompt" onSubmit={handleSubmit}>
          <span className="caret">{detectedPlatform ? detectedPlatform.icon : "$"}</span>
          <input
            type="url"
            required
            placeholder={activePlatform.placeholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />

          {url ? (
            <button type="button" className="btn-icon" onClick={handleClear} title="Clear URL input">
              ✕
            </button>
          ) : (
            <button type="button" className="btn-paste" onClick={handlePaste} title="Paste link from clipboard">
              📋 Paste
            </button>
          )}

          <button type="submit" className="btn-submit" disabled={loading || !url.trim()}>
            {loading ? "Extracting..." : "Extract Media"}
          </button>
        </form>

        {/* Detected platform banner */}
        {detectedPlatform && detectedPlatform.id !== activePlatformTab && (
          <div className="detected-banner">
            <span>Detected <strong>{detectedPlatform.name}</strong> link!</span>
            <button
              type="button"
              className="btn-switch-tab"
              onClick={() => setActivePlatformTab(detectedPlatform.id)}
            >
              Switch to {detectedPlatform.name} tab
            </button>
          </div>
        )}

        {/* Error notification banner */}
        {error && (
          <div className="error-banner">
            <span className="err-icon">⚠️</span>
            <div className="err-content">{error}</div>
          </div>
        )}
      </section>

      {/* Result presentation section */}
      {result ? (
        <section className="result">
          <div className="result-head">
            {result.thumbnail && (
              <div className="thumb-wrapper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.thumbnail} alt={result.title} />
                {result.durationSeconds && (
                  <span className="thumb-duration">{formatDuration(result.durationSeconds)}</span>
                )}
              </div>
            )}
            <div className="result-meta">
              <h2>{result.title}</h2>
              <div className="meta-row">
                <span className="badge accent">
                  {result.platform?.icon} {result.platform?.name}
                </span>
                {result.uploader && <span className="badge">👤 {result.uploader}</span>}
                {result.viewCount && <span className="badge">👁️ {result.viewCount.toLocaleString()} views</span>}
                <span className="badge">{result.formats.length} formats available</span>
              </div>
            </div>
          </div>

          {/* Quick 1-Click Download Options */}
          {result.quickOptions && (
            <div className="quick-section">
              <h3 className="section-title">⚡ Instant Downloads</h3>
              <div className="quick-grid">
                {/* Quick Video Option */}
                {result.quickOptions.bestCombined && (
                  <div className="quick-card video-card">
                    <div className="quick-badge">🎬 Best Video + Audio</div>
                    <div className="quick-title">
                      {result.quickOptions.bestCombined.resolution} · {result.quickOptions.bestCombined.ext.toUpperCase()}
                    </div>
                    <div className="quick-sub">
                      {formatBytes(result.quickOptions.bestCombined.filesize)} · High Quality Stream
                    </div>
                    <div className="quick-actions">
                      <a
                        className="btn-quick direct"
                        href={result.quickOptions.bestCombined.directUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Direct Link 🔗
                      </a>
                      <a
                        className="btn-quick primary"
                        href={getDownloadHref("best", result.quickOptions.bestCombined.ext)}
                      >
                        Download File ⬇️
                      </a>
                    </div>
                  </div>
                )}

                {/* Quick Audio Option */}
                {result.quickOptions.bestAudio && (
                  <div className="quick-card audio-card">
                    <div className="quick-badge">🎧 Best Audio / MP3</div>
                    <div className="quick-title">
                      {result.quickOptions.bestAudio.resolution} · {result.quickOptions.bestAudio.ext.toUpperCase()}
                    </div>
                    <div className="quick-sub">
                      {formatBytes(result.quickOptions.bestAudio.filesize)} · Clean Audio Track
                    </div>
                    <div className="quick-actions">
                      <a
                        className="btn-quick direct"
                        href={result.quickOptions.bestAudio.directUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Direct Link 🔗
                      </a>
                      <a
                        className="btn-quick primary"
                        href={getDownloadHref("bestaudio", result.quickOptions.bestAudio.ext)}
                      >
                        Download Audio ⬇️
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Format Table Header Controls */}
          <div className="formats-header">
            <h3>All Extraction Formats ({filteredFormats.length})</h3>

            {/* Filter Tabs */}
            <div className="filter-tabs" role="tablist">
              <button
                type="button"
                className={`filter-btn ${filterCategory === "all" ? "active" : ""}`}
                onClick={() => setFilterCategory("all")}
              >
                All ({result.formats.length})
              </button>
              <button
                type="button"
                className={`filter-btn ${filterCategory === "combined" ? "active" : ""}`}
                onClick={() => setFilterCategory("combined")}
              >
                🎬 Video + Audio ({result.formats.filter((f) => f.isCombined).length})
              </button>
              <button
                type="button"
                className={`filter-btn ${filterCategory === "video" ? "active" : ""}`}
                onClick={() => setFilterCategory("video")}
              >
                📹 Video Only ({result.formats.filter((f) => f.hasVideo && !f.hasAudio).length})
              </button>
              <button
                type="button"
                className={`filter-btn ${filterCategory === "audio" ? "active" : ""}`}
                onClick={() => setFilterCategory("audio")}
              >
                🎧 Audio Only ({result.formats.filter((f) => f.hasAudio && !f.hasVideo).length})
              </button>
            </div>
          </div>

          {/* Formats list */}
          <div className="formats">
            {filteredFormats.length === 0 ? (
              <div className="no-formats">No formats found matching this category filter.</div>
            ) : (
              filteredFormats.map((f, idx) => (
                <div className="format-row" key={`${f.formatId}-${idx}`}>
                  <div className="res-cell">
                    <span className="res-main">{f.resolution}</span>
                    <span className={`type-badge ${f.isCombined ? "combined" : f.hasVideo ? "video-only" : "audio-only"}`}>
                      {f.typeLabel}
                    </span>
                  </div>

                  <div className="note-cell">
                    <span className="format-ext">{f.ext.toUpperCase()}</span>
                    {f.fps ? <span className="format-fps"> · {f.fps}fps</span> : null}
                    {f.note ? <span className="format-note"> · {f.note}</span> : null}
                  </div>

                  <div className="size">{formatBytes(f.filesize)}</div>

                  <div className="format-actions">
                    <a
                      className="btn-ghost"
                      href={f.directUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Open direct CDN URL in new tab"
                    >
                      Direct
                    </a>
                    <a
                      className="btn-ghost primary"
                      href={getDownloadHref(f.formatId, f.ext)}
                      title="Download file through server proxy"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : (
        !loading && (
          <div className="empty">
            <span className="empty-icon">📥</span>
            <div>Paste a link above to fetch all available video & audio formats</div>
            <div className="empty-sub">
              Supported: YouTube, Instagram Reels & Posts, TikTok, X (Twitter), SoundCloud, Pinterest, Facebook & 1000+ more
            </div>
          </div>
        )
      )}

      {/* Footer details */}
      <footer className="note">
        <strong>Direct Links</strong> open media streams straight from source CDNs. <strong>Download</strong> proxies the file through the server to guarantee compatibility across all browsers. Only download content you have permission to access in accordance with applicable copyright laws and platform Terms of Service.
      </footer>
    </div>
  );
}
