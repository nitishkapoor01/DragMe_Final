import sharp from 'sharp';
import fs from 'fs';

const sheetImg = 'C:\\Users\\nitis\\.gemini\\antigravity-ide\\brain\\43ac5bc4-aca5-4f0b-9a45-0fe2c5d7e852\\.user_uploaded\\media_1791096677753.jpg';

async function generatePerfectAsset() {
  // Capture the full card 1 mascot including all sparkles, peaks, and ground glow
  const cropX = 14;
  const cropY = 56;
  const cropW = 188;
  const cropH = 142;

  const raw = await sharp(sheetImg)
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = raw;
  const { width, height, channels } = info;

  // Background removal via flood fill from 4 borders
  const visited = new Uint8Array(width * height);
  const queue = [];

  function isBackground(x, y) {
    const idx = (y * width + x) * channels;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    
    // Check if pixel is card background (gray/black text/border or dark backdrop)
    // Dark card background: r,g,b all low (< 35) without strong green tint
    const brightness = (r + g + b) / 3;
    const isGreen = (g > r + 10) && (g > 25);
    const isYellowSparkle = (r > 60 && g > 60 && b < 50);

    // Also avoid card title text pixels if any at the very top
    return brightness < 32 && !isGreen && !isYellowSparkle;
  }

  // Seed outer edges
  for (let x = 0; x < width; x++) {
    if (isBackground(x, 0)) { queue.push(x, 0); visited[0 * width + x] = 1; }
    if (isBackground(x, height - 1)) { queue.push(x, height - 1); visited[(height - 1) * width + x] = 1; }
  }
  for (let y = 0; y < height; y++) {
    if (isBackground(0, y)) { queue.push(0, y); visited[y * width + 0] = 1; }
    if (isBackground(width - 1, y)) { queue.push(width - 1, y); visited[y * width + (width - 1)] = 1; }
  }

  // Flood fill
  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];

    const neighbors = [
      [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (!visited[nIdx] && isBackground(nx, ny)) {
          visited[nIdx] = 1;
          queue.push(nx, ny);
        }
      }
    }
  }

  // Output RGBA
  const outRgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];

    outRgba[i * 4] = r;
    outRgba[i * 4 + 1] = g;
    outRgba[i * 4 + 2] = b;

    if (visited[i]) {
      outRgba[i * 4 + 3] = 0;
    } else {
      // Smooth alpha for glowing edge pixels
      const isGlow = (g > r + 8) && (g > 20);
      if (isGlow && (r + g + b) / 3 < 45) {
        outRgba[i * 4 + 3] = Math.min(255, Math.round(g * 3.5));
      } else {
        outRgba[i * 4 + 3] = 255;
      }
    }
  }

  // Extend with padding for seamless layout
  await sharp(outRgba, { raw: { width, height, channels: 4 } })
    .resize(380, 288, { fit: 'contain' })
    .png({ quality: 100 })
    .toFile('public/assets/dragme_mascot_front.png');

  await sharp(outRgba, { raw: { width, height, channels: 4 } })
    .resize(380, 288, { fit: 'contain' })
    .webp({ quality: 96, alphaQuality: 100 })
    .toFile('public/assets/dragme_mascot_front.webp');

  fs.copyFileSync('public/assets/dragme_mascot_front.png', 'dragme_mascot_front.png');
  fs.copyFileSync('public/assets/dragme_mascot_front.webp', 'dragme_mascot_front.webp');

  console.log('✅ Generated refined 380x288 high-res transparent mascot assets.');
}

generatePerfectAsset();
