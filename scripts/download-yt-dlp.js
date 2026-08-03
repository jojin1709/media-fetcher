const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

async function downloadBinary(filename, url) {
  const binDir = path.join(__dirname, '..', 'node_modules', 'youtube-dl-exec', 'bin');
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const targetPath = path.join(binDir, filename);
  if (fs.existsSync(targetPath)) {
    console.log(`[prepare-bin] ${filename} already exists at ${targetPath}`);
    return;
  }

  console.log(`[prepare-bin] Downloading ${filename} from ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${filename}: ${response.statusText}`);
  }

  const fileStream = fs.createWriteStream(targetPath);
  // @ts-ignore
  await pipeline(response.body, fileStream);

  if (process.platform !== 'win32' || !filename.endsWith('.exe')) {
    try {
      fs.chmodSync(targetPath, 0o755);
    } catch {}
  }

  console.log(`[prepare-bin] Successfully downloaded ${filename}`);
}

async function main() {
  try {
    // Download Linux binary
    await downloadBinary('yt-dlp', 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp');
    // Download Windows binary
    await downloadBinary('yt-dlp.exe', 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe');
  } catch (err) {
    console.error('[prepare-bin] Error downloading binaries:', err.message);
  }
}

main();
