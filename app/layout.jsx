import "./globals.css";

export const metadata = {
  title: "MediaFetcher Pro — Universal Video & Audio Downloader",
  description:
    "Download videos and audio from YouTube, Instagram, TikTok, X/Twitter, SoundCloud, Pinterest, Facebook and 1000+ sites. Extract original quality streams instantly.",
  keywords: "video downloader, youtube downloader, instagram reels, tiktok downloader, audio extractor, media fetcher",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
