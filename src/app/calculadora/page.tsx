'use client';

import React, { useState, useMemo } from 'react';
import {
  FILAMENT_MATERIALS,
  PRINTER_PRESETS,
  calculatePrintPricing,
  parseStlArrayBuffer,
  computeSingleGeometryMetrics,
} from '@/engine/meshMetrics';
import CustomSelect from '@/components/customizer/CustomSelect';
import NumericInput from '@/components/ui/NumericInput';
import {
  CalculatorIcon as Calculator,
  UploadSimpleIcon as Upload,
  ScalesIcon as Scale,
  ClockIcon as Clock,
  LightningIcon as Zap,
  WrenchIcon as Wrench,
  PackageIcon as Package,
  TrendUpIcon as TrendingUp,
  ShoppingBagIcon as ShoppingBag,
  StackIcon as Layers,
  CheckIcon as Check,
  CopyIcon as Copy,
  ArrowCounterClockwiseIcon as RotateCcw,
  CurrencyDollarIcon as DollarSign,
  CubeIcon as Box,
} from '@phosphor-icons/react';

export default function FullCalculatorPage() {
  const [inputMode, setInputMode] = useState<'stl' | 'manual'>('manual');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stlVolumeCm3, setStlVolumeCm3] = useState<number>(22.5);
  const [stlAreaCm2, setStlAreaCm2] = useState<number>(85.0);
  const [stlDims, setStlDims] = useState<[number, number, number]>([72, 65, 98]);

  const [manualWeightGrams, setManualWeightGrams] = useState<number>(34);
  const [manualTimeHours, setManualTimeHours] = useState<number>(1);
  const [manualTimeMins, setManualTimeMins] = useState<number>(15);

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
  const [copiedQuote, setCopiedQuote] = useState(false);

  const totalManualMinutes = Math.max(1, manualTimeHours * 60 + manualTimeMins);

  const handleResetDefaults = () => {
    setManualWeightGrams(34);
    setManualTimeHours(1);
    setManualTimeMins(15);
    setMaterialId('PLA');
    setFilamentPricePerKg(115);
    setInfillPercent(18);
    setWallPerimeters(3);
    setPartsCount(1);
    setPrinterId('bambu-a1');
    setKwhTariff(0.92);
    setFailureRate(8);
    setPackagingBrl(1.2);
    setLaborSetupBrl(1.5);
    setProfitMargin(200);
    setShopeeCommission(20);
    setShopeeFixedFee(4.0);
    setMlCommission(16);
    setMlFixedFee(6.0);
    setBatchQuantity(10);
  };

  const handleStlUpload = async (file?: File | null) => {
    if (!file) return;
    const buf = await file.arrayBuffer();
    const geom = parseStlArrayBuffer(buf);
    const m = computeSingleGeometryMetrics(geom);
    setUploadedFileName(file.name);
    setStlVolumeCm3(Math.max(0.5, Number(m.volumeCm3.toFixed(2))));
    setStlAreaCm2(Math.max(1.0, Number(m.areaCm2.toFixed(1))));
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
      manualTimeMinutes: inputMode === 'manual' ? totalManualMinutes : null,
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
    totalManualMinutes,
    batchQuantity,
  ]);

  const formatBrl = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}min` : `${m} min`;
  };

  const handleCopyQuote = () => {
    const lines = [
      `📦 *Orçamento de Impressão 3D*`,
      `• Material: ${materialId} (${result.totalWeightGrams.toFixed(0)}g)`,
      `• Valor Unitário (Pix / Direto): *${formatBrl(result.directSalePriceBrl)}*`,
      ``,
      `🏷️ *Descontos Progressivos p/ Lotes:*`,
      ...result.wholesaleTiers.map(
        (t) => `• ${t.discountLabel}: *${formatBrl(t.unitPriceBrl)}/un* (Total: ${formatBrl(t.totalPriceBrl)})`
      ),
    ];
    navigator.clipboard?.writeText(lines.join('\n'));
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2500);
  };

  // Percentuais para a barra visual de composição do custo
  const totalUnitCost = Math.max(0.01, result.unitProductionCostBrl);
  const pctMat = Math.min(100, (result.materialCostBrl / totalUnitCost) * 100);
  const pctEnergy = Math.min(100, (result.energyCostBrl / totalUnitCost) * 100);
  const pctDepr = Math.min(100, (result.depreciationCostBrl / totalUnitCost) * 100);
  const pctFail = Math.min(100, (result.failureBufferBrl / totalUnitCost) * 100);
  const pctExtras = Math.max(0, 100 - (pctMat + pctEnergy + pctDepr + pctFail));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs font-semibold">
            <Calculator className="w-3.5 h-3.5 text-brand-400" />
            <span>Precificação Profissional p/ Impressão 3D</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
            Calculadora de Custos & Preço de Venda 3D
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Informe o peso e o tempo do seu fatiador ou envie um arquivo <code className="text-brand-400 font-mono">.STL</code>. Calcula energia, depreciação, reserva de falha, taxas de marketplaces e lotes em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 border border-slate-700/80 text-xs font-medium text-slate-300 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Restaurar Padrão</span>
          </button>
          <button
            type="button"
            onClick={handleCopyQuote}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-brand-500/15"
          >
            {copiedQuote ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Orçamento Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Orçamento (WhatsApp)</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Parâmetros de Entrada */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Origem dos Dados (Fatiador vs STL) */}
          <div className="p-5 rounded-2xl bg-surface-800 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-400">
                <Scale className="w-4 h-4" />
                <span>1. Peso e Tempo de Impressão</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {inputMode === 'manual' ? 'Modo Fatiador (Bambu / Orca)' : 'Modo Geometria STL'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-surface-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setInputMode('manual')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  inputMode === 'manual'
                    ? 'bg-brand-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Digitar Peso (g) e Tempo</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('stl')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  inputMode === 'stl'
                    ? 'bg-brand-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>Importar Arquivo .STL</span>
              </button>
            </div>

            {inputMode === 'manual' ? (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Peso em Gramas */}
                  <div className="p-3.5 rounded-xl bg-surface-900/90 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Peso Total no Fatiador
                      </label>
                      <span className="text-[11px] font-mono text-brand-400">gramas (g)</span>
                    </div>
                    <div className="relative">
                      <NumericInput
                        min={0.5}
                        max={10000}
                        step={1}
                        fallbackValue={34}
                        value={manualWeightGrams}
                        onChange={setManualWeightGrams}
                        className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-slate-700 focus:border-brand-500 focus:outline-none text-base font-bold font-mono text-brand-400"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[15, 30, 50, 100, 250].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setManualWeightGrams(w)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono border transition ${
                            manualWeightGrams === w
                              ? 'bg-brand-500/20 border-brand-500 text-brand-300 font-bold'
                              : 'bg-surface-800 border-slate-700/80 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {w}g
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tempo em Horas + Minutos */}
                  <div className="p-3.5 rounded-xl bg-surface-900/90 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Tempo de Impressão
                      </label>
                      <span className="text-[11px] font-mono text-amber-400">
                        Total: {formatTime(totalManualMinutes)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center">
                          <NumericInput
                            min={0}
                            max={240}
                            step={1}
                            fallbackValue={0}
                            value={manualTimeHours}
                            onChange={setManualTimeHours}
                            className="w-full px-2.5 py-2 rounded-l-lg bg-surface-800 border border-slate-700 focus:border-brand-500 focus:outline-none text-base font-bold font-mono text-slate-100"
                          />
                          <span className="px-2.5 py-2 rounded-r-lg bg-slate-800 border border-l-0 border-slate-700 text-xs font-mono text-slate-400">
                            h
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center">
                          <NumericInput
                            min={0}
                            max={59}
                            step={5}
                            fallbackValue={15}
                            value={manualTimeMins}
                            onChange={setManualTimeMins}
                            className="w-full px-2.5 py-2 rounded-l-lg bg-surface-800 border border-slate-700 focus:border-brand-500 focus:outline-none text-base font-bold font-mono text-slate-100"
                          />
                          <span className="px-2 py-2 rounded-r-lg bg-slate-800 border border-l-0 border-slate-700 text-xs font-mono text-slate-400">
                            min
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: '30m', h: 0, m: 30 },
                        { label: '1h', h: 1, m: 0 },
                        { label: '2h', h: 2, m: 0 },
                        { label: '4h', h: 4, m: 0 },
                        { label: '8h', h: 8, m: 0 },
                      ].map((preset) => {
                        const active =
                          manualTimeHours === preset.h && manualTimeMins === preset.m;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setManualTimeHours(preset.h);
                              setManualTimeMins(preset.m);
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition ${
                              active
                                ? 'bg-brand-500/20 border-brand-500 text-brand-300 font-bold'
                                : 'bg-surface-800 border-slate-700/80 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleStlUpload(e.dataTransfer.files?.[0] || null);
                  }}
                  className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed cursor-pointer transition text-center ${
                    isDragging
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-slate-700 hover:border-brand-500 bg-surface-900/70'
                  }`}
                >
                  <Upload className="w-7 h-7 text-brand-400 mb-2" />
                  <span className="text-sm font-semibold text-slate-200">
                    {uploadedFileName
                      ? `Arquivo carregado: ${uploadedFileName}`
                      : 'Clique ou arraste um arquivo .STL aqui'}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    Extração automática de volume (cm³), área superficial (cm²) e dimensões (100% local)
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
                    <span className="text-slate-400 block mb-1">Volume Sólido (cm³)</span>
                    <NumericInput
                      min={0.1}
                      step={0.5}
                      fallbackValue={22.5}
                      value={stlVolumeCm3}
                      onChange={setStlVolumeCm3}
                      className="w-full px-2 py-1 rounded bg-surface-800 border border-slate-700 font-bold font-mono text-brand-400"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-surface-900 border border-slate-800">
                    <span className="text-slate-400 block mb-1">Área Superficial (cm²)</span>
                    <NumericInput
                      min={1}
                      step={1}
                      fallbackValue={85}
                      value={stlAreaCm2}
                      onChange={setStlAreaCm2}
                      className="w-full px-2 py-1 rounded bg-surface-800 border border-slate-700 font-bold font-mono text-slate-200"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-surface-900 border border-slate-800 flex flex-col justify-between">
                    <span className="text-slate-400">Dimensões L×P×A</span>
                    <div className="text-sm font-bold font-mono text-slate-200 py-1">
                      {stlDims[0].toFixed(0)}×{stlDims[1].toFixed(0)}×{stlDims[2].toFixed(0)} mm
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Preenchimento / Infill (%)
                    </label>
                    <NumericInput
                      min={0}
                      max={100}
                      step={5}
                      fallbackValue={18}
                      value={infillPercent}
                      onChange={setInfillPercent}
                      className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 text-sm font-mono text-brand-400 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Paredes / Perímetros (0.4mm)
                    </label>
                    <NumericInput
                      min={1}
                      max={10}
                      step={1}
                      fallbackValue={3}
                      value={wallPerimeters}
                      onChange={setWallPerimeters}
                      className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 text-sm font-mono text-slate-100 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Material, Impressora e Energia */}
          <div className="p-5 rounded-2xl bg-surface-800 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-400 border-b border-slate-800 pb-2.5">
              <Zap className="w-4 h-4" />
              <span>2. Filamento, Impressora e Energia</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <CustomSelect
                  label="Material do Filamento"
                  value={materialId}
                  onChange={(val) => {
                    const m = FILAMENT_MATERIALS.find((x) => x.id === val);
                    setMaterialId(val);
                    if (m) setFilamentPricePerKg(m.defaultPricePerKgBrl);
                  }}
                  options={FILAMENT_MATERIALS.map((m) => ({
                    value: m.id,
                    label: `${m.name} (${m.densityGcm3} g/cm³)`,
                  }))}
                />
              </div>

              <div>
                <label className="block font-medium text-slate-200 mb-1.5">
                  Custo do Filamento (R$ / Kg)
                </label>
                <NumericInput
                  min={20}
                  max={1000}
                  step={5}
                  fallbackValue={115}
                  value={filamentPricePerKg}
                  onChange={setFilamentPricePerKg}
                  className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 font-mono text-brand-400 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <CustomSelect
                  label="Impressora 3D (Consumo & Depreciação)"
                  value={printerId}
                  onChange={(val) => setPrinterId(val)}
                  options={PRINTER_PRESETS.map((p) => ({
                    value: p.id,
                    label: `${p.name} (${p.avgPowerWatts}W)`,
                  }))}
                />
              </div>

              <div>
                <label className="block font-medium text-slate-200 mb-1.5">
                  Tarifa de Energia Elétrica (R$ / kWh)
                </label>
                <NumericInput
                  min={0.1}
                  max={5.0}
                  step={0.05}
                  fallbackValue={0.92}
                  value={kwhTariff}
                  onChange={setKwhTariff}
                  className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 font-mono text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Custos Extras, Markup e Taxas de Marketplace */}
          <div className="p-5 rounded-2xl bg-surface-800 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-400 border-b border-slate-800 pb-2.5">
              <DollarSign className="w-4 h-4" />
              <span>3. Acabamento, Margem de Lucro e Marketplaces</span>
            </div>

            {/* Markup Control em Destaque */}
            <div className="p-3.5 rounded-xl bg-surface-900/90 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-200">
                    Margem de Lucro / Markup sobre o Custo (%)
                  </span>
                  <span className="text-slate-500 ml-2 font-mono">
                    ({(1 + profitMargin / 100).toFixed(1)}× o custo total)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <NumericInput
                    min={0}
                    max={1000}
                    step={10}
                    fallbackValue={200}
                    value={profitMargin}
                    onChange={setProfitMargin}
                    className="w-20 px-2.5 py-1 text-right rounded-lg bg-surface-800 border border-brand-500/60 font-mono text-xs font-bold text-brand-400 focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-xs font-mono text-slate-400">%</span>
                </div>
              </div>

              <input
                type="range"
                min={20}
                max={400}
                step={10}
                value={Math.min(400, Math.max(20, profitMargin))}
                onChange={(e) => setProfitMargin(Number(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />

              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[
                  { label: '100% (2×)', val: 100 },
                  { label: '150% (2.5×)', val: 150 },
                  { label: '200% (3× Padrão)', val: 200 },
                  { label: '250% (3.5×)', val: 250 },
                  { label: '300% (4×)', val: 300 },
                ].map((m) => (
                  <button
                    key={m.val}
                    type="button"
                    onClick={() => setProfitMargin(m.val)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition ${
                      profitMargin === m.val
                        ? 'bg-brand-500/20 border-brand-500 text-brand-300 font-bold'
                        : 'bg-surface-800 border-slate-700/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Argola / Embalagem (R$)</label>
                <NumericInput
                  min={0}
                  max={200}
                  step={0.2}
                  fallbackValue={1.2}
                  value={packagingBrl}
                  onChange={setPackagingBrl}
                  className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 font-mono text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Mão de Obra / Setup (R$)</label>
                <NumericInput
                  min={0}
                  max={500}
                  step={0.5}
                  fallbackValue={1.5}
                  value={laborSetupBrl}
                  onChange={setLaborSetupBrl}
                  className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 font-mono text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Reserva p/ Falhas (%)</label>
                <NumericInput
                  min={0}
                  max={50}
                  step={1}
                  fallbackValue={8}
                  value={failureRate}
                  onChange={setFailureRate}
                  className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 font-mono text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-slate-800/70">
              <div>
                <label className="block text-slate-400 mb-1">Comissão Shopee (%)</label>
                <NumericInput
                  min={0}
                  max={50}
                  step={1}
                  fallbackValue={20}
                  value={shopeeCommission}
                  onChange={setShopeeCommission}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-900 border border-slate-700 font-mono text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Taxa Fixa Shopee (R$)</label>
                <NumericInput
                  min={0}
                  max={50}
                  step={0.5}
                  fallbackValue={4.0}
                  value={shopeeFixedFee}
                  onChange={setShopeeFixedFee}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-900 border border-slate-700 font-mono text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Comissão M. Livre (%)</label>
                <NumericInput
                  min={0}
                  max={50}
                  step={1}
                  fallbackValue={16}
                  value={mlCommission}
                  onChange={setMlCommission}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-900 border border-slate-700 font-mono text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Taxa Fixa ML (R$)</label>
                <NumericInput
                  min={0}
                  max={50}
                  step={0.5}
                  fallbackValue={6.0}
                  value={mlFixedFee}
                  onChange={setMlFixedFee}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-900 border border-slate-700 font-mono text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita Sticky: Dashboard Financeiro Completo */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-5">
          <div className="p-6 rounded-2xl bg-gradient-to-b from-surface-800 to-surface-900 border border-slate-800 shadow-2xl space-y-5">
            {/* Preço Principal & Lucro Líquido */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-brand-400">
                  Preço Sugerido (Venda Direta / Pix)
                </span>
                <div className="text-3xl font-extrabold font-mono text-slate-100 mt-1">
                  {formatBrl(result.directSalePriceBrl)}
                </div>
              </div>
              <div className="text-right px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[11px] text-emerald-300 block">Lucro Líquido / un.</span>
                <div className="text-lg font-extrabold font-mono text-emerald-400">
                  +{formatBrl(result.unitNetProfitBrl)}
                </div>
              </div>
            </div>

            {/* Barra Visual de Composição de Custos */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Composição do Custo Unitário</span>
                <span className="font-mono font-bold text-slate-200">
                  {formatBrl(result.unitProductionCostBrl)}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-surface-900 overflow-hidden flex border border-slate-800">
                <div
                  style={{ width: `${pctMat}%` }}
                  className="bg-brand-500 h-full"
                  title="Filamento"
                />
                <div
                  style={{ width: `${pctEnergy}%` }}
                  className="bg-amber-400 h-full"
                  title="Energia Elétrica"
                />
                <div
                  style={{ width: `${pctDepr}%` }}
                  className="bg-sky-400 h-full"
                  title="Depreciação"
                />
                <div
                  style={{ width: `${pctFail}%` }}
                  className="bg-rose-400 h-full"
                  title="Reserva p/ Falhas"
                />
                <div
                  style={{ width: `${pctExtras}%` }}
                  className="bg-purple-400 h-full"
                  title="Embalagem e Setup"
                />
              </div>
            </div>

            {/* Cost Breakdown Rows */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-500" />
                  <Scale className="w-3.5 h-3.5 text-brand-400" />
                  Filamento ({result.totalWeightGrams.toFixed(1)}g · {result.filamentMeters.toFixed(1)}m)
                </span>
                <span className="font-mono">{formatBrl(result.materialCostBrl)}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Energia Elétrica ({formatTime(result.estimatedTimeMinutes)})
                </span>
                <span className="font-mono">{formatBrl(result.energyCostBrl)}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <Wrench className="w-3.5 h-3.5 text-sky-400" />
                  Depreciação + Manutenção Máquina
                </span>
                <span className="font-mono">{formatBrl(result.depreciationCostBrl)}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                  Reserva p/ Falhas ({failureRate}%)
                </span>
                <span className="font-mono">{formatBrl(result.failureBufferBrl)}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <Package className="w-3.5 h-3.5 text-purple-400" />
                  Embalagem, Argola e Setup
                </span>
                <span className="font-mono">{formatBrl(result.extrasCostBrl)}</span>
              </div>
            </div>

            {/* Marketplace Prices */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/30">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-brand-300">
                  <ShoppingBag className="w-3.5 h-3.5 text-brand-400" />
                  <span>Preço na Shopee</span>
                </div>
                <div className="text-lg font-extrabold font-mono text-brand-400 mt-0.5">
                  {formatBrl(result.shopeeSuggestedPriceBrl)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Taxa {shopeeCommission}% + {formatBrl(shopeeFixedFee)} inclusa
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-yellow-300">
                  <ShoppingBag className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Mercado Livre</span>
                </div>
                <div className="text-lg font-extrabold font-mono text-yellow-400 mt-0.5">
                  {formatBrl(result.mercadoLivreSuggestedPriceBrl)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Taxa {mlCommission}% + {formatBrl(mlFixedFee)} inclusa
                </div>
              </div>
            </div>

            {/* Simulador de Lote Personalizado */}
            <div className="p-3.5 rounded-xl bg-surface-900/90 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-brand-400" />
                  Simular Produção em Lote
                </span>
                <div className="flex items-center gap-1.5">
                  <NumericInput
                    min={1}
                    max={5000}
                    step={5}
                    fallbackValue={10}
                    value={batchQuantity}
                    onChange={setBatchQuantity}
                    className="w-16 px-2 py-1 text-right rounded bg-surface-800 border border-slate-700 font-mono text-xs font-bold text-brand-400 focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-slate-400 font-mono">un.</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded-lg bg-surface-800/80 border border-slate-800">
                  <span className="text-slate-400 block">Filamento Total</span>
                  <span className="font-mono font-bold text-slate-200">
                    {(result.totalWeightGrams * batchQuantity).toFixed(0)} g
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-surface-800/80 border border-slate-800">
                  <span className="text-slate-400 block">Tempo Total</span>
                  <span className="font-mono font-bold text-slate-200">
                    {formatTime(result.estimatedTimeMinutes * batchQuantity)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-emerald-300 block">Lucro do Lote</span>
                  <span className="font-mono font-bold text-emerald-400">
                    +{formatBrl(result.unitNetProfitBrl * batchQuantity)}
                  </span>
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
