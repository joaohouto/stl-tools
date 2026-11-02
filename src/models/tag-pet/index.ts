import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import * as THREE from 'three';
import {
  Polygons2D,
  unionPolygons,
  subtractPolygons,
  translatePolygons,
  getBounds2D,
  attachKeyringTab,
  textToPolygons,
  shapeGalleryToPolygons,
  extrudePolygons,
  mergeGeometries,
} from '@/engine/cad';

export const tagPetModule: ProductModule = {
  schema: {
    id: 'tag-pet',
    name: 'Tag / Pingente de Coleira Pet',
    shortDescription: 'Pingente de identificação pet em formato Osso, Coração, Medalha ou Escudo com nome e telefone.',
    description:
      'Gere tags de identificação para cães e gatos prontas para argola de coleira. Escolha o formato (Osso, Coração, Círculo ou Escudo), digite o nome do pet e o telefone do tutor e escolha alto ou baixo-relevo.',
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
        name: 'altura_fonte',
        label: 'Altura da Fonte do Nome (mm)',
        type: 'number',
        default: 8.0,
        min: 4.0,
        max: 18.0,
        step: 0.5,
        group: 'Formato e Texto',
      },
      {
        name: 'altura_fonte_tel',
        label: 'Altura da Fonte do Telefone (mm)',
        type: 'number',
        default: 4.5,
        min: 2.5,
        max: 10.0,
        step: 0.5,
        group: 'Formato e Texto',
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
        label: 'Altura / Profundidade das Letras (mm)',
        type: 'number',
        default: 1.0,
        min: 0.6,
        max: 2.0,
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
        default: '#f97316',
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
    const modoRelevo = String(params.modo_relevo || 'alto_relevo');
    const tamanho = Number(params.tamanho || 46);
    const espBase = Number(params.espessura_base || 3.0);
    const relevo = Math.min(Number(params.relevo || 1.0), espBase - 0.8);
    const furoArgola = Number(params.furo_argola || 4.0);
    const corBase = String(params.cor_base || '#f97316');
    const corTexto = String(params.cor_texto || '#ffffff');

    let shape2D = shapeGalleryToPolygons(formato, tamanho);

    // Attach top pendant keyring tab
    shape2D = attachKeyringTab(shape2D, 'top', furoArgola, 2.5);

    const textPolysList: Polygons2D[] = [];
    const hasPhone = telefone.trim().length > 0;
    const defaultNameH = formato === 'osso' ? tamanho * 0.16 : tamanho * 0.19;
    const nameH = Number(params.altura_fonte || defaultNameH);
    const phoneH = Number(params.altura_fonte_tel || Math.max(3.0, nameH * 0.6));

    if (nomePet.trim()) {
      const nPolys = await textToPolygons(nomePet, fonte, nameH);
      const yPos = hasPhone ? phoneH * 0.5 + 1.2 : 0;
      textPolysList.push(translatePolygons(nPolys, 0, yPos));
    }
    if (hasPhone) {
      const pPolys = await textToPolygons(telefone, 'Bebas Neue', phoneH);
      const yPos = hasPhone && nomePet.trim() ? -(nameH * 0.5 + 0.8) : 0;
      textPolysList.push(translatePolygons(pPolys, 0, yPos));
    }

    const combinedText2D = unionPolygons(...textPolysList);

    let baseGeom: THREE.BufferGeometry;
    let textoGeom: THREE.BufferGeometry;

    if (modoRelevo === 'baixo_relevo') {
      const baseSolida = extrudePolygons(shape2D, { height: espBase - relevo, zOffset: 0 });
      const faceRecortada2D = subtractPolygons(shape2D, combinedText2D);
      const faceRecortadaGeom = extrudePolygons(faceRecortada2D, {
        height: relevo,
        zOffset: espBase - relevo,
      });

      baseGeom = mergeGeometries([baseSolida, faceRecortadaGeom]);

      // Infill fino assentado no fundo da cavidade para entalhe 3D visível
      const infillH = Math.min(0.4, relevo * 0.4);
      textoGeom = extrudePolygons(combinedText2D, {
        height: infillH,
        zOffset: espBase - relevo,
      });
    } else {
      baseGeom = extrudePolygons(shape2D, { height: espBase, zOffset: 0 });
      textoGeom = extrudePolygons(combinedText2D, {
        height: relevo,
        zOffset: espBase,
      });
    }

    const bounds = getBounds2D(shape2D);

    const parts: GeneratedPartMesh[] = [
      { name: 'base', label: 'Base da Tag Pet', geometry: baseGeom, color: corBase },
      {
        name: 'texto',
        label: modoRelevo === 'baixo_relevo' ? 'Entalhe / Infill' : 'Nome / Telefone',
        geometry: textoGeom,
        color: corTexto,
      },
    ];

    return {
      parts,
      fichaTecnica: {
        title: 'Medidas da Tag Pet',
        items: [
          { label: 'Largura', value: `${bounds.width.toFixed(1)} mm` },
          { label: 'Altura', value: `${bounds.height.toFixed(1)} mm` },
          {
            label: 'Espessura Total',
            value: `${(modoRelevo === 'baixo_relevo' ? espBase : espBase + relevo).toFixed(1)} mm`,
          },
          { label: 'Acabamento', value: modoRelevo === 'baixo_relevo' ? 'Entalhado Negativo' : 'Alto-Relevo' },
        ],
      },
    };
  },
};