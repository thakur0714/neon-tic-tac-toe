import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, drawPixel) {
  // RGBA buffer with filter byte at the beginning of each scanline
  const rowLength = width * 4 + 1;
  const rawData = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const chunkData = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(chunkData), 0);
    return Buffer.concat([len, chunkData, crc]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate cyber game icon
function drawGameIcon(isMaskable) {
  return (x, y, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Deep slate-950 background
    let r = 2;
    let g = 6;
    let b = 23;
    let a = 255;

    // Glowing background radial vignette
    const maxRadius = w * 0.46;
    if (dist < maxRadius) {
      const glow = (1 - dist / maxRadius);
      r = Math.min(255, r + Math.floor(glow * 25));
      g = Math.min(255, g + Math.floor(glow * 70));
      b = Math.min(255, b + Math.floor(glow * 110));
    }

    // Outer neon ring (safe zone check for maskable)
    const ringRadius = isMaskable ? w * 0.32 : w * 0.38;
    const ringThickness = w * 0.025;
    if (Math.abs(dist - ringRadius) < ringThickness) {
      // Cyan / Magenta neon gradient
      const t = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI);
      r = Math.floor(6 + t * (244 - 6));
      g = Math.floor(182 - t * (182 - 63));
      b = Math.floor(212 - t * (212 - 148));
      return [r, g, b, 255];
    }

    // Gamepad shape in center
    const scale = isMaskable ? 0.72 : 0.85;
    const gx = dx / scale;
    const gy = dy / scale;
    const baseW = w * 0.28;
    const baseH = h * 0.16;

    // Rounded pill body for gamepad
    const inBody = Math.abs(gx) < baseW && Math.abs(gy) < baseH;
    const inLeftHandle = Math.hypot(gx + baseW * 0.6, gy) < baseH * 1.15;
    const inRightHandle = Math.hypot(gx - baseW * 0.6, gy) < baseH * 1.15;

    if (inBody || inLeftHandle || inRightHandle) {
      // Gamepad body color (dark slate with cyber cyan border)
      r = 15;
      g = 23;
      b = 42;

      // D-pad on left side: gx in [-baseW*0.65, -baseW*0.35]
      const dpadX = gx + baseW * 0.5;
      const dpadY = gy;
      const isDpadH = Math.abs(dpadX) < w * 0.045 && Math.abs(dpadY) < w * 0.015;
      const isDpadV = Math.abs(dpadX) < w * 0.015 && Math.abs(dpadY) < w * 0.045;
      if (isDpadH || isDpadV) {
        return [6, 182, 212, 255]; // Cyan neon D-pad
      }

      // Buttons on right side
      const btnX = gx - baseW * 0.5;
      const btnY = gy;
      const btn1 = Math.hypot(btnX, btnY - w * 0.025) < w * 0.018;
      const btn2 = Math.hypot(btnX, btnY + w * 0.025) < w * 0.018;
      const btn3 = Math.hypot(btnX - w * 0.025, btnY) < w * 0.018;
      const btn4 = Math.hypot(btnX + w * 0.025, btnY) < w * 0.018;
      if (btn1 || btn2 || btn3 || btn4) {
        return [244, 63, 94, 255]; // Pink / Rose neon buttons
      }

      // Center glowing logo star
      if (Math.hypot(gx, gy) < w * 0.02) {
        return [245, 158, 11, 255]; // Amber gold star
      }
    }

    return [r, g, b, a];
  };
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA icons...');
const png192 = createPng(192, 192, drawGameIcon(false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

const png512 = createPng(512, 512, drawGameIcon(false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

const pngMaskable512 = createPng(512, 512, drawGameIcon(true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable512);

const appleIcon = createPng(180, 180, drawGameIcon(false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

console.log('All PWA PNG icons created successfully in /public!');
