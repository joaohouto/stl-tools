import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  Polygons2D,
  offsetPolygons,
  subtractPolygons,
  translatePolygons,
  getBounds2D,
  circlePolygon,
  textToPolygons,
  shapeGalleryToPolygons,
  svgToPolygons,
  extrudePolygons,
  mergeGeometries,
} from '@/engine/cad';

export const cortadorCarimboModule: ProductModule = {
  schema: {
    id: 'cortador-carimbo',
    name: 'Cortadores de Biscoito, Argila & Carimbos',
    shortDescription: 'Gera cortador com lâmina fina, aba de pressão (flange) e carimbo marcador com pegador.',
    description:
      'Transforme qualquer formato da galeria, texto ou seu próprio desenho SVG/PNG em um Cortador de Biscoito/Argila/Pasta Americana com carimbo marcador opcional e pegador ergonômico.',
    categories: ['cortadores'],
    featured: true,
    free: false,
    creditCost: 2,
    addedAt: '2026-10-28',
    badge: 'Confeitaria & Cerâmica',
    params: [
      {
        name: 'tipo',
        label: 'Modo de Ferramenta',
        type: 'enum',
        default: 'kit_completo',
        options: [
          { value: 'kit_completo', label: 'Kit Cortador + Carimbo c/ Pegador' },
          { value: 'apenas_cortador', label: 'Apenas Cortador de Contorno' },
          { value: 'apenas_carimbo', label: 'Apenas Carimbo c/ Pegador' },
        ],
        group: 'Tipo e Arte',
      },
      {
        name: 'arte',
        label: 'Origem do Formato',
        type: 'enum',
        default: 'forma',
        options: [
          { value: 'forma', label: 'Forma da Galeria' },
          { value: 'texto', label: 'Palavra / Inicial' },
          { value: 'svg', label: 'Enviar Desenho SVG / Imagem' },
        ],
        group: 'Tipo e Arte',
      },
      {
        name: 'forma',
        label: 'Forma da Galeria',
        type: 'shape',
        default: 'urso',
        visibleIf: 'arte=forma',
        group: 'Tipo e Arte',
      },
      {
        name: 'texto',
        label: 'Texto do Cortador',
        type: 'string',
        default: 'AMOR',
        maxLength: 10,
        visibleIf: 'arte=texto',
        group: 'Tipo e Arte',
      },
      {
        name: 'fonte',
        label: 'Fonte',
        type: 'font',
        default: 'Lilita One',
        visibleIf: 'arte=texto',
        group: 'Tipo e Arte',
      },
      {
        name: 'desenho_svg',
        label: 'Desenho SVG ou Imagem',
        type: 'svg',
        default: '',
        visibleIf: 'arte=svg',
        group: 'Tipo e Arte',
      },
      {
        name: 'tamanho',
        label: 'Tamanho Principal (mm)',
        type: 'number',
        default: 68,
        min: 30,
        max: 140,
        step: 2,
        group: 'Medidas da Lâmina',
      },
      {
        name: 'altura_lamina',
        label: 'Altura de Corte (mm)',
        type: 'number',
        default: 15,
        min: 8,
        max: 30,
        step: 1,
        group: 'Medidas da Lâmina',
      },
      {
        name: 'espessura_lamina',
        label: 'Espessura da Lâmina (mm)',
        type: 'number',
        default: 1.0,
        min: 0.6,
        max: 2.0,
        step: 0.1,
        group: 'Medidas da Lâmina',
      },
      {
        name: 'largura_aba',
        label: 'Aba de Apoio da Mão / Flange (mm)',
        type: 'number',
        default: 4.5,
        min: 2.5,
        max: 8.0,
        step: 0.5,
        group: 'Medidas da Lâmina',
      },
      {
        name: 'folga_carimbo',
        label: 'Folga Entre Carimbo e Cortador (mm)',
        type: 'number',
        default: 1.5,
        min: 0.8,
        max: 3.5,
        step: 0.1,
        group: 'Carimbo',
      },
      {
        name: 'cor_cortador',
        label: 'Cor do Cortador',
        type: 'color',
        default: '#16d8aa',
        previewOnly: true,
      },
      {
        name: 'cor_carimbo',
        label: 'Cor do Carimbo Marcador',
        type: 'color',
        default: '#f59e0b',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'cortador', label: 'Cortador com Flange', colorParam: 'cor_cortador' },
      { name: 'carimbo', label: 'Carimbo Marcador + Pegador', colorParam: 'cor_carimbo' },
    ],
  },

  async generate(params) {
    const tipo = String(params.tipo || 'kit_completo');
    const arte = String(params.arte || 'forma');
    const forma = String(params.forma || 'urso');
    const texto = String(params.texto || 'AMOR');
    const fonte = String(params.fonte || 'Lilita One');
    const desenhoSvg = String(params.desenho_svg || '');
    const tamanho = Number(params.tamanho || 68);
    const alturaLamina = Number(params.altura_lamina || 15);
    const espLamina = Number(params.espessura_lamina || 1.0);
    const larguraAba = Number(params.largura_aba || 4.5);
    const folgaCarimbo = Number(params.folga_carimbo || 1.5);
    const corCortador = String(params.cor_cortador || '#16d8aa');
    const corCarimbo = String(params.cor_carimbo || '#f59e0b');

    let baseShape2D: Polygons2D = [];
    if (arte === 'texto') {
      const rawText = await textToPolygons(texto, fonte, tamanho * 0.45);
      baseShape2D = offsetPolygons(offsetPolygons(rawText, 3.5, 'round'), -1.5, 'round');
    } else if (arte === 'svg' && desenhoSvg.includes('<')) {
      baseShape2D = svgToPolygons(desenhoSvg, tamanho);
    } else {
      baseShape2D = shapeGalleryToPolygons(forma, tamanho);
    }

    // Smooth outer silhouette for clean dough release
    const innerCut2D = offsetPolygons(baseShape2D, 1.5, 'round');
    const bladeOuter2D = offsetPolygons(innerCut2D, espLamina, 'round');
    const flangeOuter2D = offsetPolygons(innerCut2D, larguraAba, 'round');

    const bladeRing2D = subtractPolygons(bladeOuter2D, innerCut2D);
    const flangeRing2D = subtractPolygons(flangeOuter2D, innerCut2D);

    const flangeHeight = 3.2;
    const flangeGeom = extrudePolygons(flangeRing2D, { height: flangeHeight, zOffset: 0 });
    const bladeGeom = extrudePolygons(bladeRing2D, {
      height: alturaLamina - flangeHeight,
      zOffset: flangeHeight,
    });
    const cortadorGeom = mergeGeometries([flangeGeom, bladeGeom]);

    // Stamp Marker + Central Knob Handle
    const stampPlate2D = offsetPolygons(innerCut2D, -folgaCarimbo, 'round');
    // Decorative inner contour lines on the stamp
    const innerDetailOuter = offsetPolygons(stampPlate2D, -2.5, 'round');
    const innerDetailInner = offsetPolygons(stampPlate2D, -4.2, 'round');
    const stampDetailRing = subtractPolygons(innerDetailOuter, innerDetailInner);

    const stampPlateGeom = extrudePolygons(stampPlate2D, { height: 3.0, zOffset: 0 });
    const stampReliefGeom = extrudePolygons(stampDetailRing, { height: 2.2, zOffset: 3.0 });

    const sb = getBounds2D(stampPlate2D);
    const handleRadius = Math.min(11, Math.min(sb.width, sb.height) * 0.22);
    const stem2D = circlePolygon(handleRadius * 0.65, sb.centerX, sb.centerY, 32);
    const knob2D = circlePolygon(handleRadius, sb.centerX, sb.centerY, 32);

    const stemGeom = extrudePolygons(stem2D, { height: 10, zOffset: 3.0 });
    const knobGeom = extrudePolygons(knob2D, { height: 3.5, zOffset: 13.0 });

    let carimboGeom = mergeGeometries([stampPlateGeom, stampReliefGeom, stemGeom, knobGeom]);

    const parts: GeneratedPartMesh[] = [];
    if (tipo === 'kit_completo') {
      // Place cutter on the left and stamp on the right for clear side-by-side preview & printing
      const shift = tamanho * 0.62 + larguraAba + 4;
      const cortadorShifted = extrudePolygons(
        translatePolygons(flangeRing2D, -shift, 0),
        { height: flangeHeight, zOffset: 0 }
      );
      const bladeShifted = extrudePolygons(
        translatePolygons(bladeRing2D, -shift, 0),
        { height: alturaLamina - flangeHeight, zOffset: flangeHeight }
      );
      parts.push({
        name: 'cortador',
        label: 'Cortador de Contorno',
        geometry: mergeGeometries([cortadorShifted, bladeShifted]),
        color: corCortador,
      });

      const plateShifted = extrudePolygons(translatePolygons(stampPlate2D, shift, 0), {
        height: 3.0,
        zOffset: 0,
      });
      const reliefShifted = extrudePolygons(translatePolygons(stampDetailRing, shift, 0), {
        height: 2.2,
        zOffset: 3.0,
      });
      const stemShifted = extrudePolygons(translatePolygons(stem2D, shift, 0), {
        height: 10,
        zOffset: 3.0,
      });
      const knobShifted = extrudePolygons(translatePolygons(knob2D, shift, 0), {
        height: 3.5,
        zOffset: 13.0,
      });

      parts.push({
        name: 'carimbo',
        label: 'Carimbo Marcador c/ Pegador',
        geometry: mergeGeometries([plateShifted, reliefShifted, stemShifted, knobShifted]),
        color: corCarimbo,
      });
    } else if (tipo === 'apenas_cortador') {
      parts.push({
        name: 'cortador',
        label: 'Cortador de Contorno',
        geometry: cortadorGeom,
        color: corCortador,
      });
    } else {
      parts.push({
        name: 'carimbo',
        label: 'Carimbo Marcador c/ Pegador',
        geometry: carimboGeom,
        color: corCarimbo,
      });
    }

    return { parts };
  },
};
