import * as THREE from 'three';
import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  Point2D,
  Polygons2D,
  offsetPolygons,
  unionPolygons,
  subtractPolygons,
  translatePolygons,
  scalePolygons,
  getBounds2D,
  circlePolygon,
  roundedRectPolygon,
  textToPolygons,
  shapeGalleryToPolygons,
  svgToPolygons,
  extrudePolygons,
  mergeGeometries,
  transformGeometry,
} from '@/engine/cad';

/**
 * Gera um polígono hexagonal regular centrado em (cx, cy) com largura entre faces opostas `flatToFlat`.
 */
function hexSocketPolygon(flatToFlat: number, cx = 0, cy = 0): Polygons2D {
  const r = (flatToFlat * 0.5) / Math.cos(Math.PI / 6);
  const pts: Point2D[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return [pts];
}

/**
 * Constrói o Cabo / Handle Ergonômico de Encaixe (imprime 100% em pé na mesa Z=0 sem suportes):
 * - Base de apoio anatômica canelada para a palma da mão / dedos (Z = 0..5mm)
 * - Haste cilíndrica ergonômica (Z = 5..19mm)
 * - Flange de distribuição de pressão (Z = 19..22mm)
 * - Pino sextavado macho no topo (Z = 22..22+pinoH) que encaixa sob pressão no verso da placa do carimbo.
 */
function buildStampHandleGeometry(
  knobDiam: number,
  plugFlatWidth: number,
  plugHeight: number
): THREE.BufferGeometry {
  const knobR = knobDiam * 0.5;
  let knob2D = circlePolygon(knobR, 0, 0, 64);

  // 8 entalhes suaves ao redor do pomo para pega firme anti-deslizante
  const flutes: Polygons2D[] = [];
  const fluteR = knobR * 0.22;
  const fluteDist = knobR * 1.06;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    flutes.push(circlePolygon(fluteR, Math.cos(a) * fluteDist, Math.sin(a) * fluteDist, 24));
  }
  knob2D = offsetPolygons(subtractPolygons(knob2D, unionPolygons(...flutes)), 0.6, 'round');

  const stemR = Math.max(7.5, plugFlatWidth * 0.54);
  const collarR = Math.max(stemR + 2.5, plugFlatWidth * 0.72);

  const knobBaseGeom = extrudePolygons(offsetPolygons(knob2D, -0.8, 'round'), {
    height: 1.2,
    zOffset: 0,
  });
  const knobBodyGeom = extrudePolygons(knob2D, {
    height: 4.2,
    zOffset: 1.2,
  });
  const knobTopGeom = extrudePolygons(offsetPolygons(knob2D, -1.0, 'round'), {
    height: 1.2,
    zOffset: 5.4,
  });

  const stemGeom = extrudePolygons(circlePolygon(stemR, 0, 0, 48), {
    height: 12.4,
    zOffset: 6.6,
  });

  const collarGeom = extrudePolygons(circlePolygon(collarR, 0, 0, 48), {
    height: 3.0,
    zOffset: 19.0,
  });

  // Pino macho sextavado com leve chanfro de entrada na ponta
  const plugMain2D = hexSocketPolygon(plugFlatWidth, 0, 0);
  const plugTip2D = hexSocketPolygon(plugFlatWidth - 0.5, 0, 0);
  const plugMainH = Math.max(1.0, plugHeight - 0.6);

  const plugMainGeom = extrudePolygons(plugMain2D, {
    height: plugMainH,
    zOffset: 22.0,
  });
  const plugTipGeom = extrudePolygons(plugTip2D, {
    height: 0.6,
    zOffset: 22.0 + plugMainH,
  });

  return mergeGeometries([
    knobBaseGeom,
    knobBodyGeom,
    knobTopGeom,
    stemGeom,
    collarGeom,
    plugMainGeom,
    plugTipGeom,
  ]);
}

export const cortadorCarimboModule: ProductModule = {
  schema: {
    id: 'cortador-carimbo',
    name: 'Carimbo Marcador Personalizado c/ Cabo de Encaixe',
    shortDescription:
      'Carimbo marcador em alto-relevo com placa limpa e cabo ergonômico (handle) de encaixe sextavado para massas, biscoitos e argila.',
    description:
      'Crie carimbos marcadores profissionais para confeitaria (biscoitos amanteigados, pasta americana, brigadeiros), cerâmica fria, argila e sabonetes artesanais. Acompanha placa marcadora sem abas externas e 2ª peça (Handle / Cabo Ergonômico) que encaixa sob pressão no verso da placa.',
    categories: ['cortadores'],
    featured: true,
    free: false,
    creditCost: 2,
    addedAt: '2026-10-28',
    badge: 'Com Cabo de Encaixe',
    params: [
      {
        name: 'formato_base',
        label: 'Formato da Placa do Carimbo',
        type: 'enum',
        default: 'circulo',
        options: [
          { value: 'circulo', label: 'Sinete Redondo Clássico' },
          { value: 'quadrado', label: 'Placa Quadrada Arredondada' },
          { value: 'hexagono', label: 'Sinete Hexagonal' },
          { value: 'contorno', label: 'Contornado no Formato da Arte' },
        ],
        group: 'Formato e Conteúdo',
      },
      {
        name: 'arte',
        label: 'Tipo de Arte do Carimbo',
        type: 'enum',
        default: 'texto_icone',
        options: [
          { value: 'texto_icone', label: 'Ícone + Texto / Nome' },
          { value: 'forma', label: 'Apenas Forma da Galeria' },
          { value: 'texto', label: 'Apenas Palavra / Iniciais' },
          { value: 'svg', label: 'Enviar Desenho SVG / Logo' },
        ],
        group: 'Formato e Conteúdo',
      },
      {
        name: 'forma',
        label: 'Ícone da Galeria',
        type: 'shape',
        default: 'coroa',
        visibleIf: 'arte=forma|texto_icone',
        group: 'Formato e Conteúdo',
      },
      {
        name: 'texto',
        label: 'Texto do Carimbo',
        type: 'string',
        default: 'FEITO À MÃO',
        maxLength: 18,
        visibleIf: 'arte=texto|texto_icone',
        group: 'Formato e Conteúdo',
      },
      {
        name: 'fonte',
        label: 'Fonte',
        type: 'font',
        default: 'Lilita One',
        visibleIf: 'arte=texto|texto_icone',
        group: 'Formato e Conteúdo',
      },
      {
        name: 'desenho_svg',
        label: 'Seu Logo SVG ou Imagem',
        type: 'svg',
        default: '',
        visibleIf: 'arte=svg',
        group: 'Formato e Conteúdo',
      },
      {
        name: 'espelhar',
        label: 'Espelhar Arte (Para Carimbar Legível na Massa)',
        type: 'boolean',
        default: false,
        group: 'Formato e Conteúdo',
      },
      {
        name: 'borda_marcadora',
        label: 'Anel / Moldura Externa em Relevo',
        type: 'boolean',
        default: true,
        group: 'Estrutura e Cabo (Handle)',
      },
      {
        name: 'tamanho',
        label: 'Diâmetro / Largura do Carimbo (mm)',
        type: 'number',
        default: 60,
        min: 32,
        max: 120,
        step: 2,
        group: 'Estrutura e Cabo (Handle)',
      },
      {
        name: 'espessura_base',
        label: 'Espessura da Placa Base (mm)',
        type: 'number',
        default: 5.0,
        min: 4.0,
        max: 8.0,
        step: 0.5,
        group: 'Estrutura e Cabo (Handle)',
      },
      {
        name: 'altura_relevo',
        label: 'Profundidade de Marcação / Relevo (mm)',
        type: 'number',
        default: 2.6,
        min: 1.5,
        max: 5.0,
        step: 0.2,
        group: 'Estrutura e Cabo (Handle)',
      },
      {
        name: 'incluir_cabo',
        label: 'Gerar 2ª Peça: Cabo / Handle de Encaixe',
        type: 'boolean',
        default: true,
        group: 'Estrutura e Cabo (Handle)',
      },
      {
        name: 'posicao_cabo',
        label: 'Disposição do Cabo na Mesa 3D',
        type: 'enum',
        default: 'ao_lado',
        options: [
          { value: 'ao_lado', label: 'Ao Lado da Placa (Pronto p/ Fatiar sem Suporte)' },
          { value: 'encaixado', label: 'Encaixado no Verso (Visualização Montada)' },
        ],
        visibleIf: 'incluir_cabo=true',
        group: 'Estrutura e Cabo (Handle)',
      },
      {
        name: 'folga_encaixe',
        label: 'Folga do Encaixe Cabo-Placa (mm)',
        type: 'number',
        default: 0.2,
        min: 0.1,
        max: 0.45,
        step: 0.05,
        visibleIf: 'incluir_cabo=true',
        group: 'Estrutura e Cabo (Handle)',
      },
      {
        name: 'cor_base',
        label: 'Cor da Placa e Cabo',
        type: 'color',
        default: '#f97316',
        previewOnly: true,
      },
      {
        name: 'cor_relevo',
        label: 'Cor da Face Marcadora (Relevo)',
        type: 'color',
        default: '#ffffff',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'base', label: 'Placa Base do Carimbo', colorParam: 'cor_base' },
      { name: 'relevo', label: 'Face Marcadora em Relevo', colorParam: 'cor_relevo' },
      { name: 'cabo', label: 'Cabo / Handle de Encaixe', colorParam: 'cor_base' },
    ],
  },

  async generate(params) {
    const formatoBase = String(params.formato_base || 'circulo');
    const arte = String(params.arte || 'texto_icone');
    const forma = String(params.forma || 'coroa');
    const texto = String(params.texto || 'FEITO À MÃO').trim() || 'ARTESANAL';
    const fonte = String(params.fonte || 'Lilita One');
    const desenhoSvg = String(params.desenho_svg || '');
    const espelhar = Boolean(params.espelhar ?? false);
    const bordaMarcadora = Boolean(params.borda_marcadora ?? true);
    const tamanho = Number(params.tamanho || 60);
    const espBase = Math.max(4.0, Number(params.espessura_base || 5.0));
    const altRelevo = Number(params.altura_relevo || 2.6);
    const incluirCabo = Boolean(params.incluir_cabo ?? true);
    const posicaoCabo = String(params.posicao_cabo || 'ao_lado');
    const folgaEncaixe = Number(params.folga_encaixe ?? 0.2);
    const corBase = String(params.cor_base || '#f97316');
    const corRelevo = String(params.cor_relevo || '#ffffff');

    // 1. Constrói a arte 2D centralizada
    let artPolys: Polygons2D = [];

    if (arte === 'texto_icone') {
      const iconPolys = shapeGalleryToPolygons(forma, tamanho * 0.38);
      const txtPolys = await textToPolygons(texto, fonte, tamanho * 0.115);
      const placedIcon = translatePolygons(iconPolys, 0, tamanho * 0.11);
      const placedTxt = translatePolygons(txtPolys, 0, -tamanho * 0.18);
      artPolys = unionPolygons(placedIcon, placedTxt);
    } else if (arte === 'texto') {
      artPolys = await textToPolygons(texto, fonte, tamanho * 0.24);
    } else if (arte === 'svg' && desenhoSvg.includes('<')) {
      artPolys = svgToPolygons(desenhoSvg, tamanho * 0.68);
    } else {
      artPolys = shapeGalleryToPolygons(forma, tamanho * 0.64);
    }

    if (espelhar) {
      artPolys = scalePolygons(artPolys, -1, 1);
    }

    // 2. Constrói a placa base limpa (sem "orelhas" laterais!)
    let plate2D: Polygons2D = [];
    if (formatoBase === 'quadrado') {
      plate2D = roundedRectPolygon(tamanho, tamanho, tamanho * 0.16, 0, 0, 16);
    } else if (formatoBase === 'hexagono') {
      plate2D = shapeGalleryToPolygons('hexagono', tamanho);
    } else if (formatoBase === 'contorno') {
      plate2D = offsetPolygons(artPolys, 6.0, 'round');
    } else {
      plate2D = circlePolygon(tamanho * 0.5, 0, 0, 72);
    }

    const bPlate = getBounds2D(plate2D);

    // 3. Cavidade sextavada fêmea no verso da placa (Z = 0 .. socketDepth) para encaixe firme do Handle
    const socketNominalFlat = Math.min(15.0, Math.max(11.0, tamanho * 0.25));
    const socketDepth = Math.min(2.8, espBase - 1.8);
    const socketFemale2D = hexSocketPolygon(socketNominalFlat + folgaEncaixe * 2, 0, 0);

    const plateWithSocket2D = subtractPolygons(plate2D, socketFemale2D);
    const bottomSocketLayerGeom = extrudePolygons(plateWithSocket2D, {
      height: socketDepth,
      zOffset: 0,
    });
    const topSolidLayerGeom = extrudePolygons(plate2D, {
      height: espBase - socketDepth,
      zOffset: socketDepth,
    });
    let baseGeom = mergeGeometries([bottomSocketLayerGeom, topSolidLayerGeom]);

    // 4. Relevo marcador (com base chanfrada mais larga na raiz para não quebrar letras finas na massa)
    let stampFace2D = artPolys;
    if (bordaMarcadora) {
      const outerRim = offsetPolygons(plate2D, -1.6, 'round');
      const innerRim = offsetPolygons(plate2D, -3.4, 'round');
      const frameRing = subtractPolygons(outerRim, innerRim);
      stampFace2D = unionPolygons(stampFace2D, frameRing);
    }

    const rootReinforced2D = offsetPolygons(stampFace2D, 0.35, 'round');
    const rootH = altRelevo * 0.35;
    const tipH = altRelevo * 0.65;

    const reliefRootGeom = extrudePolygons(rootReinforced2D, {
      height: rootH,
      zOffset: espBase,
    });
    const reliefTipGeom = extrudePolygons(stampFace2D, {
      height: tipH,
      zOffset: espBase + rootH,
    });
    let relevoGeom = mergeGeometries([reliefRootGeom, reliefTipGeom]);

    const parts: GeneratedPartMesh[] = [];

    if (incluirCabo) {
      const knobDiam = Math.min(34, Math.max(24, tamanho * 0.52));
      const rawHandleGeom = buildStampHandleGeometry(
        knobDiam,
        socketNominalFlat,
        socketDepth - 0.2
      );

      let caboGeom: THREE.BufferGeometry;
      if (posicaoCabo === 'encaixado') {
        // Eleva a placa para Z = 22mm e posiciona o cabo encaixado embaixo (Z = 0..22+socketDepth)
        const liftZ = 22.0;
        baseGeom = transformGeometry(baseGeom, { translate: [0, 0, liftZ] });
        relevoGeom = transformGeometry(relevoGeom, { translate: [0, 0, liftZ] });
        caboGeom = rawHandleGeom;
      } else {
        // Posiciona a placa e o cabo lado a lado apoiados em Z = 0 (prontos para imprimir sem suporte!)
        const offsetPlateX = -(knobDiam * 0.5 + 8);
        const offsetHandleX = bPlate.width * 0.5 + 8;
        baseGeom = transformGeometry(baseGeom, { translate: [offsetPlateX, 0, 0] });
        relevoGeom = transformGeometry(relevoGeom, { translate: [offsetPlateX, 0, 0] });
        caboGeom = transformGeometry(rawHandleGeom, { translate: [offsetHandleX, 0, 0] });
      }

      parts.push(
        {
          name: 'base',
          label: 'Placa do Carimbo (c/ Encaixe Fêmea)',
          geometry: baseGeom,
          color: corBase,
        },
        {
          name: 'relevo',
          label: 'Face Marcadora em Alto-Relevo',
          geometry: relevoGeom,
          color: corRelevo,
        },
        {
          name: 'cabo',
          label: 'Cabo / Handle de Encaixe (2ª Peça)',
          geometry: caboGeom,
          color: corBase,
        }
      );
    } else {
      parts.push(
        {
          name: 'base',
          label: 'Placa do Carimbo',
          geometry: baseGeom,
          color: corBase,
        },
        {
          name: 'relevo',
          label: 'Face Marcadora em Alto-Relevo',
          geometry: relevoGeom,
          color: corRelevo,
        }
      );
    }

    return {
      parts,
      fichaTecnica: {
        title: 'Especificações do Carimbo Marcador + Handle',
        items: [
          { label: 'Dimensão da Placa', value: `${bPlate.width.toFixed(1)} × ${bPlate.height.toFixed(1)} mm` },
          { label: 'Profundidade do Relevo', value: `${altRelevo.toFixed(1)} mm` },
          {
            label: 'Sistema de Encaixe',
            value: incluirCabo ? `Sextavado ${socketNominalFlat.toFixed(1)} mm (Folga ${folgaEncaixe} mm)` : 'Apenas Placa',
          },
          { label: 'Orientação', value: espelhar ? 'Espelhado (Pronto p/ Carimbar)' : 'Leitura Direta' },
        ],
      },
    };
  },
};
