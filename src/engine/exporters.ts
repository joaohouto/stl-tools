import * as THREE from 'three';
import { zipSync, strToU8 } from 'fflate';
import { GeneratedPartMesh } from './types';
import { mergeGeometries } from './cad';

/**
 * Encodes a THREE.BufferGeometry into a standard Binary STL Uint8Array
 */
export function geometryToBinarySTL(geom: THREE.BufferGeometry, headerTitle = 'STLTools Parametric Model'): Uint8Array {
  const pos = geom.getAttribute('position') as THREE.BufferAttribute | undefined;
  const norm = geom.getAttribute('normal') as THREE.BufferAttribute | undefined;

  if (!pos || pos.count < 3) {
    const empty = new Uint8Array(84);
    return empty;
  }

  const numTriangles = Math.floor(pos.count / 3);
  const buffer = new ArrayBuffer(84 + numTriangles * 50);
  const view = new DataView(buffer);

  // 80-byte ASCII header
  const headerBytes = strToU8(headerTitle.slice(0, 78));
  new Uint8Array(buffer, 0, headerBytes.length).set(headerBytes);

  // Number of triangles (uint32 little-endian)
  view.setUint32(80, numTriangles, true);

  let offset = 84;
  const pArr = pos.array as Float32Array;
  const nArr = norm ? (norm.array as Float32Array) : null;

  for (let i = 0; i < numTriangles; i++) {
    const base = i * 9;

    const nx = nArr ? nArr[base] : 0;
    const ny = nArr ? nArr[base + 1] : 0;
    const nz = nArr ? nArr[base + 2] : 1;

    view.setFloat32(offset, nx, true);
    view.setFloat32(offset + 4, ny, true);
    view.setFloat32(offset + 8, nz, true);
    offset += 12;

    for (let v = 0; v < 9; v++) {
      view.setFloat32(offset, pArr[base + v], true);
      offset += 4;
    }

    // 2-byte attribute byte count
    view.setUint16(offset, 0, true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}

/**
 * Exports all parts merged into a single Binary STL
 */
export function exportMergedSTL(parts: GeneratedPartMesh[], modelSlug: string): Uint8Array {
  const merged = mergeGeometries(parts.map((p) => p.geometry));
  return geometryToBinarySTL(merged, `STLTools - ${modelSlug}`);
}

/**
 * Exports a multi-file ZIP archive containing:
 * - One individual STL per colored part (e.g. `01_corpo.stl`, `02_nome.stl`)
 * - The complete assembled STL (`completo_montado.stl`)
 * - A `LEIAME_IMPRESSAO.txt` guide with part colors and slicing recommendations
 */
export function exportPartsZIP(
  parts: GeneratedPartMesh[],
  modelName: string,
  modelSlug: string
): Uint8Array {
  const files: Record<string, Uint8Array> = {};

  parts.forEach((part, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const safeName = part.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    files[`${num}_${safeName}.stl`] = geometryToBinarySTL(
      part.geometry,
      `STLTools - ${modelSlug} - ${part.label}`
    );
  });

  if (parts.length > 1) {
    files['completo_montado.stl'] = exportMergedSTL(parts, modelSlug);
  }

  const readmeLines = [
    `==========================================================`,
    `STLTools — Pacote de Impressao 3D: ${modelName}`,
    `==========================================================`,
    ``,
    `Arquivos incluidos neste pacote:`,
    ...parts.map(
      (p, i) =>
        `  - ${String(i + 1).padStart(2, '0')}_${p.name}.stl -> ${p.label} (Cor sugerida: ${p.color})`
    ),
    parts.length > 1 ? `  - completo_montado.stl -> Todas as partes unificadas` : '',
    ``,
    `DICA PARA IMPRESSAO MULTICOR (Bambu Studio / OrcaSlicer / PrusaSlicer):`,
    `1. Selecione todos os arquivos numerados (01_..., 02_...) e arraste juntos para o fatiador.`,
    `2. Quando o fatiador perguntar "Carregar estes arquivos como um unico objeto com varias partes?", clique em SIM.`,
    `3. Escolha o filamento/cor de cada parte na lista de objetos ou use o arquivo .3MF direto!`,
    ``,
    `Gerado em: ${new Date().toISOString()}`,
  ].filter(Boolean);

  files['LEIAME_IMPRESSAO.txt'] = strToU8(readmeLines.join('\n'));

  return zipSync(files, { level: 6 });
}

/**
 * Exports a native Multi-Part / Multi-Color .3MF archive compatible with Bambu Studio, OrcaSlicer & PrusaSlicer
 */
export function exportMultiColor3MF(parts: GeneratedPartMesh[], modelName: string): Uint8Array {
  const resourcesXml: string[] = [];
  const buildItemsXml: string[] = [];

  parts.forEach((part, idx) => {
    const objId = idx + 1;
    const pos = part.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!pos || pos.count < 3) return;

    const verticesLines: string[] = [];
    const trianglesLines: string[] = [];

    const arr = pos.array as Float32Array;
    const numTris = Math.floor(pos.count / 3);

    for (let v = 0; v < pos.count; v++) {
      const vx = arr[v * 3].toFixed(4);
      const vy = arr[v * 3 + 1].toFixed(4);
      const vz = arr[v * 3 + 2].toFixed(4);
      verticesLines.push(`          <vertex x="${vx}" y="${vy}" z="${vz}" />`);
    }

    for (let t = 0; t < numTris; t++) {
      const v1 = t * 3;
      const v2 = t * 3 + 1;
      const v3 = t * 3 + 2;
      trianglesLines.push(`          <triangle v1="${v1}" v2="${v2}" v3="${v3}" />`);
    }

    resourcesXml.push(`    <object id="${objId}" name="${escapeXml(part.label)}" type="model">
      <mesh>
        <vertices>
${verticesLines.join('\n')}
        </vertices>
        <triangles>
${trianglesLines.join('\n')}
        </triangles>
      </mesh>
    </object>`);

    buildItemsXml.push(`    <item objectid="${objId}" />`);
  });

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="pt-BR" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">${escapeXml(modelName)}</metadata>
  <metadata name="Application">STLTools Parametric Engine</metadata>
  <resources>
${resourcesXml.join('\n')}
  </resources>
  <build>
${buildItemsXml.join('\n')}
  </build>
</model>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`;

  return zipSync(
    {
      '[Content_Types].xml': strToU8(contentTypesXml),
      '_rels/.rels': strToU8(relsXml),
      '3D/3dmodel.model': strToU8(modelXml),
    },
    { level: 6 }
  );
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function triggerBrowserDownload(bytes: Uint8Array, filename: string, mimeType: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
