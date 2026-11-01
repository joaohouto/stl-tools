import { NextResponse } from 'next/server';
import { PRODUCT_MODULES, getDefaultParams } from '@/models/registry';

/**
 * Debug-only: renders the top view (upward-facing triangles) of a generated model as SVG.
 * Usage: /api/debug-render?model=chaveiro-contorno&params={"texto":"Ana"}
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled in production' }, { status: 404 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get('model') || 'chaveiro-contorno';
  const overrides = JSON.parse(url.searchParams.get('params') || '{}');
  const mod = PRODUCT_MODULES.find((m) => m.schema.id === id);
  if (!mod) return NextResponse.json({ error: 'model not found' }, { status: 404 });

  const params = { ...getDefaultParams(mod), ...overrides };
  const { parts } = await mod.generate(params);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const layers: { color: string; z: number; d: string }[] = [];
  for (const part of parts) {
    const pos = part.geometry.getAttribute('position');
    if (!pos) continue;
    // group top triangles by their z so higher layers draw on top
    const byZ = new Map<number, string[]>();
    for (let i = 0; i < pos.count; i += 3) {
      const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i);
      const bx = pos.getX(i + 1), by = pos.getY(i + 1);
      const cx = pos.getX(i + 2), cy = pos.getY(i + 2);
      const cross = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      if (cross <= 1e-9) continue; // only upward-facing
      const z = Math.round(az * 10) / 10;
      for (const [x, y] of [[ax, ay], [bx, by], [cx, cy]]) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      const tri = `M${ax.toFixed(3)} ${(-ay).toFixed(3)}L${bx.toFixed(3)} ${(-by).toFixed(3)}L${cx.toFixed(3)} ${(-cy).toFixed(3)}Z`;
      if (!byZ.has(z)) byZ.set(z, []);
      byZ.get(z)!.push(tri);
    }
    for (const [z, tris] of byZ) {
      layers.push({ color: part.color || '#f97316', z, d: tris.join('') });
    }
  }
  layers.sort((a, b) => a.z - b.z);
  const pad = 4;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX - pad} ${-maxY - pad} ${w} ${h}" width="${Math.round(w * 8)}" height="${Math.round(h * 8)}"><rect x="${minX - pad}" y="${-maxY - pad}" width="${w}" height="${h}" fill="#111"/>${layers
    .map((l) => `<path d="${l.d}" fill="${l.color}" stroke="${l.color}" stroke-width="0.02"/>`)
    .join('')}</svg>`;
  return new NextResponse(svg, { headers: { 'content-type': 'image/svg+xml' } });
}
