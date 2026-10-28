'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PRODUCT_MODULES, CATEGORY_LABELS } from '@/models/registry';
import { ProductCategory } from '@/engine/types';
import { Wrench, Terminal, PlusCircle, Copy, Check, ExternalLink, Layers, BookOpen } from 'lucide-react';

export default function OficinaPage() {
  const [newSlug, setNewSlug] = useState('suporte-headset-nome');
  const [newTitle, setNewTitle] = useState('Suporte de Mesa para Headset com Nome');
  const [newCategory, setNewCategory] = useState<ProductCategory>('suportes');
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const cliCommand = `pnpm run new:model ${newSlug} "${newTitle}" "${newCategory}"`;

  const camelName =
    newSlug
      .split('-')
      .map((part, idx) =>
        idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
      )
      .join('') + 'Module';

  const generatedTemplate = `// src/models/${newSlug}/index.ts
import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  roundedRectPolygon,
  offsetPolygons,
  subtractPolygons,
  textToPolygons,
  extrudePolygons,
} from '@/engine/cad';

export const ${camelName}: ProductModule = {
  schema: {
    id: '${newSlug}',
    name: '${newTitle}',
    shortDescription: 'Personalize medidas, texto e cores e baixe o STL pronto para impressão.',
    description: '${newTitle} paramétrico gerado em tempo real.',
    categories: ['${newCategory}'],
    featured: true,
    creditCost: 2,
    addedAt: '${new Date().toISOString().slice(0, 10)}',
    badge: 'Novo',
    params: [
      { name: 'texto', label: 'Texto / Nome', type: 'string', default: 'GAMER', maxLength: 16, group: 'Personalização' },
      { name: 'fonte', label: 'Fonte', type: 'font', default: 'Bebas Neue', group: 'Personalização' },
      { name: 'largura', label: 'Largura (mm)', type: 'number', default: 85, min: 40, max: 200, group: 'Medidas' },
      { name: 'altura', label: 'Altura (mm)', type: 'number', default: 45, min: 20, max: 150, group: 'Medidas' },
      { name: 'espessura', label: 'Espessura (mm)', type: 'number', default: 5, min: 2, max: 15, group: 'Medidas' },
      { name: 'cor_base', label: 'Cor Principal', type: 'color', default: '#1e293b', previewOnly: true },
      { name: 'cor_relevo', label: 'Cor do Texto', type: 'color', default: '#16d8aa', previewOnly: true },
    ],
    parts: [
      { name: 'base', label: 'Corpo Principal', colorParam: 'cor_base' },
      { name: 'relevo', label: 'Texto em Relevo', colorParam: 'cor_relevo' },
    ],
  },
  async generate(params) {
    const base2D = roundedRectPolygon(Number(params.largura), Number(params.altura), 6);
    const text2D = await textToPolygons(String(params.texto), String(params.fonte), Number(params.altura) * 0.4);
    return {
      parts: [
        { name: 'base', label: 'Corpo Principal', geometry: extrudePolygons(base2D, { height: Number(params.espessura) }), color: String(params.cor_base) },
        { name: 'relevo', label: 'Texto em Relevo', geometry: extrudePolygons(text2D, { height: 1.4, zOffset: Number(params.espessura) }), color: String(params.cor_relevo) },
      ],
    };
  },
};`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs font-semibold">
          <Wrench className="w-3.5 h-3.5 text-brand-400" />
          <span>Fluxo Interno de Criação de Produtos (Product Factory)</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">
          Oficina Interna de Modelos Paramétricos
        </h1>
        <p className="text-sm text-slate-400 max-w-3xl">
          Painel interno de engenharia para criar novos produtos 3D no catálogo, inspecionar parâmetros e consultar a arquitetura documentada em{' '}
          <code className="text-brand-400">/docs/PRODUCT_FACTORY_WORKFLOW.md</code> e{' '}
          <code className="text-brand-400">/docs/PROCESS_AND_IDEAS.md</code>.
        </p>
      </div>

      {/* Interactive Model Generator Wizard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 p-6 rounded-2xl bg-surface-800 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <PlusCircle className="w-4 h-4 text-brand-400" />
            <span>1. Gerador Rápido de Novo Produto</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1">Slug do Produto (URL)</label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) =>
                  setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                }
                className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 font-mono text-brand-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Nome de Exibição</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Categoria Principal</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 text-slate-100"
              >
                {(Object.keys(CATEGORY_LABELS) as (ProductCategory | 'all')[])
                  .filter((c) => c !== 'all')
                  .map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-brand-400" />
              Comando CLI Automático (cria a pasta + registra no catálogo):
            </div>
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-surface-900 border border-slate-700 font-mono text-xs text-brand-300">
              <span className="truncate">{cliCommand}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(cliCommand);
                  setCopiedCmd(true);
                  setTimeout(() => setCopiedCmd(false), 1800);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0"
              >
                {copiedCmd ? <Check className="w-3.5 h-3.5 text-brand-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Generated TypeScript Code Preview */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-surface-800 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
              2. Código Gerado Automaticamente (src/models/{newSlug}/index.ts)
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(generatedTemplate);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 1800);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-brand-400" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copiar Template
                </>
              )}
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-surface-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-80">
            {generatedTemplate}
          </pre>
        </div>
      </div>

      {/* Active Catalog Inventory Table */}
      <div className="p-6 rounded-2xl bg-surface-800 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-400" />
            <h2 className="text-base font-bold text-slate-100">
              Inventário de Produtos Ativos ({PRODUCT_MODULES.length} Geradores Paramétricos)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            src/models/registry.ts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase">
                <th className="py-3 px-3">Slug / ID</th>
                <th className="py-3 px-3">Nome do Produto</th>
                <th className="py-3 px-3">Categorias</th>
                <th className="py-3 px-3">Parâmetros</th>
                <th className="py-3 px-3">Partes (Cores)</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {PRODUCT_MODULES.map((m) => (
                <tr key={m.schema.id} className="hover:bg-surface-900/50 transition">
                  <td className="py-3 px-3 font-mono text-brand-400">
                    {m.schema.id}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-100">
                    {m.schema.name}
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {m.schema.categories.join(', ')}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">
                    {m.schema.params.length} controles
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">
                    {m.schema.parts.map((p) => p.name).join(' + ')}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Link
                      href={`/models/${m.schema.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-500/15 text-brand-300 hover:bg-brand-500/25 font-semibold"
                    >
                      Abrir <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Architecture & Process Docs Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-5 rounded-2xl bg-surface-800 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-100">
            <BookOpen className="w-4 h-4 text-brand-400" />
            <span>/PLAN.md</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Plano mestre com a engenharia reversa do usestl.com, diagramas de arquitetura e escopo dos geradores.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-surface-800 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-100">
            <BookOpen className="w-4 h-4 text-brand-400" />
            <span>/docs/PRODUCT_FACTORY_WORKFLOW.md</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Guia da fábrica interna de produtos: como usar as super-primitivas 2D/3D (`offsetPolygons`, `textToPolygons`, `extrudeProfileAlongX`) e prompts para IA.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-surface-800 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-100">
            <BookOpen className="w-4 h-4 text-brand-400" />
            <span>/docs/PROCESS_AND_IDEAS.md</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Documento vivo com todas as regras de processo (fórmula de casca+infill, cálculo reverso Shopee/ML, regras de folga sem cola e ideias futuras).
          </p>
        </div>
      </div>
    </div>
  );
}
