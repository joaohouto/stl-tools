import * as THREE from 'three';
import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  Point2D,
  Polygons2D,
  unionPolygons,
  subtractPolygons,
  translatePolygons,
  scalePolygons,
  getBounds2D,
  roundedRectPolygon,
  textToPolygons,
  svgToPolygons,
  shapeGalleryToPolygons,
  extrudePolygons,
  extrudeProfileAlongX,
  mergeGeometries,
  normalizePolygons,
} from '@/engine/cad';

interface CornerFilletData {
  tIn: Point2D;
  tOut: Point2D;
  center: Point2D;
  effR: number;
  a1: number;
  diff: number;
}

/**
 * Calcula os pontos de tangência exatos e o arco circular para um vértice interno `pCurr`
 * entre `pPrev` e `pNext`.
 */
function computeCornerFillet(
  pPrev: Point2D,
  pCurr: Point2D,
  pNext: Point2D,
  radius: number
): CornerFilletData {
  const v1x = pPrev[0] - pCurr[0];
  const v1y = pPrev[1] - pCurr[1];
  const v2x = pNext[0] - pCurr[0];
  const v2y = pNext[1] - pCurr[1];
  const len1 = Math.hypot(v1x, v1y) || 1;
  const len2 = Math.hypot(v2x, v2y) || 1;

  const u1x = v1x / len1;
  const u1y = v1y / len1;
  const u2x = v2x / len2;
  const u2y = v2y / len2;

  const dot = Math.max(-0.999, Math.min(0.999, u1x * u2x + u1y * u2y));
  const angle = Math.acos(dot);
  const halfAngle = angle * 0.5;
  const tanHalf = Math.tan(halfAngle) || 1e-4;

  const maxTanDist = Math.min(len1 * 0.45, len2 * 0.45);
  const tanDist = Math.min(radius / tanHalf, maxTanDist);
  const effR = tanDist * tanHalf;

  const tIn: Point2D = [pCurr[0] + u1x * tanDist, pCurr[1] + u1y * tanDist];
  const tOut: Point2D = [pCurr[0] + u2x * tanDist, pCurr[1] + u2y * tanDist];

  const bx = u1x + u2x;
  const by = u1y + u2y;
  const bLen = Math.hypot(bx, by) || 1;
  const centerDist = effR / Math.max(1e-4, Math.sin(halfAngle));
  const cx = pCurr[0] + (bx / bLen) * centerDist;
  const cy = pCurr[1] + (by / bLen) * centerDist;

  const a1 = Math.atan2(tIn[1] - cy, tIn[0] - cx);
  const a2 = Math.atan2(tOut[1] - cy, tOut[0] - cx);
  let diff = a2 - a1;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  return {
    tIn,
    tOut,
    center: [cx, cy],
    effR,
    a1,
    diff,
  };
}

/**
 * Gera a seção anelar 2D (no plano YZ) de uma dobra cilíndrica entre `tIn` e `tOut`.
 */
function buildBendSectorYZ(
  fillet: CornerFilletData,
  thickness: number,
  arcSegments = 24
): Polygons2D {
  const halfT = thickness * 0.5;
  const rIn = Math.max(0.15, fillet.effR - halfT);
  const rOut = fillet.effR + halfT;
  const [cx, cy] = fillet.center;

  const ring: Point2D[] = [];
  for (let s = 0; s <= arcSegments; s++) {
    const ang = fillet.a1 + (fillet.diff * s) / arcSegments;
    ring.push([cx + Math.cos(ang) * rOut, cy + Math.sin(ang) * rOut]);
  }
  for (let s = arcSegments; s >= 0; s--) {
    const ang = fillet.a1 + (fillet.diff * s) / arcSegments;
    ring.push([cx + Math.cos(ang) * rIn, cy + Math.sin(ang) * rIn]);
  }

  return normalizePolygons([ring]);
}

/**
 * Gera um retângulo 2D no plano (X, S) com raios de arredondamento independentes
 * na borda inicial (`s = sStart`, `rStart`) e na borda final (`s = sStart + length`, `rEnd`).
 */
function halfRoundedRectPolygon(
  width: number,
  length: number,
  rStart: number,
  rEnd: number,
  cx = 0,
  sStart = 0,
  segments = 16
): Polygons2D {
  const xMin = cx - width * 0.5;
  const xMax = cx + width * 0.5;
  const sMin = sStart;
  const sMax = sStart + length;

  const r0 = Math.max(0, Math.min(rStart, width * 0.48, length * 0.48));
  const r1 = Math.max(0, Math.min(rEnd, width * 0.48, length * 0.48));

  const ring: Point2D[] = [];

  // 1. Canto inferior direito (xMax, sMin)
  if (r0 > 1e-3) {
    const cX = xMax - r0;
    const cS = sMin + r0;
    for (let i = 0; i <= segments; i++) {
      const ang = -Math.PI * 0.5 + (Math.PI * 0.5 * i) / segments;
      ring.push([cX + Math.cos(ang) * r0, cS + Math.sin(ang) * r0]);
    }
  } else {
    ring.push([xMax, sMin]);
  }

  // 2. Canto superior direito (xMax, sMax)
  if (r1 > 1e-3) {
    const cX = xMax - r1;
    const cS = sMax - r1;
    for (let i = 0; i <= segments; i++) {
      const ang = (Math.PI * 0.5 * i) / segments;
      ring.push([cX + Math.cos(ang) * r1, cS + Math.sin(ang) * r1]);
    }
  } else {
    ring.push([xMax, sMax]);
  }

  // 3. Canto superior esquerdo (xMin, sMax)
  if (r1 > 1e-3) {
    const cX = xMin + r1;
    const cS = sMax - r1;
    for (let i = 0; i <= segments; i++) {
      const ang = Math.PI * 0.5 + (Math.PI * 0.5 * i) / segments;
      ring.push([cX + Math.cos(ang) * r1, cS + Math.sin(ang) * r1]);
    }
  } else {
    ring.push([xMin, sMax]);
  }

  // 4. Canto inferior esquerdo (xMin, sMin)
  if (r0 > 1e-3) {
    const cX = xMin + r0;
    const cS = sMin + r0;
    for (let i = 0; i <= segments; i++) {
      const ang = Math.PI + (Math.PI * 0.5 * i) / segments;
      ring.push([cX + Math.cos(ang) * r0, cS + Math.sin(ang) * r0]);
    }
  } else {
    ring.push([xMin, sMin]);
  }

  return normalizePolygons([ring]);
}

/**
 * Extruda um polígono 2D definido no sistema local (X, S) do segmento reto `pStart -> pEnd`
 * e posiciona no espaço 3D (X, Y, Z) mantendo a base ortonormal destra.
 */
function extrudePlateOnSegment(
  polysXS: Polygons2D,
  pStart: Point2D,
  pEnd: Point2D,
  nOffset: number,
  nHeight: number
): THREE.BufferGeometry {
  const geom = extrudePolygons(polysXS, { height: nHeight, zOffset: nOffset });
  const dy = pEnd[0] - pStart[0];
  const dz = pEnd[1] - pStart[1];
  const len = Math.hypot(dy, dz) || 1;
  const uy = dy / len;
  const uz = dz / len;
  const ny = -uz;
  const nz = uy;

  const pos = geom.getAttribute('position') as THREE.BufferAttribute;
  const norm = geom.getAttribute('normal') as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vs = pos.getY(i);
    const vn = pos.getZ(i);

    const worldX = vx;
    const worldY = pStart[0] + uy * vs + ny * vn;
    const worldZ = pStart[1] + uz * vs + nz * vn;
    pos.setXYZ(i, worldX, worldY, worldZ);

    const nx = norm.getX(i);
    const ns = norm.getY(i);
    const nn = norm.getZ(i);
    norm.setXYZ(i, nx, uy * ns + ny * nn, uz * ns + nz * nn);
  }

  pos.needsUpdate = true;
  norm.needsUpdate = true;
  return geom;
}

export const suporteCelularMarcaModule: ProductModule = {
  schema: {
    id: 'suporte-celular-marca',
    name: 'Suporte de Celular Flutuante — Sua Marca',
    shortDescription:
      'Suporte minimalista flutuante em V invertido com berço suspenso, passagem de cabo USB-C e marca em alto ou baixo-relevo.',
    description:
      'Design moderno flutuante tipo cantilever: o berço frontal fica suspenso acima da base com abertura central arredondada para o cabo carregador, ganchos frontais com cantos suavizados e janela traseira passa-fio. Personalize o encosto com texto, ícone ou seu logo SVG em alto ou baixo-relevo.',
    categories: ['suportes', 'organizacao'],
    featured: true,
    free: false,
    creditCost: 2,
    addedAt: '2026-10-28',
    badge: 'Design Flutuante',
    params: [
      {
        name: 'texto',
        label: 'Texto / Nome da Marca (Aceita 2 Linhas)',
        type: 'string',
        default: 'STLTOOLS',
        maxLength: 55,
        group: 'Personalização',
      },
      {
        name: 'fonte',
        label: 'Fonte do Texto',
        type: 'font',
        default: 'Montserrat',
        group: 'Personalização',
      },
      {
        name: 'altura_texto',
        label: 'Altura das Letras (mm)',
        type: 'number',
        default: 9,
        min: 5,
        max: 18,
        step: 0.5,
        group: 'Personalização',
      },
      {
        name: 'incluir_icone',
        label: 'Incluir Logo / Ícone no Encosto',
        type: 'boolean',
        default: true,
        group: 'Personalização',
      },
      {
        name: 'icone_fonte',
        label: 'Origem do Logo',
        type: 'enum',
        default: 'galeria',
        options: [
          { value: 'galeria', label: 'Ícone da Galeria' },
          { value: 'svg', label: 'Enviar SVG / Imagem Própria' },
        ],
        visibleIf: 'incluir_icone=true',
        group: 'Personalização',
      },
      {
        name: 'forma_icone',
        label: 'Ícone da Galeria',
        type: 'shape',
        default: 'coroa',
        visibleIf: 'incluir_icone=true&icone_fonte=galeria',
        group: 'Personalização',
      },
      {
        name: 'logo_svg',
        label: 'Logo Próprio (SVG ou PNG)',
        type: 'svg',
        default: '',
        visibleIf: 'incluir_icone=true&icone_fonte=svg',
        group: 'Personalização',
      },
      {
        name: 'tamanho_logo',
        label: 'Tamanho do Logo (mm)',
        type: 'number',
        default: 26,
        min: 14,
        max: 48,
        step: 2,
        visibleIf: 'incluir_icone=true',
        group: 'Personalização',
      },
      {
        name: 'modo_relevo',
        label: 'Modo de Gravação da Marca',
        type: 'enum',
        default: 'baixo_relevo',
        options: [
          { value: 'alto_relevo', label: 'Alto-Relevo (Sobressalente)' },
          { value: 'baixo_relevo', label: 'Baixo-Relevo (Entalhado no Encosto)' },
        ],
        group: 'Personalização',
      },
      {
        name: 'relevo_marca',
        label: 'Altura / Profundidade do Relevo (mm)',
        type: 'number',
        default: 1.2,
        min: 0.6,
        max: 2.2,
        step: 0.2,
        group: 'Personalização',
      },
      {
        name: 'largura',
        label: 'Largura do Suporte (mm)',
        type: 'number',
        default: 68,
        min: 52,
        max: 110,
        step: 2,
        group: 'Dimensões e Ergonomia',
      },
      {
        name: 'altura_encosto',
        label: 'Altura Total do Suporte (mm)',
        type: 'number',
        default: 92,
        min: 75,
        max: 130,
        step: 2,
        group: 'Dimensões e Ergonomia',
      },
      {
        name: 'angulo_visao',
        label: 'Ângulo de Inclinação da Tela (°)',
        type: 'number',
        default: 64,
        min: 55,
        max: 74,
        step: 1,
        group: 'Dimensões e Ergonomia',
      },
      {
        name: 'abertura_capa',
        label: 'Espessura do Celular c/ Capinha (mm)',
        type: 'number',
        default: 14,
        min: 10,
        max: 22,
        step: 0.5,
        group: 'Dimensões e Ergonomia',
      },
      {
        name: 'altura_gancho',
        label: 'Altura do Gancho Frontal (mm)',
        type: 'number',
        default: 16,
        min: 9,
        max: 28,
        step: 1,
        group: 'Dimensões e Ergonomia',
      },
      {
        name: 'espessura_parede',
        label: 'Espessura da Estrutura (mm)',
        type: 'number',
        default: 5.2,
        min: 4.0,
        max: 7.5,
        step: 0.2,
        group: 'Dimensões e Ergonomia',
      },
      {
        name: 'passa_fio',
        label: 'Janela Traseira e Abertura p/ Cabo Carregador',
        type: 'boolean',
        default: true,
        group: 'Dimensões e Ergonomia',
      },
      {
        name: 'cor_corpo',
        label: 'Cor do Suporte',
        type: 'color',
        default: '#f97316',
        previewOnly: true,
      },
      {
        name: 'cor_marca',
        label: 'Cor da Marca / Logo',
        type: 'color',
        default: '#ffffff',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'corpo', label: 'Corpo Flutuante do Suporte', colorParam: 'cor_corpo' },
      { name: 'marca', label: 'Logo e Texto Personalizado', colorParam: 'cor_marca' },
    ],
  },

  async generate(params) {
    const texto = String(params.texto ?? 'STLTOOLS');
    const fonte = String(params.fonte || 'Montserrat');
    const alturaTexto = Number(params.altura_texto || 9);
    const incluirIcone = Boolean(params.incluir_icone ?? true);
    const iconeFonte = String(params.icone_fonte || 'galeria');
    const formaIcone = String(params.forma_icone || 'coroa');
    const logoSvg = String(params.logo_svg || '');
    const tamanhoLogo = Number(params.tamanho_logo || 26);
    const modoRelevo = String(params.modo_relevo || 'baixo_relevo');
    const relevoMarca = Number(params.relevo_marca || 1.2);
    const largura = Number(params.largura || 68);
    const alturaTotal = Number(params.altura_encosto || 92);
    const anguloVisao = Number(params.angulo_visao || 64);
    const aberturaCapa = Number(params.abertura_capa || 14);
    const alturaGancho = Number(params.altura_gancho || 16);
    const t = Number(params.espessura_parede || 5.2);
    const passaFio = Boolean(params.passa_fio ?? true);
    const corCorpo = String(params.cor_corpo || '#f97316');
    const corMarca = String(params.cor_marca || '#ffffff');

    const halfT = t * 0.5;
    const radVisao = (anguloVisao * Math.PI) / 180;
    const cosV = Math.cos(radVisao);
    const sinV = Math.sin(radVisao);

    // P3 = curva inferior do berço flutuante (suspensa acima da base)
    const zCradle = 21;
    const yCradle = -18;

    // P2 = topo do suporte (ápice do V invertido)
    const zApex = alturaTotal - halfT;
    const dyBackrest = (zApex - zCradle) / Math.tan(radVisao);
    const yApex = yCradle + dyBackrest;

    // P1 = curva traseira na base (Z = halfT para tangenciar perfeitamente Z = 0)
    const rearAngleRad = (58 * Math.PI) / 180;
    const dyRearLeg = (zApex - halfT) / Math.tan(rearAngleRad);
    const yRear = yApex + dyRearLeg;

    // P4 = curva frontal do berço (avança perpendicularmente ao encosto pela espessura do celular + parede)
    const shelfSpan = aberturaCapa + t;
    const yShelfFront = yCradle - sinV * shelfSpan;
    const zShelfFront = zCradle + cosV * shelfSpan;

    // P5 = ponta superior das abas frontais (controlada pelo slider `altura_gancho`)
    const lipLen = Math.max(9, alturaGancho);
    const yLipTip = yShelfFront + cosV * lipLen;
    const zLipTip = zShelfFront + sinV * lipLen;

    const p3: Point2D = [yCradle, zCradle];
    const p4: Point2D = [yShelfFront, zShelfFront];
    const p5: Point2D = [yLipTip, zLipTip];
    const p2: Point2D = [yApex, zApex];
    const p1: Point2D = [yRear, halfT];

    // Calcula a dobra P4 primeiro para saber a coordenada Y frontal exata do gancho
    const fillet4 = computeCornerFillet(p3, p4, p5, 3.6);
    const bend4PolyYZ = buildBendSectorYZ(fillet4, t, 24);
    const bend4Bounds = getBounds2D(bend4PolyYZ);

    // Faz o comprimento da base casar perfeitamente com a frente do gancho do celular!
    const yFootFront = Math.min(bend4Bounds.minX, yLipTip - halfT * sinV);
    const p0: Point2D = [yFootFront, halfT];

    // Calcula os fillets das dobras P1 (traseira base), P2 (topo) e P3 (fundo do berço)
    const fillet1 = computeCornerFillet(p0, p1, p2, 5.8);
    const fillet2 = computeCornerFillet(p1, p2, p3, 5.2);
    const fillet3 = computeCornerFillet(p2, p3, p4, 3.8);

    const bodyGeoms: THREE.BufferGeometry[] = [];

    // 1. Placa da Base na Mesa (P0 -> fillet1.tIn) com cantos frontais arredondados
    const baseLen = Math.max(4, fillet1.tIn[0] - p0[0]);
    const baseCornerR = Math.min(6.0, largura * 0.15, baseLen * 0.35);
    const basePolyXS = halfRoundedRectPolygon(largura, baseLen + 0.04, baseCornerR, 0, 0, 0, 18);
    bodyGeoms.push(extrudePlateOnSegment(basePolyXS, p0, fillet1.tIn, -halfT, t));

    // 2. Dobra Traseira Inferior P1 (100% contínua em toda a largura — sem degrau!)
    const bend1PolyYZ = buildBendSectorYZ(fillet1, t, 28);
    bodyGeoms.push(extrudeProfileAlongX(bend1PolyYZ, largura));

    // 3. Perna Traseira (fillet1.tOut -> fillet2.tIn) com janela passa-fio arredondada
    const rearLegLen = Math.hypot(
      fillet2.tIn[0] - fillet1.tOut[0],
      fillet2.tIn[1] - fillet1.tOut[1]
    );
    let rearLegPolyXS = halfRoundedRectPolygon(largura, rearLegLen + 0.08, 0, 0, 0, -0.04, 8);
    const slotW = passaFio ? Math.min(20, Math.max(14, largura * 0.28)) : 0;

    if (passaFio && rearLegLen > 24) {
      const holeBottomMargin = 5.5;
      const holeH = Math.min(26, Math.max(14, rearLegLen * 0.38));
      const holeCenterS = holeBottomMargin + holeH * 0.5;
      const holeCornerR = Math.min(4.8, slotW * 0.28, holeH * 0.28);
      const rearHolePoly = roundedRectPolygon(slotW, holeH, holeCornerR, 0, holeCenterS, 18);
      rearLegPolyXS = subtractPolygons(rearLegPolyXS, rearHolePoly);
    }
    bodyGeoms.push(extrudePlateOnSegment(rearLegPolyXS, fillet1.tOut, fillet2.tIn, -halfT, t));

    // 4. Dobra Superior no Ápice P2 (100% contínua em toda a largura)
    const bend2PolyYZ = buildBendSectorYZ(fillet2, t, 28);
    bodyGeoms.push(extrudeProfileAlongX(bend2PolyYZ, largura));

    // 5. Encosto Frontal (de fillet3.tIn subindo até fillet2.tOut para que +S aponte p/ cima e +N aponte p/ frente)
    const backrestLen = Math.hypot(
      fillet2.tOut[0] - fillet3.tIn[0],
      fillet2.tOut[1] - fillet3.tIn[1]
    );
    const backrestBasePolyXS = halfRoundedRectPolygon(
      largura,
      backrestLen + 0.08,
      0,
      0,
      0,
      -0.04,
      8
    );

    // Constrói a marca 2D (texto e/ou logo) centralizada no encosto
    const brandPolysList: Polygons2D[] = [];
    const hasText = texto.trim().length > 0;
    const maxBrandW = largura - 10;

    const fitWidth = (polys: Polygons2D, maxW: number): Polygons2D => {
      const b = getBounds2D(polys);
      if (b.width > maxW && b.width > 0) {
        const s = maxW / b.width;
        return scalePolygons(polys, s, s);
      }
      return polys;
    };

    if (incluirIcone) {
      let rawIcon: Polygons2D = [];
      try {
        rawIcon =
          iconeFonte === 'svg' && logoSvg.includes('<')
            ? svgToPolygons(logoSvg, tamanhoLogo)
            : shapeGalleryToPolygons(formaIcone, tamanhoLogo);
      } catch {
        rawIcon = shapeGalleryToPolygons('coroa', tamanhoLogo);
      }
      rawIcon = fitWidth(rawIcon, maxBrandW);
      const yOffset = hasText ? backrestLen * 0.14 : 0;
      brandPolysList.push(translatePolygons(rawIcon, 0, backrestLen * 0.5 + yOffset));
    }

    if (hasText) {
      let rawText = await textToPolygons(texto, fonte, alturaTexto);
      rawText = fitWidth(rawText, maxBrandW);
      const yOffset = incluirIcone ? -backrestLen * 0.22 : 0;
      brandPolysList.push(translatePolygons(rawText, 0, backrestLen * 0.5 + yOffset));
    }

    const combinedBrandXS = unionPolygons(...brandPolysList);
    const relevoEfetivo = Math.min(relevoMarca, t * 0.42);
    let marcaGeom = new THREE.BufferGeometry();

    if (combinedBrandXS.length > 0 && modoRelevo === 'baixo_relevo') {
      // Camada traseira sólida do encosto + camada frontal entalhada com a marca
      bodyGeoms.push(
        extrudePlateOnSegment(
          backrestBasePolyXS,
          fillet3.tIn,
          fillet2.tOut,
          -halfT,
          t - relevoEfetivo
        )
      );
      const carvedFrontXS = subtractPolygons(backrestBasePolyXS, combinedBrandXS);
      bodyGeoms.push(
        extrudePlateOnSegment(
          carvedFrontXS,
          fillet3.tIn,
          fillet2.tOut,
          halfT - relevoEfetivo,
          relevoEfetivo
        )
      );

      const infillH = Math.min(0.4, relevoEfetivo * 0.4);
      marcaGeom = extrudePlateOnSegment(
        combinedBrandXS,
        fillet3.tIn,
        fillet2.tOut,
        halfT - relevoEfetivo,
        infillH
      );
    } else {
      bodyGeoms.push(
        extrudePlateOnSegment(backrestBasePolyXS, fillet3.tIn, fillet2.tOut, -halfT, t)
      );
      if (combinedBrandXS.length > 0) {
        marcaGeom = extrudePlateOnSegment(
          combinedBrandXS,
          fillet3.tIn,
          fillet2.tOut,
          halfT - 0.25,
          relevoEfetivo + 0.25
        );
      }
    }

    // 6. Dobra Inferior do Berço P3 (100% contínua em toda a largura)
    const bend3PolyYZ = buildBendSectorYZ(fillet3, t, 24);
    bodyGeoms.push(extrudeProfileAlongX(bend3PolyYZ, largura));

    // 7. Prateleira do Berço (fillet3.tOut -> fillet4.tIn) com recorte em U arredondado p/ o cabo
    const shelfLen = Math.hypot(
      fillet4.tIn[0] - fillet3.tOut[0],
      fillet4.tIn[1] - fillet3.tOut[1]
    );
    let shelfPolyXS = halfRoundedRectPolygon(largura, shelfLen + 0.08, 0, 0, 0, -0.04, 8);
    const sideW = (largura - slotW) * 0.5;

    if (passaFio && slotW > 0) {
      const bridgeMargin = Math.min(2.2, shelfLen * 0.22);
      const uCutCornerR = Math.min(4.0, slotW * 0.28, Math.max(1.5, (shelfLen - bridgeMargin) * 0.6));
      const uCutPoly = halfRoundedRectPolygon(
        slotW,
        shelfLen + 6,
        uCutCornerR,
        0,
        0,
        bridgeMargin,
        16
      );
      shelfPolyXS = subtractPolygons(shelfPolyXS, uCutPoly);
    }
    bodyGeoms.push(extrudePlateOnSegment(shelfPolyXS, fillet3.tOut, fillet4.tIn, -halfT, t));

    // 8. Dobra Frontal do Gancho P4 e Abas Frontais (fillet4.tOut -> P5) com cantos superiores arredondados
    const hookStraightLen = Math.max(
      2.5,
      Math.hypot(p5[0] - fillet4.tOut[0], p5[1] - fillet4.tOut[1])
    );

    // Para a ponta superior do gancho ficar suave no perfil lateral também, podemos arredondar os cantos superiores no plano (X, S)
    if (passaFio && slotW > 0) {
      const leftCenterX = -(slotW * 0.5 + sideW * 0.5);
      const rightCenterX = slotW * 0.5 + sideW * 0.5;

      // Dobra P4 dividida nos dois ganchos laterais
      const leftBend4 = extrudeProfileAlongX(bend4PolyYZ, sideW);
      leftBend4.translate(leftCenterX, 0, 0);
      const rightBend4 = extrudeProfileAlongX(bend4PolyYZ, sideW);
      rightBend4.translate(rightCenterX, 0, 0);
      bodyGeoms.push(leftBend4, rightBend4);

      const hookCornerR = Math.min(4.2, sideW * 0.32, hookStraightLen * 0.45);
      const leftHookXS = halfRoundedRectPolygon(
        sideW,
        hookStraightLen + 0.04,
        0,
        hookCornerR,
        leftCenterX,
        -0.04,
        16
      );
      const rightHookXS = halfRoundedRectPolygon(
        sideW,
        hookStraightLen + 0.04,
        0,
        hookCornerR,
        rightCenterX,
        -0.04,
        16
      );
      bodyGeoms.push(
        extrudePlateOnSegment(leftHookXS, fillet4.tOut, p5, -halfT, t),
        extrudePlateOnSegment(rightHookXS, fillet4.tOut, p5, -halfT, t)
      );
    } else {
      bodyGeoms.push(extrudeProfileAlongX(bend4PolyYZ, largura));
      const hookCornerR = Math.min(5.0, largura * 0.15, hookStraightLen * 0.45);
      const fullHookXS = halfRoundedRectPolygon(
        largura,
        hookStraightLen + 0.04,
        0,
        hookCornerR,
        0,
        -0.04,
        16
      );
      bodyGeoms.push(extrudePlateOnSegment(fullHookXS, fillet4.tOut, p5, -halfT, t));
    }

    const corpoGeom = mergeGeometries(bodyGeoms);

    const parts: GeneratedPartMesh[] = [
      {
        name: 'corpo',
        label: 'Corpo Flutuante do Suporte',
        geometry: corpoGeom,
        color: corCorpo,
      },
    ];

    if (marcaGeom.getAttribute('position')?.count > 0) {
      parts.push({
        name: 'marca',
        label: modoRelevo === 'baixo_relevo' ? 'Entalhe / Infill da Marca' : 'Marca em Alto-Relevo',
        geometry: marcaGeom,
        color: corMarca,
      });
    }

    const totalDepthY = yRear - yFootFront + halfT;

    return {
      parts,
      fichaTecnica: {
        title: 'Ficha Técnica do Suporte Flutuante',
        items: [
          {
            label: 'Dimensões Totais (L × P × A)',
            value: `${largura} × ${totalDepthY.toFixed(0)} × ${alturaTotal} mm`,
          },
          { label: 'Ângulo de Visão', value: `${anguloVisao}° (Ergonômico de Mesa)` },
          { label: 'Compatibilidade de Capinha', value: `Até ${aberturaCapa.toFixed(1)} mm` },
          { label: 'Altura do Gancho Frontal', value: `${alturaGancho} mm` },
          { label: 'Altura Livre p/ Cabo USB-C', value: `${zCradle} mm (Berço Flutuante)` },
          {
            label: 'Acabamento da Marca',
            value: modoRelevo === 'baixo_relevo' ? 'Baixo-Relevo Entalhado' : 'Alto-Relevo',
          },
        ],
      },
    };
  },
};
