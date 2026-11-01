import { NextResponse } from 'next/server';
import zlib from 'zlib';
import { PRODUCT_MODULES, getDefaultParams } from '@/models/registry';

function parseHexColor(hex: string): [number, number, number] {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const num = parseInt(c, 16);
  if (isNaN(num)) return [249, 115, 22];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Uint8Array): Buffer {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([lenBuf, body, crcBuf]);
}

function encodeRGBAtoPNG(width: number, height: number, rgba: Uint8Array): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const rawData = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    rawData[rowStart] = 0; // No filter
    rawData.set(rgba.subarray(y * stride, (y + 1) * stride), rowStart + 1);
  }

  const compressed = zlib.deflateSync(rawData, { level: 6 });

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Renderizador 3D Z-Buffer com Supersampling 2x2 (SSAA) e iluminação de estúdio.
 * Retorna PNG transparente de alta definição sem artefatos de ordenação de triângulos.
 */
async function renderModelPreviewPNG(modelId: string): Promise<Buffer | null> {
  const mod = PRODUCT_MODULES.find((m) => m.schema.id === modelId);
  if (!mod) return null;

  const params = getDefaultParams(mod);
  const { parts } = await mod.generate(params);

  // Ângulo de câmera customizado por tipo de peça para melhor leitura
  const isVerticalStand =
    modelId === 'suporte-celular-marca' ||
    modelId === 'letreiro-3d-mesa';
  const azDeg = modelId === 'anel-personalizado' ? -22 : isVerticalStand ? -26 : -22;
  const elDeg = modelId === 'anel-personalizado' ? 28 : isVerticalStand ? 30 : 44;

  const angleZ = (azDeg * Math.PI) / 180;
  const elev = (elDeg * Math.PI) / 180;
  const cosZ = Math.cos(angleZ);
  const sinZ = Math.sin(angleZ);
  const cosE = Math.cos(elev);
  const sinE = Math.sin(elev);

  const projectPoint = (x: number, y: number, z: number) => {
    const rx = x * cosZ - y * sinZ;
    const ry = x * sinZ + y * cosZ;
    const rz = z;
    const sx = rx;
    const sy = ry * sinE + rz * cosE;
    const sz = -ry * cosE + rz * sinE;
    return [sx, sy, sz] as const;
  };

  const rotateNormal = (nx: number, ny: number, nz: number) => {
    const rx = nx * cosZ - ny * sinZ;
    const ry = nx * sinZ + ny * cosZ;
    const rz = nz;
    const sx = rx;
    const sy = ry * sinE + rz * cosE;
    const sz = -ry * cosE + rz * sinE;
    return [sx, sy, sz] as const;
  };

  // 1. Calcula bounding box projetada na tela
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const part of parts) {
    const pos = part.geometry.getAttribute('position');
    if (!pos) continue;
    for (let i = 0; i < pos.count; i++) {
      const [sx, sy] = projectPoint(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (sx < minX) minX = sx;
      if (sy < minY) minY = sy;
      if (sx > maxX) maxX = sx;
      if (sy > maxY) maxY = sy;
    }
  }

  if (!isFinite(minX) || !isFinite(minY)) {
    return null;
  }

  // Resolução final 560x380 com Supersampling 2x2 (1120x760 interno)
  const outW = 560;
  const outH = 380;
  const ss = 2;
  const bufW = outW * ss;
  const bufH = outH * ss;

  const spanX = Math.max(1e-3, maxX - minX);
  const spanY = Math.max(1e-3, maxY - minY);
  const margin = 0.86;
  const scale = Math.min((bufW * margin) / spanX, (bufH * margin) / spanY);
  const cxWorld = (minX + maxX) * 0.5;
  const cyWorld = (minY + maxY) * 0.5;

  const toScreenX = (wx: number) => (wx - cxWorld) * scale + bufW * 0.5;
  const toScreenY = (wy: number) => bufH * 0.5 - (wy - cyWorld) * scale;

  const zBuffer = new Float32Array(bufW * bufH);
  zBuffer.fill(-Infinity);
  const colorBuffer = new Uint8Array(bufW * bufH * 4);

  // Luz principal (key light) e luz de preenchimento (fill light) no espaço da câmera
  const keyL = [0.38, 0.52, 0.76];
  const fillL = [-0.55, -0.25, 0.5];

  for (let partIdx = 0; partIdx < parts.length; partIdx++) {
    const part = parts[partIdx];
    const pos = part.geometry.getAttribute('position');
    if (!pos) continue;
    const baseRgb = parseHexColor(part.color || '#f97316');
    // Pequeno bias de profundidade (0.12mm) para evitar Z-fighting em faces coplanares de peças multicor
    const zBias = partIdx * 0.12;

    for (let i = 0; i < pos.count; i += 3) {
      const x1 = pos.getX(i), y1 = pos.getY(i), z1 = pos.getZ(i);
      const x2 = pos.getX(i + 1), y2 = pos.getY(i + 1), z2 = pos.getZ(i + 1);
      const x3 = pos.getX(i + 2), y3 = pos.getY(i + 2), z3 = pos.getZ(i + 2);

      // Normal geométrica da face
      const e1x = x2 - x1, e1y = y2 - y1, e1z = z2 - z1;
      const e2x = x3 - x1, e2y = y3 - y1, e2z = z3 - z1;
      let fnx = e1y * e2z - e1z * e2y;
      let fny = e1z * e2x - e1x * e2z;
      let fnz = e1x * e2y - e1y * e2x;
      const fnLen = Math.hypot(fnx, fny, fnz);
      if (fnLen < 1e-8) continue;
      fnx /= fnLen;
      fny /= fnLen;
      fnz /= fnLen;

      const [snx, sny, snz] = rotateNormal(fnx, fny, fnz);
      // Se a face estiver de costas para a câmera, inverte normal (DoubleSide como no Three.js)
      const orient = snz < 0 ? -1 : 1;
      const nx = snx * orient;
      const ny = sny * orient;
      const nz = snz * orient;

      const dotKey = Math.max(0, nx * keyL[0] + ny * keyL[1] + nz * keyL[2]);
      const dotFill = Math.max(0, nx * fillL[0] + ny * fillL[1] + nz * fillL[2]);
      // Specular suave (Blinn-Phong)
      const spec = Math.pow(Math.max(0, nz), 22) * 0.14;
      const shade = 0.44 + dotKey * 0.48 + dotFill * 0.16;

      const rCol = Math.min(255, Math.max(0, Math.round(baseRgb[0] * shade + 255 * spec)));
      const gCol = Math.min(255, Math.max(0, Math.round(baseRgb[1] * shade + 255 * spec)));
      const bCol = Math.min(255, Math.max(0, Math.round(baseRgb[2] * shade + 255 * spec)));

      const p1 = projectPoint(x1, y1, z1);
      const p2 = projectPoint(x2, y2, z2);
      const p3 = projectPoint(x3, y3, z3);

      const sx1 = toScreenX(p1[0]), sy1 = toScreenY(p1[1]), sz1 = p1[2] + zBias;
      const sx2 = toScreenX(p2[0]), sy2 = toScreenY(p2[1]), sz2 = p2[2] + zBias;
      const sx3 = toScreenX(p3[0]), sy3 = toScreenY(p3[1]), sz3 = p3[2] + zBias;

      const denom = (sy2 - sy3) * (sx1 - sx3) + (sx3 - sx2) * (sy1 - sy3);
      if (Math.abs(denom) < 1e-5) continue;
      const invDenom = 1.0 / denom;

      const minPx = Math.max(0, Math.floor(Math.min(sx1, sx2, sx3)));
      const maxPx = Math.min(bufW - 1, Math.ceil(Math.max(sx1, sx2, sx3)));
      const minPy = Math.max(0, Math.floor(Math.min(sy1, sy2, sy3)));
      const maxPy = Math.min(bufH - 1, Math.ceil(Math.max(sy1, sy2, sy3)));

      for (let py = minPy; py <= maxPy; py++) {
        const cy = py + 0.5;
        for (let px = minPx; px <= maxPx; px++) {
          const cx = px + 0.5;
          const w1 = ((sy2 - sy3) * (cx - sx3) + (sx3 - sx2) * (cy - sy3)) * invDenom;
          if (w1 < -1e-4) continue;
          const w2 = ((sy3 - sy1) * (cx - sx3) + (sx1 - sx3) * (cy - sy3)) * invDenom;
          if (w2 < -1e-4) continue;
          const w3 = 1.0 - w1 - w2;
          if (w3 < -1e-4) continue;

          const z = w1 * sz1 + w2 * sz2 + w3 * sz3;
          const idx = py * bufW + px;
          if (z > zBuffer[idx]) {
            zBuffer[idx] = z;
            const cIdx = idx * 4;
            colorBuffer[cIdx] = rCol;
            colorBuffer[cIdx + 1] = gCol;
            colorBuffer[cIdx + 2] = bCol;
            colorBuffer[cIdx + 3] = 255;
          }
        }
      }
    }
  }

  // Downsample 2x2 SSAA -> outW x outH com transparência suave nas bordas
  const finalRgba = new Uint8Array(outW * outH * 4);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
      let cov = 0;
      for (let dy = 0; dy < ss; dy++) {
        for (let dx = 0; dx < ss; dx++) {
          const sIdx = ((y * ss + dy) * bufW + (x * ss + dx)) * 4;
          const a = colorBuffer[sIdx + 3];
          if (a > 0) {
            rSum += colorBuffer[sIdx];
            gSum += colorBuffer[sIdx + 1];
            bSum += colorBuffer[sIdx + 2];
            aSum += a;
            cov++;
          }
        }
      }
      const dIdx = (y * outW + x) * 4;
      if (cov > 0) {
        finalRgba[dIdx] = Math.round(rSum / cov);
        finalRgba[dIdx + 1] = Math.round(gSum / cov);
        finalRgba[dIdx + 2] = Math.round(bSum / cov);
        finalRgba[dIdx + 3] = Math.round(aSum / (ss * ss));
      }
    }
  }

  return encodeRGBAtoPNG(outW, outH, finalRgba);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('model') || 'chaveiro-contorno';
  const pngBuf = await renderModelPreviewPNG(id);
  if (!pngBuf) {
    return NextResponse.json({ error: 'model not found' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(pngBuf), {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
