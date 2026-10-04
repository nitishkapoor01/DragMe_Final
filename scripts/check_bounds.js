import sharp from 'sharp';

async function checkBounds() {
  const { data, info } = await sharp('public/assets/dragme_mascot_front.png')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let minX = width, maxX = 0, minY = height, maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * channels + 3];
      if (alpha > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  console.log(`Content bounding box in ${width}x${height}:`, { minX, maxX, minY, maxY, contentW: maxX - minX, contentH: maxY - minY });
}

checkBounds();
