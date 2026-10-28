import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  subtractPolygons,
  translatePolygons,
  rotatePolygons,
  roundedRectPolygon,
  rectPolygon,
  circlePolygon,
  textToPolygons,
  extrudePolygons,
} from '@/engine/cad';

export const chaveiroSuporteCelularModule: ProductModule = {
  schema: {
    id: 'chaveiro-suporte-celular',
    name: 'Chaveiro Apoio de Celular (Bolso)',
    shortDescription: 'Mini suporte portátil de chaveiro com rasgo angulado para apoiar o celular e marca personalizada.',
    description:
      'Suporte de celular compacto de bolso em formato de chaveiro. Imprime plano na mesa em poucos minutos, consome menos de 12g de filamento e é perfeito para brindes de eventos, lojas de assistência técnica e uso diário.',
    categories: ['suportes', 'chaveiros'],
    featured: true,
    free: true,
    creditCost: 1,
    addedAt: '2026-10-28',
    badge: 'Campeão de Brindes',
    params: [
      {
        name: 'nome',
        label: 'Nome / Marca Lateral',
        type: 'string',
        default: 'SUA MARCA',
        maxLength: 16,
        group: 'Personalização',
      },
      {
        name: 'fonte',
        label: 'Fonte',
        type: 'font',
        default: 'Bebas Neue',
        group: 'Personalização',
      },
      {
        name: 'altura_texto',
        label: 'Altura do Texto (mm)',
        type: 'number',
        default: 6.5,
        min: 4,
        max: 11,
        step: 0.5,
        group: 'Personalização',
      },
      {
        name: 'relevo',
        label: 'Altura do Relevo (mm)',
        type: 'number',
        default: 1.2,
        min: 0.6,
        max: 2.4,
        step: 0.2,
        group: 'Personalização',
      },
      {
        name: 'comprimento',
        label: 'Comprimento (mm)',
        type: 'number',
        default: 72,
        min: 55,
        max: 95,
        step: 1,
        group: 'Medidas',
      },
      {
        name: 'largura',
        label: 'Altura / Largura do Perfil (mm)',
        type: 'number',
        default: 28,
        min: 20,
        max: 40,
        step: 1,
        group: 'Medidas',
      },
      {
        name: 'espessura',
        label: 'Espessura na Mesa (mm)',
        type: 'number',
        default: 10,
        min: 6,
        max: 16,
        step: 0.5,
        group: 'Medidas',
      },
      {
        name: 'vao',
        label: 'Encaixe do Celular (mm)',
        type: 'number',
        default: 13,
        min: 9,
        max: 18,
        step: 0.5,
        group: 'Medidas',
      },
      {
        name: 'inclinacao',
        label: 'Ângulo do Rasgo (graus)',
        type: 'number',
        default: 66,
        min: 55,
        max: 78,
        step: 1,
        group: 'Medidas',
      },
      {
        name: 'argola',
        label: 'Furo da Argola (mm)',
        type: 'number',
        default: 5,
        min: 3.5,
        max: 8,
        step: 0.5,
        group: 'Medidas',
      },
      {
        name: 'cor_corpo',
        label: 'Cor do Chaveiro',
        type: 'color',
        default: '#16d8aa',
        previewOnly: true,
      },
      {
        name: 'cor_nome',
        label: 'Cor do Texto',
        type: 'color',
        default: '#f8fafc',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'corpo', label: 'Corpo do Chaveiro Suporte', colorParam: 'cor_corpo' },
      { name: 'nome', label: 'Texto em Relevo', colorParam: 'cor_nome' },
    ],
  },

  async generate(params) {
    const nome = String(params.nome ?? 'SUA MARCA');
    const fonte = String(params.fonte || 'Bebas Neue');
    const alturaTexto = Number(params.altura_texto || 6.5);
    const relevo = Number(params.relevo || 1.2);
    const comprimento = Number(params.comprimento || 72);
    const largura = Number(params.largura || 28);
    const espessura = Number(params.espessura || 10);
    const vao = Number(params.vao || 13);
    const inclinacao = Number(params.inclinacao || 66);
    const argola = Number(params.argola || 5);
    const corCorpo = String(params.cor_corpo || '#16d8aa');
    const corNome = String(params.cor_nome || '#f8fafc');

    // Outer body rounded rectangle
    let body2D = roundedRectPolygon(comprimento, largura, 6, 0, 0);

    // Keyring hole on the left side
    const holeX = -comprimento * 0.5 + argola * 0.5 + 4.5;
    const holeY = 0;
    const hole2D = circlePolygon(argola * 0.5, holeX, holeY, 32);

    // Angled phone slot on the right side
    const slotDepth = largura * 0.62;
    const slotAngle = 90 - inclinacao;
    const rawSlot = rectPolygon(vao, slotDepth * 1.6, 0, 0);
    const rotatedSlot = rotatePolygons(rawSlot, -slotAngle);
    const slotX = comprimento * 0.5 - vao * 0.5 - 10;
    const slotY = -largura * 0.5 + slotDepth * 0.35;
    const positionedSlot = translatePolygons(rotatedSlot, slotX, slotY);

    body2D = subtractPolygons(body2D, hole2D);
    body2D = subtractPolygons(body2D, positionedSlot);

    const corpoGeom = extrudePolygons(body2D, { height: espessura, zOffset: 0 });
    const parts: GeneratedPartMesh[] = [
      { name: 'corpo', label: 'Corpo do Chaveiro Suporte', geometry: corpoGeom, color: corCorpo },
    ];

    if (nome.trim()) {
      const textPolys = await textToPolygons(nome, fonte, alturaTexto);
      // Place text centered between keyring hole and phone slot
      const safeCenterX = (holeX + argola * 0.5 + (slotX - vao * 0.5)) * 0.5 - 2;
      const placedText = translatePolygons(textPolys, safeCenterX, 1.5);
      const nomeGeom = extrudePolygons(placedText, {
        height: relevo,
        zOffset: espessura,
      });
      parts.push({
        name: 'nome',
        label: 'Texto em Relevo',
        geometry: nomeGeom,
        color: corNome,
      });
    }

    return { parts };
  },
};
