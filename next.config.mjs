/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/api/info": ["./node_modules/youtube-dl-exec/bin/**", "./scripts/**"],
    "/api/download": ["./node_modules/youtube-dl-exec/bin/**", "./node_modules/ffmpeg-static/**", "./scripts/**"],
    "app/api/info/route": ["./node_modules/youtube-dl-exec/bin/**", "./scripts/**"],
    "app/api/download/route": ["./node_modules/youtube-dl-exec/bin/**", "./node_modules/ffmpeg-static/**", "./scripts/**"],
  },
};

export default nextConfig;
