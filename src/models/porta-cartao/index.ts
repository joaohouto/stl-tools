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
  roundedRectPolygon,
  roundedPolygonFromVertices,
  circlePolygon,
  textToPolygons,
  shapeGalleryToPolygons,
  svgToPolygons,
  qrToPolygons,
  extrudePolygons,
  mergeGeometries,
} from '@/engine/cad';

/**
 * Constrói a aba integrada estilo tático/moderno (como nas fotos de referência)
 * com furo oblongo (passador de cordão/mosquetão) ou circular (argola).
 */
function buildTacticalLanyardTab(
  outerW: number,
  outerH: number,
  posicao: 'topo' | 'esquerda' | 'direita',
  formatoFuro: 'oblongo' | 'redondo',
  diametroFuro: number
): { tabSolid: Polygons2D; tabHole: Polygons2D } {
  const protrude = 6.8;

  if (posicao === 'topo') {
    const yBase = outerH * 0.5 - 2.0;
    const yTip = outerH * 0.5 + protrude;
    const earPts: Point2D[] = [
      [-19, yBase],
      [19, yBase],
      [9.5, yTip],
      [-9.5, yTip],
    ];
    const tabSolid = roundedPolygonFromVertices(earPts, 3.2);
    const holeY = outerH * 0.5 + protrude * 0.42;
    const tabHole =
      formatoFuro === 'oblongo'
        ? roundedRectPolygon(11.0, Math.min(4.2, diametroFuro), 1.9, 0, holeY, 12)
        : circlePolygon(diametroFuro * 0.5, 0, holeY, 36);
    return { tabSolid, tabHole };
  }

  const isLeft = posicao === 'esquerda';
  const s = isLeft ? -1 : 1;
  const xBase = s * (outerW * 0.5 - 2.0);
  const xTip = s * (outerW * 0.5 + protrude);
  const earPts: Point2D[] = isLeft
    ? [
        [xBase, 16],
        [xBase, -16],
        [xTip, -8.5],
        [xTip, 8.5],
      ]
    : [
        [xBase, -16],
        [xBase, 16],
        [xTip, 8.5],
        [xTip, -8.5],
      ];
  const tabSolid = roundedPolygonFromVertices(earPts, 3.0);
  const holeX = s * (outerW * 0.5 + protrude * 0.42);
  const tabHole =
    formatoFuro === 'oblongo'
      ? roundedRectPolygon(Math.min(4.2, diametroFuro), 10.5, 1.9, holeX, 0, 12)
      : circlePolygon(diametroFuro * 0.5, holeX, 0, 36);
  return { tabSolid, tabHole };
}

export const portaCartaoModule: ProductModule = {
  schema: {
    id: 'porta-cartao',
    name: 'Keycard Holder / Porta-Crachá & Cartão Rígido',
    shortDescription:
      'Suporte rígido estilo tático/moderno para cartão padrão (CR80 / Crachá / RFID) com travas anguladas, aba p/ cordão e fundo personalizado.',
    description:
      'Case rígido de encaixe rápido para cartões convencionais (85.6 × 54 mm — crachá corporativo, bilhete único, cartão de acesso RFID ou bancário). Possui abas frontais chanfradas que seguram o cartão com firmeza, janela traseira opcional para empurrar com o polegar, suporte de argola/mosquetão no topo ou na lateral e personalização de texto/logo no fundo.',
    categories: ['acessorios', 'chaveiros', 'organizacao'],
    featured: true,
    free: true,
    creditCost: 1,
    addedAt: '2026-10-31',
    badge: 'Novo',
    params: [
      {
        name: 'posicao_argola',
        label: 'Posição da Aba / Argola (Cordão ou Chaveiro)',
        type: 'enum',
        default: 'topo',
        options: [
          { value: 'topo', label: 'No Topo (Horizontal / Paisagem)' },
          { value: 'esquerda', label: 'Na Lateral Esquerda (Vertical / Retrato)' },
          { value: 'direita', label: 'Na Lateral Direita (Vertical / Retrato)' },
          { value: 'sem_argola', label: 'Sem Aba (Case de Bolso Limpo)' },
        ],
        group: 'Estrutura e Argola',
      },
      {
        name: 'formato_furo',
        label: 'Formato do Furo de Fixação',
        type: 'enum',
        default: 'oblongo',
        options: [
          { value: 'oblongo', label: 'Oblongo / Passador (Mosquetão e Cordão)' },
          { value: 'redondo', label: 'Circular (Argola de Chaveiro)' },
        ],
        visibleIf: 'posicao_argola!=sem_argola',
        group: 'Estrutura e Argola',
      },
      {
        name: 'furo_diam',
        label: 'Abertura do Furo (mm)',
        type: 'number',
        default: 4.0,
        min: 3.0,
        max: 6.0,
        step: 0.2,
        visibleIf: 'posicao_argola!=sem_argola',
        group: 'Estrutura e Argola',
      },
      {
        name: 'recorte_dedo',
        label: 'Janela Traseira p/ Empurrar o Cartão (Polegar)',
        type: 'boolean',
        default: true,
        group: 'Estrutura e Argola',
      },
      {
        name: 'capacidade',
        label: 'Capacidade de Cartões',
        type: 'enum',
        default: '1_cartao',
        options: [
          { value: '1_cartao', label: '1 Cartão Padrão (Folga Calibrada 1.3mm)' },
          { value: '2_cartoes', label: 'Até 2 Cartões (Folga Dupla 2.2mm)' },
        ],
        group: 'Estrutura e Argola',
      },
      {
        name: 'folga_cartao',
        label: 'Folga Lateral do Cartão (mm)',
        type: 'number',
        default: 0.6,
        min: 0.2,
        max: 1.5,
        step: 0.1,
        helpText: 'Cartão ISO CR80 oficial mede 85.6 × 54.0 mm',
        group: 'Estrutura e Argola',
      },
      {
        name: 'tipo_fundo',
        label: 'Personalização no Fundo do Porta-Cartão',
        type: 'enum',
        default: 'texto_icone',
        options: [
          { value: 'texto_icone', label: 'Texto + Ícone / Logo' },
          { value: 'apenas_texto', label: 'Apenas Texto / Nome / Cargo' },
          { value: 'apenas_icone', label: 'Apenas Logo / Ícone / SVG' },
          { value: 'qrcode', label: 'QR Code (Contato / Pix / Crachá)' },
          { value: 'liso', label: 'Fundo Liso (Sem Gravação)' },
        ],
        group: 'Personalização do Fundo',
      },
      {
        name: 'texto',
        label: 'Texto / Nome no Fundo',
        type: 'string',
        default: 'STAFF',
        maxLength: 28,
        visibleIf: 'tipo_fundo=texto_icone|apenas_texto',
        group: 'Personalização do Fundo',
      },
      {
        name: 'fonte',
        label: 'Fonte do Texto',
        type: 'font',
        default: 'Montserrat',
        visibleIf: 'tipo_fundo=texto_icone|apenas_texto',
        group: 'Personalização do Fundo',
      },
      {
        name: 'altura_texto',
        label: 'Altura das Letras (mm)',
        type: 'number',
        default: 9,
        min: 5,
        max: 18,
        step: 0.5,
        visibleIf: 'tipo_fundo=texto_icone|apenas_texto',
        group: 'Personalização do Fundo',
      },
      {
        name: 'origem_icone',
        label: 'Origem do Ícone / Logo',
        type: 'enum',
        default: 'galeria',
        options: [
          { value: 'galeria', label: 'Galeria de Formas' },
          { value: 'svg', label: 'Enviar SVG / Logo Próprio' },
        ],
        visibleIf: 'tipo_fundo=texto_icone|apenas_icone',
        group: 'Personalização do Fundo',
      },
      {
        name: 'icone',
        label: 'Ícone da Galeria',
        type: 'shape',
        default: 'escudo',
        visibleIf: 'tipo_fundo=texto_icone|apenas_icone&origem_icone=galeria',
        group: 'Personalização do Fundo',
      },
      {
        name: 'icone_svg',
        label: 'Seu SVG / Logo',
        type: 'svg',
        default: '',
        visibleIf: 'tipo_fundo=texto_icone|apenas_icone&origem_icone=svg',
        group: 'Personalização do Fundo',
      },
      {
        name: 'qr_conteudo',
        label: 'Link ou Texto do QR Code',
        type: 'string',
        default: 'https://stltools.com.br',
        maxLength: 120,
        visibleIf: 'tipo_fundo=qrcode',
        group: 'Personalização do Fundo',
      },
      {
        name: 'modo_relevo',
        label: 'Modo de Gravação no Fundo',
        type: 'enum',
        default: 'baixo_relevo',
        options: [
          { value: 'baixo_relevo', label: 'Baixo-Relevo (Entalhado no Fundo)' },
          { value: 'alto_relevo', label: 'Alto-Relevo Internamente (0.6mm)' },
        ],
        visibleIf: 'tipo_fundo!=liso',
        group: 'Personalização do Fundo',
      },
      {
        name: 'cor_base',
        label: 'Cor do Porta-Cartão',
        type: 'color',
        default: '#f97316',
        previewOnly: true,
      },
      {
        name: 'cor_relevo',
        label: 'Cor do Detalhe / Texto no Fundo',
        type: 'color',
        default: '#ffffff',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'corpo', label: 'Estrutura do Keycard Holder', colorParam: 'cor_base' },
      { name: 'detalhe', label: 'Personalização do Fundo', colorParam: 'cor_relevo' },
    ],
  },

  async generate(params) {
    const posicaoArgola = String(params.posicao_argola || 'topo');
    const formatoFuro = (params.formato_furo || 'oblongo') as 'oblongo' | 'redondo';
    const furoDiam = Number(params.furo_diam || 4.0);
    const recorteDedo = Boolean(params.recorte_dedo ?? true);
    const capacidade = String(params.capacidade || '1_cartao');
    const folgaCartao = Number(params.folga_cartao ?? 0.6);
    const tipoFundo = String(params.tipo_fundo || 'texto_icone');
    const texto = String(params.texto || 'STAFF').trim();
    const fonte = String(params.fonte || 'Montserrat');
    const alturaTexto = Number(params.altura_texto || 9);
    const origemIcone = String(params.origem_icone || 'galeria');
    const icone = String(params.icone || 'escudo');
    const iconeSvg = String(params.icone_svg || '');
    const qrConteudo = String(params.qr_conteudo || 'https://stltools.com.br').trim() || 'https://stltools.com.br';
    const modoRelevo = String(params.modo_relevo || 'baixo_relevo');
    const corBase = String(params.cor_base || '#f97316');
    const corRelevo = String(params.cor_relevo || '#ffffff');

    // Medidas oficiais ISO/IEC 7810 ID-1 (CR80): 85.60 × 53.98 mm
    const pocketW = 85.6 + folgaCartao;
    const pocketH = 54.0 + folgaCartao;
    const wall = 2.6;
    const outerW = pocketW + wall * 2;
    const outerH = pocketH + wall * 2;

    const espFundo = 2.0;
    const altCanal = capacidade === '2_cartoes' ? 2.2 : 1.35;
    const espTrava = 1.2;

    // 1. Silhueta externa com aba integrada p/ cordão/argola (exatamente no estilo da foto de referência)
    let outerBody2D = roundedRectPolygon(outerW, outerH, 3.8, 0, 0, 16);
    if (posicaoArgola === 'topo' || posicaoArgola === 'esquerda' || posicaoArgola === 'direita') {
      const { tabSolid, tabHole } = buildTacticalLanyardTab(
        outerW,
        outerH,
        posicaoArgola,
        formatoFuro,
        furoDiam
      );
      outerBody2D = subtractPolygons(unionPolygons(outerBody2D, tabSolid), tabHole);
    }

    // 2. Janela oblonga p/ empurrar o cartão com o polegar (deslocada à esquerda como na foto de referência)
    const thumbHoleX = -pocketW * 0.22;
    const thumbHole2D = recorteDedo
      ? roundedRectPolygon(22, 11.5, 5.75, thumbHoleX, 0, 20)
      : [];

    // 3. Arte de personalização no fundo (posicionada na metade direita se houver recorte de dedo, ou centralizada)
    const artCenterX = recorteDedo ? pocketW * 0.17 : 0;
    const maxArtW = recorteDedo ? pocketW * 0.48 : pocketW * 0.78;
    let artPolys: Polygons2D = [];

    const fitW = (polys: Polygons2D, limitW: number): Polygons2D => {
      const b = getBounds2D(polys);
      if (b.width > limitW && b.width > 0) {
        const s = limitW / b.width;
        return scalePolygons(polys, s, s);
      }
      return polys;
    };

    if (tipoFundo !== 'liso') {
      if (tipoFundo === 'qrcode') {
        const qrSize = Math.min(34, pocketH * 0.66);
        artPolys = translatePolygons(qrToPolygons(qrConteudo, qrSize), artCenterX, 0);
      } else if (tipoFundo === 'apenas_icone') {
        const iconSize = 24;
        let rawIcon =
          origemIcone === 'svg' && iconeSvg.includes('<')
            ? svgToPolygons(iconeSvg, iconSize)
            : shapeGalleryToPolygons(icone, iconSize);
        rawIcon = fitW(rawIcon, maxArtW);
        artPolys = translatePolygons(rawIcon, artCenterX, 0);
      } else if (tipoFundo === 'apenas_texto' && texto) {
        let rawT = await textToPolygons(texto, fonte, alturaTexto);
        rawT = fitW(rawT, maxArtW);
        artPolys = translatePolygons(rawT, artCenterX, 0);
      } else if (tipoFundo === 'texto_icone') {
        const iconSize = 18;
        let rawIcon =
          origemIcone === 'svg' && iconeSvg.includes('<')
            ? svgToPolygons(iconeSvg, iconSize)
            : shapeGalleryToPolygons(icone, iconSize);
        rawIcon = fitW(rawIcon, maxArtW);
        const placedIcon = translatePolygons(rawIcon, artCenterX, texto ? 7.0 : 0);
        if (texto) {
          let rawT = await textToPolygons(texto, fonte, alturaTexto);
          rawT = fitW(rawT, maxArtW);
          const placedT = translatePolygons(rawT, artCenterX, -8.5);
          artPolys = unionPolygons(placedIcon, placedT);
        } else {
          artPolys = placedIcon;
        }
      }
    }

    // Garante que a arte não invada a janela do polegar
    if (thumbHole2D.length > 0 && artPolys.length > 0) {
      artPolys = subtractPolygons(artPolys, offsetPolygons(thumbHole2D, 1.5, 'round'));
    }

    // 4. Camada do fundo (Z = 0 .. espFundo)
    let backplateBase2D = thumbHole2D.length > 0 ? subtractPolygons(outerBody2D, thumbHole2D) : outerBody2D;
    let floorGeoms: THREE.BufferGeometry[] = [];
    let detalheGeom = new THREE.BufferGeometry();

    if (artPolys.length > 0) {
      if (modoRelevo === 'baixo_relevo') {
        const cavDepth = 0.8;
        const bottomSolidGeom = extrudePolygons(backplateBase2D, {
          height: espFundo - cavDepth,
          zOffset: 0,
        });
        const topCarved2D = subtractPolygons(backplateBase2D, artPolys);
        const topCarvedGeom = extrudePolygons(topCarved2D, {
          height: cavDepth,
          zOffset: espFundo - cavDepth,
        });
        floorGeoms.push(bottomSolidGeom, topCarvedGeom);

        detalheGeom = extrudePolygons(artPolys, {
          height: 0.35,
          zOffset: espFundo - cavDepth,
        });
      } else {
        floorGeoms.push(extrudePolygons(backplateBase2D, { height: espFundo, zOffset: 0 }));
        detalheGeom = extrudePolygons(artPolys, {
          height: 0.5,
          zOffset: espFundo,
        });
      }
    } else {
      floorGeoms.push(extrudePolygons(backplateBase2D, { height: espFundo, zOffset: 0 }));
    }

    // 5. Paredes laterais do berço do cartão (Z = espFundo .. espFundo + altCanal)
    const cardPocket2D = roundedRectPolygon(pocketW, pocketH, 2.2, 0, 0, 14);
    const channelWalls2D = subtractPolygons(outerBody2D, cardPocket2D);
    const channelWallsGeom = extrudePolygons(channelWalls2D, {
      height: altCanal,
      zOffset: espFundo,
    });

    // 6. Moldura frontal de retenção com recortes geométricos chanfrados a 45° (exatamente como nas fotos anexadas!)
    //    - Abas superior e inferior avançam 4.4mm para dentro no centro e chanfram a 45° nas extremidades
    //    - Aba direita avança nos cantos e tem entalhe chanfrado no centro
    //    - Borda esquerda fica livre (sem aba interna) para permitir inserção e retirada fácil do cartão
    const halfPW = pocketW * 0.5;
    const halfPH = pocketH * 0.5;
    const lipHold = 4.4;
    const rightHold = 3.2;

    const frontWindowPts: Point2D[] = [
      // Topo: da esquerda p/ direita com o avanço trapezoidal central
      [-halfPW, halfPH],
      [-23, halfPH],
      [-17, halfPH - lipHold],
      [17, halfPH - lipHold],
      [23, halfPH],
      [halfPW - rightHold, halfPH],
      // Direita: de cima p/ baixo com o recorte chanfrado central
      [halfPW - rightHold, 11],
      [halfPW - 0.8, 6.5],
      [halfPW - 0.8, -6.5],
      [halfPW - rightHold, -11],
      [halfPW - rightHold, -halfPH],
      // Base: da direita p/ esquerda com o avanço trapezoidal central
      [23, -halfPH],
      [17, -halfPH + lipHold],
      [-17, -halfPH + lipHold],
      [-23, -halfPH],
      [-halfPW, -halfPH],
    ];
    const frontWindow2D = roundedPolygonFromVertices(frontWindowPts, 1.4);
    const frontRetainer2D = subtractPolygons(outerBody2D, frontWindow2D);
    const frontRetainerGeom = extrudePolygons(frontRetainer2D, {
      height: espTrava,
      zOffset: espFundo + altCanal,
    });

    const corpoGeom = mergeGeometries([...floorGeoms, channelWallsGeom, frontRetainerGeom]);
    const finalBounds = getBounds2D(outerBody2D);
    const totalHeightZ = espFundo + altCanal + espTrava;

    const parts: GeneratedPartMesh[] = [
      {
        name: 'corpo',
        label: 'Keycard Holder',
        geometry: corpoGeom,
        color: corBase,
      },
    ];

    if (detalheGeom.getAttribute('position')?.count > 0) {
      parts.push({
        name: 'detalhe',
        label: modoRelevo === 'baixo_relevo' ? 'Entalhe / Infill no Fundo' : 'Gravação no Fundo',
        geometry: detalheGeom,
        color: corRelevo,
      });
    }

    return {
      parts,
      fichaTecnica: {
        title: 'Medidas do Keycard Holder (Padrão CR80)',
        items: [
          {
            label: 'Dimensões Externas',
            value: `${finalBounds.width.toFixed(1)} × ${finalBounds.height.toFixed(1)} × ${totalHeightZ.toFixed(1)} mm`,
          },
          {
            label: 'Berço Interno do Cartão',
            value: `${pocketW.toFixed(1)} × ${pocketH.toFixed(1)} mm`,
          },
          {
            label: 'Capacidade',
            value: capacidade === '2_cartoes' ? 'Até 2 Cartões (2.2 mm)' : '1 Cartão Padrão (1.35 mm)',
          },
          {
            label: 'Fixação',
            value:
              posicaoArgola === 'sem_argola'
                ? 'Sem Aba (Bolso)'
                : `${posicaoArgola.toUpperCase()} (${formatoFuro === 'oblongo' ? 'Mosquetão/Cordão' : 'Argola'})`,
          },
        ],
      },
    };
  },
};
