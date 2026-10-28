import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  offsetPolygons,
  unionPolygons,
  translatePolygons,
  getBounds2D,
  roundedRectPolygon,
  textToPolygons,
  extrudePolygons,
} from '@/engine/cad';

export const letreiro3dMesaModule: ProductModule = {
  schema: {
    id: 'letreiro-3d-mesa',
    name: 'Gerador de Nome 3D & Topo de Bolo',
    shortDescription: 'Nome 3D com fundo contornado em duas cores, pedestal de mesa ou hastes para Topo de Bolo.',
    description:
      'Crie letreiros de mesa para decoração, placas de identificação de marca ou Topos de Bolo personalizados. Escolha entre suporte de mesa retangular, sem base, ou hastes pontiagudas para cravar no bolo.',
    categories: ['letreiros'],
    featured: false,
    free: false,
    creditCost: 2,
    addedAt: '2026-10-28',
    params: [
      {
        name: 'texto',
        label: 'Nome / Frase',
        type: 'string',
        default: 'Parabéns',
        maxLength: 18,
        group: 'Texto',
      },
      {
        name: 'fonte',
        label: 'Fonte',
        type: 'font',
        default: 'Lobster',
        group: 'Texto',
      },
      {
        name: 'altura_letras',
        label: 'Altura das Letras (mm)',
        type: 'number',
        default: 36,
        min: 18,
        max: 90,
        step: 2,
        group: 'Medidas',
      },
      {
        name: 'margem_fundo',
        label: 'Margem do Contorno (mm)',
        type: 'number',
        default: 4,
        min: 1.5,
        max: 10,
        step: 0.5,
        group: 'Medidas',
      },
      {
        name: 'espessura_fundo',
        label: 'Espessura do Fundo (mm)',
        type: 'number',
        default: 8,
        min: 2.4,
        max: 22,
        step: 0.5,
        group: 'Medidas',
      },
      {
        name: 'espessura_frente',
        label: 'Relevo das Letras (mm)',
        type: 'number',
        default: 3,
        min: 1,
        max: 10,
        step: 0.5,
        group: 'Medidas',
      },
      {
        name: 'tipo_suporte',
        label: 'Tipo de Base / Aplicação',
        type: 'enum',
        default: 'pedestal',
        options: [
          { value: 'pedestal', label: 'Pedestal de Mesa (Fica em Pé)' },
          { value: 'topo_bolo', label: 'Topo de Bolo (Com 2 Hastes)' },
          { value: 'nenhum', label: 'Apenas o Nome Contornado' },
        ],
        group: 'Base / Topo de Bolo',
      },
      {
        name: 'altura_haste',
        label: 'Comprimento da Haste do Bolo (mm)',
        type: 'number',
        default: 65,
        min: 35,
        max: 110,
        step: 5,
        visibleIf: 'tipo_suporte=topo_bolo',
        group: 'Base / Topo de Bolo',
      },
      {
        name: 'cor_fundo',
        label: 'Cor do Fundo / Base',
        type: 'color',
        default: '#f59e0b',
        previewOnly: true,
      },
      {
        name: 'cor_frente',
        label: 'Cor das Letras',
        type: 'color',
        default: '#ffffff',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'fundo', label: 'Fundo Contornado + Base', colorParam: 'cor_fundo' },
      { name: 'frente', label: 'Letras em Relevo', colorParam: 'cor_frente' },
    ],
  },

  async generate(params) {
    const texto = String(params.texto || 'Parabéns');
    const fonte = String(params.fonte || 'Lobster');
    const alturaLetras = Number(params.altura_letras || 36);
    const margemFundo = Number(params.margem_fundo || 4);
    const espessuraFundo = Number(params.espessura_fundo || 8);
    const espessuraFrente = Number(params.espessura_frente || 3);
    const tipoSuporte = String(params.tipo_suporte || 'pedestal');
    const alturaHaste = Number(params.altura_haste || 65);
    const corFundo = String(params.cor_fundo || '#f59e0b');
    const corFrente = String(params.cor_frente || '#ffffff');

    const text2D = await textToPolygons(texto, fonte, alturaLetras);
    let fundo2D = offsetPolygons(
      offsetPolygons(text2D, margemFundo + 3, 'round'),
      -3,
      'round'
    );
    const b = getBounds2D(fundo2D);

    if (tipoSuporte === 'pedestal') {
      const pedW = b.width * 0.85;
      const pedH = 6;
      const ped = roundedRectPolygon(pedW, pedH, 2.5, 0, b.minY - pedH * 0.35);
      fundo2D = unionPolygons(fundo2D, ped);
    } else if (tipoSuporte === 'topo_bolo') {
      const stickW = 3.6;
      const dx = Math.max(12, b.width * 0.26);
      const stickY = b.minY - alturaHaste * 0.5 + 4;
      const sLeft = roundedRectPolygon(stickW, alturaHaste, 1.5, -dx, stickY);
      const sRight = roundedRectPolygon(stickW, alturaHaste, 1.5, dx, stickY);
      fundo2D = unionPolygons(fundo2D, sLeft, sRight);
    }

    const fundoGeom = extrudePolygons(fundo2D, { height: espessuraFundo, zOffset: 0 });
    const frenteGeom = extrudePolygons(text2D, {
      height: espessuraFrente,
      zOffset: espessuraFundo,
    });

    const parts: GeneratedPartMesh[] = [
      { name: 'fundo', label: 'Fundo Contornado', geometry: fundoGeom, color: corFundo },
      { name: 'frente', label: 'Letras em Relevo', geometry: frenteGeom, color: corFrente },
    ];

    return { parts };
  },
};
