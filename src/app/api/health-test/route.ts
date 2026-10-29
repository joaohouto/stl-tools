import { NextResponse } from 'next/server';
import { PRODUCT_MODULES, getDefaultParams } from '@/models/registry';
import { AVAILABLE_FONTS } from '@/engine/fontManager';
import {
  BUILTIN_SHAPES,
  shapeGalleryToPolygons,
  attachKeyringTab,
  signedArea2D,
  textToPolygons,
  getBounds2D,
} from '@/engine/cad';
import {
  computeModelMetrics,
  calculatePrintPricing,
  parseStlArrayBuffer,
} from '@/engine/meshMetrics';
import {
  exportMergedSTL,
  exportPartsZIP,
  exportMultiColor3MF,
} from '@/engine/exporters';

export async function GET() {
  try {
    const shapeResults = [];
    for (const s of BUILTIN_SHAPES) {
      const polys = shapeGalleryToPolygons(s.id, 50);
      const outers = polys.filter((r) => signedArea2D(r) > 0).length;
      const holes = polys.filter((r) => signedArea2D(r) < 0).length;
      const expectedOuters = s.id === 'patinha' ? 5 : 1;
      if (outers !== expectedOuters || holes !== 0) {
        throw new Error(
          `Forma ${s.id} inválida: esperado ${expectedOuters} contorno(s) externo(s) e 0 furos, obtido outers=${outers}, holes=${holes}`
        );
      }
      if (s.id !== 'patinha') {
        const withTopLoop = attachKeyringTab(polys, 'top', 4.0, 2.5);
        const topOuters = withTopLoop.filter((r) => signedArea2D(r) > 0).length;
        const topHoles = withTopLoop.filter((r) => signedArea2D(r) < 0).length;
        if (topOuters !== 1 || topHoles !== 1) {
          throw new Error(
            `Pingente topo desconectado na forma ${s.id}: outers=${topOuters}, holes=${topHoles}`
          );
        }
      }
      shapeResults.push({
        id: s.id,
        outers,
        vertices: polys[0].length,
      });
    }

    const fontResults = [];
    for (const font of AVAILABLE_FONTS) {
      const polys = await textToPolygons('STLTools 3D\nTeste Acentuação', font.id, 14);
      const b = getBounds2D(polys);
      if (polys.length === 0 || b.width <= 0 || b.height <= 0) {
        throw new Error(`Falha ao gerar glifos na fonte ${font.id}`);
      }
      fontResults.push({
        font: font.id,
        rings: polys.length,
        widthMm: Number(b.width.toFixed(1)),
        heightMm: Number(b.height.toFixed(1)),
      });
    }

    const modelResults = [];
    for (const mod of PRODUCT_MODULES) {
      const { schema } = mod;
      const defaults = getDefaultParams(mod);
      const generated = await mod.generate(defaults);

      if (!generated.parts || generated.parts.length === 0) {
        throw new Error(`Modelo ${schema.id} retornou 0 partes`);
      }

      const metrics = computeModelMetrics(generated.parts);
      if (metrics.volumeCm3 <= 0 || Number.isNaN(metrics.volumeCm3)) {
        throw new Error(`Volume inválido em ${schema.id}: ${metrics.volumeCm3}`);
      }

      const stlBytes = exportMergedSTL(generated.parts, schema.id);
      const parsedGeom = parseStlArrayBuffer(stlBytes.buffer as ArrayBuffer);
      const parsedTris = Math.floor(parsedGeom.getAttribute('position').count / 3);
      if (parsedTris !== metrics.trianglesCount) {
        throw new Error(
          `Divergência de triângulos no binário STL de ${schema.id}: esperado ${metrics.trianglesCount}, lido ${parsedTris}`
        );
      }

      const zipBytes = exportPartsZIP(generated.parts, schema.name, schema.id);
      const threemfBytes = exportMultiColor3MF(generated.parts, schema.name);

      const pricing = calculatePrintPricing({
        volumeCm3: metrics.volumeCm3,
        areaCm2: metrics.areaCm2,
        partsCount: generated.parts.length,
        materialId: 'PLA',
        filamentPricePerKgBrl: 115,
        infillPercent: 18,
        wallPerimeters: 3,
        printerId: 'bambu-a1',
        kwhTariffBrl: 0.92,
        failureRatePercent: 8,
        packagingAndHardwareBrl: 1.0,
        laborSetupBrl: 1.0,
        profitMarginPercent: 200,
        shopeeCommissionPercent: 20,
        shopeeFixedFeeBrl: 4.0,
        mlCommissionPercent: 16,
        mlFixedFeeBrl: 6.0,
        batchQuantity: 10,
      });

      modelResults.push({
        id: schema.id,
        name: schema.name,
        partsCount: generated.parts.length,
        triangles: metrics.trianglesCount,
        volumeCm3: Number(metrics.volumeCm3.toFixed(2)),
        areaCm2: Number(metrics.areaCm2.toFixed(1)),
        dimsMm: `${metrics.boundingBoxMm.x.toFixed(0)}x${metrics.boundingBoxMm.y.toFixed(0)}x${metrics.boundingBoxMm.z.toFixed(1)}`,
        stlSizeBytes: stlBytes.byteLength,
        zipSizeBytes: zipBytes.byteLength,
        threemfSizeBytes: threemfBytes.byteLength,
        estimatedWeightGrams: Number(pricing.totalWeightGrams.toFixed(1)),
        suggestedPriceBrl: Number(pricing.directSalePriceBrl.toFixed(2)),
      });
    }

    return NextResponse.json({
      ok: true,
      shapesTested: shapeResults.length,
      fontsTested: fontResults.length,
      modelsTested: modelResults.length,
      shapes: shapeResults,
      fonts: fontResults,
      models: modelResults,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err), stack: err?.stack },
      { status: 500 }
    );
  }
}
