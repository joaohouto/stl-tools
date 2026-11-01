import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = path.resolve('public/previews');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const MODELS = [
  'suporte-celular-marca',
  'tampa-stanley-jug',
  'chaveiro-contorno',
  'porta-cartao',
  'caixa-com-tampa',
  'anel-personalizado',
  'ponteira-lapis',
  'letra-com-nome',
  'letra-caixa-led',
  'cortador-carimbo',
  'placa-personalizada',
  'letreiro-3d-mesa',
  'tag-pet',
  'organizador-mesa',
];

async function generateAll() {
  console.log(`[Preview Generator] Iniciando geração Z-Buffer 2x2 SSAA para ${MODELS.length} produtos...`);
  console.log(`[Preview Generator] Destino: ${OUT_DIR}`);

  for (const modelId of MODELS) {
    try {
      const url = `${BASE_URL}/api/render-preview?model=${modelId}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(180000) });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const buf = Buffer.from(await res.arrayBuffer());
      const pngPath = path.join(OUT_DIR, `${modelId}.png`);
      fs.writeFileSync(pngPath, buf);

      console.log(`✓ [${modelId}] salvo em public/previews/${modelId}.png (${(buf.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`✗ Erro ao gerar preview para ${modelId}:`, err.message);
    }
  }

  console.log('[Preview Generator] Concluído com sucesso!');
}

generateAll();
