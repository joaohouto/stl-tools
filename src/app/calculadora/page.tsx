'use client';

import React, { useState, useMemo } from 'react';
import {
  FILAMENT_MATERIALS,
  PRINTER_PRESETS,
  calculatePrintPricing,
  parseStlArrayBuffer,
  computeSingleGeometryMetrics,
} from '@/engine/meshMetrics';
import {
  Calculator,
  Upload,
  Scale,
  Clock,
  Zap,
  Wrench,
  Package,
  TrendingUp,
  ShoppingBag,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export default function FullCalculatorPage() {
  const [inputMode, setInputMode] = useState<'stl' | 'manual'>('manual');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [stlVolumeCm3, setStlVolumeCm3] = useState<number>(22.5);
  const [stlAreaCm2, setStlAreaCm2] = useState<number>(85.0);
  const [stlDims, setStlDims] = useState<[number, number, number]>([72, 65, 98]);

  const [manualWeightGrams, setManualWeightGrams] = useState<number>(34);
  const [manualTimeMinutes, setManualTimeMinutes] = useState<number>(75);

  const [materialId, setMaterialId] = useState('PLA');
  const [filamentPricePerKg, setFilamentPricePerKg] = useState(115);
  const [infillPercent, setInfillPercent] = useState(18);
  const [wallPerimeters, setWallPerimeters] = useState(3);
  const [partsCount, setPartsCount] = useState(1);

  const [printerId, setPrinterId] = useState('bambu-a1');
  const [kwhTariff, setKwhTariff] = useState(0.92);
  const [failureRate, setFailureRate] = useState(8);
  const [packagingBrl, setPackagingBrl] = useState(1.2);
  const [laborSetupBrl, setLaborSetupBrl] = useState(1.5);
  const [profitMargin, setProfitMargin] = useState(200);

  const [shopeeCommission, setShopeeCommission] = useState(20);
  const [shopeeFixedFee, setShopeeFixedFee] = useState(4.0);
  const [mlCommission, setMlCommission] = useState(16);
  const [mlFixedFee, setMlFixedFee] = useState(6.0);
  const [batchQuantity, setBatchQuantity] = useState(10);

  const handleStlUpload = async (file?: File | null) => {
    if (!file) return;
    const buf = await file.arrayBuffer();
    const geom = parseStlArrayBuffer(buf);
    const m = computeSingleGeometryMetrics(geom);
    setUploadedFileName(file.name);
    setStlVolumeCm3(Math.max(0.5, m.volumeCm3));
    setStlAreaCm2(Math.max(1.0, m.areaCm2));
    setStlDims([
      Math.abs(m.max[0] - m.min[0]),
      Math.abs(m.max[1] - m.min[1]),
      Math.abs(m.max[2] - m.min[2]),
    ]);
    setInputMode('stl');
  };

  const result = useMemo(() => {
    return calculatePrintPricing({
      volumeCm3: stlVolumeCm3,
      areaCm2: stlAreaCm2,
      partsCount,
      materialId,
      filamentPricePerKgBrl: filamentPricePerKg,
      infillPercent,
      wallPerimeters,
      printerId,
      kwhTariffBrl: kwhTariff,
      failureRatePercent: failureRate,
      packagingAndHardwareBrl: packagingBrl,
      laborSetupBrl,
      profitMarginPercent: profitMargin,
      shopeeCommissionPercent: shopeeCommission,
      shopeeFixedFeeBrl: shopeeFixedFee,
      mlCommissionPercent: mlCommission,
      mlFixedFeeBrl: mlFixedFee,
      manualWeightGrams: inputMode === 'manual' ? manualWeightGrams : null,
      manualTimeMinutes: inputMode === 'manual' ? manualTimeMinutes : null,
      batchQuantity,
    });
  }, [
    inputMode,
    stlVolumeCm3,
    stlAreaCm2,
    partsCount,
    materialId,
    filamentPricePerKg,
    infillPercent,
    wallPerimeters,
    printerId,
    kwhTariff,
    failureRate,
    packagingBrl,
    laborSetupBrl,
    profitMargin,
    shopeeCommission,
    shopeeFixedFee,
    mlCommission,
    mlFixedFee,
    manualWeightGrams,
    manualTimeMinutes,
    batchQuantity,
  ]);

  const formatBrl = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}min` : `${m} min`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs font-semibold">
          <Calculator className="w-3.5 h-3.5 text-brand-400" />
          <span>Precificação Profissional para Impressão 3D</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
          Calculadora de Custos & Preço de Venda 3D
        </h1>
        <p className="text-sm text-slate-400 max-w-3xl">
          Arraste qualquer arquivo <code className="text-brand-400">.STL</code> para extrair volume e área automaticamente ou digite o peso e o tempo do seu fatiador. Calcula custos reais de energia, depreciação, falhas e taxas reversas de Shopee e Mercado Livre.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-7 space-y-5">
          {/* Mode Selector + STL Dropzone */}
          <div className="p-5 rounded-2xl bg-surface-800 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setInputMode('manual')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                  inputMode === 'manual'
                    ? 'bg-brand-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Informar Peso (g) e Tempo (Fatiador)
              </button>
              <button
                type="button"
                onClick={() => setInputMode('stl')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                  inputMode === 'stl'
                    ? 'bg-brand-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Calcular via Arquivo .STL (Casca + Infill)
              </button>
            </div>

            {inputMode === 'stl' ? (
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-700 hover:border-brand-500 bg-surface-900/70 cursor-pointer transition text-center">
                  <Upload className="w-7 h-7 text-brand-400 mb-2" />
                  <span className="text-sm font-semibold text-slate-200">
                    {uploadedFileName
                      ? `Arquivo carregado: ${uploadedFileName}`
                      : 'Clique ou arraste um arquivo .STL aqui'}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    O cálculo de volume (cm³) e área superficial (cm²) roda 100% no seu navegador
                  </span>
                  <input
                    type="file"
                    accept=".stl"
                    className="hidden"
                    onChange={(e) => handleStlUpload(e.target.files?.[0] || null)}
                  />
                </label>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-surface-900 border border-slate-800">
                    <span className="text-slate-400">Volume Sólido</span>
                    <div className="text-sm font-bold font-mono text-brand-400 mt-0.5">
                      {stlVolumeCm3.toFixed(2)} cm³
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-900 border border-slate-800">
                    <span className="text-slate-400">Área Superficial</span>
                    <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
                      {stlAreaCm2.toFixed(1)} cm²
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-900 border border-slate-800">
                    <span className="text-slate-400">Dimensões (mm)</span>
                    <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
                      {stlDims[0].toFixed(0)}×{stlDims[1].toFixed(0)}×{stlDims[2].toFixed(0)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Preenchimento / Infill (%)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={infillPercent}
                      onChange={(e) => setInfillPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 text-sm font-mono text-brand-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Paredes / Perímetros (0.4mm)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={wallPerimeters}
                      onChange={(e) => setWallPerimeters(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 text-sm font-mono text-slate-100"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Peso da Peça no Fatiador (gramas)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={manualWeightGrams}
                    onChange={(e) => setManualWeightGrams(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-900 border border-slate-700 text-sm font-mono text-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tempo de Impressão (minutos)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={5}
                    value={manualTimeMinutes}
                    onChange={(e) => setManualTimeMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-900 border border-slate-700 text-sm font-mono text-amber-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Material & Printer Configuration */}
          <div className="p-5 rounded-2xl bg-surface-800 border border-slate-800 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-400 border-b border-slate-800 pb-2">
              Material, Impressora e Energia
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Tipo de Filamento</label>
                <select
                  value={materialId}
                  onChange={(e) => {
                    const m = FILAMENT_MATERIALS.find((x) => x.id === e.target.value);
                    setMaterialId(e.target.value);
                    if (m) setFilamentPricePerKg(m.defaultPricePerKgBrl);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 text-slate-100"
                >
                  {FILAMENT_MATERIALS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.densityGcm3} g/cm³)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Preço do Filamento (R$ / Kg)</label>
                <input
                  type="number"
                  min={30}
                  step={5}
                  value={filamentPricePerKg}
                  onChange={(e) => setFilamentPricePerKg(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 font-mono text-brand-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Modelo da Impressora 3D</label>
                <select
                  value={printerId}
                  onChange={(e) => setPrinterId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 text-slate-100"
                >
                  {PRINTER_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.avgPowerWatts}W)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Tarifa de Energia (R$ / kWh)</label>
                <input
                  type="number"
                  step={0.05}
                  value={kwhTariff}
                  onChange={(e) => setKwhTariff(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 font-mono text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Extras, Margin & Marketplaces */}
          <div className="p-5 rounded-2xl bg-surface-800 border border-slate-800 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-400 border-b border-slate-800 pb-2">
              Acabamento, Margem de Lucro e Taxas de Marketplace
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Argola / Embalagem (R$)</label>
                <input
                  type="number"
                  step={0.2}
                  value={packagingBrl}
                  onChange={(e) => setPackagingBrl(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-lg bg-surface-900 border border-slate-700 font-mono text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Mão de Obra / Setup (R$)</label>
                <input
                  type="number"
                  step={0.5}
                  value={laborSetupBrl}
                  onChange={(e) => setLaborSetupBrl(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-lg bg-surface-900 border border-slate-700 font-mono text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Taxa de Falha (%)</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={failureRate}
                  onChange={(e) => setFailureRate(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-lg bg-surface-900 border border-slate-700 font-mono text-slate-100"
                />
              </div>

              <div>
                <label className="block text-brand-300 font-semibold mb-1">Margem Markup (%)</label>
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={profitMargin}
                  onChange={(e) => setProfitMargin(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-lg bg-surface-900 border border-brand-500/60 font-mono text-brand-400 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-800/70">
              <div>
                <label className="block text-slate-400 mb-1">Comissão Shopee (%)</label>
                <input
                  type="number"
                  value={shopeeCommission}
                  onChange={(e) => setShopeeCommission(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-900 border border-slate-700 font-mono text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Taxa Fixa Shopee (R$)</label>
                <input
                  type="number"
                  step={0.5}
                  value={shopeeFixedFee}
                  onChange={(e) => setShopeeFixedFee(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-900 border border-slate-700 font-mono text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Comissão Merc. Livre (%)</label>
                <input
                  type="number"
                  value={mlCommission}
                  onChange={(e) => setMlCommission(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-900 border border-slate-700 font-mono text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Taxa Fixa ML (R$)</label>
                <input
                  type="number"
                  step={0.5}
                  value={mlFixedFee}
                  onChange={(e) => setMlFixedFee(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-900 border border-slate-700 font-mono text-slate-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sticky Column: Complete Financial Breakdown */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-5">
          <div className="p-6 rounded-2xl bg-gradient-to-b from-surface-800 to-surface-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-brand-400">
                  Preço Sugerido (Venda Direta / Pix)
                </span>
                <div className="text-3xl font-extrabold font-mono text-slate-100 mt-1">
                  {formatBrl(result.directSalePriceBrl)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Lucro Líquido / un.</span>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  +{formatBrl(result.unitNetProfitBrl)}
                </div>
              </div>
            </div>

            {/* Cost Breakdown Rows */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-brand-400" />
                  Filamento ({result.totalWeightGrams.toFixed(1)}g · {result.filamentMeters.toFixed(1)}m)
                </span>
                <span className="font-mono">{formatBrl(result.materialCostBrl)}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Energia Elétrica ({formatTime(result.estimatedTimeMinutes)})
                </span>
                <span className="font-mono">{formatBrl(result.energyCostBrl)}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-sky-400" />
                  Depreciação + Manutenção Máquina
                </span>
                <span className="font-mono">{formatBrl(result.depreciationCostBrl)}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                  Reserva p/ Falhas ({failureRate}%)
                </span>
                <span className="font-mono">{formatBrl(result.failureBufferBrl)}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-purple-400" />
                  Embalagem, Argola e Setup
                </span>
                <span className="font-mono">{formatBrl(result.extrasCostBrl)}</span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-slate-100">
                <span>Custo de Produção Unitário</span>
                <span className="font-mono text-rose-300">
                  {formatBrl(result.unitProductionCostBrl)}
                </span>
              </div>
            </div>

            {/* Marketplace Prices */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <div className="text-[11px] font-bold uppercase text-orange-300">
                  Preço na Shopee
                </div>
                <div className="text-lg font-extrabold font-mono text-orange-400 mt-0.5">
                  {formatBrl(result.shopeeSuggestedPriceBrl)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Taxa {shopeeCommission}% + {formatBrl(shopeeFixedFee)} inclusa
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <div className="text-[11px] font-bold uppercase text-yellow-300">
                  Preço Mercado Livre
                </div>
                <div className="text-lg font-extrabold font-mono text-yellow-400 mt-0.5">
                  {formatBrl(result.mercadoLivreSuggestedPriceBrl)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Taxa {mlCommission}% + {formatBrl(mlFixedFee)} inclusa
                </div>
              </div>
            </div>

            {/* Wholesale Tiers Table */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tabela Sugerida para Kits & Atacado (Brindes)
              </div>
              <div className="space-y-1.5">
                {result.wholesaleTiers.map((tier) => (
                  <div
                    key={tier.qty}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-900/90 border border-slate-800 text-xs"
                  >
                    <span className="font-medium text-slate-300">{tier.discountLabel}</span>
                    <div className="text-right font-mono">
                      <span className="text-brand-400 font-bold">
                        {formatBrl(tier.unitPriceBrl)}/un
                      </span>
                      <span className="text-slate-500 ml-2">
                        (Total: {formatBrl(tier.totalPriceBrl)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
