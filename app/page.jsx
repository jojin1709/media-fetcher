"use client";

import { useState, useEffect } from "react";

// ─── SVG Brand Icons ──────────────────────────────────────────────────────────

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.79a4.85 4.85 0 01-1.01-.1z" />
  </svg>
);

const TwitterXIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const SoundCloudIcon = () => (
  <svg viewBox="0 0 300 300" fill="currentColor">
    <path d="M0,195.2c0,22.8,18.5,41.3,41.3,41.3c22.8,0,41.3-18.5,41.3-41.3V119c-10.5-5.7-22.6-9-35.4-9 C21.4,110,0,150.7,0,195.2z M21.4,196c-5.1,0-9.2-4.1-9.2-9.2s4.1-9.2,9.2-9.2s9.2,4.1,9.2,9.2S26.5,196,21.4,196z"/>
    <path d="M82.6,195.2V119c10.9-5.9,23.4-9.3,36.7-9.3c13.3,0,25.8,3.4,36.7,9.3v76.2c0,22.8-16.4,41.3-36.7,41.3 S82.6,218,82.6,195.2z"/>
    <path d="M156,195.2V103.3c14.5-11.9,33.1-19.1,53.4-19.1c46.9,0,84.9,38,84.9,84.9c0,0.4,0,0.8,0,1.1H156z"/>
  </svg>
);

const PinterestIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

// ─── Platform Config ──────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: "all",
    name: "All-in-One",
    color: "#6366f1",
    gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    glow: "rgba(99, 102, 241, 0.4)",
    Icon: GlobeIcon,
    placeholder: "Paste any link (YouTube, Instagram, TikTok, X, SoundCloud...)",
    hint: "Auto-detects and extracts from 1000+ video & audio platforms",
  },
  {
    id: "youtube",
    name: "YouTube",
    color: "#FF0000",
    gradient: "linear-gradient(135deg, #cc0000 0%, #FF0000 100%)",
    glow: "rgba(255, 0, 0, 0.4)",
    Icon: YouTubeIcon,
    placeholder: "https://www.youtube.com/watch?v=... or https://youtu.be/...",
    hint: "Download 4K, 1080p HD Videos, Shorts & MP3 Audio tracks",
    match: (url) => url.includes("youtube.com") || url.includes("youtu.be"),
  },
  {
    id: "instagram",
    name: "Instagram",
    color: "#E1306C",
    gradient: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
    glow: "rgba(225, 48, 108, 0.4)",
    Icon: InstagramIcon,
    placeholder: "https://www.instagram.com/reel/... or /p/...",
    hint: "Extract Instagram Reels, Video posts & Carousel media",
    match: (url) => url.includes("instagram.com"),
  },
  {
    id: "tiktok",
    name: "TikTok",
    color: "#EE1D52",
    gradient: "linear-gradient(135deg, #010101 0%, #EE1D52 100%)",
    glow: "rgba(238, 29, 82, 0.4)",
    Icon: TikTokIcon,
    placeholder: "https://www.tiktok.com/@user/video/... or vt.tiktok.com/...",
    hint: "Save TikTok HD videos without watermark & extract audio",
    match: (url) => url.includes("tiktok.com"),
  },
  {
    id: "twitter",
    name: "X / Twitter",
    color: "#1DA1F2",
    gradient: "linear-gradient(135deg, #14171A 0%, #1DA1F2 100%)",
    glow: "rgba(29, 161, 242, 0.4)",
    Icon: TwitterXIcon,
    placeholder: "https://x.com/username/status/...",
    hint: "Download X/Twitter media clips, videos, and GIFs",
    match: (url) => url.includes("twitter.com") || url.includes("x.com"),
  },
  {
    id: "soundcloud",
    name: "SoundCloud",
    color: "#FF5500",
    gradient: "linear-gradient(135deg, #cc4400 0%, #FF5500 100%)",
    glow: "rgba(255, 85, 0, 0.4)",
    Icon: SoundCloudIcon,
    placeholder: "https://soundcloud.com/artist/track-name",
    hint: "Extract high quality original SoundCloud audio tracks",
    match: (url) => url.includes("soundcloud.com"),
  },
  {
    id: "pinterest",
    name: "Pinterest",
    color: "#E60023",
    gradient: "linear-gradient(135deg, #ad081b 0%, #E60023 100%)",
    glow: "rgba(230, 0, 35, 0.4)",
    Icon: PinterestIcon,
    placeholder: "https://www.pinterest.com/pin/... or pin.it/...",
    hint: "Download Pinterest videos, ideas, and animated pins",
    match: (url) => url.includes("pinterest.com") || url.includes("pin.it"),
  },
  {
    id: "facebook",
    name: "Facebook",
    color: "#1877F2",
    gradient: "linear-gradient(135deg, #0d6efd 0%, #1877F2 100%)",
    glow: "rgba(24, 119, 242, 0.4)",
    Icon: FacebookIcon,
    placeholder: "https://www.facebook.com/watch/?v=...",
    hint: "Download public Facebook videos & reels",
    match: (url) => url.includes("facebook.com") || url.includes("fb.watch"),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
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

// Only show Direct link if it's an actual CDN stream URL (not the original page URL)
function isCdnUrl(url, originalUrl) {
  if (!url || url === originalUrl) return false;
  try {
    const u = new URL(url);
    const cdn = [
      "googlevideo.com", "cdninstagram.com", "fbcdn.net",
      "tiktokcdn.com", "soundcloud.com", "pinimg.com",
      "twimg.com", "v.redd.it", "akamaized.net", "cloudfront.net",
      "discordapp.net", "vimeocdn.com", "ytimg.com",
    ];
    if (cdn.some((d) => u.hostname.includes(d))) return true;
    if (/\.(mp4|mp3|m4a|webm|mov|ogg|flv)(\?|$)/i.test(u.pathname)) return true;
    return false;
  } catch {
    return false;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

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
    if (!trimmed) { setDetectedPlatform(null); return; }
    const matched = PLATFORMS.find((p) => p.match && p.match(trimmed));
    setDetectedPlatform(matched || null);
  }, [url]);

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
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

  function getDownloadHref(formatObj, overrideExt) {
    if (!result) return "#";
    const ext = overrideExt || formatObj?.ext || "mp4";
    const filename = `${(result.title || "media").slice(0, 60)}.${ext}`;
    // If we have a real CDN URL, pass it directly — download route skips yt-dlp entirely (much faster)
    if (formatObj?.directUrl && isCdnUrl(formatObj.directUrl, result.originalUrl)) {
      const params = new URLSearchParams({ url: formatObj.directUrl, format: "direct", filename });
      return `/api/download?${params.toString()}`;
    }
    // Fallback: pass original URL with format spec
    const spec = formatObj?.downloadSpec || formatObj?.formatId || "best";
    const params = new URLSearchParams({ url: result.originalUrl, format: spec, filename });
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
      {/* ── Top Bar ── */}
      <header className="topbar">
        <div className="brand">
          <div className="logo-badge">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" stroke="white" strokeWidth="0.5" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="wordmark">
            MediaFetcher <span>Pro</span>
          </div>
        </div>

        <div className="status-pill">
          <span className={`pulse-dot ${loading ? "loading" : ""}`} />
          <span>{loading ? "Extracting Streams..." : "Engine Ready"}</span>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-orbs" aria-hidden="true" />
        <div className="hero-pill">✨ MULTI-PLATFORM MEDIA EXTRACTION HUB</div>
        <h1>
          Download High Quality <em>Videos & Audio</em>
        </h1>
        <p>
          Extract original format streams across YouTube, Instagram, TikTok, X/Twitter,
          SoundCloud, and 1000+ sites — with direct CDN links and proxy downloads.
        </p>

        {/* Platform Tabs */}
        <div className="platform-nav" role="tablist">
          {PLATFORMS.map((p) => {
            const isActive = activePlatformTab === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`platform-btn ${isActive ? "active" : ""}`}
                style={isActive ? { background: p.gradient, boxShadow: `0 4px 20px ${p.glow}`, borderColor: "transparent" } : {}}
                onClick={() => setActivePlatformTab(p.id)}
              >
                <span className="p-icon"><p.Icon /></span>
                <span className="p-name">{p.name}</span>
              </button>
            );
          })}
        </div>

        {/* Platform Tip */}
        <div className="platform-tip">
          <span className="tip-icon"><activePlatform.Icon /></span>
          <span className="tip-text">{activePlatform.hint}</span>
        </div>

        {/* Search Form */}
        <form className="prompt" onSubmit={handleSubmit}>
          <span className="caret">
            {detectedPlatform ? <detectedPlatform.Icon /> : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            )}
          </span>
          <input
            type="url"
            required
            placeholder={activePlatform.placeholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            id="url-input"
          />
          {url ? (
            <button type="button" className="btn-icon" onClick={handleClear} title="Clear URL input">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              Clear
            </button>
          ) : (
            <button type="button" className="btn-paste" onClick={handlePaste} title="Paste link from clipboard">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              Paste
            </button>
          )}
          <button
            type="submit"
            className="btn-submit"
            disabled={loading || !url.trim()}
            style={loading ? {} : { background: activePlatform.gradient }}
          >
            {loading ? (
              <><span className="spinner" /> Extracting...</>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15"><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></svg>
                Extract Media
              </>
            )}
          </button>
        </form>

        {/* Auto-detect Banner */}
        {detectedPlatform && detectedPlatform.id !== activePlatformTab && (
          <div className="detected-banner" style={{ borderColor: `${detectedPlatform.color}40`, background: `${detectedPlatform.color}10` }}>
            <div className="detected-left">
              <span className="detected-icon" style={{ color: detectedPlatform.color }}><detectedPlatform.Icon /></span>
              <span>Detected <strong>{detectedPlatform.name}</strong> URL</span>
            </div>
            <button
              type="button"
              className="btn-switch-tab"
              style={{ background: detectedPlatform.gradient }}
              onClick={() => setActivePlatformTab(detectedPlatform.id)}
            >
              Switch to {detectedPlatform.name}
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="error-banner">
            <span className="err-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </span>
            <div className="err-body">
              <div><strong>Extraction Notice:</strong> {error}</div>
              {debugError && <div className="err-details">Debug: {debugError}</div>}
            </div>
          </div>
        )}
      </section>

      {/* ── Results ── */}
      {result ? (
        <section className="result">
          {/* Media Card Header */}
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
                {result.platform && (
                  <span className="badge accent" style={{ borderColor: `${PLATFORMS.find(p => p.id === result.platform.id)?.color || "#6366f1"}40`, color: PLATFORMS.find(p => p.id === result.platform.id)?.color || "#a5b4fc", background: `${PLATFORMS.find(p => p.id === result.platform.id)?.color || "#6366f1"}15` }}>
                    <span className="badge-icon">
                      {(() => {
                        const p = PLATFORMS.find(x => x.id === result.platform.id);
                        return p ? <p.Icon /> : null;
                      })()}
                    </span>
                    {result.platform.name}
                  </span>
                )}
                {result.uploader && <span className="badge">👤 {result.uploader}</span>}
                {result.viewCount && <span className="badge">👁 {result.viewCount.toLocaleString()} views</span>}
                <span className="badge">{result.formats.length} formats</span>
              </div>
            </div>
          </div>

          {/* Quick Downloads */}
          {result.quickOptions && (
            <div className="quick-section">
              <h3 className="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                Instant Downloads
              </h3>
              <div className="quick-grid">
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
                      {isCdnUrl(result.quickOptions.bestCombined.directUrl, result.originalUrl) && (
                        <a className="btn-quick direct" href={result.quickOptions.bestCombined.directUrl} target="_blank" rel="noreferrer">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                          Stream
                        </a>
                      )}
                      <a className="btn-quick primary" href={getDownloadHref(result.quickOptions.bestCombined)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        Download
                      </a>
                    </div>
                  </div>
                )}
                {result.quickOptions.bestAudio && (
                  <div className="quick-card audio-card">
                    <div className="quick-badge">🎧 Best Audio / MP3</div>
                    <div className="quick-title">
                      {result.quickOptions.bestAudio.resolution} · {result.quickOptions.bestAudio.ext.toUpperCase()}
                    </div>
                    <div className="quick-sub">
                      {formatBytes(result.quickOptions.bestAudio.filesize)} · High Quality Audio
                    </div>
                    <div className="quick-actions">
                      {isCdnUrl(result.quickOptions.bestAudio.directUrl, result.originalUrl) && (
                        <a className="btn-quick direct" href={result.quickOptions.bestAudio.directUrl} target="_blank" rel="noreferrer">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                          Stream
                        </a>
                      )}
                      <a className="btn-quick primary audio-primary" href={getDownloadHref(result.quickOptions.bestAudio, "m4a")}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        Download Audio
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Format Filter Tabs */}
          <div className="formats-header">
            <h3>All Extracted Formats <span className="count-badge">{filteredFormats.length}</span></h3>
            <div className="filter-tabs" role="tablist">
              {[
                { key: "all", label: "All", count: result.formats.length },
                { key: "combined", label: "🎬 Video+Audio", count: result.formats.filter((f) => f.isCombined).length },
                { key: "video", label: "📹 Video Only", count: result.formats.filter((f) => f.hasVideo && !f.hasAudio).length },
                { key: "audio", label: "🎧 Audio Only", count: result.formats.filter((f) => f.hasAudio && !f.hasVideo).length },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  className={`filter-btn ${filterCategory === key ? "active" : ""}`}
                  onClick={() => setFilterCategory(key)}
                >
                  {label} <span className="filter-count">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Format Rows */}
          <div className="formats">
            {filteredFormats.length === 0 ? (
              <div className="no-formats">No formats found for this filter.</div>
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
                    {isCdnUrl(f.directUrl, result.originalUrl) && (
                      <a className="btn-ghost" href={f.directUrl} target="_blank" rel="noreferrer" title="Open direct CDN stream URL">
                        Stream
                      </a>
                    )}
                    {/* Only show Download for combined/audio formats — video-only DASH can't be merged on serverless */}
                    {f.hasAudio ? (
                      <a className="btn-ghost primary" href={getDownloadHref(f)} title="Download file">
                        Download
                      </a>
                    ) : (
                      <span className="btn-ghost disabled" title="Video-only stream — use Stream button or select a combined format">
                        Video Only
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : (
        !loading && (
          <div className="empty">
            <div className="empty-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div className="empty-title">Paste a URL above to extract media</div>
            <div className="empty-sub">
              Supports YouTube, Instagram Reels, TikTok, X/Twitter, SoundCloud, Pinterest, Facebook & 1000+ sites
            </div>
            <div className="platform-icons-row">
              {PLATFORMS.slice(1).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="empty-platform-btn"
                  title={p.name}
                  style={{ color: p.color }}
                  onClick={() => setActivePlatformTab(p.id)}
                >
                  <p.Icon />
                </button>
              ))}
            </div>
          </div>
        )
      )}

      {/* Footer */}
      <footer className="note">
        <strong>Stream links</strong> open direct CDN URLs in a new tab.{" "}
        <strong>Download</strong> proxies the media through the server for cross-browser file saving.
        Ensure you have the right to download content per copyright law and platform Terms of Service.
      </footer>
    </div>
  );
}
