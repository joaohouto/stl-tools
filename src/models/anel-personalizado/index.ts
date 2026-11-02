import * as THREE from 'three';
import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  Polygons2D,
  getBounds2D,
  translatePolygons,
  subtractPolygons,
  roundedRectPolygon,
  textToPolygons,
  shapeGalleryToPolygons,
  svgToPolygons,
  extrudePolygons,
  mergeGeometries,
  transformGeometry,
} from '@/engine/cad';

export const AROS_BRASIL: Record<string, number> = {
  '10': 15.2,
  '11': 15.4,
  '12': 15.6,
  '13': 15.8,
  '14': 16.0,
  '15': 16.2,
  '16': 16.5,
  '17': 16.8,
  '18': 17.2,
  '19': 17.5,
  '20': 17.8,
  '21': 18.2,
  '22': 18.5,
  '23': 18.8,
  '24': 19.2,
  '25': 19.5,
  '26': 19.8,
  '27': 20.2,
  '28': 20.5,
  '29': 20.8,
  '30': 21.2,
  '31': 21.5,
  '32': 21.8,
  '33': 22.2,
  '34': 22.5,
  '35': 22.8,
};

/**
 * Constrói a malha 3D anatômica 100% fechada (manifold, sem costuras abertas, non-indexed)
 * de um Anel Selo ou Aliança Comfort-Fit.
 */
function buildRingBodyGeometry(
  innerRadius: number,
  baseWidth: number,
  wallThickness: number,
  style: 'anel_selo' | 'alianca',
  recessTopBy = 0
): { geometry: THREE.BufferGeometry; topY: number; mesaWidthX: number; mesaDepthZ: number } {
  const numTheta = 96;
  const numZ = 24;

  const halfWidth = baseWidth / 2;
  const mesaFullY =
    style === 'anel_selo'
      ? innerRadius + wallThickness * 1.85
      : innerRadius + wallThickness * 1.18;
  const capY = mesaFullY - recessTopBy;

  const mesaWidthX =
    style === 'anel_selo' ? innerRadius * 1.08 : innerRadius * 0.78;
  const mesaDepthZ =
    style === 'anel_selo' ? baseWidth * 1.05 : baseWidth * 0.82;

  const outerPts: [number, number, number][][] = [];
  const innerPts: [number, number, number][][] = [];

  for (let t = 0; t < numTheta; t++) {
    const fracT = t / numTheta;
    const angle = fracT * Math.PI * 2 - Math.PI / 2;
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);
    const topFactor = Math.max(0, sinA);

    let currentHalfWidth = halfWidth;
    let currentThickness = wallThickness;

    if (style === 'anel_selo') {
      currentHalfWidth = halfWidth * (0.68 + 0.48 * Math.pow(topFactor, 1.5));
      currentThickness = wallThickness * (0.85 + 1.15 * Math.pow(topFactor, 1.7));
    } else {
      // Aliança com leve platô superior para receber gravação nítida
      currentThickness = wallThickness * (1.0 + 0.18 * Math.pow(topFactor, 3.0));
    }

    outerPts[t] = [];
    innerPts[t] = [];

    for (let zIdx = 0; zIdx <= numZ; zIdx++) {
      const u = (zIdx / numZ) * 2 - 1;
      const zPos = u * currentHalfWidth;

      const crown = (1 - u * u) * (currentThickness * 0.36);
      const rOut = innerRadius + currentThickness * 0.64 + crown;

      const comfortChamfer = Math.pow(u, 4) * 0.24;
      const rIn = innerRadius + comfortChamfer;

      const xOut = cosA * rOut;
      let yOut = sinA * rOut;

      // Nivela o topo para formar a mesa plana de gravação (ou base da cavidade do baixo-relevo)
      if (topFactor > 0.75 && yOut > capY) {
        yOut = capY;
      }

      const xIn = cosA * rIn;
      const yIn = sinA * rIn;

      outerPts[t][zIdx] = [xOut, yOut, zPos];
      innerPts[t][zIdx] = [xIn, yIn, zPos];
    }
  }

  const positions: number[] = [];
  const normals: number[] = [];

  const pushTri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number]
  ) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-10) return;
    nx /= len;
    ny /= len;
    nz /= len;
    positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  };

  for (let t = 0; t < numTheta; t++) {
    const nextT = (t + 1) % numTheta; // Costura fechada exata 100% manifold!
    for (let z = 0; z < numZ; z++) {
      const nextZ = z + 1;

      // Face externa (normal apontando para fora)
      const oA = outerPts[t][z];
      const oB = outerPts[nextT][z];
      const oC = outerPts[nextT][nextZ];
      const oD = outerPts[t][nextZ];
      pushTri(oA, oD, oC);
      pushTri(oA, oC, oB);

      // Face interna (normal apontando para o centro do dedo)
      const iA = innerPts[t][z];
      const iB = innerPts[nextT][z];
      const iC = innerPts[nextT][nextZ];
      const iD = innerPts[t][nextZ];
      pushTri(iA, iB, iC);
      pushTri(iA, iC, iD);
    }

    // Borda lateral em zIdx = 0 (normal apontando para -Z)
    pushTri(outerPts[t][0], outerPts[nextT][0], innerPts[nextT][0]);
    pushTri(outerPts[t][0], innerPts[nextT][0], innerPts[t][0]);

    // Borda lateral em zIdx = numZ (normal apontando para +Z)
    pushTri(outerPts[t][numZ], innerPts[nextT][numZ], outerPts[nextT][numZ]);
    pushTri(outerPts[t][numZ], innerPts[t][numZ], innerPts[nextT][numZ]);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

  return { geometry: geom, topY: mesaFullY, mesaWidthX, mesaDepthZ };
}

export const anelPersonalizadoModule: ProductModule = {
  schema: {
    id: 'anel-personalizado',
    name: 'Anel Personalizado (Aros Brasil 10 a 35)',
    shortDescription:
      'Anel anatômico paramétrico com medidas oficiais brasileiras (Aro 10 ao 35). Estilos Anel Selo ou Aliança com monograma, ícone ou entalhe.',
    description:
      'Anéis e alianças de joalheria gerados com diâmetro interno exato pela norma ABNT NBR 16058. Perfil abaulado anatômico com chanfro comfort-fit, opção de Anel Selo com mesa superior e gravação personalizada em alto ou baixo-relevo.',
    categories: ['acessorios', 'chaveiros'],
    featured: true,
    free: true,
    creditCost: 1,
    addedAt: '2026-10-29',
    params: [
      {
        name: 'aro',
        label: 'Aro do Dedo (Tabela Brasileira)',
        type: 'enum',
        default: '18',
        options: Object.entries(AROS_BRASIL).map(([aro, diam]) => ({
          value: aro,
          label: `Aro ${aro} (Ø ${diam.toFixed(2)} mm)`,
        })),
        group: 'Medidas do Dedo',
      },
      {
        name: 'estilo',
        label: 'Estilo do Anel',
        type: 'enum',
        default: 'anel_selo',
        options: [
          { value: 'anel_selo', label: 'Anel Selo (Signet Ring com Mesa Superior)' },
          { value: 'alianca', label: 'Aliança Anatômica (Abaulada Comfort-Fit)' },
        ],
        group: 'Design do Anel',
      },
      {
        name: 'largura_banda',
        label: 'Largura da Banda (mm)',
        type: 'number',
        default: 8,
        min: 4,
        max: 16,
        step: 0.5,
        group: 'Design do Anel',
      },
      {
        name: 'espessura_parede',
        label: 'Espessura da Parede (mm)',
        type: 'number',
        default: 2.0,
        min: 1.4,
        max: 3.5,
        step: 0.1,
        group: 'Design do Anel',
      },
      {
        name: 'tipo_conteudo',
        label: 'Tipo de Gravação',
        type: 'enum',
        default: 'iniciais',
        options: [
          { value: 'iniciais', label: 'Iniciais / Monograma / Texto' },
          { value: 'icone', label: 'Ícone da Galeria' },
          { value: 'svg', label: 'Enviar SVG / Brasão' },
          { value: 'liso', label: 'Sem Gravação (Anel Liso)' },
        ],
        group: 'Gravação / Personalização',
      },
      {
        name: 'texto',
        label: 'Texto / Iniciais (1 a 4 letras)',
        type: 'string',
        default: 'J',
        maxLength: 6,
        visibleIf: 'tipo_conteudo=iniciais',
        group: 'Gravação / Personalização',
      },
      {
        name: 'fonte',
        label: 'Fonte',
        type: 'font',
        default: 'Montserrat',
        visibleIf: 'tipo_conteudo=iniciais',
        group: 'Gravação / Personalização',
      },
      {
        name: 'icone',
        label: 'Ícone da Galeria',
        type: 'shape',
        default: 'escudo',
        visibleIf: 'tipo_conteudo=icone',
        group: 'Gravação / Personalização',
      },
      {
        name: 'icone_svg',
        label: 'Seu SVG / Brasão',
        type: 'svg',
        default: '',
        visibleIf: 'tipo_conteudo=svg',
        group: 'Gravação / Personalização',
      },
      {
        name: 'modo_relevo',
        label: 'Modo do Relevo',
        type: 'enum',
        default: 'baixo_relevo',
        options: [
          { value: 'baixo_relevo', label: 'Baixo-Relevo (Entalhado / Negativo)' },
          { value: 'alto_relevo', label: 'Alto-Relevo (Sobressalente)' },
        ],
        visibleIf: 'tipo_conteudo!=liso',
        group: 'Gravação / Personalização',
      },
      {
        name: 'profundidade_relevo',
        label: 'Profundidade / Altura do Detalhe (mm)',
        type: 'number',
        default: 0.8,
        min: 0.4,
        max: 1.6,
        step: 0.1,
        visibleIf: 'tipo_conteudo!=liso',
        group: 'Gravação / Personalização',
      },
      {
        name: 'cor_anel',
        label: 'Cor do Anel',
        type: 'color',
        default: '#f97316',
        previewOnly: true,
      },
      {
        name: 'cor_detalhe',
        label: 'Cor do Detalhe / Infill',
        type: 'color',
        default: '#ffffff',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'anel', label: 'Corpo do Anel', colorParam: 'cor_anel' },
      { name: 'detalhe', label: 'Gravação / Monograma', colorParam: 'cor_detalhe' },
    ],
  },

  async generate(params) {
    const aroKey = String(params.aro || '18');
    const diametroInterno = AROS_BRASIL[aroKey] || 17.2;
    const raioInterno = diametroInterno / 2;
    const estilo = String(params.estilo || 'anel_selo') as 'anel_selo' | 'alianca';
    const larguraBanda = Number(params.largura_banda || 8);
    const espessura = Number(params.espessura_parede || 2.0);
    const tipoConteudo = String(params.tipo_conteudo || 'iniciais');
    const texto = String(params.texto || 'J');
    const fonte = String(params.fonte || 'Montserrat');
    const icone = String(params.icone || 'escudo');
    const iconeSvg = String(params.icone_svg || '');
    const modoRelevo = String(params.modo_relevo || 'baixo_relevo');
    const profundidade = Math.min(Number(params.profundidade_relevo || 0.8), espessura * 0.65);
    const corAnel = String(params.cor_anel || '#f97316');
    const corDetalhe = String(params.cor_detalhe || '#ffffff');

    const isBaixoRelevo = tipoConteudo !== 'liso' && modoRelevo === 'baixo_relevo';

    // 1. Gera o corpo 3D do anel com costura fechada e ombros 100% suaves
    const recessBy = isBaixoRelevo ? profundidade * 0.75 : 0;
    const {
      geometry: rawRingGeom,
      topY: yMesa,
      mesaWidthX,
      mesaDepthZ,
    } = buildRingBodyGeometry(
      raioInterno,
      larguraBanda,
      espessura,
      estilo,
      recessBy
    );

    let ringBodyGeom = rawRingGeom;
    let detalheGeom: THREE.BufferGeometry = new THREE.BufferGeometry();

    if (tipoConteudo !== 'liso') {
      const maxArtDim = Math.min(mesaWidthX * 0.65, mesaDepthZ * 0.75);
      let fgPolys: Polygons2D = [];

      if (tipoConteudo === 'iniciais' && texto.trim()) {
        fgPolys = await textToPolygons(texto.trim(), fonte, maxArtDim);
      } else if (tipoConteudo === 'icone') {
        fgPolys = shapeGalleryToPolygons(icone, maxArtDim);
      } else if (tipoConteudo === 'svg' && iconeSvg.includes('<')) {
        fgPolys = svgToPolygons(iconeSvg, maxArtDim);
      }

      if (fgPolys.length > 0) {
        const fgB = getBounds2D(fgPolys);
        fgPolys = translatePolygons(fgPolys, -fgB.centerX, -fgB.centerY);

        if (isBaixoRelevo) {
          // Camada superior da mesa do anel com entalhe recortado (bezel moldura)
          const bezel2D = roundedRectPolygon(
            mesaWidthX * 0.85,
            mesaDepthZ * 0.88,
            Math.min(mesaWidthX, mesaDepthZ) * 0.34,
            0,
            0,
            24
          );
          const carvedBezel2D = subtractPolygons(bezel2D, fgPolys);
          const bezelBaseY = yMesa - recessBy;
          const bezelTopH = recessBy + 0.2;
          const rawCarvedBezelGeom = extrudePolygons(carvedBezel2D, {
            height: bezelTopH,
            zOffset: 0,
          });
          const placedCarvedBezel = transformGeometry(rawCarvedBezelGeom, {
            rotateDeg: [-90, 0, 180],
            translate: [0, bezelBaseY, 0],
          });
          ringBodyGeom = mergeGeometries([ringBodyGeom, placedCarvedBezel]);

          // Infill da gravação contrastante assentado no fundo da cavidade
          const infillH = Math.max(0.4, recessBy * 0.55);
          const rawInfillGeom = extrudePolygons(fgPolys, {
            height: infillH,
            zOffset: 0,
          });
          detalheGeom = transformGeometry(rawInfillGeom, {
            rotateDeg: [-90, 0, 180],
            translate: [0, bezelBaseY, 0],
          });
        } else {
          // Alto-relevo clássico projetando para fora da mesa do anel
          const rawReliefGeom = extrudePolygons(fgPolys, {
            height: profundidade + 0.25,
            zOffset: 0,
          });
          detalheGeom = transformGeometry(rawReliefGeom, {
            rotateDeg: [-90, 0, 180],
            translate: [0, yMesa - 0.15, 0],
          });
        }
      }
    }

    // Posiciona o anel apoiado na mesa Z >= 0 com a face gravada voltada para a frente (-Y)
    const halfW = larguraBanda * 0.52;
    ringBodyGeom = transformGeometry(ringBodyGeom, {
      rotateDeg: [0, 0, 180],
      translate: [0, 0, halfW],
    });
    if (detalheGeom.getAttribute('position')) {
      detalheGeom = transformGeometry(detalheGeom, {
        rotateDeg: [0, 0, 180],
        translate: [0, 0, halfW],
      });
    }

    const parts: GeneratedPartMesh[] = [
      {
        name: 'anel',
        label: estilo === 'anel_selo' ? 'Corpo do Anel Selo' : 'Aliança Anatômica',
        geometry: ringBodyGeom,
        color: corAnel,
      },
    ];

    if (detalheGeom.getAttribute('position')) {
      parts.push({
        name: 'detalhe',
        label: modoRelevo === 'baixo_relevo' ? 'Entalhe / Infill' : 'Gravação em Relevo',
        geometry: detalheGeom,
        color: corDetalhe,
      });
    }

    return {
      parts,
      fichaTecnica: {
        title: 'Especificações Técnicas de Joalheria',
        items: [
          { label: 'Padrão / Norma', value: `Brasil (ABNT NBR 16058) — Aro ${aroKey}` },
          { label: 'Diâmetro Interno', value: `${diametroInterno.toFixed(2)} mm` },
          { label: 'Largura da Banda', value: `${larguraBanda.toFixed(1)} mm` },
          { label: 'Espessura da Parede', value: `${espessura.toFixed(1)} mm` },
          {
            label: 'Perfil / Acabamento',
            value: estilo === 'anel_selo' ? 'Anel Selo com Mesa Lapidada' : 'Aliança Abaulada Comfort-Fit',
          },
          {
            label: 'Gravação',
            value:
              tipoConteudo === 'liso'
                ? 'Liso / Polido'
                : modoRelevo === 'baixo_relevo'
                ? 'Baixo-Relevo (Entalhe Negativo)'
                : 'Alto-Relevo Sobressalente',
          },
        ],
      },
    };
  },
};
