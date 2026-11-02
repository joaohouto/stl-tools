'use client';

import React, { useState } from 'react';
import { ModelSchema, ParamDefinition } from '@/engine/types';
import { AVAILABLE_FONTS } from '@/engine/fontManager';
import { BUILTIN_SHAPES } from '@/engine/cad';
import ShapeSelect from './ShapeSelect';
import CustomSelect from './CustomSelect';
import NumericInput from '@/components/ui/NumericInput';
import { imageFileToSvg } from '@/engine/vectorizer';
import {
  ArrowCounterClockwiseIcon as RotateCcw,
  UploadSimpleIcon as Upload,
  PaletteIcon as Palette,
  SlidersIcon as Sliders,
} from '@phosphor-icons/react';

interface SchemaFormProps {
  schema: ModelSchema;
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onReset: () => void;
}

function isParamVisible(param: ParamDefinition, values: Record<string, any>, schema?: ModelSchema): boolean {
  if (!param.visibleIf) return true;
  // Supports OR groups separated by ';', where each group has AND clauses separated by '&'
  const orGroups = param.visibleIf.split(';');
  return orGroups.some((group) => {
    const clauses = group.split('&');
    return clauses.every((clause) => {
      const trimmed = clause.trim();
      if (trimmed.includes('!=')) {
        const [key, rawVals] = trimmed.split('!=');
        if (!key || !rawVals) return true;
        const k = key.trim();
        let currentVal = values[k];
        if (currentVal === undefined && schema) {
          currentVal = schema.params.find((p) => p.name === k)?.default;
        }
        const valStr = String(currentVal ?? '');
        const forbiddenList = rawVals.split('|').map((s) => s.trim());
        return !forbiddenList.includes(valStr);
      }
      if (trimmed.includes('=')) {
        const [key, rawVals] = trimmed.split('=');
        if (!key || !rawVals) return true;
        const k = key.trim();
        let currentVal = values[k];
        if (currentVal === undefined && schema) {
          currentVal = schema.params.find((p) => p.name === k)?.default;
        }
        const valStr = String(currentVal ?? '');
        const allowedList = rawVals.split('|').map((s) => s.trim());
        return allowedList.includes(valStr);
      }
      return true;
    });
  });
}

const FILAMENT_SWATCHES = [
  '#f97316', // Laranja Brand (Padrão)
  '#ffffff', // Branco Puro
  '#1e293b', // Preto / Grafite
  '#2563eb', // Azul Royal
  '#ef4444', // Vermelho
  '#f59e0b', // Amarelo / Ouro
  '#ec4899', // Rosa Pink
  '#8b5cf6', // Roxo
  '#10b981', // Verde Esmeralda
  '#16d8aa', // Verde Mint
];

export default function SchemaForm({
  schema,
  values,
  onChange,
  onReset,
}: SchemaFormProps) {
  const [vectorizingField, setVectorizingField] = useState<string | null>(null);
  const [vectorizeError, setVectorizeError] = useState<string | null>(null);

  const regularParams = schema.params.filter(
    (p) => p.type !== 'color' && isParamVisible(p, values, schema)
  );
  const colorParams = schema.params.filter((p) => p.type === 'color');

  // Group regular params by `group`
  const groups = new Map<string, ParamDefinition[]>();
  for (const p of regularParams) {
    const g = p.group || 'Parâmetros do Modelo';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(p);
  }

  const handleFileUpload = async (paramName: string, file?: File | null) => {
    if (!file) return;
    setVectorizeError(null);

    // Se já for SVG direto, lê o texto em UTF-8
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const text = await file.text();
      onChange(paramName, text);
      return;
    }

    // Se for imagem raster (PNG, JPG, WebP), roda o motor de vetorização
    setVectorizingField(paramName);
    try {
      const svgOutput = await imageFileToSvg(file);
      onChange(paramName, svgOutput);
    } catch (err: any) {
      console.error('[Vectorize Error]', err);
      setVectorizeError(err?.message || 'Falha ao vetorizar imagem.');
    } finally {
      setVectorizingField(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header with Reset button */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-brand-500 dark:text-brand-400" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Personalizar Peça
          </span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurar Padrão
        </button>
      </div>

      {/* Filament Colors Section */}
      {colorParams.length > 0 && (
        <div className="p-4 rounded-xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            <Palette className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
            Cores das Peças (Preview & 3MF)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {colorParams.map((cp) => {
              const currentColor = String(values[cp.name] || cp.default);
              return (
                <div
                  key={cp.name}
                  className="p-2.5 rounded-lg bg-slate-100 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {cp.label}
                    </label>
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => onChange(cp.name, e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {FILAMENT_SWATCHES.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() => onChange(cp.name, swatch)}
                        className={`w-4 h-4 rounded-full border transition ${
                          currentColor.toLowerCase() === swatch.toLowerCase()
                            ? 'ring-2 ring-brand-500 scale-110 border-slate-900 dark:border-white'
                            : 'border-slate-300 dark:border-white/20 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: swatch }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Parameter Groups */}
      {Array.from(groups.entries()).map(([groupName, params]) => (
        <div
          key={groupName}
          className="p-4 rounded-xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 border-b border-slate-200 dark:border-slate-800 pb-2">
            {groupName}
          </h3>

          <div className="space-y-4">
            {params.map((p) => {
              const val = values[p.name] ?? p.default;

              if (p.type === 'string') {
                return (
                  <div key={p.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <label className="font-medium text-slate-700 dark:text-slate-200">{p.label}</label>
                      {p.maxLength && (
                        <span className="text-slate-400 dark:text-slate-500 font-mono">
                          {String(val).length}/{p.maxLength}
                        </span>
                      )}
                    </div>
                    {(p.maxLength ?? 20) >= 35 ? (
                      <textarea
                        rows={2}
                        value={String(val)}
                        maxLength={p.maxLength}
                        placeholder={p.placeholder || 'Digite 1 ou 2 linhas...'}
                        onChange={(e) => onChange(p.name, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-500 resize-y"
                      />
                    ) : (
                      <input
                        type="text"
                        value={String(val)}
                        maxLength={p.maxLength}
                        placeholder={p.placeholder}
                        onChange={(e) => onChange(p.name, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-500"
                      />
                    )}
                  </div>
                );
              }

              if (p.type === 'number') {
                return (
                  <div key={p.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-medium text-slate-700 dark:text-slate-200">{p.label}</label>
                      <div className="flex items-center gap-1">
                        <NumericInput
                          value={Number(val)}
                          min={p.min}
                          max={p.max}
                          step={p.step ?? 1}
                          fallbackValue={Number(p.default ?? p.min ?? 0)}
                          onChange={(v) => onChange(p.name, v)}
                          className="w-16 px-2 py-0.5 text-right font-mono text-xs rounded bg-slate-50 dark:bg-surface-900 border border-slate-300 dark:border-slate-700 text-brand-600 dark:text-brand-400 focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>
                    <input
                      type="range"
                      min={p.min ?? 0}
                      max={p.max ?? 100}
                      step={p.step ?? 1}
                      value={Number(val)}
                      onChange={(e) => onChange(p.name, Number(e.target.value))}
                      className="w-full accent-brand-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                    />
                  </div>
                );
              }

              if (p.type === 'boolean') {
                return (
                  <label
                    key={p.name}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-100 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      {p.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(val)}
                      onChange={(e) => onChange(p.name, e.target.checked)}
                      className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
                    />
                  </label>
                );
              }

              if (p.type === 'font') {
                return (
                  <CustomSelect
                    key={p.name}
                    label={p.label}
                    value={String(val)}
                    onChange={(newVal) => onChange(p.name, newVal)}
                    options={AVAILABLE_FONTS.map((f) => ({
                      value: f.id,
                      label: f.name,
                      fontFamily: f.name,
                    }))}
                  />
                );
              }

              if (p.type === 'shape') {
                return (
                  <ShapeSelect
                    key={p.name}
                    label={p.label}
                    value={String(val)}
                    onChange={(newVal) => onChange(p.name, newVal)}
                    options={BUILTIN_SHAPES}
                  />
                );
              }

              if (p.type === 'enum' && p.options) {
                return (
                  <CustomSelect
                    key={p.name}
                    label={p.label}
                    value={String(val)}
                    onChange={(newVal) => onChange(p.name, newVal)}
                    options={p.options.map((opt) => {
                      const oVal = typeof opt === 'string' ? opt : opt.value;
                      const oLab = typeof opt === 'string' ? opt : opt.label;
                      return { value: oVal, label: oLab };
                    })}
                  />
                );
              }

              if (p.type === 'svg') {
                return (
                  <div key={p.name} className="space-y-2">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                      {p.label}
                    </label>
                    <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 bg-slate-100 dark:bg-surface-900 cursor-pointer transition text-center">
                      <Upload className="w-5 h-5 text-brand-500 dark:text-brand-400 mb-1" />
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {vectorizingField === p.name
                          ? 'Vetorizando imagem...'
                          : 'Clique para enviar .SVG, .PNG ou .JPG'}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        Imagens PNG/JPG são convertidas automaticamente em vetor 3D!
                      </span>
                      <input
                        type="file"
                        accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(p.name, e.target.files?.[0] || null)
                        }
                      />
                    </label>
                    {vectorizeError && (
                      <p className="text-xs text-rose-500 dark:text-rose-400">{vectorizeError}</p>
                    )}
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
