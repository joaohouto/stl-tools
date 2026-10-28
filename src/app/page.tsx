'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { PRODUCT_MODULES, CATEGORY_LABELS } from '@/models/registry';
import { ProductCategory } from '@/engine/types';
import {
  Search,
  Sparkles,
  Smartphone,
  Key,
  Type,
  Cookie,
  QrCode,
  PawPrint,
  Box,
  Calculator,
  ArrowRight,
  Layers,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all: <Layers className="w-4 h-4" />,
  suportes: <Smartphone className="w-4 h-4" />,
  chaveiros: <Key className="w-4 h-4" />,
  letreiros: <Type className="w-4 h-4" />,
  cortadores: <Cookie className="w-4 h-4" />,
  placas: <QrCode className="w-4 h-4" />,
  pets: <PawPrint className="w-4 h-4" />,
  organizacao: <Box className="w-4 h-4" />,
};

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    return PRODUCT_MODULES.filter((mod) => {
      const s = mod.schema;
      const matchesCat =
        selectedCategory === 'all' || s.categories.includes(selectedCategory);
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.shortDescription.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Hero Banner */}
      <section className="relative rounded-3xl border border-slate-800 bg-gradient-to-br from-surface-800 via-surface-900 to-[#0d1f22] p-6 sm:p-10 overflow-hidden shadow-2xl">
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Gerador de Produtos 3D Paramétricos + Precificação Automática</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-100 leading-tight">
            Personalize produtos 3D e baixe o{' '}
            <span className="text-brand-400">STL ou 3MF</span> na hora.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Suportes de celular com sua marca, chaveiros contornados, letras com nome sem cola,
            cortadores de biscoito, placas Pix QR Code e letra-caixa LED — todos com{' '}
            <strong className="text-slate-100">cálculo de peso, tempo e preço de venda em tempo real</strong>.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/models/suporte-celular-marca"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-brand-500 hover:bg-brand-400 text-slate-950 transition shadow-lg shadow-brand-500/20"
            >
              <Smartphone className="w-4 h-4" />
              Criar Suporte de Celular Personalizado
            </Link>

            <Link
              href="/calculadora"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-700 transition"
            >
              <Calculator className="w-4 h-4 text-brand-400" />
              Calculadora de Custos 3D
            </Link>
          </div>
        </div>
      </section>

      {/* Filters & Search Bar */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
            {(Object.keys(CATEGORY_LABELS) as (ProductCategory | 'all')[]).map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition ${
                    active
                      ? 'bg-brand-500 text-slate-950 border-brand-400 shadow-md shadow-brand-500/15'
                      : 'bg-surface-800 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {CATEGORY_ICONS[cat]}
                  <span>{CATEGORY_LABELS[cat]}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar modelo (ex: suporte, chaveiro, pix...)"
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-800 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
          {filteredProducts.map((mod) => {
            const { schema } = mod;
            const defaultColors = schema.params
              .filter((p) => p.type === 'color')
              .map((p) => String(p.default));

            return (
              <Link
                key={schema.id}
                href={`/models/${schema.id}`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-surface-800 hover:border-brand-500/60 transition-all duration-200 overflow-hidden shadow-lg hover:shadow-brand-500/10"
              >
                <div>
                  {/* Visual Preview Header */}
                  <div className="relative h-40 bg-gradient-to-br from-surface-900 via-[#131c2b] to-surface-800 p-5 flex flex-col justify-between border-b border-slate-800/70">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/80 text-[11px] font-medium text-slate-300">
                        {CATEGORY_ICONS[schema.categories[0]]}
                        {CATEGORY_LABELS[schema.categories[0]]}
                      </span>

                      {schema.badge && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                          {schema.badge}
                        </span>
                      )}
                    </div>

                    {/* Stylized Parametric Icon + Swatches */}
                    <div className="flex items-end justify-between">
                      <div className="text-xs font-mono text-slate-400">
                        {schema.params.filter((p) => p.type !== 'color').length} parâmetros ajustáveis
                      </div>
                      <div className="flex items-center gap-1">
                        {defaultColors.map((col, idx) => (
                          <span
                            key={idx}
                            className="w-4 h-4 rounded-full border border-white/25 shadow"
                            style={{ backgroundColor: col }}
                            title="Peça separada por cor"
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-2">
                    <h2 className="text-base font-bold text-slate-100 group-hover:text-brand-400 transition">
                      {schema.name}
                    </h2>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                      {schema.shortDescription}
                    </p>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3.5 border-t border-slate-800/80 bg-surface-900/40 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">
                    {schema.parts.length} {schema.parts.length === 1 ? 'peça' : 'peças (Multicor)'}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-brand-400 group-hover:translate-x-0.5 transition">
                    Personalizar 3D <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
