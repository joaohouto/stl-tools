import * as THREE from 'three';
import { GeneratedPartMesh, MeshMetrics } from './types';

export function computeSingleGeometryMetrics(geom: THREE.BufferGeometry): {
  volumeCm3: number;
  areaCm2: number;
  triangles: number;
  min: [number, number, number];
  max: [number, number, number];
} {
  const pos = geom.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!pos || pos.count < 3) {
    return {
      volumeCm3: 0,
      areaCm2: 0,
      triangles: 0,
      min: [0, 0, 0],
      max: [0, 0, 0],
    };
  }

  let signedVolumeMm3 = 0;
  let areaMm2 = 0;
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  const arr = pos.array as Float32Array;
  const count = pos.count;

  for (let i = 0; i < count; i += 3) {
    const i0 = i * 3;
    const i1 = (i + 1) * 3;
    const i2 = (i + 2) * 3;

    const x0 = arr[i0],
      y0 = arr[i0 + 1],
      z0 = arr[i0 + 2];
    const x1 = arr[i1],
      y1 = arr[i1 + 1],
      z1 = arr[i1 + 2];
    const x2 = arr[i2],
      y2 = arr[i2 + 1],
      z2 = arr[i2 + 2];

    if (x0 < minX) minX = x0;
    if (x1 < minX) minX = x1;
    if (x2 < minX) minX = x2;
    if (y0 < minY) minY = y0;
    if (y1 < minY) minY = y1;
    if (y2 < minY) minY = y2;
    if (z0 < minZ) minZ = z0;
    if (z1 < minZ) minZ = z1;
    if (z2 < minZ) minZ = z2;

    if (x0 > maxX) maxX = x0;
    if (x1 > maxX) maxX = x1;
    if (x2 > maxX) maxX = x2;
    if (y0 > maxY) maxY = y0;
    if (y1 > maxY) maxY = y1;
    if (y2 > maxY) maxY = y2;
    if (z0 > maxZ) maxZ = z0;
    if (z1 > maxZ) maxZ = z1;
    if (z2 > maxZ) maxZ = z2;

    // Signed tetrahedron volume: (1/6) * v0 . (v1 x v2)
    const cx = y1 * z2 - z1 * y2;
    const cy = z1 * x2 - x1 * z2;
    const cz = x1 * y2 - y1 * x2;
    signedVolumeMm3 += x0 * cx + y0 * cy + z0 * cz;

    // Triangle surface area: 0.5 * |(v1 - v0) x (v2 - v0)|
    const ux = x1 - x0,
      uy = y1 - y0,
      uz = z1 - z0;
    const vx = x2 - x0,
      vy = y2 - y0,
      vz = z2 - z0;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    areaMm2 += 0.5 * Math.hypot(nx, ny, nz);
  }

  const volumeMm3 = Math.abs(signedVolumeMm3 / 6.0);

  return {
    volumeCm3: volumeMm3 / 1000.0,
    areaCm2: areaMm2 / 100.0,
    triangles: Math.floor(count / 3),
    min: isFinite(minX) ? [minX, minY, minZ] : [0, 0, 0],
    max: isFinite(maxX) ? [maxX, maxY, maxZ] : [0, 0, 0],
  };
}

export function computeModelMetrics(parts: GeneratedPartMesh[]): MeshMetrics {
  let totalVolumeCm3 = 0;
  let totalAreaCm2 = 0;
  let totalTriangles = 0;

  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  const partMetrics = parts.map((p) => {
    const m = computeSingleGeometryMetrics(p.geometry);
    totalVolumeCm3 += m.volumeCm3;
    totalAreaCm2 += m.areaCm2;
    totalTriangles += m.triangles;

    if (m.triangles > 0) {
      if (m.min[0] < minX) minX = m.min[0];
      if (m.min[1] < minY) minY = m.min[1];
      if (m.min[2] < minZ) minZ = m.min[2];
      if (m.max[0] > maxX) maxX = m.max[0];
      if (m.max[1] > maxY) maxY = m.max[1];
      if (m.max[2] > maxZ) maxZ = m.max[2];
    }

    return {
      name: p.name,
      label: p.label,
      color: p.color,
      volumeCm3: m.volumeCm3,
      areaCm2: m.areaCm2,
      triangles: m.triangles,
    };
  });

  return {
    volumeCm3: totalVolumeCm3,
    areaCm2: totalAreaCm2,
    trianglesCount: totalTriangles,
    boundingBoxMm: {
      x: isFinite(minX) ? Math.max(0, maxX - minX) : 0,
      y: isFinite(minY) ? Math.max(0, maxY - minY) : 0,
      z: isFinite(minZ) ? Math.max(0, maxZ - minZ) : 0,
    },
    partMetrics,
  };
}

/**
 * Parses a raw Binary or ASCII STL ArrayBuffer into a THREE.BufferGeometry
 * Used when the user uploads an external STL file into the Cost Calculator!
 */
export function parseStlArrayBuffer(buffer: ArrayBuffer): THREE.BufferGeometry {
  const view = new DataView(buffer);
  if (buffer.byteLength < 84) {
    return new THREE.BufferGeometry();
  }

  const numTriangles = view.getUint32(80, true);
  const expectedByteLength = 84 + numTriangles * 50;

  // Check if valid binary STL
  if (expectedByteLength === buffer.byteLength || (numTriangles > 0 && expectedByteLength <= buffer.byteLength + 2)) {
    const positions = new Float32Array(numTriangles * 9);
    const normals = new Float32Array(numTriangles * 9);
    let offset = 84;

    for (let i = 0; i < numTriangles; i++) {
      const nx = view.getFloat32(offset, true);
      const ny = view.getFloat32(offset + 4, true);
      const nz = view.getFloat32(offset + 8, true);
      offset += 12;

      const base = i * 9;
      for (let v = 0; v < 3; v++) {
        positions[base + v * 3] = view.getFloat32(offset, true);
        positions[base + v * 3 + 1] = view.getFloat32(offset + 4, true);
        positions[base + v * 3 + 2] = view.getFloat32(offset + 8, true);
        normals[base + v * 3] = nx;
        normals[base + v * 3 + 1] = ny;
        normals[base + v * 3 + 2] = nz;
        offset += 12;
      }
      offset += 2; // attribute byte count
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    return geom;
  }

  // Fallback ASCII STL parser
  const text = new TextDecoder().decode(buffer);
  const vertexRegex = /vertex\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/gi;
  const coords: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = vertexRegex.exec(text)) !== null) {
    coords.push(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
  geom.computeVertexNormals();
  return geom;
}

// ============================================================================
// COST & PRICING ENGINE
// ============================================================================

export interface FilamentMaterialPreset {
  id: string;
  name: string;
  densityGcm3: number;
  defaultPricePerKgBrl: number;
}

export const FILAMENT_MATERIALS: FilamentMaterialPreset[] = [
  { id: 'PLA', name: 'PLA (Padrão / Silk / Matte)', densityGcm3: 1.24, defaultPricePerKgBrl: 115 },
  { id: 'PETG', name: 'PETG (Resistente / Mecânico)', densityGcm3: 1.27, defaultPricePerKgBrl: 120 },
  { id: 'ABS', name: 'ABS (Alta Temperatura)', densityGcm3: 1.04, defaultPricePerKgBrl: 110 },
  { id: 'ASA', name: 'ASA (Uso Externo / Sol)', densityGcm3: 1.07, defaultPricePerKgBrl: 165 },
  { id: 'TPU', name: 'TPU 95A (Flexível)', densityGcm3: 1.21, defaultPricePerKgBrl: 175 },
];

export interface PrinterPreset {
  id: string;
  name: string;
  avgPowerWatts: number;
  effectiveFlowMm3s: number; // Effective average flow including travel/first layer
  machineValueBrl: number;
  lifespanHours: number;
}

export const PRINTER_PRESETS: PrinterPreset[] = [
  {
    id: 'bambu-a1',
    name: 'Bambu Lab A1 / A1 Mini',
    avgPowerWatts: 130,
    effectiveFlowMm3s: 9.5,
    machineValueBrl: 3600,
    lifespanHours: 4000,
  },
  {
    id: 'bambu-p1s',
    name: 'Bambu Lab P1S / X1C (CoreXY)',
    avgPowerWatts: 210,
    effectiveFlowMm3s: 11.0,
    machineValueBrl: 6800,
    lifespanHours: 5000,
  },
  {
    id: 'creality-k1',
    name: 'Creality K1 / K1 Max / Ender 3 V3',
    avgPowerWatts: 220,
    effectiveFlowMm3s: 9.0,
    machineValueBrl: 3800,
    lifespanHours: 4000,
  },
  {
    id: 'ender3-std',
    name: 'Ender 3 V2 / S1 / Impressora Padrão',
    avgPowerWatts: 160,
    effectiveFlowMm3s: 4.5,
    machineValueBrl: 1600,
    lifespanHours: 3500,
  },
];

export interface CostCalculationInput {
  volumeCm3: number;
  areaCm2: number;
  partsCount: number;
  materialId: string;
  filamentPricePerKgBrl: number;
  infillPercent: number;
  wallPerimeters: number;
  printerId: string;
  customPowerWatts?: number;
  kwhTariffBrl: number;
  failureRatePercent: number;
  packagingAndHardwareBrl: number; // Argola de chaveiro, imã, fita dupla-face, caixa
  laborSetupBrl: number;
  profitMarginPercent: number; // Markup sobre custo para venda direta
  shopeeCommissionPercent: number;
  shopeeFixedFeeBrl: number;
  mlCommissionPercent: number;
  mlFixedFeeBrl: number;
  manualWeightGrams?: number | null;
  manualTimeMinutes?: number | null;
  batchQuantity: number;
}

export interface CostCalculationResult {
  effectiveVolumeCm3: number;
  estimatedWeightGrams: number;
  purgeWasteGrams: number;
  totalWeightGrams: number;
  filamentMeters: number;
  estimatedTimeMinutes: number;
  materialCostBrl: number;
  energyCostBrl: number;
  depreciationCostBrl: number;
  failureBufferBrl: number;
  extrasCostBrl: number;
  unitProductionCostBrl: number;
  directSalePriceBrl: number;
  unitNetProfitBrl: number;
  shopeeSuggestedPriceBrl: number;
  mercadoLivreSuggestedPriceBrl: number;
  batchTotalCostBrl: number;
  batchSuggestedPriceBrl: number;
  wholesaleTiers: {
    qty: number;
    unitPriceBrl: number;
    totalPriceBrl: number;
    discountLabel: string;
  }[];
}

export function calculatePrintPricing(input: CostCalculationInput): CostCalculationResult {
  const mat =
    FILAMENT_MATERIALS.find((m) => m.id === input.materialId) || FILAMENT_MATERIALS[0];
  const printer =
    PRINTER_PRESETS.find((p) => p.id === input.printerId) || PRINTER_PRESETS[0];

  // 1. Shell + Infill physical model
  const shellThicknessCm = Math.max(1, input.wallPerimeters) * 0.04; // 0.4mm nozzle
  const shellVolCm3 = Math.min(
    input.volumeCm3,
    input.areaCm2 * shellThicknessCm * 0.82
  );
  const interiorVolCm3 = Math.max(0, input.volumeCm3 - shellVolCm3);
  const effectiveVolumeCm3 =
    shellVolCm3 + interiorVolCm3 * (Math.max(5, Math.min(100, input.infillPercent)) / 100);

  const partWeightGrams =
    input.manualWeightGrams != null && input.manualWeightGrams > 0
      ? input.manualWeightGrams
      : effectiveVolumeCm3 * mat.densityGcm3;

  // Multi-part / color change purge estimation
  const purgeWasteGrams = input.partsCount > 1 ? (input.partsCount - 1) * 1.4 : 0;
  const totalWeightGrams = Math.max(0.5, partWeightGrams + purgeWasteGrams);

  // 1.75mm filament cross-section area = pi * (0.0875 cm)^2 = 0.02405 cm^2
  const filamentMeters = totalWeightGrams / mat.densityGcm3 / 2.405;

  // 2. Print time estimation
  const effectiveVolMm3 = effectiveVolumeCm3 * 1000;
  const rawSeconds = effectiveVolMm3 / Math.max(1, printer.effectiveFlowMm3s);
  const setupAndFirstLayerMinutes = 4.5 + (input.partsCount > 1 ? (input.partsCount - 1) * 2 : 0);
  const estimatedTimeMinutes =
    input.manualTimeMinutes != null && input.manualTimeMinutes > 0
      ? input.manualTimeMinutes
      : Math.max(3, rawSeconds / 60 + setupAndFirstLayerMinutes);

  const printHours = estimatedTimeMinutes / 60.0;

  // 3. Direct costs
  const materialCostBrl = (totalWeightGrams / 1000.0) * input.filamentPricePerKgBrl;
  const powerW = input.customPowerWatts || printer.avgPowerWatts;
  const energyCostBrl = printHours * (powerW / 1000.0) * input.kwhTariffBrl;
  const hourlyDepreciation = printer.machineValueBrl / Math.max(500, printer.lifespanHours);
  const depreciationCostBrl = printHours * hourlyDepreciation;

  const operationalBase = materialCostBrl + energyCostBrl + depreciationCostBrl;
  const failureBufferBrl = operationalBase * (Math.max(0, input.failureRatePercent) / 100.0);
  const extrasCostBrl = Math.max(0, input.packagingAndHardwareBrl) + Math.max(0, input.laborSetupBrl);

  const unitProductionCostBrl = operationalBase + failureBufferBrl + extrasCostBrl;

  // 4. Direct sale price & Net profit
  const markupMultiplier = 1 + Math.max(0, input.profitMarginPercent) / 100.0;
  const directSalePriceBrl = Math.max(unitProductionCostBrl + 1, unitProductionCostBrl * markupMultiplier);
  const unitNetProfitBrl = directSalePriceBrl - unitProductionCostBrl;

  // 5. Reverse Marketplace Fee Calculation (guarantees identical net profit!)
  const shopeeRate = Math.min(0.6, Math.max(0, input.shopeeCommissionPercent / 100.0));
  const shopeeSuggestedPriceBrl =
    (directSalePriceBrl + Math.max(0, input.shopeeFixedFeeBrl)) / (1 - shopeeRate);

  const mlRate = Math.min(0.6, Math.max(0, input.mlCommissionPercent / 100.0));
  const mercadoLivreSuggestedPriceBrl =
    (directSalePriceBrl + Math.max(0, input.mlFixedFeeBrl)) / (1 - mlRate);

  const qty = Math.max(1, Math.round(input.batchQuantity || 1));
  const batchTotalCostBrl = unitProductionCostBrl * qty;
  const batchSuggestedPriceBrl = directSalePriceBrl * qty;

  // Wholesale progressive tiers
  const tiers = [
    { qty: 1, factor: 1.0, label: 'Varejo (1 un.)' },
    { qty: 10, factor: 0.85, label: 'Kit 10 un. (-15%)' },
    { qty: 30, factor: 0.75, label: 'Atacado 30 un. (-25%)' },
    { qty: 100, factor: 0.65, label: 'Corporativo 100 un. (-35%)' },
  ];

  const wholesaleTiers = tiers.map((t) => {
    const unitP = Math.max(unitProductionCostBrl * 1.25, directSalePriceBrl * t.factor);
    return {
      qty: t.qty,
      unitPriceBrl: unitP,
      totalPriceBrl: unitP * t.qty,
      discountLabel: t.label,
    };
  });

  return {
    effectiveVolumeCm3,
    estimatedWeightGrams: partWeightGrams,
    purgeWasteGrams,
    totalWeightGrams,
    filamentMeters,
    estimatedTimeMinutes,
    materialCostBrl,
    energyCostBrl,
    depreciationCostBrl,
    failureBufferBrl,
    extrasCostBrl,
    unitProductionCostBrl,
    directSalePriceBrl,
    unitNetProfitBrl,
    shopeeSuggestedPriceBrl,
    mercadoLivreSuggestedPriceBrl,
    batchTotalCostBrl,
    batchSuggestedPriceBrl,
    wholesaleTiers,
  };
}
