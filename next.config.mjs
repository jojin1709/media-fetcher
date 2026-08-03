/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel traces which files each serverless function needs and drops
  // everything else. The yt-dlp binary lives in node_modules but isn't
  // detected by static analysis (it's spawned as a child process, not
  // imported), so it has to be included explicitly or the function will
  // crash in production with "yt-dlp binary not found".
  outputFileTracingIncludes: {
    "/api/info": ["./node_modules/youtube-dl-exec/bin/**"],
    "/api/download": ["./node_modules/youtube-dl-exec/bin/**"],
  },
};

export default nextConfig;
