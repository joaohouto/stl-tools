import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import * as THREE from 'three';
import {
  Polygons2D,
  offsetPolygons,
  unionPolygons,
  subtractPolygons,
  translatePolygons,
  getBounds2D,
  signedArea2D,
  roundedRectPolygon,
  attachKeyringTab,
  textToPolygons,
  shapeGalleryToPolygons,
  svgToPolygons,
  qrToPolygons,
  extrudePolygons,
  mergeGeometries,
} from '@/engine/cad';

export const chaveiroContornoModule: ProductModule = {
  schema: {
    id: 'chaveiro-contorno',
    name: 'Chaveiro Personalizado com Contorno',
    shortDescription: 'Chaveiro de nome e/ou ícone com base contornada ("bolha"), argola ajustável em 7 posições e relevo alto/baixo.',
    description:
      'O produto mais vendido na impressão 3D. Digite qualquer nome, escolha a fonte, adicione um ícone ou use apenas o ícone, selecione a posição da argola nos 4 cantos ou laterais e escolha relevo positivo ou entalhe negativo.',
    categories: ['chaveiros', 'pets'],
    featured: true,
    free: true,
    creditCost: 1,
    addedAt: '2026-10-28',
    badge: 'Mais Popular',
    params: [
      {
        name: 'tipo_conteudo',
        label: 'Tipo de Conteúdo',
        type: 'enum',
        default: 'texto_icone',
        options: [
          { value: 'texto_icone', label: 'Nome + Ícone / Logo / QR Code' },
          { value: 'apenas_texto', label: 'Apenas Nome / Texto' },
          { value: 'apenas_icone', label: 'Apenas Ícone / SVG' },
          { value: 'apenas_qrcode', label: 'Apenas QR Code Escaneável' },
        ],
        group: 'Conteúdo do Chaveiro',
      },
      {
        name: 'texto',
        label: 'Nome / Texto do Chaveiro (Suporta 2 Linhas)',
        type: 'string',
        default: 'Maria',
        maxLength: 55,
        visibleIf: 'tipo_conteudo=texto_icone|apenas_texto',
        group: 'Conteúdo do Chaveiro',
      },
      {
        name: 'fonte',
        label: 'Fonte',
        type: 'font',
        default: 'Pacifico',
        visibleIf: 'tipo_conteudo=texto_icone|apenas_texto',
        group: 'Conteúdo do Chaveiro',
      },
      {
        name: 'altura_texto',
        label: 'Altura das Letras (mm)',
        type: 'number',
        default: 18,
        min: 10,
        max: 45,
        step: 1,
        visibleIf: 'tipo_conteudo=texto_icone|apenas_texto',
        group: 'Conteúdo do Chaveiro',
      },
      {
        name: 'tamanho_icone_solo',
        label: 'Tamanho do Ícone / QR Code (mm)',
        type: 'number',
        default: 34,
        min: 18,
        max: 70,
        step: 2,
        visibleIf: 'tipo_conteudo=apenas_icone|apenas_qrcode',
        group: 'Ícone / Desenho',
      },
      {
        name: 'tipo_icone',
        label: 'Origem do Ícone / Símbolo',
        type: 'enum',
        default: 'galeria',
        options: [
          { value: 'galeria', label: 'Galeria de Formas' },
          { value: 'svg', label: 'Enviar SVG / Imagem' },
          { value: 'qrcode', label: 'QR Code (Link / Pix / Contato)' },
        ],
        visibleIf: 'tipo_conteudo=texto_icone|apenas_icone',
        group: 'Ícone / Desenho',
      },
      {
        name: 'icone',
        label: 'Ícone da Galeria',
        type: 'shape',
        default: 'coracao',
        visibleIf: 'tipo_conteudo=texto_icone|apenas_icone&tipo_icone=galeria',
        group: 'Ícone / Desenho',
      },
      {
        name: 'icone_svg',
        label: 'Seu SVG / Logo',
        type: 'svg',
        default: '',
        visibleIf: 'tipo_conteudo=texto_icone|apenas_icone&tipo_icone=svg',
        group: 'Ícone / Desenho',
      },
      {
        name: 'qr_conteudo',
        label: 'Link, Chave Pix ou Texto do QR Code',
        type: 'string',
        default: 'https://stltools.com.br',
        maxLength: 120,
        visibleIf: 'tipo_conteudo=apenas_qrcode;tipo_conteudo=texto_icone|apenas_icone&tipo_icone=qrcode',
        group: 'Ícone / Desenho',
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
        group: 'Estrutura e Argola',
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
        label: 'Profundidade / Altura do Relevo (mm)',
        type: 'number',
        default: 1.2,
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
        visibleIf: 'modo_relevo=alto_relevo',
        group: 'Estrutura e Argola',
      },
      {
        name: 'posicao_argola',
        label: 'Posição da Argola',
        type: 'enum',
        default: 'esquerda',
        options: [
          { value: 'esquerda', label: 'Lateral Esquerda' },
          { value: 'direita', label: 'Lateral Direita' },
          { value: 'topo', label: 'Topo Central' },
          { value: 'canto_sup_esq', label: 'Canto Superior Esquerdo' },
          { value: 'canto_sup_dir', label: 'Canto Superior Direito' },
          { value: 'canto_inf_esq', label: 'Canto Inferior Esquerdo' },
          { value: 'canto_inf_dir', label: 'Canto Inferior Direito' },
          { value: 'sem_argola', label: 'Sem Argola (Plaquinha / Topo)' },
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
        visibleIf: 'posicao_argola!=sem_argola',
        group: 'Estrutura e Argola',
      },
      {
        name: 'cor_base',
        label: 'Cor da Base',
        type: 'color',
        default: '#f97316',
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
      { name: 'relevo', label: 'Texto e Ícone', colorParam: 'cor_relevo' },
    ],
  },

  async generate(params) {
    const tipoConteudo = String(params.tipo_conteudo || 'texto_icone');
    const texto = String(params.texto || 'Maria');
    const fonte = String(params.fonte || 'Pacifico');
    const alturaTexto = Number(params.altura_texto || 18);
    const tamanhoIconeSolo = Number(params.tamanho_icone_solo || 32);
    const tipoIcone = String(params.tipo_icone || 'galeria');
    const icone = String(params.icone || 'coracao');
    const iconeSvg = String(params.icone_svg || '');
    const qrConteudo = String(params.qr_conteudo || 'https://stltools.com.br').trim() || 'https://stltools.com.br';
    const modoRelevo = String(params.modo_relevo || 'alto_relevo');
    const margem = Number(params.margem || 3.2);
    const espessuraBase = Number(params.espessura_base || 2.8);
    const espessuraRelevo = Number(params.espessura_relevo || 1.2);
    const bordaElevada = Boolean(params.borda_elevada ?? false);
    const posicaoArgola = String(params.posicao_argola || 'esquerda');
    const furoDiam = Number(params.furo_diam || 4.5);
    const corBase = String(params.cor_base || '#f97316');
    const corRelevo = String(params.cor_relevo || '#ffffff');

    let foregroundPolys: Polygons2D = [];
    let qrContourBacking2D: Polygons2D = [];

    if (tipoConteudo === 'apenas_qrcode') {
      const qrSize = Math.max(24, tamanhoIconeSolo);
      foregroundPolys = qrToPolygons(qrConteudo, qrSize);
      qrContourBacking2D = roundedRectPolygon(qrSize, qrSize, 1.5, 0, 0);
    } else if (tipoConteudo === 'apenas_icone') {
      let rawIcon: Polygons2D = [];
      try {
        if (tipoIcone === 'qrcode') {
          const qrSize = Math.max(24, tamanhoIconeSolo);
          rawIcon = qrToPolygons(qrConteudo, qrSize);
          qrContourBacking2D = roundedRectPolygon(qrSize, qrSize, 1.5, 0, 0);
        } else if (tipoIcone === 'svg' && iconeSvg.includes('<')) {
          rawIcon = svgToPolygons(iconeSvg, tamanhoIconeSolo);
        } else {
          rawIcon = shapeGalleryToPolygons(icone, tamanhoIconeSolo);
        }
      } catch {
        rawIcon = shapeGalleryToPolygons('coracao', tamanhoIconeSolo);
      }
      foregroundPolys = rawIcon;
    } else {
      let textPolys = await textToPolygons(texto, fonte, alturaTexto);
      const textBounds = getBounds2D(textPolys);

      if (tipoConteudo === 'texto_icone') {
        const isQr = tipoIcone === 'qrcode';
        const iconSize = isQr ? Math.max(24, alturaTexto * 1.35) : alturaTexto * 0.95;
        let rawIcon: Polygons2D = [];
        try {
          if (isQr) {
            rawIcon = qrToPolygons(qrConteudo, iconSize);
          } else if (tipoIcone === 'svg' && iconeSvg.includes('<')) {
            rawIcon = svgToPolygons(iconeSvg, iconSize);
          } else {
            rawIcon = shapeGalleryToPolygons(icone, iconSize);
          }
        } catch {
          rawIcon = shapeGalleryToPolygons('coracao', iconSize);
        }
        const iconBounds = getBounds2D(rawIcon);
        const iconX = textBounds.minX - iconBounds.width * 0.5 - 3.5;
        const placedIcon = translatePolygons(rawIcon, iconX, 0);
        foregroundPolys = unionPolygons(textPolys, placedIcon);
        if (isQr) {
          qrContourBacking2D = roundedRectPolygon(iconSize, iconSize, 1.5, iconX, 0);
        }
      } else {
        foregroundPolys = textPolys;
      }
    }

    if (foregroundPolys.length === 0) {
      foregroundPolys = shapeGalleryToPolygons('coracao', 25);
    }

    // Center combined foreground
    const fgBounds = getBounds2D(foregroundPolys);
    foregroundPolys = translatePolygons(foregroundPolys, -fgBounds.centerX, -fgBounds.centerY);
    if (qrContourBacking2D.length > 0) {
      qrContourBacking2D = translatePolygons(qrContourBacking2D, -fgBounds.centerX, -fgBounds.centerY);
    }

    // Robust, organic bubble contour: offset with round joints (including solid backing behind QR Code if present)
    const contourSource =
      qrContourBacking2D.length > 0
        ? unionPolygons(foregroundPolys, qrContourBacking2D)
        : foregroundPolys;
    const rawContour = offsetPolygons(contourSource, margem, 'round');
    // Keep all outer boundary islands, and seal small interior pinholes/creases to prevent cracks
    const baseContour = rawContour.filter((ring) => {
      const a = signedArea2D(ring);
      if (a > 0) return true; // Always keep all outer boundary loops!
      return Math.abs(a) >= 35; // Seal small trapped holes (< 35mm²)
    });

    let base2D = baseContour;

    // Attach keyring tab seamlessly
    if (posicaoArgola !== 'sem_argola') {
      base2D = attachKeyringTab(
        base2D,
        posicaoArgola as any,
        furoDiam,
        2.8
      );
    }

    let finalRelevoPolys = foregroundPolys;
    if (bordaElevada && modoRelevo === 'alto_relevo') {
      const outerRim = subtractPolygons(base2D, offsetPolygons(baseContour, -1.2, 'round'));
      finalRelevoPolys = unionPolygons(foregroundPolys, outerRim);
    }

    let baseGeom: THREE.BufferGeometry;
    let relevoGeom: THREE.BufferGeometry;

    if (modoRelevo === 'baixo_relevo') {
      // Baixo-relevo entalhado
      // Base sólida com o fundo
      const baseSolida = extrudePolygons(base2D, { height: espessuraBase - espessuraRelevo, zOffset: 0 });
      // Camada superior da base recortada com o entalhe do texto/ícone
      const faceRecortada2D = subtractPolygons(base2D, finalRelevoPolys);
      const faceRecortadaGeom = extrudePolygons(faceRecortada2D, {
        height: espessuraRelevo,
        zOffset: espessuraBase - espessuraRelevo,
      });

      // Geometria da base une as duas camadas perfeitamente
      baseGeom = mergeGeometries([baseSolida, faceRecortadaGeom]);

      // Infill colorido assentado no fundo da cavidade (camada fina de 0.4mm),
      // deixando a profundidade do entalhe claramente visível no 3D
      const infillHeight = Math.min(0.4, espessuraRelevo * 0.4);
      relevoGeom = extrudePolygons(finalRelevoPolys, {
        height: infillHeight,
        zOffset: espessuraBase - espessuraRelevo,
      });
    } else {
      // Alto-relevo clássico
      baseGeom = extrudePolygons(base2D, { height: espessuraBase, zOffset: 0 });
      relevoGeom = extrudePolygons(finalRelevoPolys, {
        height: espessuraRelevo,
        zOffset: espessuraBase,
      });
    }

    const finalBounds = getBounds2D(base2D);

    const parts: GeneratedPartMesh[] = [
      { name: 'base', label: 'Base Contornada', geometry: baseGeom, color: corBase },
      {
        name: 'relevo',
        label: modoRelevo === 'baixo_relevo' ? 'Entalhe / Infill' : 'Nome / Ícone em Relevo',
        geometry: relevoGeom,
        color: corRelevo,
      },
    ];

    return {
      parts,
      fichaTecnica: {
        title: 'Medidas do Chaveiro',
        items: [
          { label: 'Largura Total', value: `${finalBounds.width.toFixed(1)} mm` },
          { label: 'Altura Total', value: `${finalBounds.height.toFixed(1)} mm` },
          {
            label: 'Espessura Total',
            value: `${(modoRelevo === 'baixo_relevo' ? espessuraBase : espessuraBase + espessuraRelevo).toFixed(1)} mm`,
          },
          { label: 'Modo do Relevo', value: modoRelevo === 'baixo_relevo' ? 'Baixo-Relevo (Entalhado)' : 'Alto-Relevo' },
        ],
      },
    };
  },
};
