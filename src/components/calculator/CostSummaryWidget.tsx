'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { MeshMetrics } from '@/engine/types';
import {
  FILAMENT_MATERIALS,
  PRINTER_PRESETS,
  calculatePrintPricing,
} from '@/engine/meshMetrics';
import { Calculator, Clock, Scale, DollarSign, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';

interface CostSummaryWidgetProps {
  metrics: MeshMetrics;
  partsCount: number;
}

export default function CostSummaryWidget({
  metrics,
  partsCount,
}: CostSummaryWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [materialId, setMaterialId] = useState('PLA');
  const [filamentPricePerKg, setFilamentPricePerKg] = useState(115);
  const [infillPercent, setInfillPercent] = useState(18);
  const [printerId, setPrinterId] = useState('bambu-a1');
  const [packagingBrl, setPackagingBrl] = useState(0.8);
  const [profitMarginPercent, setProfitMarginPercent] = useState(200);

  const pricing = useMemo(() => {
    return calculatePrintPricing({
      volumeCm3: metrics.volumeCm3,
      areaCm2: metrics.areaCm2,
      partsCount,
      materialId,
      filamentPricePerKgBrl: filamentPricePerKg,
      infillPercent,
      wallPerimeters: 3,
      printerId,
      kwhTariffBrl: 0.92,
      failureRatePercent: 8,
      packagingAndHardwareBrl: packagingBrl,
      laborSetupBrl: 0.5,
      profitMarginPercent,
      shopeeCommissionPercent: 20,
      shopeeFixedFeeBrl: 4.0,
      mlCommissionPercent: 16,
      mlFixedFeeBrl: 6.0,
      batchQuantity: 10,
    });
  }, [
    metrics.volumeCm3,
    metrics.areaCm2,
    partsCount,
    materialId,
    filamentPricePerKg,
    infillPercent,
    printerId,
    packagingBrl,
    profitMarginPercent,
  ]);

  const formatBrl = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}min` : `${m} min`;
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-surface-800 overflow-hidden shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-800 bg-surface-900/60">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Calculadora de Custos & Preço de Venda (Ao Vivo)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/calculadora"
            className="text-xs text-brand-400 hover:underline font-medium"
          >
            Abrir Calculadora Completa →
          </Link>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-md border border-slate-700 transition"
          >
            {expanded ? (
              <>
                Ocultar Ajustes <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Ajustar Filamento/Margem <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main KPIs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
        <div className="p-3 rounded-xl bg-surface-900/90 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Scale className="w-3.5 h-3.5 text-brand-400" />
            Peso Estimado
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-slate-100">
            {pricing.totalWeightGrams.toFixed(1)} g
          </div>
          <div className="text-[11px] text-slate-500">
            {pricing.filamentMeters.toFixed(2)}m de filamento ({infillPercent}% infill)
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-900/90 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Tempo Estimado
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-slate-100">
            {formatTime(pricing.estimatedTimeMinutes)}
          </div>
          <div className="text-[11px] text-slate-500">
            Mat.: {formatBrl(pricing.materialCostBrl)} | Luz: {formatBrl(pricing.energyCostBrl)}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-900/90 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <DollarSign className="w-3.5 h-3.5 text-rose-400" />
            Custo Total Unit.
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-slate-100">
            {formatBrl(pricing.unitProductionCostBrl)}
          </div>
          <div className="text-[11px] text-slate-500">
            Inclui máquina, falha e argola/emb.
          </div>
        </div>

        <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/40">
          <div className="flex items-center gap-1.5 text-xs text-brand-300 font-semibold">
            <ShoppingBag className="w-3.5 h-3.5 text-brand-400" />
            Preço Sugerido
          </div>
          <div className="mt-1 text-lg font-extrabold font-mono text-brand-400">
            {formatBrl(pricing.directSalePriceBrl)}
          </div>
          <div className="text-[11px] text-brand-200/80">
            Shopee: {formatBrl(pricing.shopeeSuggestedPriceBrl)} | ML: {formatBrl(pricing.mercadoLivreSuggestedPriceBrl)}
          </div>
        </div>
      </div>

      {/* Expandable Quick Calibration */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-surface-900/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Material & Preço/Kg (R$)</label>
            <div className="flex gap-1.5">
              <select
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-900 border border-slate-700 text-slate-100"
              >
                {FILAMENT_MATERIALS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={filamentPricePerKg}
                onChange={(e) => setFilamentPricePerKg(Number(e.target.value))}
                className="w-20 px-2 py-1.5 rounded-lg bg-surface-900 border border-slate-700 font-mono text-brand-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Impressora & Preenchimento (%)</label>
            <div className="flex gap-1.5">
              <select
                value={printerId}
                onChange={(e) => setPrinterId(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-900 border border-slate-700 text-slate-100"
              >
                {PRINTER_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name.split('(')[0]}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={5}
                max={100}
                value={infillPercent}
                onChange={(e) => setInfillPercent(Number(e.target.value))}
                className="w-16 px-2 py-1.5 rounded-lg bg-surface-900 border border-slate-700 font-mono text-brand-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              Margem Lucro (%) & Extra/Argola (R$)
            </label>
            <div className="flex gap-1.5">
              <input
                type="number"
                min={20}
                max={1000}
                step={10}
                value={profitMarginPercent}
                onChange={(e) => setProfitMarginPercent(Number(e.target.value))}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-900 border border-slate-700 font-mono text-brand-400"
              />
              <input
                type="number"
                step={0.1}
                value={packagingBrl}
                onChange={(e) => setPackagingBrl(Number(e.target.value))}
                className="w-20 px-2 py-1.5 rounded-lg bg-surface-900 border border-slate-700 font-mono text-slate-200"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
