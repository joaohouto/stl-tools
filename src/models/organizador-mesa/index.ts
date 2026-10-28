import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  Polygons2D,
  unionPolygons,
  subtractPolygons,
  translatePolygons,
  roundedRectPolygon,
  rectPolygon,
  textToPolygons,
  extrudePolygons,
  mergeGeometries,
  transformGeometry,
} from '@/engine/cad';

export const organizadorMesaModule: ProductModule = {
  schema: {
    id: 'organizador-mesa',
    name: 'Caixa Organizadora de Mesa c/ Divisórias',
    shortDescription: 'Caixa sob medida com divisórias internas configuráveis (colunas x linhas) e etiqueta frontal.',
    description:
      'Gere organizadores de mesa, porta-canetas, caixas de componentes eletrônicos ou porta-sachês para restaurantes com grade de divisórias internas sob medida e texto personalizado na face frontal.',
    categories: ['organizacao'],
    featured: false,
    free: true,
    creditCost: 1,
    addedAt: '2026-10-28',
    params: [
      {
        name: 'largura',
        label: 'Largura X (mm)',
        type: 'number',
        default: 110,
        min: 40,
        max: 240,
        step: 5,
        group: 'Dimensões da Caixa',
      },
      {
        name: 'profundidade',
        label: 'Profundidade Y (mm)',
        type: 'number',
        default: 75,
        min: 40,
        max: 220,
        step: 5,
        group: 'Dimensões da Caixa',
      },
      {
        name: 'altura',
        label: 'Altura Z (mm)',
        type: 'number',
        default: 55,
        min: 20,
        max: 140,
        step: 5,
        group: 'Dimensões da Caixa',
      },
      {
        name: 'colunas',
        label: 'Divisões na Largura (Colunas)',
        type: 'number',
        default: 3,
        min: 1,
        max: 6,
        step: 1,
        group: 'Grade de Divisórias',
      },
      {
        name: 'linhas',
        label: 'Divisões na Profundidade (Linhas)',
        type: 'number',
        default: 2,
        min: 1,
        max: 6,
        step: 1,
        group: 'Grade de Divisórias',
      },
      {
        name: 'parede',
        label: 'Espessura das Paredes (mm)',
        type: 'number',
        default: 2.2,
        min: 1.4,
        max: 4.5,
        step: 0.2,
        group: 'Grade de Divisórias',
      },
      {
        name: 'raio_canto',
        label: 'Raio dos Cantos (mm)',
        type: 'number',
        default: 6,
        min: 1,
        max: 20,
        step: 1,
        group: 'Dimensões da Caixa',
      },
      {
        name: 'texto_frontal',
        label: 'Etiqueta / Marca Frontal',
        type: 'string',
        default: 'OFFICE',
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
        name: 'cor_caixa',
        label: 'Cor da Caixa',
        type: 'color',
        default: '#334155',
        previewOnly: true,
      },
      {
        name: 'cor_etiqueta',
        label: 'Cor da Etiqueta Frontal',
        type: 'color',
        default: '#16d8aa',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'caixa', label: 'Corpo e Divisórias', colorParam: 'cor_caixa' },
      { name: 'etiqueta', label: 'Texto Frontal em Relevo', colorParam: 'cor_etiqueta' },
    ],
  },

  async generate(params) {
    const largura = Number(params.largura || 110);
    const profundidade = Number(params.profundidade || 75);
    const altura = Number(params.altura || 55);
    const colunas = Math.max(1, Math.round(Number(params.colunas || 3)));
    const linhas = Math.max(1, Math.round(Number(params.linhas || 2)));
    const parede = Number(params.parede || 2.2);
    const raioCanto = Number(params.raio_canto || 6);
    const textoFrontal = String(params.texto_frontal ?? 'OFFICE');
    const fonte = String(params.fonte || 'Bebas Neue');
    const corCaixa = String(params.cor_caixa || '#334155');
    const corEtiqueta = String(params.cor_etiqueta || '#16d8aa');

    const outer2D = roundedRectPolygon(largura, profundidade, raioCanto, 0, 0);
    const innerW = largura - parede * 2;
    const innerD = profundidade - parede * 2;
    const innerR = Math.max(0.5, raioCanto - parede);
    const innerCavity = roundedRectPolygon(innerW, innerD, innerR, 0, 0);

    let walls2D = subtractPolygons(outer2D, innerCavity);

    // Internal grid dividers
    const dividers: Polygons2D[] = [];
    for (let c = 1; c < colunas; c++) {
      const x = -innerW * 0.5 + (innerW / colunas) * c;
      dividers.push(rectPolygon(parede * 0.85, innerD + 1, x, 0));
    }
    for (let r = 1; r < linhas; r++) {
      const y = -innerD * 0.5 + (innerD / linhas) * r;
      dividers.push(rectPolygon(innerW + 1, parede * 0.85, 0, y));
    }

    if (dividers.length > 0) {
      walls2D = unionPolygons(walls2D, ...dividers);
    }

    const bottomHeight = Math.max(2.0, parede);
    const floorGeom = extrudePolygons(outer2D, { height: bottomHeight, zOffset: 0 });
    const wallsGeom = extrudePolygons(walls2D, {
      height: altura - bottomHeight,
      zOffset: bottomHeight,
    });
    const caixaGeom = mergeGeometries([floorGeom, wallsGeom]);

    const parts: GeneratedPartMesh[] = [
      { name: 'caixa', label: 'Caixa Organizadora', geometry: caixaGeom, color: corCaixa },
    ];

    if (textoFrontal.trim()) {
      const labelH = Math.min(14, altura * 0.28);
      const tPolys = await textToPolygons(textoFrontal, fonte, labelH);
      const rawText3D = extrudePolygons(tPolys, { height: 1.5, zOffset: -0.3 });
      const frontTextGeom = transformGeometry(rawText3D, {
        rotateDeg: [90, 0, 0],
        translate: [0, -profundidade * 0.5, altura * 0.52],
      });
      parts.push({
        name: 'etiqueta',
        label: 'Texto Frontal',
        geometry: frontTextGeom,
        color: corEtiqueta,
      });
    }

    return { parts };
  },
};
