"use client";

import { useState, useEffect } from "react";

const PLATFORMS = [
  {
    id: "all",
    name: "All-in-One",
    icon: "🌐",
    placeholder: "Paste any link (YouTube, Instagram, TikTok, X, SoundCloud...)",
    hint: "Auto-detects and extracts from 1000+ video & audio platforms",
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "🔴",
    placeholder: "https://www.youtube.com/watch?v=... or https://youtu.be/...",
    hint: "Download 4K, 1080p HD Videos, Shorts & MP3 Audio tracks",
    match: (url) => url.includes("youtube.com") || url.includes("youtu.be"),
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "📸",
    placeholder: "https://www.instagram.com/reel/... or /p/...",
    hint: "Extract Instagram Reels, Video posts & Carousel media",
    match: (url) => url.includes("instagram.com"),
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "🎵",
    placeholder: "https://www.tiktok.com/@user/video/... or vt.tiktok.com/...",
    hint: "Save TikTok HD videos without watermark & extract audio",
    match: (url) => url.includes("tiktok.com"),
  },
  {
    id: "twitter",
    name: "Twitter / X",
    icon: "🐦",
    placeholder: "https://x.com/username/status/...",
    hint: "Download X/Twitter media clips, videos, and GIFs",
    match: (url) => url.includes("twitter.com") || url.includes("x.com"),
  },
  {
    id: "soundcloud",
    name: "SoundCloud",
    icon: "🎶",
    placeholder: "https://soundcloud.com/artist/track-name",
    hint: "Extract high quality original SoundCloud audio tracks",
    match: (url) => url.includes("soundcloud.com"),
  },
  {
    id: "pinterest",
    name: "Pinterest",
    icon: "📌",
    placeholder: "https://www.pinterest.com/pin/... or pin.it/...",
    hint: "Download Pinterest videos, ideas, and animated pins",
    match: (url) => url.includes("pinterest.com") || url.includes("pin.it"),
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "📘",
    placeholder: "https://www.facebook.com/watch/?v=...",
    hint: "Download public Facebook videos & reels",
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
  const [debugError, setDebugError] = useState(null);
  const [result, setResult] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [detectedPlatform, setDetectedPlatform] = useState(null);

  const activePlatform = PLATFORMS.find((p) => p.id === activePlatformTab) || PLATFORMS[0];

  useEffect(() => {
    const trimmed = url.trim().toLowerCase();
    if (!trimmed) {
      setDetectedPlatform(null);
      return;
    }
    const matched = PLATFORMS.find((p) => p.match && p.match(trimmed));
    setDetectedPlatform(matched || null);
  }, [url]);

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
      }
    } catch {}
  }

  function handleClear() {
    setUrl("");
    setError(null);
    setDebugError(null);
    setResult(null);
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl || loading) return;

    setLoading(true);
    setError(null);
    setDebugError(null);
    setResult(null);

    try {
      const res = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not extract media from that URL.");
        setDebugError(data.debugError || null);
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

  const filteredFormats = (result?.formats || []).filter((f) => {
    if (filterCategory === "combined") return f.isCombined;
    if (filterCategory === "video") return f.hasVideo && !f.hasAudio;
    if (filterCategory === "audio") return f.hasAudio && !f.hasVideo;
    return true;
  });

  return (
    <div className="shell">
      {/* Top Bar Header */}
      <header className="topbar">
        <div className="brand">
          <div className="logo-badge">⚡</div>
          <div className="wordmark">
            MediaFetcher <span>Pro</span>
          </div>
        </div>

        <div className="status-pill">
          <span className={`pulse-dot ${loading ? "loading" : ""}`} />
          <span>{loading ? "Extracting Streams..." : "Engine Ready"}</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-pill">✨ MULTI-PLATFORM MEDIA EXTRACTION HUB</div>
        <h1>
          Download High Quality <em>Videos & Audio</em>
        </h1>
        <p>
          Extract original format streams across YouTube, Instagram, TikTok, X/Twitter, SoundCloud, and 1000+ sites with direct CDN links and proxy downloads.
        </p>

        {/* Platform Selection Bar */}
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

        {/* Platform Helper Tip */}
        <div className="platform-tip">
          <span className="tip-badge">{activePlatform.icon} {activePlatform.name}</span>
          <span className="tip-text">{activePlatform.hint}</span>
        </div>

        {/* Search Input Form */}
        <form className="prompt" onSubmit={handleSubmit}>
          <span className="caret">{detectedPlatform ? detectedPlatform.icon : "🔗"}</span>
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
              ✕ Clear
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

        {/* Auto Platform Match Banner */}
        {detectedPlatform && detectedPlatform.id !== activePlatformTab && (
          <div className="detected-banner">
            <span>Detected <strong>{detectedPlatform.name}</strong> URL link</span>
            <button
              type="button"
              className="btn-switch-tab"
              onClick={() => setActivePlatformTab(detectedPlatform.id)}
            >
              Switch to {detectedPlatform.name} mode
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="error-banner">
            <span className="err-icon">⚠️</span>
            <div className="err-body">
              <div><strong>Extraction Notice:</strong> {error}</div>
              {debugError && <div className="err-details">Debug Log: {debugError}</div>}
            </div>
          </div>
        )}
      </section>

      {/* Results View */}
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
                <span className="badge">{result.formats.length} formats</span>
              </div>
            </div>
          </div>

          {/* Quick Instant Downloads Grid */}
          {result.quickOptions && (
            <div className="quick-section">
              <h3 className="section-title">⚡ Instant Downloads</h3>
              <div className="quick-grid">
                {/* Best Video Card */}
                {result.quickOptions.bestCombined && (
                  <div className="quick-card video-card">
                    <div className="quick-badge">🎬 Best Video + Audio</div>
                    <div className="quick-title">
                      {result.quickOptions.bestCombined.resolution} · {result.quickOptions.bestCombined.ext.toUpperCase()}
                    </div>
                    <div className="quick-sub">
                      {formatBytes(result.quickOptions.bestCombined.filesize)} · High Resolution Video
                    </div>
                    <div className="quick-actions">
                      <a
                        className="btn-quick direct"
                        href={result.quickOptions.bestCombined.directUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Direct Stream 🔗
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

                {/* Best Audio Card */}
                {result.quickOptions.bestAudio && (
                  <div className="quick-card audio-card">
                    <div className="quick-badge">🎧 Best Audio Track / MP3</div>
                    <div className="quick-title">
                      {result.quickOptions.bestAudio.resolution} · {result.quickOptions.bestAudio.ext.toUpperCase()}
                    </div>
                    <div className="quick-sub">
                      {formatBytes(result.quickOptions.bestAudio.filesize)} · High Quality Audio
                    </div>
                    <div className="quick-actions">
                      <a
                        className="btn-quick direct"
                        href={result.quickOptions.bestAudio.directUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Direct Stream 🔗
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

          {/* Format Table Header */}
          <div className="formats-header">
            <h3>All Extracted Formats ({filteredFormats.length})</h3>

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

          {/* Format Rows List */}
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
                      title="Open direct CDN URL"
                    >
                      Direct
                    </a>
                    <a
                      className="btn-ghost primary"
                      href={getDownloadHref(f.formatId, f.ext)}
                      title="Download stream via server proxy"
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
            <div className="empty-title">Paste a URL above to extract media formats</div>
            <div className="empty-sub">
              Supports YouTube Videos & Shorts, Instagram Reels, TikTok, Twitter/X, SoundCloud, Pinterest, Facebook & 1000+ sites
            </div>
          </div>
        )
      )}

      {/* Footer Disclaimer */}
      <footer className="note">
        <strong>Direct Links</strong> connect straight to source CDNs. <strong>Download</strong> proxies media streams through the server for cross-browser file saving. Ensure you have the rights to download content in accordance with copyright regulations and platform Terms of Service.
      </footer>
    </div>
  );
}
