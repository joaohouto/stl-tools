import * as THREE from 'three';
import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  Polygons2D,
  offsetPolygons,
  unionPolygons,
  subtractPolygons,
  translatePolygons,
  scalePolygons,
  getBounds2D,
  circlePolygon,
  roundedRectPolygon,
  textToPolygons,
  shapeGalleryToPolygons,
  svgToPolygons,
  extrudePolygons,
  extrudeBeveledPolygons,
  mergeGeometries,
  transformGeometry,
} from '@/engine/cad';

export const caixaComTampaModule: ProductModule = {
  schema: {
    id: 'caixa-com-tampa',
    name: 'Caixa Organizadora / Presente com Tampa de Encaixe',
    shortDescription:
      'Caixa paramétrica sob medida (retangular, redonda ou hexagonal) com tampa de encaixe calibrado e tampa personalizável.',
    description:
      'Gere caixas de presente, estojos organizadores, porta-joias ou cases sob medida com tampa de encaixe preciso (degrau interno calibrado). Imprime a caixa e a tampa lado a lado na mesa sem necessidade de suportes, com opção de texto ou logo na tampa.',
    categories: ['organizacao', 'acessorios'],
    featured: true,
    free: true,
    creditCost: 1,
    addedAt: '2026-10-31',
    badge: 'Novo',
    params: [
      {
        name: 'formato',
        label: 'Formato da Caixa',
        type: 'enum',
        default: 'retangular',
        options: [
          { value: 'retangular', label: 'Retangular / Quadrada Arredondada' },
          { value: 'redonda', label: 'Cilíndrica / Redonda' },
          { value: 'hexagonal', label: 'Hexagonal Moderna' },
        ],
        group: 'Dimensões e Encaixe',
      },
      {
        name: 'largura',
        label: 'Largura X / Diâmetro (mm)',
        type: 'number',
        default: 72,
        min: 30,
        max: 200,
        step: 2,
        group: 'Dimensões e Encaixe',
      },
      {
        name: 'profundidade',
        label: 'Profundidade Y (mm)',
        type: 'number',
        default: 60,
        min: 30,
        max: 200,
        step: 2,
        visibleIf: 'formato=retangular',
        group: 'Dimensões e Encaixe',
      },
      {
        name: 'altura_caixa',
        label: 'Altura da Caixa Base (mm)',
        type: 'number',
        default: 36,
        min: 15,
        max: 140,
        step: 2,
        group: 'Dimensões e Encaixe',
      },
      {
        name: 'altura_aba_tampa',
        label: 'Altura do Colarinho de Encaixe da Tampa (mm)',
        type: 'number',
        default: 6,
        min: 3,
        max: 16,
        step: 1,
        group: 'Dimensões e Encaixe',
      },
      {
        name: 'parede',
        label: 'Espessura das Paredes (mm)',
        type: 'number',
        default: 2.4,
        min: 1.6,
        max: 4.8,
        step: 0.2,
        group: 'Dimensões e Encaixe',
      },
      {
        name: 'raio_canto',
        label: 'Arredondamento dos Cantos (mm)',
        type: 'number',
        default: 8,
        min: 2,
        max: 30,
        step: 1,
        visibleIf: 'formato=retangular',
        group: 'Dimensões e Encaixe',
      },
      {
        name: 'folga_tampa',
        label: 'Folga de Encaixe da Tampa (mm)',
        type: 'number',
        default: 0.22,
        min: 0.1,
        max: 0.5,
        step: 0.02,
        helpText: '0.20 a 0.25mm garante encaixe suave sem cair e sem travar',
        group: 'Dimensões e Encaixe',
      },
      {
        name: 'ativar_filete',
        label: 'Filete / Chanfro Suave nas Bordas',
        type: 'boolean',
        default: true,
        group: 'Dimensões e Encaixe',
      },
      {
        name: 'raio_filete',
        label: 'Raio do Filete / Chanfro (mm)',
        type: 'number',
        default: 1.2,
        min: 0.4,
        max: 3.0,
        step: 0.2,
        visibleIf: 'ativar_filete=true',
        group: 'Dimensões e Encaixe',
      },
      {
        name: 'posicao_tampa',
        label: 'Disposição da Tampa no Preview / Exportação',
        type: 'enum',
        default: 'ao_lado',
        options: [
          { value: 'ao_lado', label: 'Ao Lado na Mesa (Pronto p/ Fatiar sem Suporte)' },
          { value: 'fechada', label: 'Encaixada Sobre a Caixa (Visualização Montada)' },
        ],
        group: 'Dimensões e Encaixe',
      },
      {
        name: 'arte_tampa',
        label: 'Personalização na Tampa',
        type: 'enum',
        default: 'texto_icone',
        options: [
          { value: 'liso', label: 'Tampa Lisa Minimalista' },
          { value: 'texto_icone', label: 'Texto + Ícone / Logo' },
          { value: 'apenas_texto', label: 'Apenas Texto / Nome' },
          { value: 'apenas_icone', label: 'Apenas Ícone / SVG' },
        ],
        group: 'Personalização da Tampa',
      },
      {
        name: 'texto',
        label: 'Texto na Tampa',
        type: 'string',
        default: 'TREASURE',
        maxLength: 20,
        visibleIf: 'arte_tampa=texto_icone|apenas_texto',
        group: 'Personalização da Tampa',
      },
      {
        name: 'fonte',
        label: 'Fonte do Texto',
        type: 'font',
        default: 'Montserrat',
        visibleIf: 'arte_tampa=texto_icone|apenas_texto',
        group: 'Personalização da Tampa',
      },
      {
        name: 'origem_icone',
        label: 'Origem do Ícone',
        type: 'enum',
        default: 'galeria',
        options: [
          { value: 'galeria', label: 'Galeria de Formas' },
          { value: 'svg', label: 'Enviar SVG / Logo' },
        ],
        visibleIf: 'arte_tampa=texto_icone|apenas_icone',
        group: 'Personalização da Tampa',
      },
      {
        name: 'icone',
        label: 'Ícone da Galeria',
        type: 'shape',
        default: 'coroa',
        visibleIf: 'arte_tampa=texto_icone|apenas_icone&origem_icone=galeria',
        group: 'Personalização da Tampa',
      },
      {
        name: 'icone_svg',
        label: 'Seu SVG / Logo',
        type: 'svg',
        default: '',
        visibleIf: 'arte_tampa=texto_icone|apenas_icone&origem_icone=svg',
        group: 'Personalização da Tampa',
      },
      {
        name: 'modo_relevo',
        label: 'Modo de Gravação na Tampa',
        type: 'enum',
        default: 'baixo_relevo',
        options: [
          { value: 'baixo_relevo', label: 'Baixo-Relevo (Entalhado na Tampa)' },
          { value: 'alto_relevo', label: 'Alto-Relevo (Sobressalente no Topo)' },
        ],
        visibleIf: 'arte_tampa!=liso',
        group: 'Personalização da Tampa',
      },
      {
        name: 'cor_caixa',
        label: 'Cor da Caixa e Tampa',
        type: 'color',
        default: '#f97316',
        previewOnly: true,
      },
      {
        name: 'cor_detalhe',
        label: 'Cor da Arte / Detalhe na Tampa',
        type: 'color',
        default: '#ffffff',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'caixa', label: 'Corpo da Caixa Base', colorParam: 'cor_caixa' },
      { name: 'tampa', label: 'Tampa com Colarinho de Encaixe', colorParam: 'cor_caixa' },
      { name: 'detalhe', label: 'Arte Personalizada da Tampa', colorParam: 'cor_detalhe' },
    ],
  },

  async generate(params) {
    const formato = String(params.formato || 'retangular');
    const largura = Number(params.largura || 72);
    const profundidade = formato === 'retangular' ? Number(params.profundidade || 60) : largura;
    const alturaCaixa = Number(params.altura_caixa || 36);
    const alturaAba = Number(params.altura_aba_tampa || 6);
    const parede = Number(params.parede || 2.4);
    const raioCanto = Number(params.raio_canto || 8);
    const folga = Number(params.folga_tampa ?? 0.22);
    const ativarFilete = Boolean(params.ativar_filete ?? true);
    const raioFilete = Number(params.raio_filete || 1.2);
    const posicaoTampa = String(params.posicao_tampa || 'ao_lado');
    const arteTampa = String(params.arte_tampa || 'texto_icone');
    const texto = String(params.texto || 'TREASURE').trim();
    const fonte = String(params.fonte || 'Montserrat');
    const origemIcone = String(params.origem_icone || 'galeria');
    const icone = String(params.icone || 'coroa');
    const iconeSvg = String(params.icone_svg || '');
    const modoRelevo = String(params.modo_relevo || 'baixo_relevo');
    const corCaixa = String(params.cor_caixa || '#f97316');
    const corDetalhe = String(params.cor_detalhe || '#ffffff');

    // 1. Silhueta 2D externa da caixa
    let outer2D: Polygons2D = [];
    if (formato === 'redonda') {
      outer2D = circlePolygon(largura * 0.5, 0, 0, 72);
    } else if (formato === 'hexagonal') {
      outer2D = offsetPolygons(
        shapeGalleryToPolygons('hexagono', largura - 4),
        2.0,
        'round'
      );
    } else {
      const rSafe = Math.min(raioCanto, Math.min(largura, profundidade) * 0.45);
      outer2D = roundedRectPolygon(largura, profundidade, rSafe, 0, 0, 24);
    }

    const innerCavity2D = offsetPolygons(outer2D, -parede, 'round');
    const boxWalls2D = subtractPolygons(outer2D, innerCavity2D);
    const floorH = Math.max(2.0, parede);

    const boxFloorGeom = ativarFilete
      ? extrudeBeveledPolygons(outer2D, {
          height: floorH,
          zOffset: 0,
          bevelSize: Math.min(raioFilete, floorH * 0.4),
          bevelSegments: 4,
          filletBottom: true,
          filletTop: false,
        })
      : extrudePolygons(outer2D, { height: floorH, zOffset: 0 });

    const boxWallGeom = extrudePolygons(boxWalls2D, {
      height: alturaCaixa - floorH,
      zOffset: floorH,
    });
    let caixaGeom = mergeGeometries([boxFloorGeom, boxWallGeom]);

    // 2. Arte da tampa 2D
    const innerBounds = getBounds2D(innerCavity2D);
    const maxArtW = innerBounds.width * 0.72;
    const maxArtH = innerBounds.height * 0.72;
    let art2D: Polygons2D = [];

    const fitArt = (polys: Polygons2D, limW: number, limH: number): Polygons2D => {
      const b = getBounds2D(polys);
      if (b.width <= 0 || b.height <= 0) return polys;
      const s = Math.min(1, limW / b.width, limH / b.height);
      return s < 1 ? scalePolygons(polys, s, s) : polys;
    };

    if (arteTampa !== 'liso') {
      if (arteTampa === 'apenas_icone') {
        const rawI =
          origemIcone === 'svg' && iconeSvg.includes('<')
            ? svgToPolygons(iconeSvg, Math.min(maxArtW, maxArtH) * 0.75)
            : shapeGalleryToPolygons(icone, Math.min(maxArtW, maxArtH) * 0.75);
        art2D = fitArt(rawI, maxArtW, maxArtH);
      } else if (arteTampa === 'apenas_texto' && texto) {
        const rawT = await textToPolygons(texto, fonte, Math.min(12, maxArtH * 0.35));
        art2D = fitArt(rawT, maxArtW, maxArtH);
      } else if (arteTampa === 'texto_icone') {
        const iconSz = Math.min(maxArtW, maxArtH) * 0.44;
        const rawI =
          origemIcone === 'svg' && iconeSvg.includes('<')
            ? svgToPolygons(iconeSvg, iconSz)
            : shapeGalleryToPolygons(icone, iconSz);
        const placedI = translatePolygons(rawI, 0, texto ? maxArtH * 0.14 : 0);
        if (texto) {
          const rawT = await textToPolygons(texto, fonte, Math.min(9.5, maxArtH * 0.24));
          const fittedT = fitArt(rawT, maxArtW, maxArtH * 0.35);
          const placedT = translatePolygons(fittedT, 0, -maxArtH * 0.24);
          art2D = unionPolygons(placedI, placedT);
        } else {
          art2D = placedI;
        }
      }
    }

    // 3. Construção da Tampa (placa superior de espessura `lidTopH` + colarinho interno de encaixe `lidLip2D`)
    const lidTopH = Math.max(2.2, parede);
    const lipOuter2D = offsetPolygons(innerCavity2D, -folga, 'round');
    const lipInner2D = offsetPolygons(lipOuter2D, -Math.max(1.4, parede * 0.75), 'round');
    const lidLipRing2D = subtractPolygons(lipOuter2D, lipInner2D);

    let tampaGeom: THREE.BufferGeometry;
    let detalheGeom = new THREE.BufferGeometry();

    if (posicaoTampa === 'ao_lado') {
      if (modoRelevo === 'baixo_relevo' && art2D.length > 0) {
        const cavDepth = 0.8;
        const collarGeom = extrudePolygons(lidLipRing2D, {
          height: alturaAba,
          zOffset: 0,
        });
        const solidPlateGeom = extrudePolygons(outer2D, {
          height: lidTopH - cavDepth,
          zOffset: alturaAba,
        });
        const carvedTop2D = subtractPolygons(outer2D, art2D);
        const carvedTopGeom = ativarFilete
          ? extrudeBeveledPolygons(carvedTop2D, {
              height: cavDepth,
              zOffset: alturaAba + lidTopH - cavDepth,
              bevelSize: Math.min(raioFilete, cavDepth * 0.45),
              bevelSegments: 4,
              filletBottom: false,
              filletTop: true,
            })
          : extrudePolygons(carvedTop2D, {
              height: cavDepth,
              zOffset: alturaAba + lidTopH - cavDepth,
            });
        tampaGeom = mergeGeometries([collarGeom, solidPlateGeom, carvedTopGeom]);
        detalheGeom = extrudePolygons(art2D, {
          height: 0.35,
          zOffset: alturaAba + lidTopH - cavDepth,
        });
      } else {
        const collarGeom = extrudePolygons(lidLipRing2D, {
          height: alturaAba,
          zOffset: 0,
        });
        const topPlateGeom = ativarFilete
          ? extrudeBeveledPolygons(outer2D, {
              height: lidTopH,
              zOffset: alturaAba,
              bevelSize: Math.min(raioFilete, lidTopH * 0.4),
              bevelSegments: 4,
              filletBottom: false,
              filletTop: true,
            })
          : extrudePolygons(outer2D, {
              height: lidTopH,
              zOffset: alturaAba,
            });
        tampaGeom = mergeGeometries([collarGeom, topPlateGeom]);
        if (art2D.length > 0) {
          detalheGeom = extrudePolygons(art2D, {
            height: 1.0,
            zOffset: alturaAba + lidTopH,
          });
        }
      }

      const bOuter = getBounds2D(outer2D);
      const shiftX = bOuter.width * 0.5 + 6;
      caixaGeom = transformGeometry(caixaGeom, { translate: [-shiftX, 0, 0] });
      tampaGeom = transformGeometry(tampaGeom, { translate: [shiftX, 0, 0] });
      if (detalheGeom.getAttribute('position')?.count > 0) {
        detalheGeom = transformGeometry(detalheGeom, { translate: [shiftX, 0, 0] });
      }
    } else {
      // Tampa encaixada sobre a caixa
      const collarGeom = extrudePolygons(lidLipRing2D, {
        height: alturaAba,
        zOffset: alturaCaixa - alturaAba,
      });

      if (modoRelevo === 'baixo_relevo' && art2D.length > 0) {
        const cavDepth = 0.8;
        const solidPlateGeom = extrudePolygons(outer2D, {
          height: lidTopH - cavDepth,
          zOffset: alturaCaixa,
        });
        const carvedTop2D = subtractPolygons(outer2D, art2D);
        const carvedTopGeom = ativarFilete
          ? extrudeBeveledPolygons(carvedTop2D, {
              height: cavDepth,
              zOffset: alturaCaixa + lidTopH - cavDepth,
              bevelSize: Math.min(raioFilete, cavDepth * 0.45),
              bevelSegments: 4,
              filletBottom: false,
              filletTop: true,
            })
          : extrudePolygons(carvedTop2D, {
              height: cavDepth,
              zOffset: alturaCaixa + lidTopH - cavDepth,
            });
        tampaGeom = mergeGeometries([collarGeom, solidPlateGeom, carvedTopGeom]);
        detalheGeom = extrudePolygons(art2D, {
          height: 0.35,
          zOffset: alturaCaixa + lidTopH - cavDepth,
        });
      } else {
        const topPlateGeom = ativarFilete
          ? extrudeBeveledPolygons(outer2D, {
              height: lidTopH,
              zOffset: alturaCaixa,
              bevelSize: Math.min(raioFilete, lidTopH * 0.4),
              bevelSegments: 4,
              filletBottom: false,
              filletTop: true,
            })
          : extrudePolygons(outer2D, {
              height: lidTopH,
              zOffset: alturaCaixa,
            });
        tampaGeom = mergeGeometries([collarGeom, topPlateGeom]);
        if (art2D.length > 0) {
          detalheGeom = extrudePolygons(art2D, {
            height: 1.0,
            zOffset: alturaCaixa + lidTopH,
          });
        }
      }
    }

    const parts: GeneratedPartMesh[] = [
      {
        name: 'caixa',
        label: 'Caixa Base',
        geometry: caixaGeom,
        color: corCaixa,
      },
      {
        name: 'tampa',
        label: 'Tampa',
        geometry: tampaGeom,
        color: corCaixa,
      },
    ];

    if (detalheGeom.getAttribute('position')?.count > 0) {
      parts.push({
        name: 'detalhe',
        label: modoRelevo === 'baixo_relevo' ? 'Entalhe na Tampa' : 'Relevo da Tampa',
        geometry: detalheGeom,
        color: corDetalhe,
      });
    }

    return {
      parts,
      fichaTecnica: {
        title: 'Especificações da Caixa',
        items: [
          {
            label: 'Formato',
            value:
              formato === 'redonda'
                ? 'Cilíndrico / Redondo'
                : formato === 'hexagonal'
                ? 'Hexagonal'
                : 'Retangular',
          },
          {
            label: 'Dimensões Externas',
            value: `${largura.toFixed(0)} × ${profundidade.toFixed(0)} × ${alturaCaixa.toFixed(0)} mm`,
          },
          {
            label: 'Cavidade Útil Interna',
            value: `${(largura - parede * 2).toFixed(1)} × ${(profundidade - parede * 2).toFixed(1)} × ${(alturaCaixa - floorH).toFixed(1)} mm`,
          },
          {
            label: 'Acabamento das Bordas',
            value: ativarFilete ? `Filete Suave (${raioFilete.toFixed(1)} mm)` : 'Borda Reta 90°',
          },
          { label: 'Folga da Tampa', value: `${folga.toFixed(2)} mm` },
        ],
      },
    };
  },
};
