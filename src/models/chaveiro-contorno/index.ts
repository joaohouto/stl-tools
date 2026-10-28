import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  Polygons2D,
  offsetPolygons,
  unionPolygons,
  subtractPolygons,
  translatePolygons,
  getBounds2D,
  circlePolygon,
  textToPolygons,
  shapeGalleryToPolygons,
  svgToPolygons,
  extrudePolygons,
} from '@/engine/cad';

export const chaveiroContornoModule: ProductModule = {
  schema: {
    id: 'chaveiro-contorno',
    name: 'Chaveiro Personalizado com Contorno',
    shortDescription: 'Chaveiro de nome e ícone com base contornada automática ("bolha"), argola e troca de cor por camada.',
    description:
      'O produto mais vendido na impressão 3D. Digite qualquer nome ou palavra, escolha a fonte, adicione um ícone ou SVG ao lado e gere automaticamente a base contornada suave com furo para argola.',
    categories: ['chaveiros', 'pets'],
    featured: true,
    free: true,
    creditCost: 1,
    addedAt: '2026-10-28',
    badge: 'Mais Popular',
    params: [
      {
        name: 'texto',
        label: 'Nome / Texto do Chaveiro',
        type: 'string',
        default: 'Maria',
        maxLength: 18,
        group: 'Texto e Fonte',
      },
      {
        name: 'fonte',
        label: 'Fonte',
        type: 'font',
        default: 'Pacifico',
        group: 'Texto e Fonte',
      },
      {
        name: 'altura_texto',
        label: 'Altura das Letras (mm)',
        type: 'number',
        default: 18,
        min: 10,
        max: 45,
        step: 1,
        group: 'Texto e Fonte',
      },
      {
        name: 'incluir_icone',
        label: 'Adicionar Ícone ao Lado',
        type: 'boolean',
        default: true,
        group: 'Ícone / Desenho',
      },
      {
        name: 'tipo_icone',
        label: 'Origem do Ícone',
        type: 'enum',
        default: 'galeria',
        options: [
          { value: 'galeria', label: 'Galeria de Formas' },
          { value: 'svg', label: 'Enviar SVG / Imagem' },
        ],
        visibleIf: 'incluir_icone=true',
        group: 'Ícone / Desenho',
      },
      {
        name: 'icone',
        label: 'Ícone da Galeria',
        type: 'shape',
        default: 'coracao',
        visibleIf: 'incluir_icone=true',
        group: 'Ícone / Desenho',
      },
      {
        name: 'icone_svg',
        label: 'Seu SVG / Logo',
        type: 'svg',
        default: '',
        visibleIf: 'tipo_icone=svg',
        group: 'Ícone / Desenho',
      },
      {
        name: 'margem',
        label: 'Largura do Contorno / Borda (mm)',
        type: 'number',
        default: 3.2,
        min: 1.5,
        max: 8,
        step: 0.2,
        group: 'Estrutura e Argola',
      },
      {
        name: 'espessura_base',
        label: 'Espessura da Base (mm)',
        type: 'number',
        default: 2.8,
        min: 1.6,
        max: 6,
        step: 0.2,
        group: 'Estrutura e Argola',
      },
      {
        name: 'espessura_relevo',
        label: 'Altura do Relevo (mm)',
        type: 'number',
        default: 1.4,
        min: 0.6,
        max: 3,
        step: 0.2,
        group: 'Estrutura e Argola',
      },
      {
        name: 'borda_elevada',
        label: 'Borda Externa em Relevo',
        type: 'boolean',
        default: false,
        group: 'Estrutura e Argola',
      },
      {
        name: 'posicao_argola',
        label: 'Posição da Argola',
        type: 'enum',
        default: 'esquerda',
        options: [
          { value: 'esquerda', label: 'Orelha à Esquerda' },
          { value: 'topo', label: 'Orelha no Topo' },
          { value: 'sem_argola', label: 'Sem Furo (Plaquinha / Topo)' },
        ],
        group: 'Estrutura e Argola',
      },
      {
        name: 'furo_diam',
        label: 'Diâmetro do Furo (mm)',
        type: 'number',
        default: 4.5,
        min: 3,
        max: 8,
        step: 0.5,
        group: 'Estrutura e Argola',
      },
      {
        name: 'cor_base',
        label: 'Cor da Base',
        type: 'color',
        default: '#ec4899',
        previewOnly: true,
      },
      {
        name: 'cor_relevo',
        label: 'Cor do Nome / Ícone',
        type: 'color',
        default: '#ffffff',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'base', label: 'Base Contornada', colorParam: 'cor_base' },
      { name: 'relevo', label: 'Texto e Ícone em Relevo', colorParam: 'cor_relevo' },
    ],
  },

  async generate(params) {
    const texto = String(params.texto || 'Maria');
    const fonte = String(params.fonte || 'Pacifico');
    const alturaTexto = Number(params.altura_texto || 18);
    const incluirIcone = Boolean(params.incluir_icone ?? true);
    const tipoIcone = String(params.tipo_icone || 'galeria');
    const icone = String(params.icone || 'coracao');
    const iconeSvg = String(params.icone_svg || '');
    const margem = Number(params.margem || 3.2);
    const espessuraBase = Number(params.espessura_base || 2.8);
    const espessuraRelevo = Number(params.espessura_relevo || 1.4);
    const bordaElevada = Boolean(params.borda_elevada ?? false);
    const posicaoArgola = String(params.posicao_argola || 'esquerda');
    const furoDiam = Number(params.furo_diam || 4.5);
    const corBase = String(params.cor_base || '#ec4899');
    const corRelevo = String(params.cor_relevo || '#ffffff');

    let textPolys = await textToPolygons(texto, fonte, alturaTexto);
    const textBounds = getBounds2D(textPolys);

    let foregroundPolys: Polygons2D = [...textPolys];

    if (incluirIcone) {
      const iconSize = alturaTexto * 0.95;
      const rawIcon =
        tipoIcone === 'svg' && iconeSvg.includes('<')
          ? svgToPolygons(iconeSvg, iconSize)
          : shapeGalleryToPolygons(icone, iconSize);
      const iconBounds = getBounds2D(rawIcon);
      const iconX = textBounds.minX - iconBounds.width * 0.5 - 3.0;
      const placedIcon = translatePolygons(rawIcon, iconX, 0);
      foregroundPolys = unionPolygons(textPolys, placedIcon);
    }

    // Center combined foreground
    const fgBounds = getBounds2D(foregroundPolys);
    foregroundPolys = translatePolygons(foregroundPolys, -fgBounds.centerX, -fgBounds.centerY);

    // Create smooth bubble offset contour around foreground
    // Double offset (+margem + 2, then -2) bridges gaps between letters cleanly!
    const bridgedBase = offsetPolygons(
      offsetPolygons(foregroundPolys, margem + 2.2, 'round'),
      -2.2,
      'round'
    );

    let base2D = bridgedBase;
    const baseBounds = getBounds2D(base2D);

    // Attach keyring tab
    if (posicaoArgola !== 'sem_argola') {
      const outerR = furoDiam * 0.5 + 3.0;
      const innerR = furoDiam * 0.5;
      const tabX =
        posicaoArgola === 'esquerda' ? baseBounds.minX - outerR * 0.45 : 0;
      const tabY =
        posicaoArgola === 'topo' ? baseBounds.maxY + outerR * 0.45 : 0;

      const outerTab = circlePolygon(outerR, tabX, tabY, 36);
      const hole = circlePolygon(innerR, tabX, tabY, 32);
      base2D = subtractPolygons(unionPolygons(base2D, outerTab), hole);
    }

    let finalRelevoPolys = foregroundPolys;
    if (bordaElevada) {
      const outerRim = subtractPolygons(base2D, offsetPolygons(bridgedBase, -1.4, 'round'));
      finalRelevoPolys = unionPolygons(foregroundPolys, outerRim);
    }

    const baseGeom = extrudePolygons(base2D, { height: espessuraBase, zOffset: 0 });
    const relevoGeom = extrudePolygons(finalRelevoPolys, {
      height: espessuraRelevo,
      zOffset: espessuraBase,
    });

    const finalBounds = getBounds2D(base2D);

    const parts: GeneratedPartMesh[] = [
      { name: 'base', label: 'Base Contornada', geometry: baseGeom, color: corBase },
      { name: 'relevo', label: 'Nome / Ícone em Relevo', geometry: relevoGeom, color: corRelevo },
    ];

    return {
      parts,
      fichaTecnica: {
        title: 'Medidas do Chaveiro',
        items: [
          { label: 'Largura Total', value: `${finalBounds.width.toFixed(1)} mm` },
          { label: 'Altura Total', value: `${finalBounds.height.toFixed(1)} mm` },
          { label: 'Espessura Total', value: `${(espessuraBase + espessuraRelevo).toFixed(1)} mm` },
        ],
      },
    };
  },
};
