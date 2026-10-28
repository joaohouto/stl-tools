import * as THREE from 'three';
import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  Polygons2D,
  offsetPolygons,
  unionPolygons,
  subtractPolygons,
  translatePolygons,
  roundedRectPolygon,
  rectPolygon,
  textToPolygons,
  svgToPolygons,
  shapeGalleryToPolygons,
  extrudePolygons,
  extrudeProfileAlongX,
  mergeGeometries,
  transformGeometry,
} from '@/engine/cad';

export const suporteCelularMarcaModule: ProductModule = {
  schema: {
    id: 'suporte-celular-marca',
    name: 'Suporte de Celular — Sua Marca',
    shortDescription: 'Suporte de mesa personalizado com logo, nome, ajuste de ângulo, vão para capinha e passa-cabo.',
    description:
      'Gere suportes de celular personalizados com sua marca, nome ou ícone para brindes corporativos, bancadas, restaurantes ou uso próprio. Escolha entre o modelo Clássico Inclinado (imprime deitado sem suporte) ou Encaixe em X (2 chapas planas desmontáveis).',
    categories: ['suportes', 'organizacao'],
    featured: true,
    free: false,
    creditCost: 2,
    addedAt: '2026-10-28',
    badge: 'Destaque',
    params: [
      {
        name: 'estilo',
        label: 'Estilo Construtivo',
        type: 'enum',
        default: 'classico',
        options: [
          { value: 'classico', label: 'Clássico em L (Nervura Traseira)' },
          { value: 'encaixe_x', label: 'Encaixe em X (2 Peças Desmontáveis)' },
        ],
        group: 'Estrutura',
      },
      {
        name: 'texto',
        label: 'Texto / Nome da Marca',
        type: 'string',
        default: 'MINHA MARCA',
        maxLength: 20,
        group: 'Personalização',
      },
      {
        name: 'fonte',
        label: 'Fonte do Texto',
        type: 'font',
        default: 'Bebas Neue',
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
        visibleIf: 'incluir_icone=true',
        group: 'Personalização',
      },
      {
        name: 'logo_svg',
        label: 'Logo Próprio (SVG ou PNG)',
        type: 'svg',
        default: '',
        visibleIf: 'icone_fonte=svg',
        group: 'Personalização',
      },
      {
        name: 'tamanho_logo',
        label: 'Tamanho do Logo (mm)',
        type: 'number',
        default: 32,
        min: 15,
        max: 60,
        step: 1,
        visibleIf: 'incluir_icone=true',
        group: 'Personalização',
      },
      {
        name: 'relevo_mm',
        label: 'Altura do Relevo da Marca (mm)',
        type: 'number',
        default: 1.4,
        min: 0.6,
        max: 3.0,
        step: 0.2,
        group: 'Personalização',
      },
      {
        name: 'largura',
        label: 'Largura do Suporte (mm)',
        type: 'number',
        default: 72,
        min: 50,
        max: 140,
        step: 2,
        group: 'Medidas e Ergonomia',
      },
      {
        name: 'altura',
        label: 'Altura do Encosto (mm)',
        type: 'number',
        default: 98,
        min: 65,
        max: 150,
        step: 2,
        group: 'Medidas e Ergonomia',
      },
      {
        name: 'espessura',
        label: 'Espessura da Estrutura (mm)',
        type: 'number',
        default: 5.5,
        min: 4,
        max: 9,
        step: 0.5,
        group: 'Medidas e Ergonomia',
      },
      {
        name: 'angulo',
        label: 'Inclinação da Tela (graus)',
        type: 'number',
        default: 26,
        min: 15,
        max: 40,
        step: 1,
        group: 'Medidas e Ergonomia',
      },
      {
        name: 'vao',
        label: 'Vão do Celular c/ Capinha (mm)',
        type: 'number',
        default: 14,
        min: 9,
        max: 22,
        step: 0.5,
        group: 'Medidas e Ergonomia',
      },
      {
        name: 'aba',
        label: 'Aba Frontal de Retenção (mm)',
        type: 'number',
        default: 15,
        min: 8,
        max: 26,
        step: 1,
        group: 'Medidas e Ergonomia',
      },
      {
        name: 'furo_cabo',
        label: 'Abertura Frontal p/ Cabo Carregador',
        type: 'boolean',
        default: true,
        group: 'Medidas e Ergonomia',
      },
      {
        name: 'folga',
        label: 'Folga de Encaixe X (mm)',
        type: 'number',
        default: 0.25,
        min: 0.1,
        max: 0.5,
        step: 0.05,
        visibleIf: 'estilo=encaixe_x',
        group: 'Medidas e Ergonomia',
      },
      {
        name: 'disposicao',
        label: 'Visualização na Mesa',
        type: 'enum',
        default: 'montado',
        options: [
          { value: 'montado', label: 'Em Pé (Montado)' },
          { value: 'impressao', label: 'Posição de Impressão (Sem Suporte)' },
        ],
        group: 'Visualização',
      },
      {
        name: 'cor_corpo',
        label: 'Cor do Suporte',
        type: 'color',
        default: '#1e293b',
        previewOnly: true,
      },
      {
        name: 'cor_marca',
        label: 'Cor do Logo / Texto',
        type: 'color',
        default: '#16d8aa',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'corpo', label: 'Corpo do Suporte', colorParam: 'cor_corpo' },
      { name: 'marca', label: 'Logo e Texto em Relevo', colorParam: 'cor_marca' },
    ],
  },

  async generate(params) {
    const estilo = String(params.estilo || 'classico');
    const texto = String(params.texto ?? 'MINHA MARCA');
    const fonte = String(params.fonte || 'Bebas Neue');
    const alturaTexto = Number(params.altura_texto || 9);
    const incluirIcone = Boolean(params.incluir_icone ?? true);
    const iconeFonte = String(params.icone_fonte || 'galeria');
    const formaIcone = String(params.forma_icone || 'coroa');
    const logoSvg = String(params.logo_svg || '');
    const tamanhoLogo = Number(params.tamanho_logo || 32);
    const relevoMm = Number(params.relevo_mm || 1.4);

    const largura = Number(params.largura || 72);
    const altura = Number(params.altura || 98);
    const espessura = Number(params.espessura || 5.5);
    const angulo = Number(params.angulo || 26);
    const vao = Number(params.vao || 14);
    const aba = Number(params.aba || 15);
    const furoCabo = Boolean(params.furo_cabo ?? true);
    const folga = Number(params.folga || 0.25);
    const disposicao = String(params.disposicao || 'montado');

    const corCorpo = String(params.cor_corpo || '#1e293b');
    const corMarca = String(params.cor_marca || '#16d8aa');

    // Build 2D artwork (text + optional logo) in local backrest plane
    const artPolysList: Polygons2D[] = [];
    if (texto.trim()) {
      const tPoly = await textToPolygons(texto, fonte, alturaTexto);
      const yPos = incluirIcone ? -tamanhoLogo * 0.58 : 0;
      artPolysList.push(translatePolygons(tPoly, 0, yPos));
    }

    if (incluirIcone) {
      const iconPoly =
        iconeFonte === 'svg' && logoSvg.includes('<')
          ? svgToPolygons(logoSvg, tamanhoLogo)
          : shapeGalleryToPolygons(formaIcone, tamanhoLogo);
      const yPos = texto.trim() ? alturaTexto * 0.75 : 0;
      artPolysList.push(translatePolygons(iconPoly, 0, yPos));
    }

    const combinedArt2D = unionPolygons(...artPolysList);

    if (estilo === 'encaixe_x') {
      // Two interlocking flat plates with slot cut
      const plateW = largura * 0.48;
      const plateH = altura;
      let plate2D = roundedRectPolygon(plateW, plateH, 5, 0, 0);

      // Front cradle hook cutout on top/bottom
      const hookCut = rectPolygon(vao, aba, -plateW * 0.22, -plateH * 0.5 + aba * 0.5 + espessura);
      plate2D = subtractPolygons(plate2D, hookCut);

      // Half-lap X slot
      const slotW = espessura + folga;
      const slotH = plateH * 0.52;
      const plateLeft2D = subtractPolygons(
        plate2D,
        rectPolygon(slotW, slotH, 0, plateH * 0.25)
      );
      const plateRight2D = subtractPolygons(
        plate2D,
        rectPolygon(slotW, slotH, 0, -plateH * 0.25)
      );

      const spacing = plateW + 8;
      const geomLeft = extrudePolygons(translatePolygons(plateLeft2D, -spacing * 0.5, 0), {
        height: espessura,
        zOffset: 0,
      });
      const geomRight = extrudePolygons(translatePolygons(plateRight2D, spacing * 0.5, 0), {
        height: espessura,
        zOffset: 0,
      });

      const corpoGeom = mergeGeometries([geomLeft, geomRight]);

      const parts: GeneratedPartMesh[] = [
        { name: 'corpo', label: 'Chapas do Suporte (Par)', geometry: corpoGeom, color: corCorpo },
      ];

      if (combinedArt2D.length > 0) {
        const scaledArt = translatePolygons(combinedArt2D, -spacing * 0.5, plateH * 0.12);
        const marcaGeom = extrudePolygons(scaledArt, {
          height: relevoMm,
          zOffset: espessura,
        });
        parts.push({
          name: 'marca',
          label: 'Logo / Texto em Relevo',
          geometry: marcaGeom,
          color: corMarca,
        });
      }

      return { parts };
    }

    // Classic L-Stand with Rear Support Triangle & Front Lip
    const rad = (angulo * Math.PI) / 180;
    const sinA = Math.sin(rad);
    const cosA = Math.cos(rad);

    const baseLen = Math.max(68, altura * sinA + vao + espessura * 2 + 16);
    const frontY = -baseLen * 0.45;
    const rearY = baseLen * 0.55;

    // Cradle & backrest coordinates in YZ profile plane
    const lipFrontY = frontY;
    const lipBackY = lipFrontY + espessura;
    const troughBackY = lipBackY + vao;
    const shelfZ = espessura + 6; // elevated shelf so charger cable can bend underneath
    const topY = troughBackY + altura * sinA;
    const topZ = shelfZ + altura * cosA;

    // Outer profile in YZ plane (x = Y_world, y = Z_world)
    const outerProfile: Polygons2D = [
      [
        [lipFrontY, 0],
        [rearY, 0],
        [rearY, espessura],
        [topY + espessura * cosA, topZ - espessura * sinA],
        [topY, topZ],
        [troughBackY, shelfZ],
        [lipBackY, shelfZ],
        [lipBackY, shelfZ + aba],
        [lipFrontY, shelfZ + aba],
      ],
    ];

    // Hollow inner triangle in rear support for sleek look and fast printing
    const holeMargin = espessura * 1.45;
    const innerTri: Polygons2D = [
      [
        [troughBackY + holeMargin * 1.3, espessura],
        [rearY - holeMargin * 1.6, espessura],
        [topY + espessura * cosA - holeMargin * 0.8, topZ - holeMargin * 2.2],
      ],
    ];

    const smoothedOuter = offsetPolygons(
      offsetPolygons(outerProfile, -1.2, 'round'),
      1.2,
      'round'
    );
    const smoothedHole = offsetPolygons(innerTri, -1.8, 'round');
    const finalProfileYZ = subtractPolygons(smoothedOuter, smoothedHole);

    let corpoGeom = extrudeProfileAlongX(finalProfileYZ, largura);

    // Optional front cable pass-through slot in the lip/cradle
    if (furoCabo) {
      // Split front lip in the center (18mm gap for USB-C plug & finger access)
      const gapW = 18;
      const sideW = Math.max(12, (largura - gapW) * 0.5);
      // Rebuild front lip as two side wings while keeping backrest continuous
      const mainNoLipProfile: Polygons2D = [
        [
          [troughBackY - 2, 0],
          [rearY, 0],
          [rearY, espessura],
          [topY + espessura * cosA, topZ - espessura * sinA],
          [topY, topZ],
          [troughBackY, shelfZ],
          [troughBackY - 2, shelfZ],
        ],
      ];
      const backWithHole = subtractPolygons(
        offsetPolygons(offsetPolygons(mainNoLipProfile, -1.0, 'round'), 1.0, 'round'),
        smoothedHole
      );
      const backBodyGeom = extrudeProfileAlongX(backWithHole, largura);

      const cradleWingProfile: Polygons2D = [
        [
          [lipFrontY, 0],
          [troughBackY + espessura, 0],
          [troughBackY + espessura, shelfZ],
          [lipBackY, shelfZ],
          [lipBackY, shelfZ + aba],
          [lipFrontY, shelfZ + aba],
        ],
      ];
      const roundedWing = offsetPolygons(
        offsetPolygons(cradleWingProfile, -1.0, 'round'),
        1.0,
        'round'
      );
      const wingGeom = extrudeProfileAlongX(roundedWing, sideW);
      const wingLeft = transformGeometry(wingGeom, {
        translate: [-(gapW * 0.5 + sideW * 0.5), 0, 0],
      });
      const wingRight = transformGeometry(wingGeom, {
        translate: [gapW * 0.5 + sideW * 0.5, 0, 0],
      });
      corpoGeom = mergeGeometries([backBodyGeom, wingLeft, wingRight]);
    }

    // Position the 3D embossed Logo + Text onto the inclined backrest face
    let marcaGeom = new THREE.BufferGeometry();
    if (combinedArt2D.length > 0) {
      const rawMarca = extrudePolygons(combinedArt2D, {
        height: relevoMm + 0.4,
        zOffset: -0.4,
      });

      const midLen = altura * 0.52;
      const faceCenterY = troughBackY + midLen * sinA;
      const faceCenterZ = shelfZ + midLen * cosA;

      // Rotate so local +Z normal points perpendicular to the backrest face (towards -Y, +Z)
      const tiltDeg = 90 - angulo;
      marcaGeom = transformGeometry(rawMarca, {
        rotateDeg: [tiltDeg, 0, 0],
        translate: [0, faceCenterY, faceCenterZ],
      });
    }

    // Optional print orientation (laid on its side at X=0 -> Z=0 so 0 supports needed)
    if (disposicao === 'impressao') {
      corpoGeom = transformGeometry(corpoGeom, {
        rotateDeg: [0, 90, 0],
        translate: [0, 0, largura * 0.5],
      });
      if (marcaGeom.getAttribute('position')) {
        marcaGeom = transformGeometry(marcaGeom, {
          rotateDeg: [0, 90, 0],
          translate: [0, 0, largura * 0.5],
        });
      }
    }

    const parts: GeneratedPartMesh[] = [
      { name: 'corpo', label: 'Corpo do Suporte', geometry: corpoGeom, color: corCorpo },
    ];

    if (marcaGeom.getAttribute('position')?.count > 0) {
      parts.push({
        name: 'marca',
        label: 'Logo / Marca em Relevo',
        geometry: marcaGeom,
        color: corMarca,
      });
    }

    return {
      parts,
      fichaTecnica: {
        title: 'Ficha Técnica do Suporte',
        items: [
          { label: 'Largura Total', value: `${largura} mm` },
          { label: 'Profundidade da Base', value: `${baseLen.toFixed(0)} mm` },
          { label: 'Vão p/ Capinha', value: `${vao} mm` },
          { label: 'Ângulo de Visão', value: `${angulo}°` },
        ],
      },
    };
  },
};
