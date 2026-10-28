#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const slug = args[0];
const title = args[1] || 'Novo Produto Paramétrico';
const category = args[2] || 'suportes';

if (!slug) {
  console.error('Uso: pnpm run new:model <slug-do-produto> "Nome do Produto" "categoria"');
  console.error('Categorias válidas: suportes, chaveiros, letreiros, cortadores, placas, pets, organizacao');
  process.exit(1);
}

const camelName = slug
  .split('-')
  .map((part, idx) => (idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
  .join('') + 'Module';

const modelDir = path.join(process.cwd(), 'src', 'models', slug);
const indexFile = path.join(modelDir, 'index.ts');

if (fs.existsSync(indexFile)) {
  console.error(`Erro: O modelo '${slug}' já existe em src/models/${slug}/index.ts`);
  process.exit(1);
}

fs.mkdirSync(modelDir, { recursive: true });

const template = `import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  roundedRectPolygon,
  textToPolygons,
  extrudePolygons,
} from '@/engine/cad';

export const ${camelName}: ProductModule = {
  schema: {
    id: '${slug}',
    name: '${title}',
    shortDescription: 'Descrição curta para o card da vitrine.',
    description:
      'Descrição detalhada do produto paramétrico ${title}. Ajuste os controles ao lado para personalizar medidas, textos e cores.',
    categories: ['${category}'],
    featured: false,
    free: false,
    creditCost: 2,
    addedAt: '${new Date().toISOString().slice(0, 10)}',
    badge: 'Novo',
    params: [
      {
        name: 'texto',
        label: 'Texto Personalizado',
        type: 'string',
        default: 'STLTOOLS',
        maxLength: 16,
        group: 'Personalização',
      },
      {
        name: 'fonte',
        label: 'Fonte',
        type: 'font',
        default: 'Bebas Neue',
        group: 'Personalização',
      },
      {
        name: 'largura',
        label: 'Largura (mm)',
        type: 'number',
        default: 80,
        min: 30,
        max: 200,
        step: 2,
        group: 'Medidas',
      },
      {
        name: 'altura',
        label: 'Altura (mm)',
        type: 'number',
        default: 40,
        min: 20,
        max: 150,
        step: 2,
        group: 'Medidas',
      },
      {
        name: 'espessura',
        label: 'Espessura (mm)',
        type: 'number',
        default: 4,
        min: 2,
        max: 12,
        step: 0.5,
        group: 'Medidas',
      },
      {
        name: 'cor_base',
        label: 'Cor da Base',
        type: 'color',
        default: '#1e293b',
        previewOnly: true,
      },
      {
        name: 'cor_relevo',
        label: 'Cor do Relevo',
        type: 'color',
        default: '#16d8aa',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'base', label: 'Base Principal', colorParam: 'cor_base' },
      { name: 'relevo', label: 'Texto em Relevo', colorParam: 'cor_relevo' },
    ],
  },

  async generate(params) {
    const texto = String(params.texto || 'STLTOOLS');
    const fonte = String(params.fonte || 'Bebas Neue');
    const largura = Number(params.largura || 80);
    const altura = Number(params.altura || 40);
    const espessura = Number(params.espessura || 4);
    const corBase = String(params.cor_base || '#1e293b');
    const corRelevo = String(params.cor_relevo || '#16d8aa');

    const base2D = roundedRectPolygon(largura, altura, 6, 0, 0);
    const text2D = await textToPolygons(texto, fonte, altura * 0.42);

    const baseGeom = extrudePolygons(base2D, { height: espessura, zOffset: 0 });
    const relevoGeom = extrudePolygons(text2D, { height: 1.4, zOffset: espessura });

    const parts: GeneratedPartMesh[] = [
      { name: 'base', label: 'Base Principal', geometry: baseGeom, color: corBase },
      { name: 'relevo', label: 'Texto em Relevo', geometry: relevoGeom, color: corRelevo },
    ];

    return { parts };
  },
};
`;

fs.writeFileSync(indexFile, template, 'utf8');

// Register automatically in src/models/registry.ts
const registryPath = path.join(process.cwd(), 'src', 'models', 'registry.ts');
if (fs.existsSync(registryPath)) {
  let regContent = fs.readFileSync(registryPath, 'utf8');
  const importLine = `import { ${camelName} } from './${slug}';\n`;
  if (!regContent.includes(importLine)) {
    regContent = importLine + regContent;
    regContent = regContent.replace(
      'export const PRODUCT_MODULES: ProductModule[] = [',
      `export const PRODUCT_MODULES: ProductModule[] = [\n  ${camelName},`
    );
    fs.writeFileSync(registryPath, regContent, 'utf8');
  }
}

console.log(`✅ Modelo '${slug}' criado com sucesso em src/models/${slug}/index.ts!`);
console.log(`✅ Registrado automaticamente em src/models/registry.ts!`);
console.log(`👉 Acesse em: http://localhost:3000/models/${slug}`);
