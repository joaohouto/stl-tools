export interface VectorizeOptions {
  threshold: number; // 10 - 245
  invert: boolean;
  removeBg: boolean;
  resolution: number; // e.g. 160 px
}

/**
 * Converts a browser Image/File (PNG/JPG/WebP) into a clean, single-path SVG string
 * using canvas thresholding and contour run-length / marching rectangles merging.
 */
export async function imageFileToSvg(
  file: File | Blob,
  options: VectorizeOptions = {
    threshold: 140,
    invert: false,
    removeBg: true,
    resolution: 140,
  }
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, options.resolution / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(16, Math.round(bitmap.width * scale));
  const h = Math.max(16, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D indisponível');

  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Determine foreground pixels (1 = foreground, 0 = background)
  const grid = new Uint8Array(w * h);

  // Corner background color sampling if removeBg is enabled
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 64) {
        grid[y * w + x] = 0;
        continue;
      }

      if (options.removeBg) {
        const distBg = Math.hypot(r - bgR, g - bgG, b - bgB);
        if (distBg < 28) {
          grid[y * w + x] = 0;
          continue;
        }
      }

      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const isDark = luma < options.threshold;
      grid[y * w + x] = options.invert ? (isDark ? 0 : 1) : isDark ? 1 : 0;
    }
  }

  // Convert horizontal runs into SVG path sub-rectangles so Clipper2 merges them into smooth polygons
  const paths: string[] = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      if (grid[y * w + x] === 1) {
        const startX = x;
        while (x < w && grid[y * w + x] === 1) {
          x++;
        }
        const x0 = startX - 0.1;
        const x1 = x + 0.1;
        const y0 = y - 0.1;
        const y1 = y + 1.1;
        paths.push(`M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}L${x0.toFixed(1)} ${y1.toFixed(1)}Z`);
      } else {
        x++;
      }
    }
  }

  if (paths.length === 0) {
    throw new Error('Nenhum contorno detectado na imagem. Ajuste o limiar (threshold) ou inverta as cores.');
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><path d="${paths.join(' ')}" fill="#f97316"/></svg>`;
}
