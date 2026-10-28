import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  Polygons2D,
  offsetPolygons,
  unionPolygons,
  subtractPolygons,
  getBounds2D,
  perimeter2D,
  area2D,
  circlePolygon,
  textToIndividualLetterPolygons,
  extrudePolygons,
  mergeGeometries,
} from '@/engine/cad';

export const letraCaixaLedModule: ProductModule = {
  schema: {
    id: 'letra-caixa-led',
    name: 'Letra-Caixa Luminosa (LED)',
    shortDescription: 'Letreiro luminoso oco com tampa difusora de encaixe, furos traseiros para LED e ficha técnica de fita LED.',
    description:
      'Gere letras-caixa profissionais prontas para iluminação LED. Cada letra sai com o corpo oco, paredes calibradas, furos traseiros para passagem de fio/fixação e tampa frontal translúcida com degrau de encaixe sem cola.',
    categories: ['letreiros', 'placas'],
    featured: true,
    free: false,
    creditCost: 3,
    addedAt: '2026-10-28',
    badge: 'Com Ficha Técnica LED',
    params: [
      {
        name: 'texto',
        label: 'Palavra / Sigla',
        type: 'string',
        default: 'LUZ',
        maxLength: 10,
        group: 'Texto e Fonte',
      },
      {
        name: 'fonte',
        label: 'Fonte',
        type: 'font',
        default: 'Anton',
        group: 'Texto e Fonte',
      },
      {
        name: 'altura',
        label: 'Altura das Letras (mm)',
        type: 'number',
        default: 110,
        min: 60,
        max: 250,
        step: 5,
        group: 'Dimensões da Caixa',
      },
      {
        name: 'profundidade',
        label: 'Profundidade do Corpo (mm)',
        type: 'number',
        default: 35,
        min: 18,
        max: 65,
        step: 1,
        group: 'Dimensões da Caixa',
      },
      {
        name: 'parede',
        label: 'Espessura da Parede Lateral (mm)',
        type: 'number',
        default: 2.2,
        min: 1.6,
        max: 4.0,
        step: 0.2,
        group: 'Dimensões da Caixa',
      },
      {
        name: 'fundo',
        label: 'Espessura do Fundo Traseiro (mm)',
        type: 'number',
        default: 2.0,
        min: 1.2,
        max: 4.0,
        step: 0.2,
        group: 'Dimensões da Caixa',
      },
      {
        name: 'tampa_espessura',
        label: 'Espessura da Tampa Difusora (mm)',
        type: 'number',
        default: 1.6,
        min: 0.8,
        max: 3.0,
        step: 0.2,
        group: 'Tampa e Encaixe',
      },
      {
        name: 'folga',
        label: 'Folga de Encaixe da Tampa (mm)',
        type: 'number',
        default: 0.22,
        min: 0.1,
        max: 0.45,
        step: 0.02,
        group: 'Tampa e Encaixe',
      },
      {
        name: 'furo_fio',
        label: 'Furo Traseiro p/ Passagem de Fio LED (mm)',
        type: 'number',
        default: 8,
        min: 0,
        max: 16,
        step: 1,
        group: 'Tampa e Encaixe',
      },
      {
        name: 'cor_corpo',
        label: 'Cor do Corpo (Caixa)',
        type: 'color',
        default: '#0f172a',
        previewOnly: true,
      },
      {
        name: 'cor_tampa',
        label: 'Cor da Tampa Difusora (LED)',
        type: 'color',
        default: '#fef08a',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'corpo', label: 'Corpo Oco das Letras', colorParam: 'cor_corpo' },
      { name: 'tampa', label: 'Tampa Difusora Frontal', colorParam: 'cor_tampa' },
    ],
  },

  async generate(params) {
    const texto = String(params.texto || 'LUZ');
    const fonte = String(params.fonte || 'Anton');
    const altura = Number(params.altura || 110);
    const profundidade = Number(params.profundidade || 35);
    const parede = Number(params.parede || 2.2);
    const fundo = Number(params.fundo || 2.0);
    const tampaEsp = Number(params.tampa_espessura || 1.6);
    const folga = Number(params.folga || 0.22);
    const furoFio = Number(params.furo_fio ?? 8);
    const corCorpo = String(params.cor_corpo || '#0f172a');
    const corTampa = String(params.cor_tampa || '#fef08a');

    const letterItems = await textToIndividualLetterPolygons(texto, fonte, altura, 14);

    const allOuter: Polygons2D = [];
    const allWalls: Polygons2D = [];
    const allBacks: Polygons2D = [];
    const allLids: Polygons2D = [];

    let totalPerimeterMm = 0;
    let totalAreaMm2 = 0;

    for (const item of letterItems) {
      const outer = item.polys;
      const cavity = offsetPolygons(outer, -parede, 'round');
      const wallRing = subtractPolygons(outer, cavity);
      const lid2D = offsetPolygons(outer, -(parede + folga), 'round');

      let back2D = outer;
      if (furoFio > 0) {
        const b = getBounds2D(outer);
        const wireHole = circlePolygon(furoFio * 0.5, b.centerX, b.minY + b.height * 0.25, 24);
        back2D = subtractPolygons(outer, wireHole);
      }

      allOuter.push(...outer);
      allWalls.push(...wallRing);
      allBacks.push(...back2D);
      allLids.push(...lid2D);

      totalPerimeterMm += perimeter2D(cavity);
      totalAreaMm2 += area2D(outer);
    }

    const backPlateGeom = extrudePolygons(allBacks, { height: fundo, zOffset: 0 });
    const wallsGeom = extrudePolygons(allWalls, {
      height: profundidade - fundo,
      zOffset: fundo,
    });

    // Inner support ledge (3mm below top edge) so the lid doesn't fall inside the letter!
    const ledgeRing = subtractPolygons(
      offsetPolygons(allOuter, -parede, 'round'),
      offsetPolygons(allOuter, -(parede + 1.4), 'round')
    );
    const ledgeGeom = extrudePolygons(ledgeRing, {
      height: 2.5,
      zOffset: profundidade - tampaEsp - 2.5,
    });

    const corpoGeom = mergeGeometries([backPlateGeom, wallsGeom, ledgeGeom]);
    const tampaGeom = extrudePolygons(allLids, {
      height: tampaEsp,
      zOffset: profundidade - tampaEsp + 0.4,
    });

    const overallBounds = getBounds2D(allOuter);

    const parts: GeneratedPartMesh[] = [
      { name: 'corpo', label: 'Corpo da Letra-Caixa', geometry: corpoGeom, color: corCorpo },
      { name: 'tampa', label: 'Tampa Difusora', geometry: tampaGeom, color: corTampa },
    ];

    return {
      parts,
      fichaTecnica: {
        title: 'Ficha Técnica do Letreiro Luminoso',
        items: [
          { label: 'Quantidade de Letras', value: `${letterItems.length} peças` },
          {
            label: 'Dimensão Total Montado',
            value: `${overallBounds.width.toFixed(0)} × ${overallBounds.height.toFixed(0)} × ${profundidade} mm`,
          },
          {
            label: 'Fita LED Necessária (Perímetro Interno)',
            value: `${(totalPerimeterMm / 1000).toFixed(2)} metros (${totalPerimeterMm.toFixed(0)} mm)`,
          },
          {
            label: 'Área Frontal Luminosa',
            value: `${(totalAreaMm2 / 100).toFixed(1)} cm²`,
          },
        ],
      },
    };
  },
};
