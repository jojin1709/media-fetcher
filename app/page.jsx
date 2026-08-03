"use client";

import { useState } from "react";

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
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not read that URL");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error — the extraction request never landed");
    } finally {
      setLoading(false);
    }
  }

  function downloadHref(format) {
    const filename = `${(result?.title || "media").slice(0, 60)}.${format.ext}`;
    const params = new URLSearchParams({
      url: result.originalUrl,
      format: format.formatId,
      filename,
    });
    return `/api/download?${params.toString()}`;
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="wordmark">
          SIGNAL<span className="slash">/</span>GRAB
        </div>
        <div className={`waveform ${loading ? "active" : ""}`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} />
          ))}
        </div>
        <div className="tag">yt-dlp core</div>
      </div>

      <div className="hero">
        <h1>
          Paste a link. Pull the <em>raw stream.</em>
        </h1>
        <p>
          Video and audio extraction across hundreds of sites — YouTube, Instagram, TikTok,
          Twitter/X, SoundCloud, and more. No re-encoding, no watermarks, just the source formats.
        </p>

        <form className="prompt" onSubmit={handleSubmit}>
          <span className="caret">$</span>
          <input
            type="url"
            required
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? "reading…" : "extract"}
          </button>
        </form>

        {error && <div className="error-banner">✗ {error}</div>}
      </div>

      {result ? (
        <div className="result">
          <div className="result-head">
            {result.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.thumbnail} alt="" />
            )}
            <div className="result-meta">
              <h2>{result.title}</h2>
              <div className="meta-row">
                <span className="badge accent">{result.source}</span>
                {result.uploader && <span className="badge">{result.uploader}</span>}
                {formatDuration(result.durationSeconds) && (
                  <span className="badge">{formatDuration(result.durationSeconds)}</span>
                )}
                <span className="badge">{result.formats.length} formats</span>
              </div>
            </div>
          </div>

          <div className="formats">
            {result.formats.map((f) => (
              <div className="format-row" key={f.formatId}>
                <div className="res">{f.resolution}</div>
                <div className="note">
                  {f.ext} · {f.hasVideo ? "video" : ""}
                  {f.hasVideo && f.hasAudio ? "+" : ""}
                  {f.hasAudio ? "audio" : ""} · {f.note}
                </div>
                <div className="size">{formatBytes(f.filesize)}</div>
                <div className="format-actions">
                  <a
                    className="btn-ghost"
                    href={f.directUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Open the source CDN link directly"
                  >
                    direct
                  </a>
                  <a
                    className="btn-ghost primary"
                    href={downloadHref(f)}
                    title="Stream this through the server as a download"
                  >
                    download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !loading && (
          <div className="empty">
            waiting for input <span className="blink">_</span>
          </div>
        )
      )}

      <footer className="note">
        Direct links point straight at the source CDN — fastest, but some hosts expire or
        IP-lock them. The download button proxies the stream through this server instead, which
        works everywhere but counts against your Vercel function time. Only use this on content
        you have the right to download — respect each platform&apos;s terms of service and local
        copyright law.
      </footer>
    </div>
  );
}
