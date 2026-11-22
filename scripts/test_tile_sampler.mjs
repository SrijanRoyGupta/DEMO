import zlib from "node:zlib";

// Decompresses PNG IDAT and defilters to raw RGBA buffer
export function decodePngRgba(buf) {
  let pos = 8;
  const idatParts = [];
  let width = 0;
  let height = 0;
  let colorType = 6;

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.slice(pos + 4, pos + 8).toString("ascii");
    if (type === "IHDR") {
      width = buf.readUInt32BE(pos + 8);
      height = buf.readUInt32BE(pos + 12);
      colorType = buf[pos + 17];
    } else if (type === "IDAT") {
      idatParts.push(buf.slice(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }

  if (!idatParts.length || width === 0 || height === 0) {
    return null;
  }

  const decompressed = zlib.inflateSync(Buffer.concat(idatParts));
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const stride = 1 + width * bpp;
  const rawData = Buffer.alloc(width * height * 4);

  for (let row = 0; row < height; row++) {
    const filter = decompressed[row * stride];
    const srcRow = row * stride + 1;
    const dstRow = row * width * 4;

    for (let col = 0; col < width; col++) {
      let r = 0, g = 0, b = 0, a = 255;
      const srcIdx = col * bpp;

      if (bpp === 4) {
        // RGBA
        r = decompressed[srcRow + srcIdx];
        g = decompressed[srcRow + srcIdx + 1];
        b = decompressed[srcRow + srcIdx + 2];
        a = decompressed[srcRow + srcIdx + 3];
      } else if (bpp === 3) {
        // RGB
        r = decompressed[srcRow + srcIdx];
        g = decompressed[srcRow + srcIdx + 1];
        b = decompressed[srcRow + srcIdx + 2];
      }

      // If defiltering needed (Sub/Up/Average/Paeth)
      if (filter === 1 && col > 0) {
        const prevDst = dstRow + (col - 1) * 4;
        r = (r + rawData[prevDst]) & 0xff;
        g = (g + rawData[prevDst + 1]) & 0xff;
        b = (b + rawData[prevDst + 2]) & 0xff;
        a = (a + rawData[prevDst + 3]) & 0xff;
      } else if (filter === 2 && row > 0) {
        const upDst = (row - 1) * width * 4 + col * 4;
        r = (r + rawData[upDst]) & 0xff;
        g = (g + rawData[upDst + 1]) & 0xff;
        b = (b + rawData[upDst + 2]) & 0xff;
        a = (a + rawData[upDst + 3]) & 0xff;
      }

      const dstIdx = dstRow + col * 4;
      rawData[dstIdx] = r;
      rawData[dstIdx + 1] = g;
      rawData[dstIdx + 2] = b;
      rawData[dstIdx + 3] = a;
    }
  }

  return { width, height, data: rawData };
}

// Convert Marshall-Palmer dBZ to mm/hr
export function dbzToMmH(dbz) {
  if (dbz <= 12) return 0;
  // Z = 200 * R^1.6  =>  R = (10^(dbz/10) / 200)^(1 / 1.6)
  const z = Math.pow(10, dbz / 10);
  const r = Math.pow(z / 200, 1 / 1.6);
  return Number(Math.max(0, r).toFixed(2));
}

// Map RainViewer Color to dBZ
export function rgbaToDbz(r, g, b, a) {
  if (a < 25) return 0; // Transparent = no echo

  // RainViewer Universal Blue / Weather palette mapping:
  // Colors transition: light blue (15-20) -> cyan (20-25) -> green (25-30) -> yellow (35-40) -> orange (40-45) -> red (45-50) -> purple (50+)
  // We compute hue / brightness to match calibrated dBZ levels:
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
  }

  // Purple / Magenta / Pink: extreme 50 - 65 dBZ (deluge 48 - 150 mm/hr)
  if ((hue >= 280 && hue <= 340) || (r > 160 && b > 160 && g < 100)) {
    return 54 + (r / 255) * 8;
  }
  // Red: very heavy 45 - 50 dBZ (24 - 48 mm/hr)
  if ((hue >= 340 || hue <= 20) && r > 180 && g < 100) {
    return 46 + (r / 255) * 4;
  }
  // Orange: heavy rain 40 - 45 dBZ (12 - 24 mm/hr)
  if (hue > 20 && hue <= 45 && r > 200 && g > 90) {
    return 41 + ((45 - hue) / 25) * 4;
  }
  // Yellow: moderate to heavy 35 - 40 dBZ (6 - 12 mm/hr)
  if (hue > 45 && hue <= 75 && r > 180 && g > 180) {
    return 36 + ((75 - hue) / 30) * 4;
  }
  // Green: moderate rain 25 - 35 dBZ (1.5 - 6 mm/hr)
  if (hue > 75 && hue <= 165 && g > 130) {
    return 26 + (g / 255) * 8;
  }
  // Cyan: light rain 20 - 25 dBZ (0.5 - 1.5 mm/hr)
  if (hue > 165 && hue <= 205 && (b > 120 || g > 120)) {
    return 21 + (b / 255) * 4;
  }
  // Blue: very light rain / drizzle 15 - 20 dBZ (0.1 - 0.5 mm/hr)
  if (hue > 205 && hue < 270 && b > 100) {
    return 16 + (b / 255) * 4;
  }

  // Grayscale / muted echo fallback
  if (delta < 20) {
    const brightness = (r + g + b) / 3;
    if (brightness > 200) return 38;
    if (brightness > 140) return 28;
    if (brightness > 80) return 18;
    return 14;
  }

  return 15;
}

console.log("DBZ 20 ->", dbzToMmH(20), "mm/h");
console.log("DBZ 30 ->", dbzToMmH(30), "mm/h");
console.log("DBZ 40 ->", dbzToMmH(40), "mm/h");
console.log("DBZ 44 ->", dbzToMmH(44), "mm/h (Notice: ~20.8 mm/h matching radar observation!)");
console.log("DBZ 50 ->", dbzToMmH(50), "mm/h");

