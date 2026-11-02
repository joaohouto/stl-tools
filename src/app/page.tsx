"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PRODUCT_MODULES, CATEGORY_LABELS } from "@/models/registry";
import { ProductCategory } from "@/engine/types";
import {
  MagnifyingGlassIcon as Search,
  SparkleIcon as Sparkles,
  DeviceMobileIcon as Smartphone,
  KeyIcon as Key,
  TextTIcon as Type,
  CookieIcon as Cookie,
  QrCodeIcon as QrCode,
  PawPrintIcon as PawPrint,
  CubeIcon as Box,
  StackIcon as Layers,
} from "@phosphor-icons/react";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all: <Layers className="w-4 h-4" />,
  suportes: <Smartphone className="w-4 h-4" />,
  chaveiros: <Key className="w-4 h-4" />,
  acessorios: <Sparkles className="w-4 h-4" />,
  letreiros: <Type className="w-4 h-4" />,
  cortadores: <Cookie className="w-4 h-4" />,
  placas: <QrCode className="w-4 h-4" />,
  pets: <PawPrint className="w-4 h-4" />,
  organizacao: <Box className="w-4 h-4" />,
};

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<
    ProductCategory | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    return PRODUCT_MODULES.filter((mod) => {
      const s = mod.schema;
      const matchesCat =
        selectedCategory === "all" || s.categories.includes(selectedCategory);
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
      {/* Filters & Search Bar */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
            {(Object.keys(CATEGORY_LABELS) as (ProductCategory | "all")[]).map(
              (cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition ${
                      active
                        ? "bg-brand-500 text-slate-950 border-brand-400 shadow-md shadow-brand-500/15"
                        : "bg-white dark:bg-surface-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {CATEGORY_ICONS[cat]}
                    <span>{CATEGORY_LABELS[cat]}</span>
                  </button>
                );
              },
            )}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar modelo..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
          {filteredProducts.map((mod) => {
            const { schema } = mod;

            return (
              <Link
                key={schema.id}
                href={`/models/${schema.id}`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-surface-800 hover:border-brand-500/60 dark:hover:border-brand-500/60 transition-all duration-200 overflow-hidden shadow-sm dark:shadow-lg hover:shadow-brand-500/10"
              >
                <div>
                  {/* Visual Preview Header com Imagem 3D isolada */}
                  <div className="relative h-48 bg-gradient-to-b from-slate-100 to-slate-50 dark:from-surface-900 dark:to-surface-800 p-4 flex flex-col justify-between border-b border-slate-200 dark:border-slate-800/70 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 z-10">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-[11px] font-medium text-slate-700 dark:text-slate-300 shadow-sm">
                        {CATEGORY_ICONS[schema.categories[0]]}
                        {CATEGORY_LABELS[schema.categories[0]]}
                      </span>
                    </div>

                    {/* Imagem do Produto 3D estática salva em /public */}
                    <div className="absolute inset-0 flex items-center justify-center p-5 pointer-events-none">
                      <img
                        src={`/previews/${schema.id}.png`}
                        alt={schema.name}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.endsWith(".png")) {
                            target.src = `/previews/${schema.id}.svg`;
                          } else if (target.src.endsWith(".svg")) {
                            target.src = `/api/render-preview?model=${schema.id}`;
                          } else {
                            target.style.display = "none";
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition">
                      {schema.name}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                      {schema.shortDescription}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
