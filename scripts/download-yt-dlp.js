const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream/promises');

async function downloadBinary(filename, url, targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetPath = path.join(targetDir, filename);
  console.log(`[download-yt-dlp] Downloading ${filename} from ${url} to ${targetPath}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${filename}: ${response.status} ${response.statusText}`);
  }

  const fileStream = fs.createWriteStream(targetPath);
  // @ts-ignore
  await pipeline(response.body, fileStream);

  if (!filename.endsWith('.exe')) {
    try {
      fs.chmodSync(targetPath, 0o755);
    } catch (e) {
      console.warn(`[download-yt-dlp] Could not chmod ${targetPath}:`, e.message);
    }
  }

  console.log(`[download-yt-dlp] Successfully saved ${filename}`);
  return targetPath;
}

async function main() {
  const vendorDir = path.join(__dirname, '..', 'node_modules', 'youtube-dl-exec', 'bin');
  
  // URL for Standalone Linux binary (PyInstaller standalone - NO python3 required on Vercel)
  const linuxUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
  const winUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';

  try {
    if (process.platform === 'win32') {
      await downloadBinary('yt-dlp.exe', winUrl, vendorDir);
      // Also download Linux standalone binary into vendorDir so Vercel trace bundles it
      await downloadBinary('yt-dlp', linuxUrl, vendorDir);
    } else {
      await downloadBinary('yt-dlp', linuxUrl, vendorDir);
    }
  } catch (err) {
    console.error('[download-yt-dlp] Download error:', err.message);
  }
}

main();
