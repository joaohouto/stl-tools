'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { MeshMetrics } from '@/engine/types';
import { calculatePrintPricing } from '@/engine/meshMetrics';
import {
  CalculatorIcon as Calculator,
  ClockIcon as Clock,
  ScalesIcon as Scale,
  CurrencyDollarIcon as DollarSign,
  ShoppingBagIcon as ShoppingBag,
  ArrowUpRightIcon as ArrowUpRight,
} from '@phosphor-icons/react';

interface CostSummaryWidgetProps {
  metrics: MeshMetrics;
  partsCount: number;
}

export default function CostSummaryWidget({
  metrics,
  partsCount,
}: CostSummaryWidgetProps) {
  const pricing = useMemo(() => {
    return calculatePrintPricing({
      volumeCm3: metrics.volumeCm3,
      areaCm2: metrics.areaCm2,
      partsCount,
      materialId: 'PLA',
      filamentPricePerKgBrl: 115,
      infillPercent: 18,
      wallPerimeters: 3,
      printerId: 'bambu-a1',
      kwhTariffBrl: 0.92,
      failureRatePercent: 8,
      packagingAndHardwareBrl: 0.8,
      laborSetupBrl: 0.5,
      profitMarginPercent: 200,
      shopeeCommissionPercent: 20,
      shopeeFixedFeeBrl: 4.0,
      mlCommissionPercent: 16,
      mlFixedFeeBrl: 6.0,
      batchQuantity: 10,
    });
  }, [metrics.volumeCm3, metrics.areaCm2, partsCount]);

  const formatBrl = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}min` : `${m} min`;
  };

  return (
    <div className="p-4 rounded-2xl border border-slate-800/80 bg-surface-800/70 space-y-3">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-400">
          <Calculator className="w-3.5 h-3.5" />
          <span>Custo & Preço Sugerido</span>
        </div>

        <Link
          href="/calculadora"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 transition"
        >
          <span>Abrir Calculadora Completa</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-2.5 rounded-xl bg-surface-900/90 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Scale className="w-3.5 h-3.5 text-brand-400" />
            <span>Peso Estimado</span>
          </div>
          <div className="mt-0.5 text-sm font-bold font-mono text-slate-100">
            {pricing.totalWeightGrams.toFixed(1)} g
          </div>
          <div className="text-[10px] text-slate-500">
            {pricing.filamentMeters.toFixed(2)}m PLA (18% infill)
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-surface-900/90 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Tempo de Impressão</span>
          </div>
          <div className="mt-0.5 text-sm font-bold font-mono text-slate-100">
            {formatTime(pricing.estimatedTimeMinutes)}
          </div>
          <div className="text-[10px] text-slate-500">
            Mat.: {formatBrl(pricing.materialCostBrl)} | Luz: {formatBrl(pricing.energyCostBrl)}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-surface-900/90 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <DollarSign className="w-3.5 h-3.5 text-rose-400" />
            <span>Custo Unitário</span>
          </div>
          <div className="mt-0.5 text-sm font-bold font-mono text-slate-100">
            {formatBrl(pricing.unitProductionCostBrl)}
          </div>
          <div className="text-[10px] text-slate-500">
            Filamento + energia + extras
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/40">
          <div className="flex items-center gap-1.5 text-[11px] text-brand-300 font-semibold">
            <ShoppingBag className="w-3.5 h-3.5 text-brand-400" />
            <span>Venda Sugerida</span>
          </div>
          <div className="mt-0.5 text-sm font-extrabold font-mono text-brand-400">
            {formatBrl(pricing.directSalePriceBrl)}
          </div>
          <div className="text-[10px] text-brand-200/80 truncate">
            Shopee: {formatBrl(pricing.shopeeSuggestedPriceBrl)}
          </div>
        </div>
      </div>
    </div>
  );
}
