import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  offsetPolygons,
  unionPolygons,
  subtractPolygons,
  translatePolygons,
  getBounds2D,
  rectPolygon,
  textToPolygons,
  extrudePolygons,
  mergeGeometries,
} from '@/engine/cad';

export const letraComNomeModule: ProductModule = {
  schema: {
    id: 'letra-com-nome',
    name: 'Letra com Nome (Encaixe Sem Cola)',
    shortDescription: 'Inicial grande que fica em pé sozinha com o nome atravessado na frente e encaixe sob medida.',
    description:
      'Inicial capitular espessa para decoração de quarto infantil, festas e presentes. O nome atravessa a frente da letra e encaixa num rebaixo com o próprio formato do nome — sem precisar de barra traseira ou cola.',
    categories: ['letreiros'],
    featured: true,
    free: false,
    creditCost: 3,
    addedAt: '2026-10-28',
    badge: 'Sucesso em Festas',
    params: [
      {
        name: 'letra',
        label: 'Letra Inicial (1 Caractere)',
        type: 'string',
        default: 'M',
        maxLength: 1,
        group: 'Texto',
      },
      {
        name: 'nome',
        label: 'Nome na Frente',
        type: 'string',
        default: 'Maria',
        maxLength: 14,
        group: 'Texto',
      },
      {
        name: 'fonte_letra',
        label: 'Fonte da Inicial',
        type: 'font',
        default: 'Anton',
        group: 'Texto',
      },
      {
        name: 'fonte_nome',
        label: 'Fonte do Nome',
        type: 'font',
        default: 'Pacifico',
        group: 'Texto',
      },
      {
        name: 'tamanho',
        label: 'Altura da Letra (mm)',
        type: 'number',
        default: 130,
        min: 60,
        max: 240,
        step: 5,
        group: 'Medidas e Encaixe',
      },
      {
        name: 'espessura_letra',
        label: 'Profundidade da Letra (mm)',
        type: 'number',
        default: 20,
        min: 12,
        max: 32,
        step: 1,
        group: 'Medidas e Encaixe',
      },
      {
        name: 'espessura_nome',
        label: 'Espessura do Nome (mm)',
        type: 'number',
        default: 6,
        min: 3,
        max: 12,
        step: 0.5,
        group: 'Medidas e Encaixe',
      },
      {
        name: 'folga',
        label: 'Folga do Encaixe Sem Cola (mm)',
        type: 'number',
        default: 0.25,
        min: 0.1,
        max: 0.5,
        step: 0.05,
        group: 'Medidas e Encaixe',
      },
      {
        name: 'base_apoio',
        label: 'Achatar Base p/ Ficar em Pé (ex: C, J, O, S, U)',
        type: 'boolean',
        default: true,
        group: 'Medidas e Encaixe',
      },
      {
        name: 'cor_letra',
        label: 'Cor da Letra Inicial',
        type: 'color',
        default: '#f472b6',
        previewOnly: true,
      },
      {
        name: 'cor_nome',
        label: 'Cor do Nome',
        type: 'color',
        default: '#ffffff',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'letra', label: 'Letra Inicial (Base)', colorParam: 'cor_letra' },
      { name: 'nome', label: 'Nome de Encaixe', colorParam: 'cor_nome' },
    ],
  },

  async generate(params) {
    const letra = String(params.letra || 'M').slice(0, 1).toUpperCase() || 'M';
    const nome = String(params.nome || 'Maria');
    const fonteLetra = String(params.fonte_letra || 'Anton');
    const fonteNome = String(params.fonte_nome || 'Pacifico');
    const tamanho = Number(params.tamanho || 130);
    const espessuraLetra = Number(params.espessura_letra || 20);
    const espessuraNome = Number(params.espessura_nome || 6);
    const folga = Number(params.folga || 0.25);
    const baseApoio = Boolean(params.base_apoio ?? true);
    const corLetra = String(params.cor_letra || '#f472b6');
    const corNome = String(params.cor_nome || '#ffffff');

    let letra2D = await textToPolygons(letra, fonteLetra, tamanho);
    if (baseApoio) {
      const lb = getBounds2D(letra2D);
      // Shave 1.5mm at the bottom so curved letters (C, O, S, U, G, J) stand firmly on tables
      const shaveRect = rectPolygon(lb.width * 2, 4, 0, lb.minY - 0.5);
      letra2D = subtractPolygons(letra2D, shaveRect);
    }

    const alturaNome = Math.max(16, tamanho * 0.24);
    const rawNome2D = await textToPolygons(nome, fonteNome, alturaNome);
    // Connect script letters slightly with a subtle bridge offset so it prints as 1 solid piece
    const connectedNome2D = offsetPolygons(offsetPolygons(rawNome2D, 0.9, 'round'), -0.5, 'round');

    // Pocket recess in the front of the big letter (depth = 2.4mm, clearance = +folga)
    const recessDepth = 2.4;
    const recess2D = offsetPolygons(connectedNome2D, folga, 'round');

    const backHeight = espessuraLetra - recessDepth;
    const letraBackGeom = extrudePolygons(letra2D, { height: backHeight, zOffset: 0 });
    const letraFront2D = subtractPolygons(letra2D, recess2D);
    const letraFrontGeom = extrudePolygons(letraFront2D, {
      height: recessDepth,
      zOffset: backHeight,
    });

    const letraGeom = mergeGeometries([letraBackGeom, letraFrontGeom]);
    const nomeGeom = extrudePolygons(connectedNome2D, {
      height: espessuraNome,
      zOffset: backHeight,
    });

    const parts: GeneratedPartMesh[] = [
      { name: 'letra', label: `Letra ${letra}`, geometry: letraGeom, color: corLetra },
      { name: 'nome', label: `Nome (${nome})`, geometry: nomeGeom, color: corNome },
    ];

    return { parts };
  },
};
