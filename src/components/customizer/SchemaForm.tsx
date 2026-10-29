'use client';

import React, { useState } from 'react';
import { ModelSchema, ParamDefinition } from '@/engine/types';
import { AVAILABLE_FONTS } from '@/engine/fontManager';
import { BUILTIN_SHAPES } from '@/engine/cad';
import { imageFileToSvg } from '@/engine/vectorizer';
import { RotateCcw, Upload, Palette, Sliders } from 'lucide-react';

interface SchemaFormProps {
  schema: ModelSchema;
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onReset: () => void;
}

function isParamVisible(param: ParamDefinition, values: Record<string, any>): boolean {
  if (!param.visibleIf) return true;
  // Format: "key=val1|val2"
  const [key, allowedRaw] = param.visibleIf.split('=');
  if (!key || !allowedRaw) return true;
  const currentVal = String(values[key.trim()]);
  const allowedList = allowedRaw.split('|').map((s) => s.trim());
  return allowedList.includes(currentVal);
}

const FILAMENT_SWATCHES = [
  '#1e293b', // Preto / Grafite
  '#f8fafc', // Branco
  '#16d8aa', // Verde Mint STLTools
  '#ef4444', // Vermelho
  '#3b82f6', // Azul Royal
  '#f59e0b', // Amarelo / Ouro
  '#ec4899', // Rosa Pink
  '#8b5cf6', // Roxo
  '#10b981', // Verde Esmeralda
  '#f97316', // Laranja
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
    (p) => p.type !== 'color' && isParamVisible(p, values)
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

    if (file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml') {
      const text = await file.text();
      onChange(paramName, text);
      return;
    }

    // PNG / JPG / WebP -> Vectorize automatically into SVG!
    try {
      setVectorizingField(paramName);
      const svg = await imageFileToSvg(file);
      onChange(paramName, svg);
    } catch (err: any) {
      setVectorizeError(err?.message || 'Erro ao vetorizar imagem.');
    } finally {
      setVectorizingField(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header with Reset button */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-800 border border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-brand-400" />
          <span className="text-sm font-semibold text-slate-100">
            Personalizar Peça
          </span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurar Padrão
        </button>
      </div>

      {/* Filament Colors Section */}
      {colorParams.length > 0 && (
        <div className="p-4 rounded-xl bg-surface-800 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Palette className="w-3.5 h-3.5 text-brand-400" />
            Cores das Peças (Preview & 3MF)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {colorParams.map((cp) => {
              const currentColor = String(values[cp.name] || cp.default);
              return (
                <div
                  key={cp.name}
                  className="p-2.5 rounded-lg bg-surface-900/80 border border-slate-800/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">
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
                            ? 'ring-2 ring-brand-400 scale-110 border-white'
                            : 'border-white/20 opacity-80 hover:opacity-100'
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
          className="p-4 rounded-xl bg-surface-800 border border-slate-800 space-y-4"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 border-b border-slate-800 pb-2">
            {groupName}
          </h3>

          <div className="space-y-4">
            {params.map((p) => {
              const val = values[p.name] ?? p.default;

              if (p.type === 'string') {
                return (
                  <div key={p.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <label className="font-medium text-slate-200">{p.label}</label>
                      {p.maxLength && (
                        <span className="text-slate-500 font-mono">
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
                        className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-brand-500 resize-y"
                      />
                    ) : (
                      <input
                        type="text"
                        value={String(val)}
                        maxLength={p.maxLength}
                        placeholder={p.placeholder}
                        onChange={(e) => onChange(p.name, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                      />
                    )}
                  </div>
                );
              }

              if (p.type === 'number') {
                return (
                  <div key={p.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-medium text-slate-200">{p.label}</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={Number(val)}
                          min={p.min}
                          max={p.max}
                          step={p.step ?? 1}
                          onChange={(e) => onChange(p.name, Number(e.target.value))}
                          className="w-16 px-2 py-0.5 text-right font-mono text-xs rounded bg-surface-900 border border-slate-700 text-brand-400"
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
                      className="w-full accent-brand-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                    />
                  </div>
                );
              }

              if (p.type === 'boolean') {
                return (
                  <label
                    key={p.name}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-surface-900/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition"
                  >
                    <span className="text-xs font-medium text-slate-200">
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
                  <div key={p.name} className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-200">
                      {p.label}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {AVAILABLE_FONTS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => onChange(p.name, f.id)}
                          className={`px-2.5 py-2 rounded-lg text-left border transition ${
                            val === f.id
                              ? 'bg-brand-500/15 border-brand-500 text-brand-300'
                              : 'bg-surface-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-xs font-semibold truncate">{f.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {f.styleNote}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              if (p.type === 'shape') {
                return (
                  <div key={p.name} className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-200">
                      {p.label}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {BUILTIN_SHAPES.map((sh) => (
                        <button
                          key={sh.id}
                          type="button"
                          onClick={() => onChange(p.name, sh.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                            val === sh.id
                              ? 'bg-brand-500/15 border-brand-500 text-brand-300'
                              : 'bg-surface-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {sh.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              if (p.type === 'enum' && p.options) {
                return (
                  <div key={p.name} className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-200">
                      {p.label}
                    </label>
                    <select
                      value={String(val)}
                      onChange={(e) => onChange(p.name, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                    >
                      {p.options.map((opt) => {
                        const oVal = typeof opt === 'string' ? opt : opt.value;
                        const oLab = typeof opt === 'string' ? opt : opt.label;
                        return (
                          <option key={oVal} value={oVal}>
                            {oLab}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                );
              }

              if (p.type === 'svg') {
                return (
                  <div key={p.name} className="space-y-2">
                    <label className="block text-xs font-medium text-slate-200">
                      {p.label}
                    </label>
                    <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-brand-500 bg-surface-900/60 cursor-pointer transition text-center">
                      <Upload className="w-5 h-5 text-brand-400 mb-1" />
                      <span className="text-xs font-medium text-slate-200">
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
                      <p className="text-xs text-rose-400">{vectorizeError}</p>
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
