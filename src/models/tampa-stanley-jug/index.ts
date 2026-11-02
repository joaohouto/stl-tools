import * as THREE from 'three';
import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  Polygons2D,
  circlePolygon,
  roundedRectPolygon,
  rectPolygon,
  unionPolygons,
  subtractPolygons,
  intersectPolygons,
  offsetPolygons,
  translatePolygons,
  rotatePolygons,
  circularTextToPolygons,
  shapeGalleryToPolygons,
  svgToPolygons,
  extrudePolygons,
  mergeGeometries,
} from '@/engine/cad';

export const tampaStanleyJugModule: ProductModule = {
  schema: {
    id: 'tampa-stanley-jug',
    name: 'Coroa Personalizada p/ Tampa de Stanley Jug',
    shortDescription:
      'Conjunto bipartido (peça superior e inferior) com encaixe exato para tampa de Stanley Jug, texto circular, SVG e bordas decorativas.',
    description:
      'Personalização circular em duas metades simétricas projetada sob medida para a tampa do galão térmico Stanley Jug. Permite gravar textos circulares independentes, inverter o sentido vertical das letras, carregar logotipos SVG para os badges laterais e adicionar contorno/moldura em relevo.',
    categories: ['acessorios', 'placas'],
    featured: true,
    free: false,
    creditCost: 2,
    addedAt: '2026-11-01',
    badge: 'Texto Circular',
    params: [
      {
        name: 'texto_superior',
        label: 'Texto Circular — Peça Superior',
        type: 'string',
        default: 'STANLEY JUG',
        maxLength: 28,
        group: 'Texto Circular',
      },
      {
        name: 'inverter_vertical_superior',
        label: 'Inverter Verticalmente (Refletir Texto Superior)',
        type: 'boolean',
        default: false,
        group: 'Texto Circular',
      },
      {
        name: 'texto_inferior',
        label: 'Texto Circular — Peça Inferior',
        type: 'string',
        default: 'SEU NOME AQUI',
        maxLength: 28,
        group: 'Texto Circular',
      },
      {
        name: 'leitura_inferior',
        label: 'Sentido do Texto Inferior',
        type: 'enum',
        default: 'direito',
        options: [
          { value: 'direito', label: 'Leitura Direita (De Pé na Curva Inferior)' },
          { value: 'horario', label: 'Giro Contínuo Horário (Espelhado à Peça Superior)' },
        ],
        group: 'Texto Circular',
      },
      {
        name: 'inverter_vertical_inferior',
        label: 'Inverter Verticalmente (Refletir Texto Inferior)',
        type: 'boolean',
        default: false,
        group: 'Texto Circular',
      },
      {
        name: 'fonte',
        label: 'Fonte das Letras',
        type: 'font',
        default: 'Montserrat',
        group: 'Texto Circular',
      },
      {
        name: 'altura_letras',
        label: 'Altura das Letras (mm)',
        type: 'number',
        default: 15,
        min: 8,
        max: 28,
        step: 1,
        group: 'Texto Circular',
      },
      {
        name: 'espacamento_letras',
        label: 'Espaçamento entre Letras (mm)',
        type: 'number',
        default: 2.0,
        min: 0,
        max: 12,
        step: 0.5,
        group: 'Texto Circular',
      },
      {
        name: 'tipo_decoracao_lateral',
        label: 'Decoração das Laterais da Tampa',
        type: 'enum',
        default: 'estrelas',
        options: [
          { value: 'estrelas', label: 'Ícone da Galeria (Estrelas, Corações, etc.)' },
          { value: 'svg_personalizado', label: 'Logo / SVG Personalizado Próprio' },
          { value: 'nenhum', label: 'Sem Ícones Laterais' },
        ],
        group: 'Decoração Lateral e Borda',
      },
      {
        name: 'icone_lateral',
        label: 'Ícone da Galeria',
        type: 'shape',
        default: 'estrela',
        visibleIf: 'tipo_decoracao_lateral=estrelas',
        group: 'Decoração Lateral e Borda',
      },
      {
        name: 'svg_lateral',
        label: 'Seu Logo / Desenho em SVG',
        type: 'svg',
        default: '',
        visibleIf: 'tipo_decoracao_lateral=svg_personalizado',
        group: 'Decoração Lateral e Borda',
      },
      {
        name: 'tamanho_decoracao_lateral',
        label: 'Tamanho dos Ícones / SVG Lateral (mm)',
        type: 'number',
        default: 14,
        min: 6,
        max: 28,
        step: 1,
        visibleIf: 'tipo_decoracao_lateral!=nenhum',
        group: 'Decoração Lateral e Borda',
      },
      {
        name: 'deslocamento_svg_x',
        label: 'Deslocamento Lateral / Tangencial do SVG (mm)',
        type: 'number',
        default: 0,
        min: -30,
        max: 30,
        step: 0.5,
        visibleIf: 'tipo_decoracao_lateral=svg_personalizado',
        group: 'Decoração Lateral e Borda',
      },
      {
        name: 'deslocamento_svg_y',
        label: 'Deslocamento Radial / Vertical do SVG (mm)',
        type: 'number',
        default: 0,
        min: -25,
        max: 25,
        step: 0.5,
        visibleIf: 'tipo_decoracao_lateral=svg_personalizado',
        group: 'Decoração Lateral e Borda',
      },
      {
        name: 'rotacao_svg',
        label: 'Rotação Própria do SVG (graus)',
        type: 'number',
        default: 0,
        min: -180,
        max: 180,
        step: 5,
        visibleIf: 'tipo_decoracao_lateral=svg_personalizado',
        group: 'Decoração Lateral e Borda',
      },
      {
        name: 'escala_svg',
        label: 'Escala / Zoom do SVG (%)',
        type: 'number',
        default: 100,
        min: 30,
        max: 250,
        step: 5,
        visibleIf: 'tipo_decoracao_lateral=svg_personalizado',
        group: 'Decoração Lateral e Borda',
      },
      {
        name: 'adicionar_borda',
        label: 'Adicionar Borda / Contorno em Relevo',
        type: 'boolean',
        default: false,
        group: 'Decoração Lateral e Borda',
      },
      {
        name: 'largura_borda',
        label: 'Largura do Contorno (mm)',
        type: 'number',
        default: 1.8,
        min: 0.8,
        max: 4.0,
        step: 0.2,
        visibleIf: 'adicionar_borda=true',
        group: 'Decoração Lateral e Borda',
      },
      {
        name: 'modo_relevo',
        label: 'Modo de Gravação',
        type: 'enum',
        default: 'alto_relevo',
        options: [
          { value: 'alto_relevo', label: 'Alto-Relevo (Letras Sobressalentes)' },
          { value: 'baixo_relevo', label: 'Baixo-Relevo (Entalhado na Tampa)' },
        ],
        group: 'Decoração Lateral e Borda',
      },
      {
        name: 'altura_relevo',
        label: 'Altura / Profundidade do Relevo (mm)',
        type: 'number',
        default: 1.4,
        min: 0.6,
        max: 2.5,
        step: 0.2,
        group: 'Decoração Lateral e Borda',
      },
      {
        name: 'pecas_geradas',
        label: 'Peças no Modelo',
        type: 'enum',
        default: 'ambas',
        options: [
          { value: 'ambas', label: 'Ambas as Peças (Superior + Inferior)' },
          { value: 'superior', label: 'Apenas Peça Superior (1 Meia-Lua)' },
        ],
        group: 'Dimensões da Tampa (Padrão Stanley)',
      },
      {
        name: 'diametro_externo',
        label: 'Diâmetro Externo da Tampa (mm)',
        type: 'number',
        default: 240,
        min: 140,
        max: 250,
        step: 2,
        group: 'Dimensões da Tampa (Padrão Stanley)',
      },
      {
        name: 'espessura_base',
        label: 'Espessura da Placa (mm)',
        type: 'number',
        default: 4.0,
        min: 2.5,
        max: 6.0,
        step: 0.5,
        group: 'Dimensões da Tampa (Padrão Stanley)',
      },
      {
        name: 'cor_base',
        label: 'Cor das Peças da Tampa',
        type: 'color',
        default: '#f97316',
        previewOnly: true,
      },
      {
        name: 'cor_texto',
        label: 'Cor do Texto / Relevo',
        type: 'color',
        default: '#ffffff',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'base', label: 'Peças da Tampa (Superior e Inferior)', colorParam: 'cor_base' },
      { name: 'relevo', label: 'Texto, Logo e Detalhes', colorParam: 'cor_texto' },
    ],
  },

  async generate(params) {
    const textoSuperior = String(params.texto_superior ?? 'STANLEY JUG');
    const inverterVerticalSuperior = Boolean(params.inverter_vertical_superior ?? false);
    const textoInferior = String(params.texto_inferior ?? 'SEU NOME AQUI');
    const leituraInferior = String(params.leitura_inferior || 'direito');
    const inverterVerticalInferior = Boolean(params.inverter_vertical_inferior ?? false);

    const fonte = String(params.fonte || 'Montserrat');
    const alturaLetras = Number(params.altura_letras || 15);
    const espacamentoLetras = Number(params.espacamento_letras ?? 2.0);

    const tipoDecoracaoLateral = String(params.tipo_decoracao_lateral || 'estrelas');
    const iconeLateral = String(params.icone_lateral || 'estrela');
    const svgLateral = String(params.svg_lateral || '');
    const tamanhoDecoracaoLateral = Number(params.tamanho_decoracao_lateral || 14);
    const deslocamentoSvgX = Number(params.deslocamento_svg_x || 0);
    const deslocamentoSvgY = Number(params.deslocamento_svg_y || 0);
    const rotacaoSvg = Number(params.rotacao_svg || 0);
    const escalaSvg = Math.max(0.2, Number(params.escala_svg || 100) / 100);

    const adicionarBorda = Boolean(params.adicionar_borda ?? false);
    const larguraBorda = Number(params.largura_borda || 1.8);

    const modoRelevo = String(params.modo_relevo || 'alto_relevo');
    const alturaRelevo = Number(params.altura_relevo || 1.4);
    const pecasGeradas = String(params.pecas_geradas || 'ambas');
    const diametroExterno = Number(params.diametro_externo || 240);
    const espessuraBase = Number(params.espessura_base || 4.0);
    const corBase = String(params.cor_base || '#f97316');
    const corTexto = String(params.cor_texto || '#ffffff');

    // Proporções oficiais extraídas da Tampa do Stanley Jug (D = 240 mm, D_inner = 154 mm)
    const scale = diametroExterno / 240.0;
    const rOuter = 120.0 * scale;
    const rInner = 77.0 * scale;
    const notchHalfSpanX = 100.0 * scale;
    const notchHalfHeightY = 15.0 * scale;
    const notchCornerR = 5.0 * scale;

    // 1. Anel com os recortes laterais de alça
    const outerCircle = circlePolygon(rOuter, 0, 0, 144);
    const innerCircle = circlePolygon(rInner, 0, 0, 128);
    const handleNotch = roundedRectPolygon(
      notchHalfSpanX * 2,
      notchHalfHeightY * 2,
      notchCornerR,
      0,
      0,
      20
    );

    const fullRing2D = subtractPolygons(outerCircle, unionPolygons(innerCircle, handleNotch));

    // Divisão bipartida (metade superior e inferior)
    const splitGap = 1.2;
    const clipBoxSize = rOuter * 2.4;
    const topClipBox = rectPolygon(
      clipBoxSize,
      rOuter * 1.2,
      0,
      splitGap * 0.5 + rOuter * 0.6
    );
    const bottomClipBox = rectPolygon(
      clipBoxSize,
      rOuter * 1.2,
      0,
      -(splitGap * 0.5 + rOuter * 0.6)
    );

    const topHalfBase2D = intersectPolygons(fullRing2D, topClipBox);
    const bottomHalfBase2D =
      pecasGeradas === 'ambas' ? intersectPolygons(fullRing2D, bottomClipBox) : [];

    // 2. Raio médio e dimensões da faixa
    const rMid = (rOuter + rInner) * 0.5;
    const ringBandWidth = rOuter - rInner;
    const clampedLetterH = Math.min(alturaLetras * scale, ringBandWidth * 0.72);
    const scaledSpacing = espacamentoLetras * scale;

    const topDecorPolys: Polygons2D[] = [];
    const bottomDecorPolys: Polygons2D[] = [];

    // Texto Circular Superior (reflete verticalmente no lugar se inverterVerticalSuperior)
    if (textoSuperior.trim().length > 0) {
      const topTextPoly = await circularTextToPolygons(
        textoSuperior,
        fonte,
        clampedLetterH,
        rMid,
        {
          anchorAngleDeg: 0,
          letterSpacingMm: scaledSpacing,
          flip: inverterVerticalSuperior,
        }
      );
      topDecorPolys.push(translatePolygons(topTextPoly, 0, splitGap * 0.5));
    }

    // Texto Circular Inferior (reflete verticalmente no lugar se inverterVerticalInferior)
    if (pecasGeradas === 'ambas' && textoInferior.trim().length > 0) {
      const shouldFlipBottom =
        leituraInferior === 'direito'
          ? !inverterVerticalInferior
          : inverterVerticalInferior;

      const bottomTextPoly = await circularTextToPolygons(
        textoInferior,
        fonte,
        clampedLetterH,
        rMid,
        {
          anchorAngleDeg: 180,
          letterSpacingMm: scaledSpacing,
          flip: shouldFlipBottom,
        }
      );
      bottomDecorPolys.push(translatePolygons(bottomTextPoly, 0, -splitGap * 0.5));
    }

    // 3. Decoração das Laterais (Ícones da galeria OU SVG Personalizado)
    if (tipoDecoracaoLateral !== 'nenhum') {
      const maxDecoSize = Math.min(
        tamanhoDecoracaoLateral * scale,
        ringBandWidth * 0.8
      );

      let lateralPolys: Polygons2D = [];
      if (tipoDecoracaoLateral === 'svg_personalizado' && svgLateral.includes('<')) {
        lateralPolys = svgToPolygons(svgLateral, maxDecoSize * escalaSvg);
        if (rotacaoSvg !== 0) {
          lateralPolys = rotatePolygons(lateralPolys, rotacaoSvg);
        }
      } else if (tipoDecoracaoLateral === 'estrelas') {
        lateralPolys = shapeGalleryToPolygons(iconeLateral, maxDecoSize);
      }

      if (lateralPolys.length > 0) {
        // Ângulos ±73° na peça superior e ±107° na peça inferior
        const topAngles = [-73, 73];
        for (const angDeg of topAngles) {
          const rad = (angDeg * Math.PI) / 180;
          const sgn = angDeg < 0 ? -1 : 1;
          const ix = (rMid + deslocamentoSvgY) * Math.sin(rad) + sgn * deslocamentoSvgX;
          const iy = (rMid + deslocamentoSvgY) * Math.cos(rad) + splitGap * 0.5;
          topDecorPolys.push(
            translatePolygons(rotatePolygons(lateralPolys, -angDeg), ix, iy)
          );
        }

        if (pecasGeradas === 'ambas') {
          const botAngles = [-107, 107];
          for (const angDeg of botAngles) {
            const rad = (angDeg * Math.PI) / 180;
            const sgn = angDeg < 0 ? -1 : 1;
            const ix = (rMid + deslocamentoSvgY) * Math.sin(rad) + sgn * deslocamentoSvgX;
            const iy = (rMid + deslocamentoSvgY) * Math.cos(rad) - splitGap * 0.5;
            bottomDecorPolys.push(
              translatePolygons(
                rotatePolygons(lateralPolys, 180 - angDeg),
                ix,
                iy
              )
            );
          }
        }
      }
    }

    // 4. Borda / Contorno decorativo em relevo
    if (adicionarBorda) {
      const bW = Math.min(larguraBorda * scale, ringBandWidth * 0.22);
      const makeHalfRim = (halfPoly: Polygons2D): Polygons2D => {
        if (halfPoly.length === 0) return [];
        const inset = offsetPolygons(halfPoly, -bW, 'round');
        return subtractPolygons(halfPoly, inset);
      };
      const topRim = makeHalfRim(topHalfBase2D);
      const bottomRim = makeHalfRim(bottomHalfBase2D);
      topDecorPolys.push(topRim);
      if (bottomRim.length > 0) bottomDecorPolys.push(bottomRim);
    }

    // 5. Unifica e recorta os relevos dentro das metades da base
    const topDecor2D =
      topDecorPolys.length > 0
        ? intersectPolygons(unionPolygons(...topDecorPolys), topHalfBase2D)
        : [];
    const bottomDecor2D =
      bottomDecorPolys.length > 0 && bottomHalfBase2D.length > 0
        ? intersectPolygons(unionPolygons(...bottomDecorPolys), bottomHalfBase2D)
        : [];

    const allBase2D = unionPolygons(topHalfBase2D, bottomHalfBase2D);
    const allDecor2D = unionPolygons(topDecor2D, bottomDecor2D);

    const relevoEfetivo = Math.min(alturaRelevo, espessuraBase * 0.6);
    const baseGeoms: THREE.BufferGeometry[] = [];
    let relevoGeom = new THREE.BufferGeometry();

    if (modoRelevo === 'baixo_relevo' && allDecor2D.length > 0) {
      const solidBottomH = Math.max(1.0, espessuraBase - relevoEfetivo);
      baseGeoms.push(extrudePolygons(allBase2D, { height: solidBottomH, zOffset: 0 }));

      const carvedTop2D = subtractPolygons(allBase2D, allDecor2D);
      baseGeoms.push(
        extrudePolygons(carvedTop2D, {
          height: espessuraBase - solidBottomH,
          zOffset: solidBottomH,
        })
      );

      relevoGeom = extrudePolygons(allDecor2D, {
        height: Math.min(0.4, relevoEfetivo * 0.4),
        zOffset: solidBottomH,
      });
    } else {
      baseGeoms.push(extrudePolygons(allBase2D, { height: espessuraBase, zOffset: 0 }));
      if (allDecor2D.length > 0) {
        relevoGeom = extrudePolygons(allDecor2D, {
          height: relevoEfetivo + 0.2,
          zOffset: espessuraBase - 0.2,
        });
      }
    }

    const baseGeom = mergeGeometries(baseGeoms);

    const parts: GeneratedPartMesh[] = [
      {
        name: 'base',
        label: pecasGeradas === 'ambas' ? 'Coroa Bipartida (Tampa Stanley)' : 'Coroa Meia-Lua (Topo)',
        geometry: baseGeom,
        color: corBase,
      },
    ];

    if (relevoGeom.getAttribute('position')?.count > 0) {
      parts.push({
        name: 'relevo',
        label: modoRelevo === 'baixo_relevo' ? 'Entalhe / Infill Decorativo' : 'Gravação / Relevo',
        geometry: relevoGeom,
        color: corTexto,
      });
    }

    return {
      parts,
      fichaTecnica: {
        title: 'Medidas da Coroa Stanley Jug (Escala 1:1)',
        items: [
          { label: 'Diâmetro Externo', value: `${diametroExterno.toFixed(0)} mm` },
          { label: 'Diâmetro do Vão Central', value: `${(154.0 * scale).toFixed(0)} mm` },
          { label: 'Vão das Alças Laterais', value: `${(200.0 * scale).toFixed(0)} × ${(30.0 * scale).toFixed(0)} mm` },
          { label: 'Espessura da Placa', value: `${espessuraBase.toFixed(1)} mm` },
          { label: 'Peças Inclusas', value: pecasGeradas === 'ambas' ? '2 peças (Bipartida)' : '1 peça (Superior)' },
          { label: 'Acabamento', value: modoRelevo === 'baixo_relevo' ? 'Baixo-Relevo (Entalhado)' : 'Alto-Relevo (3D)' },
        ],
      },
    };
  },
};
