import * as THREE from "three";
import { ProductModule, GeneratedPartMesh } from "@/engine/types";
import {
  Polygons2D,
  Point2D,
  offsetPolygons,
  unionPolygons,
  translatePolygons,
  getBounds2D,
  circlePolygon,
  rectPolygon,
  roundedPolygonFromVertices,
  subtractPolygons,
  textToPolygons,
  shapeGalleryToPolygons,
  svgToPolygons,
  extrudePolygons,
  extrudeProfileAlongX,
  transformGeometry,
  mergeGeometries,
} from "@/engine/cad";

/**
 * Constrói o corpo contornado do enfeite com túnel prismático 100% liso (extrudado ao longo do eixo X).
 * - Paredes externas curvas seguem o contorno da bolha em Z.
 * - O núcleo do furo passante é extrudado analiticamente ao longo de X (`extrudeProfileAlongX`),
 *   eliminando 100% qualquer efeito de degrau/escada nos perfis Cilíndrico, Sextavado e Triangular.
 */
function buildPencilSleeveBody(
  baseContour2D: Polygons2D,
  diametroLapis: number,
  comprimentoX: { minX: number; maxX: number },
  topCavity2D?: Polygons2D,
  topCavityDepth = 0,
  tipoEncaixe: "cilindro" | "hexagono" | "triangulo" = "hexagono",
): THREE.BufferGeometry {
  const raioFuro = diametroLapis / 2;
  const parede = 1.8;
  const alturaTotalBase = diametroLapis + parede * 2;
  const zCentroFuro = alturaTotalBase / 2;

  const zBottomFuro = zCentroFuro - raioFuro;
  const zTopFuro = zCentroFuro + raioFuro;

  // 1. Perfil 2D analítico exato do furo passante no plano YZ (Y = largura transversal, Z = altura)
  let holeProfileYZ: Polygons2D = [];
  let halfBoxY = raioFuro + 1.2;

  if (tipoEncaixe === "cilindro") {
    holeProfileYZ = circlePolygon(raioFuro, 0, zCentroFuro, 64);
    halfBoxY = raioFuro + 1.2;
  } else if (tipoEncaixe === "hexagono") {
    // Hexágono regular com topo e base planos (imprime sem suportes e encaixa lápis sextavado)
    // Diâmetro entre faces opostas (flat-to-flat) = diametroLapis => circumradius = raioFuro / cos(30°)
    const rHex = raioFuro / Math.cos(Math.PI / 6);
    const hexPts: Point2D[] = [];
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI) / 3;
      hexPts.push([Math.cos(ang) * rHex, zCentroFuro + Math.sin(ang) * rHex]);
    }
    holeProfileYZ = [hexPts];
    halfBoxY = rHex + 1.0;
  } else {
    // Perfil triangular prismático liso para lápis triangular
    const halfBase = raioFuro * 1.12;
    const triPts: Point2D[] = [
      [-halfBase, zBottomFuro],
      [halfBase, zBottomFuro],
      [0, zTopFuro + raioFuro * 0.12],
    ];
    holeProfileYZ = roundedPolygonFromVertices(triPts, 0.45);
    halfBoxY = halfBase + 1.0;
  }

  // Altura sólida até o topo (ou até o fundo da cavidade de baixo-relevo, sempre acima do furo)
  const safeCavityDepth =
    topCavity2D && topCavityDepth > 0
      ? Math.min(topCavityDepth, parede - 0.4)
      : 0;
  const solidHeightZ = alturaTotalBase - safeCavityDepth;

  const spanLenX = Math.max(12, comprimentoX.maxX - comprimentoX.minX);
  const midX = (comprimentoX.minX + comprimentoX.maxX) * 0.5;

  // 2. Núcleo central prismático contínuo de ponta a ponta (X = minX .. maxX, Z = 0 .. solidHeightZ)
  //    O furo com o formato exato da seção transversal atravessa 100% de um lado ao outro!
  const coreBoxYZ = rectPolygon(
    halfBoxY * 2 + 0.3,
    solidHeightZ,
    0,
    solidHeightZ * 0.5,
  );
  const tunnelWallYZ = subtractPolygons(coreBoxYZ, holeProfileYZ);
  const rawPrismGeom = extrudeProfileAlongX(tunnelWallYZ, spanLenX);
  const prismGeom = transformGeometry(rawPrismGeom, {
    translate: [midX, 0, 0],
  });

  // 3. Asas laterais contornadas fora da faixa central [-halfBoxY, +halfBoxY]
  const centralSlotXY = rectPolygon(spanLenX + 20, halfBoxY * 2, midX, 0);
  const sideWings2D = subtractPolygons(baseContour2D, centralSlotXY);
  const sideWingsGeom = extrudePolygons(sideWings2D, {
    height: solidHeightZ,
    zOffset: 0,
  });

  // 4. Camada superior recortada quando em modo baixo-relevo
  if (topCavity2D && safeCavityDepth > 0) {
    const centralSpine2D = rectPolygon(spanLenX, halfBoxY * 2 + 0.3, midX, 0);
    const fullTop2D = unionPolygons(baseContour2D, centralSpine2D);
    const faceRecortada2D = subtractPolygons(fullTop2D, topCavity2D);
    const recessedFaceGeom = extrudePolygons(faceRecortada2D, {
      height: safeCavityDepth,
      zOffset: solidHeightZ,
    });
    return mergeGeometries([prismGeom, sideWingsGeom, recessedFaceGeom]);
  }

  return mergeGeometries([prismGeom, sideWingsGeom]);
}

export const ponteiraLapisModule: ProductModule = {
  schema: {
    id: "ponteira-lapis",
    name: "Enfeite de Lápis (Nome ao Longo do Lápis)",
    shortDescription:
      "Nome em relevo num corpo contornado que entra no lápis por um furo passante horizontal. Troca de cor por camada.",
    description:
      "Enfeite personalizado para lápis grafite, lápis de cor e canetas. O nome acompanha longitudinalmente o sentido do lápis, com letras em alto-relevo na face superior e túnel horizontal passante. Imprime deitado, sem suporte, com troca de cor de filamento.",
    categories: ["acessorios", "chaveiros", "organizacao"],
    featured: true,
    free: true,
    creditCost: 1,
    addedAt: "2026-10-29",
    params: [
      {
        name: "texto",
        label: "Nome / Texto",
        type: "string",
        default: "JOÃO",
        maxLength: 14,
        group: "Personalização",
      },
      {
        name: "fonte",
        label: "Fonte do Nome",
        type: "font",
        default: "Lilita One",
        group: "Personalização",
      },
      {
        name: "altura_letras",
        label: "Altura das Letras (mm)",
        type: "number",
        default: 18,
        min: 12,
        max: 30,
        step: 1,
        group: "Personalização",
      },
      {
        name: "diametro_lapis",
        label: "Diâmetro do Lápis / Caneta (mm)",
        type: "number",
        default: 7.6,
        min: 6.8,
        max: 9.0,
        step: 0.1,
        helpText:
          "Lápis sextavado padrão: 7.4 a 7.6mm | Caneta Bic: 8.2 a 8.4mm",
        group: "Ajuste do Lápis",
      },
      {
        name: "tipo_encaixe",
        label: "Formato da Seção de Encaixe",
        type: "enum",
        default: "hexagono",
        options: [
          {
            value: "cilindro",
            label: "1. Cilíndrico / Redondo (Lápis e Canetas)",
          },
          {
            value: "hexagono",
            label: "2. Sextavado / Hexagonal (Padrão Grafite)",
          },
          {
            value: "triangulo",
            label: "3. Triangular (Lápis Ergonômicos / Jumbo)",
          },
        ],
        group: "Ajuste do Lápis",
      },
      {
        name: "relevo_texto",
        label: "Relevo do Texto (mm)",
        type: "number",
        default: 2.0,
        min: 1.0,
        max: 3.5,
        step: 0.2,
        group: "Personalização",
      },
      {
        name: "modo_relevo",
        label: "Modo do Relevo",
        type: "enum",
        default: "alto_relevo",
        options: [
          { value: "alto_relevo", label: "Alto-Relevo (Sobressalente)" },
          { value: "baixo_relevo", label: "Baixo-Relevo (Entalhado no Corpo)" },
        ],
        group: "Personalização",
      },
      {
        name: "incluir_icone",
        label: "Adicionar Ícone ao Lado",
        type: "boolean",
        default: false,
        group: "Ícone Opcional",
      },
      {
        name: "tipo_icone",
        label: "Origem do Ícone",
        type: "enum",
        default: "galeria",
        options: [
          { value: "galeria", label: "Galeria de Formas" },
          { value: "svg", label: "Enviar SVG / Logo" },
        ],
        visibleIf: "incluir_icone=true",
        group: "Ícone Opcional",
      },
      {
        name: "icone",
        label: "Ícone da Galeria",
        type: "shape",
        default: "coroa",
        visibleIf: "incluir_icone=true&tipo_icone=galeria",
        group: "Ícone Opcional",
      },
      {
        name: "icone_svg",
        label: "Seu SVG / Desenho",
        type: "svg",
        default: "",
        visibleIf: "incluir_icone=true&tipo_icone=svg",
        group: "Ícone Opcional",
      },
      {
        name: "posicao_icone",
        label: "Posição do Ícone",
        type: "enum",
        default: "esquerda",
        options: [
          { value: "esquerda", label: "Antes do Nome (Início)" },
          { value: "direita", label: "Depois do Nome (Fim)" },
        ],
        visibleIf: "incluir_icone=true",
        group: "Ícone Opcional",
      },
      {
        name: "cor_base",
        label: "Cor do Corpo",
        type: "color",
        default: "#f97316",
        previewOnly: true,
      },
      {
        name: "cor_texto",
        label: "Cor do Nome / Relevo",
        type: "color",
        default: "#ffffff",
        previewOnly: true,
      },
    ],
    parts: [
      {
        name: "corpo",
        label: "Corpo com Túnel do Lápis",
        colorParam: "cor_base",
      },
      {
        name: "texto",
        label: "Nome e Ícone em Relevo",
        colorParam: "cor_texto",
      },
    ],
  },

  async generate(params) {
    const texto = String(params.texto || "MIGUEL").trim() || "MIGUEL";
    const fonte = String(params.fonte || "Lilita One");
    const alturaLetras = Number(params.altura_letras || 18);
    const diametroLapis = Number(params.diametro_lapis || 7.6);
    const tipoEncaixe = (params.tipo_encaixe || "hexagono") as
      | "cilindro"
      | "hexagono"
      | "triangulo";
    const relevoTexto = Number(params.relevo_texto || 2.0);
    const modoRelevo = String(params.modo_relevo || "alto_relevo");
    const incluirIcone = Boolean(params.incluir_icone ?? false);
    const tipoIcone = String(params.tipo_icone || "galeria");
    const icone = String(params.icone || "coroa");
    const iconeSvg = String(params.icone_svg || "");
    const posicaoIcone = String(params.posicao_icone || "esquerda");
    const corBase = String(params.cor_base || "#f97316");
    const corTexto = String(params.cor_texto || "#ffffff");

    // 1. Gera o texto no plano XY
    let textPolys = await textToPolygons(texto, fonte, alturaLetras);
    const textBounds = getBounds2D(textPolys);

    let foregroundPolys: Polygons2D = [...textPolys];

    // 2. Ícone opcional ao lado do nome
    if (incluirIcone) {
      const iconSize = alturaLetras * 0.95;
      const rawIcon =
        tipoIcone === "svg" && iconeSvg.includes("<")
          ? svgToPolygons(iconeSvg, iconSize)
          : shapeGalleryToPolygons(icone, iconSize);
      const iconBounds = getBounds2D(rawIcon);

      let iconX = textBounds.minX - iconBounds.width * 0.5 - 3.0;
      if (posicaoIcone === "direita") {
        iconX = textBounds.maxX + iconBounds.width * 0.5 + 3.0;
      }
      const placedIcon = translatePolygons(rawIcon, iconX, 0);
      foregroundPolys = unionPolygons(textPolys, placedIcon);
    }

    // Centraliza em X e Y
    const fgBounds = getBounds2D(foregroundPolys);
    foregroundPolys = translatePolygons(
      foregroundPolys,
      -fgBounds.centerX,
      -fgBounds.centerY,
    );

    // 3. Contorno da base ("bolha") com margem suave em volta do nome
    const margem = 3.2;
    const baseContour2D = offsetPolygons(foregroundPolys, margem, "round");
    const boundsFinal = getBounds2D(baseContour2D);

    const parede = 1.8;
    const alturaTotalBase = diametroLapis + parede * 2; // ex: 7.6 + 3.6 = 11.2mm

    // 4. Constrói o corpo com túnel suave e relevo (alto ou baixo)
    let corpoGeom: THREE.BufferGeometry;
    let textoGeom: THREE.BufferGeometry;

    if (modoRelevo === "baixo_relevo") {
      const cavityDepth = Math.min(relevoTexto, 1.4);
      corpoGeom = buildPencilSleeveBody(
        baseContour2D,
        diametroLapis,
        { minX: boundsFinal.minX, maxX: boundsFinal.maxX },
        foregroundPolys,
        cavityDepth,
        tipoEncaixe,
      );

      // Infill fino assentado no fundo da cavidade para entalhe 3D visível
      const infillH = Math.min(0.4, cavityDepth * 0.4);
      textoGeom = extrudePolygons(foregroundPolys, {
        height: infillH,
        zOffset: alturaTotalBase - cavityDepth,
      });
    } else {
      corpoGeom = buildPencilSleeveBody(
        baseContour2D,
        diametroLapis,
        { minX: boundsFinal.minX, maxX: boundsFinal.maxX },
        undefined,
        0,
        tipoEncaixe,
      );

      // Letras e ícone em alto-relevo no topo
      textoGeom = extrudePolygons(foregroundPolys, {
        height: relevoTexto,
        zOffset: alturaTotalBase,
      });
    }

    const parts: GeneratedPartMesh[] = [
      {
        name: "corpo",
        label: "Corpo do Enfeite",
        geometry: corpoGeom,
        color: corBase,
      },
      {
        name: "texto",
        label:
          modoRelevo === "baixo_relevo" ? "Entalhe / Infill" : "Nome em Relevo",
        geometry: textoGeom,
        color: corTexto,
      },
    ];

    return {
      parts,
      fichaTecnica: {
        title: "Medidas do Enfeite de Lápis",
        items: [
          {
            label: "Comprimento Total",
            value: `${boundsFinal.width.toFixed(1)} mm`,
          },
          {
            label: "Largura do Corpo",
            value: `${boundsFinal.height.toFixed(1)} mm`,
          },
          {
            label: "Altura Total",
            value: `${(alturaTotalBase + relevoTexto).toFixed(1)} mm`,
          },
          {
            label: "Diâmetro do Furo",
            value: `Ø ${diametroLapis.toFixed(1)} mm`,
          },
          {
            label: "Troca de Filamento",
            value: `Na camada de ${alturaTotalBase.toFixed(1)} mm`,
          },
        ],
      },
    };
  },
};
