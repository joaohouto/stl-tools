import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import * as THREE from 'three';
import {
  Polygons2D,
  offsetPolygons,
  unionPolygons,
  subtractPolygons,
  translatePolygons,
  scalePolygons,
  getBounds2D,
  roundedRectPolygon,
  circlePolygon,
  textToPolygons,
  qrToPolygons,
  extrudePolygons,
  mergeGeometries,
} from '@/engine/cad';

export const placaPersonalizadaModule: ProductModule = {
  schema: {
    id: 'placa-personalizada',
    name: 'Placa Personalizada & Display QR Code Pix/Wi-Fi',
    shortDescription: 'Plaquinhas de porta, escritório ou display de balcão com QR Code 3D escaneável e moldura.',
    description:
      'Crie plaquinhas de porta, sinalização comercial ou displays de Pix / Wi-Fi / Instagram com QR Code 3D real escaneável pela câmera do celular. Opção de furos para parafuso, fita dupla-face ou pé de apoio de balcão.',
    categories: ['placas', 'suportes'],
    featured: true,
    free: false,
    creditCost: 2,
    addedAt: '2026-10-28',
    badge: 'QR Code 3D Real',
    params: [
      {
        name: 'modo',
        label: 'Tipo de Placa',
        type: 'enum',
        default: 'placa_qr',
        options: [
          { value: 'placa_qr', label: 'Placa / Display com QR Code (Pix / Wi-Fi / Link)' },
          { value: 'placa_porta', label: 'Plaquinha de Porta / Sinalização' },
        ],
        group: 'Conteúdo',
      },
      {
        name: 'titulo',
        label: 'Título Principal',
        type: 'string',
        default: 'PAGUE COM PIX',
        maxLength: 42,
        group: 'Conteúdo',
      },
      {
        name: 'subtitulo',
        label: 'Subtítulo / Chave / Nome',
        type: 'string',
        default: 'Aponte a Camera',
        maxLength: 42,
        group: 'Conteúdo',
      },
      {
        name: 'fonte',
        label: 'Fonte do Texto',
        type: 'font',
        default: 'Bebas Neue',
        group: 'Conteúdo',
      },
      {
        name: 'qr_conteudo',
        label: 'Link, Chave Pix ou Texto do QR Code',
        type: 'string',
        default: 'https://stltools.com.br',
        maxLength: 120,
        visibleIf: 'modo=placa_qr',
        group: 'Conteúdo',
      },
      {
        name: 'largura',
        label: 'Largura da Placa (mm)',
        type: 'number',
        default: 95,
        min: 50,
        max: 220,
        step: 5,
        group: 'Dimensões e Fixação',
      },
      {
        name: 'altura',
        label: 'Altura da Placa (mm)',
        type: 'number',
        default: 115,
        min: 35,
        max: 240,
        step: 5,
        group: 'Dimensões e Fixação',
      },
      {
        name: 'espessura',
        label: 'Espessura da Placa (mm)',
        type: 'number',
        default: 3.2,
        min: 2.0,
        max: 8.0,
        step: 0.2,
        group: 'Dimensões e Fixação',
      },
      {
        name: 'modo_relevo',
        label: 'Modo do Relevo',
        type: 'enum',
        default: 'alto_relevo',
        options: [
          { value: 'alto_relevo', label: 'Alto-Relevo (Sobressalente)' },
          { value: 'baixo_relevo', label: 'Baixo-Relevo (Entalhado / Negativo)' },
        ],
        group: 'Dimensões e Fixação',
      },
      {
        name: 'relevo',
        label: 'Altura / Profundidade do Relevo (mm)',
        type: 'number',
        default: 1.2,
        min: 0.6,
        max: 2.4,
        step: 0.2,
        group: 'Dimensões e Fixação',
      },
      {
        name: 'raio_canto',
        label: 'Arredondamento dos Cantos (mm)',
        type: 'number',
        default: 8,
        min: 0,
        max: 30,
        step: 1,
        group: 'Dimensões e Fixação',
      },
      {
        name: 'moldura',
        label: 'Incluir Moldura Externa em Relevo',
        type: 'boolean',
        default: true,
        group: 'Dimensões e Fixação',
      },
      {
        name: 'fixacao',
        label: 'Tipo de Fixação',
        type: 'enum',
        default: 'lisa',
        options: [
          { value: 'lisa', label: 'Fundo Liso (Fita Dupla-Face)' },
          { value: 'furos_2', label: '2 Furos Laterais p/ Parafuso' },
          { value: 'furos_4', label: '4 Furos nos Cantos' },
        ],
        group: 'Dimensões e Fixação',
      },
      {
        name: 'cor_placa',
        label: 'Cor do Fundo da Placa',
        type: 'color',
        default: '#f97316',
        previewOnly: true,
      },
      {
        name: 'cor_relevo',
        label: 'Cor do Texto / QR Code (Alto Contraste)',
        type: 'color',
        default: '#ffffff',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'placa', label: 'Placa Base', colorParam: 'cor_placa' },
      { name: 'relevo', label: 'Texto, Moldura e QR Code', colorParam: 'cor_relevo' },
    ],
  },

  async generate(params) {
    const modo = String(params.modo || 'placa_qr');
    const titulo = String(params.titulo ?? 'PAGUE COM PIX');
    const subtitulo = String(params.subtitulo ?? 'Aponte a Camera');
    const fonte = String(params.fonte || 'Bebas Neue');
    const qrConteudo = String(params.qr_conteudo || 'https://stltools.com.br');
    const largura = Number(params.largura || 95);
    const altura = Number(params.altura || 115);
    const espessura = Number(params.espessura || 3.2);
    const modoRelevo = String(params.modo_relevo || 'alto_relevo');
    const relevo = Math.min(Number(params.relevo || 1.2), espessura - 0.8);
    const raioCanto = Number(params.raio_canto ?? 8);
    const moldura = Boolean(params.moldura ?? true);
    const fixacao = String(params.fixacao || 'lisa');
    const corPlaca = String(params.cor_placa || '#f97316');
    const corRelevo = String(params.cor_relevo || '#ffffff');

    let placa2D = roundedRectPolygon(largura, altura, raioCanto, 0, 0);

    // Optional screw holes
    const holeR = 2.2;
    const inset = Math.max(8, raioCanto * 0.85);
    if (fixacao === 'furos_2') {
      const hL = circlePolygon(holeR, -largura * 0.5 + inset, 0, 24);
      const hR = circlePolygon(holeR, largura * 0.5 - inset, 0, 24);
      placa2D = subtractPolygons(placa2D, unionPolygons(hL, hR));
    } else if (fixacao === 'furos_4') {
      const dx = largura * 0.5 - inset;
      const dy = altura * 0.5 - inset;
      const holes = unionPolygons(
        circlePolygon(holeR, -dx, dy, 24),
        circlePolygon(holeR, dx, dy, 24),
        circlePolygon(holeR, -dx, -dy, 24),
        circlePolygon(holeR, dx, -dy, 24)
      );
      placa2D = subtractPolygons(placa2D, holes);
    }

    const relevoList: Polygons2D[] = [];

    if (moldura) {
      const mOutR = Math.max(0.5, raioCanto - 1.8);
      const mInR = Math.max(0.5, raioCanto - 4.2);
      const outerBorder = roundedRectPolygon(largura - 3.6, altura - 3.6, mOutR, 0, 0);
      const innerBorder = roundedRectPolygon(largura - 8.4, altura - 8.4, mInR, 0, 0);
      relevoList.push(subtractPolygons(outerBorder, innerBorder));
    }

    const maxTextWidth = largura - (moldura ? 16 : 10);
    const fitToWidth = (polys: Polygons2D, maxW: number): Polygons2D => {
      const b = getBounds2D(polys);
      if (b.width > maxW && b.width > 0) {
        const s = maxW / b.width;
        return scalePolygons(polys, s, s);
      }
      return polys;
    };

    if (modo === 'placa_qr') {
      const qrSize = Math.min(largura, altura) * 0.54;
      const qr2D = qrToPolygons(qrConteudo, qrSize);
      relevoList.push(translatePolygons(qr2D, 0, -altura * 0.04));

      if (titulo.trim()) {
        const rawT = await textToPolygons(titulo, fonte, Math.min(12, altura * 0.1));
        const tPolys = fitToWidth(rawT, maxTextWidth);
        relevoList.push(translatePolygons(tPolys, 0, altura * 0.34));
      }
      if (subtitulo.trim()) {
        const rawS = await textToPolygons(subtitulo, fonte, Math.min(8.5, altura * 0.07));
        const sPolys = fitToWidth(rawS, maxTextWidth);
        relevoList.push(translatePolygons(sPolys, 0, -altura * 0.37));
      }
    } else {
      if (titulo.trim()) {
        const titleH = subtitulo.trim() ? altura * 0.28 : altura * 0.36;
        const rawT = await textToPolygons(titulo, fonte, Math.min(28, titleH));
        const tPolys = fitToWidth(rawT, maxTextWidth);
        const yOff = subtitulo.trim() ? -altura * 0.14 : 0;
        relevoList.push(translatePolygons(tPolys, 0, yOff));
      }
      if (subtitulo.trim()) {
        const rawS = await textToPolygons(subtitulo, fonte, Math.min(16, altura * 0.16));
        const sPolys = fitToWidth(rawS, maxTextWidth * 0.85);
        relevoList.push(translatePolygons(sPolys, 0, altura * 0.18));
      }
    }

    const combinedRelevo2D = unionPolygons(...relevoList);

    let placaGeom: THREE.BufferGeometry;
    let relevoGeom: THREE.BufferGeometry;

    if (modoRelevo === 'baixo_relevo') {
      const baseSolida = extrudePolygons(placa2D, { height: espessura - relevo, zOffset: 0 });
      const faceRecortada2D = subtractPolygons(placa2D, combinedRelevo2D);
      const faceRecortadaGeom = extrudePolygons(faceRecortada2D, {
        height: relevo,
        zOffset: espessura - relevo,
      });

      placaGeom = mergeGeometries([baseSolida, faceRecortadaGeom]);

      // Infill fino assentado no fundo da cavidade para baixo-relevo real visível
      const infillH = Math.min(0.4, relevo * 0.4);
      relevoGeom = extrudePolygons(combinedRelevo2D, {
        height: infillH,
        zOffset: espessura - relevo,
      });
    } else {
      placaGeom = extrudePolygons(placa2D, { height: espessura, zOffset: 0 });
      relevoGeom = extrudePolygons(combinedRelevo2D, {
        height: relevo,
        zOffset: espessura,
      });
    }

    const parts: GeneratedPartMesh[] = [
      { name: 'placa', label: 'Placa Base', geometry: placaGeom, color: corPlaca },
      {
        name: 'relevo',
        label: modoRelevo === 'baixo_relevo' ? 'Entalhe / Infill' : 'Relevo (Texto / QR / Moldura)',
        geometry: relevoGeom,
        color: corRelevo,
      },
    ];

    return { parts };
  },
};
