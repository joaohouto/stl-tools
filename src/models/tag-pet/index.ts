import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  Polygons2D,
  unionPolygons,
  translatePolygons,
  getBounds2D,
  attachKeyringTab,
  textToPolygons,
  shapeGalleryToPolygons,
  extrudePolygons,
} from '@/engine/cad';

export const tagPetModule: ProductModule = {
  schema: {
    id: 'tag-pet',
    name: 'Tag / Pingente de Coleira Pet',
    shortDescription: 'Pingente de identificação pet em formato Osso, Coração, Medalha ou Escudo com nome e telefone.',
    description:
      'Gere tags de identificação para cães e gatos prontas para argola de coleira. Escolha o formato (Osso, Coração, Círculo ou Escudo), digite o nome do pet e o telefone do tutor.',
    categories: ['pets', 'chaveiros'],
    featured: false,
    free: true,
    creditCost: 1,
    addedAt: '2026-10-28',
    params: [
      {
        name: 'formato',
        label: 'Formato do Pingente',
        type: 'enum',
        default: 'osso',
        options: [
          { value: 'osso', label: 'Osso Pet Clássico' },
          { value: 'coracao', label: 'Coração' },
          { value: 'circulo', label: 'Medalha Redonda' },
          { value: 'escudo', label: 'Escudo Protetor' },
        ],
        group: 'Formato e Texto',
      },
      {
        name: 'nome_pet',
        label: 'Nome do Pet',
        type: 'string',
        default: 'THOR',
        maxLength: 12,
        group: 'Formato e Texto',
      },
      {
        name: 'telefone',
        label: 'Telefone (Opcional)',
        type: 'string',
        default: '11 99999-0000',
        maxLength: 16,
        group: 'Formato e Texto',
      },
      {
        name: 'fonte',
        label: 'Fonte',
        type: 'font',
        default: 'Lilita One',
        group: 'Formato e Texto',
      },
      {
        name: 'tamanho',
        label: 'Largura do Pingente (mm)',
        type: 'number',
        default: 46,
        min: 25,
        max: 80,
        step: 1,
        group: 'Medidas',
      },
      {
        name: 'espessura_base',
        label: 'Espessura da Base (mm)',
        type: 'number',
        default: 3.0,
        min: 2.0,
        max: 5.0,
        step: 0.2,
        group: 'Medidas',
      },
      {
        name: 'relevo',
        label: 'Altura das Letras (mm)',
        type: 'number',
        default: 1.2,
        min: 0.6,
        max: 2.4,
        step: 0.2,
        group: 'Medidas',
      },
      {
        name: 'furo_argola',
        label: 'Diâmetro do Furo da Argola (mm)',
        type: 'number',
        default: 4.0,
        min: 2.5,
        max: 6.5,
        step: 0.5,
        group: 'Medidas',
      },
      {
        name: 'cor_base',
        label: 'Cor da Tag',
        type: 'color',
        default: '#3b82f6',
        previewOnly: true,
      },
      {
        name: 'cor_texto',
        label: 'Cor do Texto',
        type: 'color',
        default: '#ffffff',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'base', label: 'Corpo da Tag Pet', colorParam: 'cor_base' },
      { name: 'texto', label: 'Nome e Telefone', colorParam: 'cor_texto' },
    ],
  },

  async generate(params) {
    const formato = String(params.formato || 'osso');
    const nomePet = String(params.nome_pet ?? 'THOR');
    const telefone = String(params.telefone ?? '11 99999-0000');
    const fonte = String(params.fonte || 'Lilita One');
    const tamanho = Number(params.tamanho || 46);
    const espBase = Number(params.espessura_base || 3.0);
    const relevo = Number(params.relevo || 1.2);
    const furoArgola = Number(params.furo_argola || 4.0);
    const corBase = String(params.cor_base || '#3b82f6');
    const corTexto = String(params.cor_texto || '#ffffff');

    let shape2D = shapeGalleryToPolygons(formato, tamanho);

    // Attach top pendant keyring tab so it fuses seamlessly into the exact top edge at x = 0
    // (whether the tag is a bone with a central shaft dip, a heart with a top cleft, a circle, or a shield!)
    shape2D = attachKeyringTab(shape2D, 'top', furoArgola, 2.5);

    const textPolysList: Polygons2D[] = [];
    const hasPhone = telefone.trim().length > 0;
    const nameH = formato === 'osso' ? tamanho * 0.14 : tamanho * 0.18;

    if (nomePet.trim()) {
      const nPolys = await textToPolygons(nomePet, fonte, nameH);
      const yPos = hasPhone ? nameH * 0.42 : 0;
      textPolysList.push(translatePolygons(nPolys, 0, yPos));
    }
    if (hasPhone) {
      const pPolys = await textToPolygons(telefone, 'Bebas Neue', nameH * 0.62);
      textPolysList.push(translatePolygons(pPolys, 0, -nameH * 0.55));
    }

    const combinedText2D = unionPolygons(...textPolysList);

    const baseGeom = extrudePolygons(shape2D, { height: espBase, zOffset: 0 });
    const textoGeom = extrudePolygons(combinedText2D, {
      height: relevo,
      zOffset: espBase,
    });

    const parts: GeneratedPartMesh[] = [
      { name: 'base', label: 'Base da Tag Pet', geometry: baseGeom, color: corBase },
      { name: 'texto', label: 'Nome / Telefone', geometry: textoGeom, color: corTexto },
    ];

    return { parts };
  },
};
