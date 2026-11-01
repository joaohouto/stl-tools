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
  translatePolygons,
  rotatePolygons,
  circularTextToPolygons,
  shapeGalleryToPolygons,
  extrudePolygons,
  mergeGeometries,
} from '@/engine/cad';

export const tampaStanleyJugModule: ProductModule = {
  schema: {
    id: 'tampa-stanley-jug',
    name: 'Coroa Personalizada p/ Tampa de Stanley Jug',
    shortDescription:
      'Conjunto bipartido (peça superior e inferior) com encaixe exato para tampa de Stanley Jug e texto circular personalizado.',
    description:
      'Personalização circular em duas metades simétricas projetada sob medida para a tampa do galão térmico Stanley Jug. Permite gravar textos circulares independentes na metade superior e inferior em alto ou baixo-relevo.',
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
        name: 'texto_inferior',
        label: 'Texto Circular — Peça Inferior',
        type: 'string',
        default: 'SEU NOME AQUI',
        maxLength: 28,
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
        name: 'incluir_estrelas',
        label: 'Incluir Ícones Decorativos nas Laterais',
        type: 'boolean',
        default: true,
        group: 'Personalização e Relevo',
      },
      {
        name: 'icone_lateral',
        label: 'Ícone Decorativo',
        type: 'shape',
        default: 'estrela',
        visibleIf: 'incluir_estrelas=true',
        group: 'Personalização e Relevo',
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
        group: 'Personalização e Relevo',
      },
      {
        name: 'altura_relevo',
        label: 'Altura / Profundidade do Relevo (mm)',
        type: 'number',
        default: 1.4,
        min: 0.6,
        max: 2.5,
        step: 0.2,
        group: 'Personalização e Relevo',
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
      { name: 'relevo', label: 'Texto Circular Personalizado', colorParam: 'cor_texto' },
    ],
  },

  async generate(params) {
    const textoSuperior = String(params.texto_superior ?? 'STANLEY JUG');
    const textoInferior = String(params.texto_inferior ?? 'SEU NOME AQUI');
    const fonte = String(params.fonte || 'Montserrat');
    const alturaLetras = Number(params.altura_letras || 15);
    const espacamentoLetras = Number(params.espacamento_letras ?? 2.0);
    const leituraInferior = String(params.leitura_inferior || 'direito');
    const incluirEstrelas = Boolean(params.incluir_estrelas ?? true);
    const iconeLateral = String(params.icone_lateral || 'estrela');
    const modoRelevo = String(params.modo_relevo || 'alto_relevo');
    const alturaRelevo = Number(params.altura_relevo || 1.4);
    const pecasGeradas = String(params.pecas_geradas || 'ambas');
    const diametroExterno = Number(params.diametro_externo || 240);
    const espessuraBase = Number(params.espessura_base || 4.0);
    const corBase = String(params.cor_base || '#f97316');
    const corTexto = String(params.cor_texto || '#ffffff');

    // Proporções exatas extraídas do modelo de referência TampaStanleyJug.stl:
    // R_outer = 120.0 mm (D = 240 mm)
    // R_inner = 77.0 mm (D = 154 mm)
    // Recorte lateral de encaixe da alça: largura total 200.0 mm (±100 mm), altura 30.0 mm (±15 mm a partir da linha divisória), raio de canto 5.0 mm
    const scale = diametroExterno / 240.0;
    const rOuter = 120.0 * scale;
    const rInner = 77.0 * scale;
    const notchHalfSpanX = 100.0 * scale;
    const notchHalfHeightY = 15.0 * scale;
    const notchCornerR = 5.0 * scale;

    // 1. Constrói o anel completo com os dois encaixes laterais arredondados idênticos ao TampaStanleyJug.stl
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

    // Separa na metade superior (Y > 0) e metade inferior (Y < 0) com uma fenda visual de 1.2mm
    // para que as 2 peças fiquem claramente individualizadas no preview e no fatiador
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

    // 2. Gera o texto circular ao longo do raio médio da coroa (R_mid = 98.5 mm na escala 1:1)
    const rMid = (rOuter + rInner) * 0.5;
    const ringBandWidth = rOuter - rInner;
    const clampedLetterH = Math.min(alturaLetras * scale, ringBandWidth * 0.72);
    const scaledSpacing = espacamentoLetras * scale;

    const topDecorPolys: Polygons2D[] = [];
    const bottomDecorPolys: Polygons2D[] = [];

    if (textoSuperior.trim().length > 0) {
      const topTextPoly = await circularTextToPolygons(
        textoSuperior,
        fonte,
        clampedLetterH,
        rMid,
        {
          anchorAngleDeg: 0,
          letterSpacingMm: scaledSpacing,
          flip: false,
        }
      );
      topDecorPolys.push(translatePolygons(topTextPoly, 0, splitGap * 0.5));
    }

    if (pecasGeradas === 'ambas' && textoInferior.trim().length > 0) {
      const bottomTextPoly = await circularTextToPolygons(
        textoInferior,
        fonte,
        clampedLetterH,
        rMid,
        {
          anchorAngleDeg: 180,
          letterSpacingMm: scaledSpacing,
          flip: leituraInferior === 'direito',
        }
      );
      bottomDecorPolys.push(translatePolygons(bottomTextPoly, 0, -splitGap * 0.5));
    }

    if (incluirEstrelas) {
      const iconSize = Math.min(clampedLetterH * 0.85, ringBandWidth * 0.5);
      const rawIcon = shapeGalleryToPolygons(iconeLateral, iconSize);
      // Posiciona ícones nos ângulos ±73° (peça superior) e ±107° (peça inferior)
      const topIconAngles = [-73, 73];
      for (const angDeg of topIconAngles) {
        const rad = (angDeg * Math.PI) / 180;
        const ix = rMid * Math.sin(rad);
        const iy = rMid * Math.cos(rad) + splitGap * 0.5;
        topDecorPolys.push(translatePolygons(rotatePolygons(rawIcon, -angDeg), ix, iy));
      }

      if (pecasGeradas === 'ambas') {
        const botIconAngles = [-107, 107];
        for (const angDeg of botIconAngles) {
          const rad = (angDeg * Math.PI) / 180;
          const ix = rMid * Math.sin(rad);
          const iy = rMid * Math.cos(rad) - splitGap * 0.5;
          bottomDecorPolys.push(
            translatePolygons(rotatePolygons(rawIcon, 180 - angDeg), ix, iy)
          );
        }
      }
    }

    // Garante que todo texto/ícone fique estritamente contido dentro das respectivas meias-luas
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
        label:
          pecasGeradas === 'ambas'
            ? 'Peças Superior e Inferior da Tampa'
            : 'Peça Meia-Lua da Tampa',
        geometry: baseGeom,
        color: corBase,
      },
    ];

    if (relevoGeom.getAttribute('position')?.count > 0) {
      parts.push({
        name: 'relevo',
        label: 'Texto Circular Personalizado',
        geometry: relevoGeom,
        color: corTexto,
      });
    }

    return {
      parts,
      fichaTecnica: {
        title: 'Ficha Técnica — Tampa Stanley Jug',
        items: [
          {
            label: 'Diâmetro Externo × Interno',
            value: `${(rOuter * 2).toFixed(0)} × ${(rInner * 2).toFixed(0)} mm`,
          },
          {
            label: 'Encaixe Central p/ Alça',
            value: `${(notchHalfSpanX * 2).toFixed(0)} × ${(notchHalfHeightY * 2).toFixed(0)} mm (R=${notchCornerR.toFixed(1)}mm)`,
          },
          { label: 'Espessura da Placa', value: `${espessuraBase.toFixed(1)} mm` },
          {
            label: 'Peças Geradas',
            value: pecasGeradas === 'ambas' ? '2 Peças (Superior + Inferior)' : '1 Peça (Meia-Lua)',
          },
        ],
      },
    };
  },
};
