import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  Polygons2D,
  offsetPolygons,
  unionPolygons,
  subtractPolygons,
  translatePolygons,
  roundedRectPolygon,
  circlePolygon,
  textToPolygons,
  qrToPolygons,
  extrudePolygons,
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
        maxLength: 20,
        group: 'Conteúdo',
      },
      {
        name: 'subtitulo',
        label: 'Subtítulo / Chave / Nome',
        type: 'string',
        default: 'Aponte a Camera',
        maxLength: 24,
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
        name: 'relevo',
        label: 'Altura do Relevo (Texto/QR/Moldura) (mm)',
        type: 'number',
        default: 1.4,
        min: 0.8,
        max: 3.0,
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
        default: '#f8fafc',
        previewOnly: true,
      },
      {
        name: 'cor_relevo',
        label: 'Cor do Texto / QR Code (Alto Contraste)',
        type: 'color',
        default: '#0f172a',
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
    const relevo = Number(params.relevo || 1.4);
    const raioCanto = Number(params.raio_canto ?? 8);
    const moldura = Boolean(params.moldura ?? true);
    const fixacao = String(params.fixacao || 'lisa');
    const corPlaca = String(params.cor_placa || '#f8fafc');
    const corRelevo = String(params.cor_relevo || '#0f172a');

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
      const outerBorder = offsetPolygons(placa2D, -1.8, 'round');
      const innerBorder = offsetPolygons(placa2D, -4.2, 'round');
      relevoList.push(subtractPolygons(outerBorder, innerBorder));
    }

    if (modo === 'placa_qr') {
      const qrSize = Math.min(largura, altura) * 0.54;
      const qr2D = qrToPolygons(qrConteudo, qrSize);
      relevoList.push(translatePolygons(qr2D, 0, -altura * 0.04));

      if (titulo.trim()) {
        const tPolys = await textToPolygons(titulo, fonte, Math.min(12, altura * 0.1));
        relevoList.push(translatePolygons(tPolys, 0, altura * 0.34));
      }
      if (subtitulo.trim()) {
        const sPolys = await textToPolygons(subtitulo, fonte, Math.min(8.5, altura * 0.07));
        relevoList.push(translatePolygons(sPolys, 0, -altura * 0.37));
      }
    } else {
      if (titulo.trim()) {
        const titleH = subtitulo.trim() ? altura * 0.28 : altura * 0.36;
        const tPolys = await textToPolygons(titulo, fonte, Math.min(28, titleH));
        const yOff = subtitulo.trim() ? altura * 0.12 : 0;
        relevoList.push(translatePolygons(tPolys, 0, yOff));
      }
      if (subtitulo.trim()) {
        const sPolys = await textToPolygons(subtitulo, fonte, Math.min(16, altura * 0.16));
        relevoList.push(translatePolygons(sPolys, 0, -altura * 0.18));
      }
    }

    const combinedRelevo2D = unionPolygons(...relevoList);

    const placaGeom = extrudePolygons(placa2D, { height: espessura, zOffset: 0 });
    const relevoGeom = extrudePolygons(combinedRelevo2D, {
      height: relevo,
      zOffset: espessura,
    });

    const parts: GeneratedPartMesh[] = [
      { name: 'placa', label: 'Placa Base', geometry: placaGeom, color: corPlaca },
      { name: 'relevo', label: 'Relevo (Texto / QR / Moldura)', geometry: relevoGeom, color: corRelevo },
    ];

    return { parts };
  },
};
