# Media Fetcher

Paste a URL, get every extractable audio/video stream back. Built on
[yt-dlp](https://github.com/yt-dlp/yt-dlp) (via `youtube-dl-exec`), which covers
1000+ sites — YouTube, Instagram, TikTok, X/Twitter, SoundCloud, Vimeo, Reddit, and more.

## How it works

- `POST /api/info` — runs `yt-dlp --dump-single-json` on the URL and returns
  title, thumbnail, and every available format (resolution, codec, size, direct CDN URL).
- `GET /api/download` — spawns `yt-dlp -f <format> -o -` and streams stdout straight
  through to the browser as a file download, for sites whose CDN links expire or
  are IP/cookie-locked.
- The frontend offers both: **direct** (fastest, hits the CDN URL straight) and
  **download** (proxied through your server, works everywhere, costs function time).

## Run locally

```bash
npm install
npm run dev
```

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Or push to GitHub and import the repo at vercel.com/new — it auto-detects Next.js.

### Things that matter for this specific app on Vercel

- **The yt-dlp binary must ship with the function.** `next.config.mjs` already sets
  `outputFileTracingIncludes` so Vercel bundles `node_modules/youtube-dl-exec/bin/**`
  into the API routes. Don't remove this — without it you'll get "yt-dlp binary not
  found" in production even though it works locally.
- **Function timeout.** `vercel.json` sets `maxDuration: 60` for both routes. 60s
  requires at least the Pro plan for reliable use; Hobby caps lower by default.
  Long videos via the `/api/download` proxy route can still time out — that's what
  the "direct" link option is for.
- **Cold starts download nothing** — the yt-dlp binary is already vendored at build
  time via the package's postinstall step, so no runtime download happens.
- If you want playlist support, batch extraction, or a queue for long jobs, that
  needs a real backend (Vercel functions aren't built for long-running work) —
  happy to help wire that up separately if you get there.

## A note on scope

This pulls from whatever URL you give it, including platforms whose terms of
service restrict downloading. That's on you to respect per-site — this tool
doesn't police it.
