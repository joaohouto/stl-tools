'use client';

import React, { useState } from 'react';
import { imageFileToSvg } from '@/engine/vectorizer';
import { triggerBrowserDownload } from '@/engine/exporters';
import { strToU8 } from 'fflate';
import {
  UploadSimpleIcon as Upload,
  DownloadSimpleIcon as Download,
  ImageIcon,
} from '@phosphor-icons/react';

export default function ImageToSvgPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [threshold, setThreshold] = useState(140);
  const [invert, setInvert] = useState(false);
  const [removeBg, setRemoveBg] = useState(true);
  const [svgResult, setSvgResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runVectorization = async (
    file: File | null,
    thresh: number,
    inv: boolean,
    remBg: boolean
  ) => {
    if (!file) return;
    setError(null);
    try {
      const svg = await imageFileToSvg(file, {
        threshold: thresh,
        invert: inv,
        removeBg: remBg,
        resolution: 160,
      });
      setSvgResult(svg);
    } catch (err: any) {
      setError(err?.message || 'Erro ao vetorizar imagem.');
    }
  };

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      runVectorization(file, threshold, invert, removeBg);
    }
  };

  const handleDownloadSvg = () => {
    if (!svgResult) return;
    const baseName = selectedFile?.name.replace(/\.[^.]+$/, '') || 'logo-vetorizado';
    triggerBrowserDownload(strToU8(svgResult), `${baseName}.svg`, 'image/svg+xml');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-600 dark:text-brand-300 text-xs font-semibold">
          <ImageIcon className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
          <span>Vetorizador Instantâneo para Impressão 3D</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
          Converter Imagem / Logo (PNG, JPG) para SVG 3D
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Converta qualquer logotipo, silhueta ou desenho em um arquivo <code className="text-brand-600 dark:text-brand-400 font-mono">.SVG</code> limpo para usar nos nossos geradores de Suporte de Celular, Chaveiros, Placas e Cortadores de Biscoito.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <label className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 bg-slate-50 dark:bg-surface-900 cursor-pointer transition text-center">
              <Upload className="w-6 h-6 text-brand-500 dark:text-brand-400 mb-2" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {selectedFile ? selectedFile.name : 'Selecionar Imagem (PNG, JPG, WebP)'}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
            </label>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Sensibilidade / Contraste (Threshold)</span>
                  <span className="font-mono text-brand-600 dark:text-brand-400 font-bold">{threshold}</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={235}
                  value={threshold}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setThreshold(v);
                    runVectorization(selectedFile, v, invert, removeBg);
                  }}
                  className="w-full accent-brand-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
              </div>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition">
                <span className="text-slate-700 dark:text-slate-200">Remover Fundo Automático</span>
                <input
                  type="checkbox"
                  checked={removeBg}
                  onChange={(e) => {
                    setRemoveBg(e.target.checked);
                    runVectorization(selectedFile, threshold, invert, e.target.checked);
                  }}
                  className="accent-brand-500 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition">
                <span className="text-slate-700 dark:text-slate-200">Inverter Claro / Escuro</span>
                <input
                  type="checkbox"
                  checked={invert}
                  onChange={(e) => {
                    setInvert(e.target.checked);
                    runVectorization(selectedFile, threshold, e.target.checked, removeBg);
                  }}
                  className="accent-brand-500 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="md:col-span-7">
          <div className="p-6 rounded-2xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Preview do Vetor SVG
              </span>
              {svgResult && (
                <button
                  onClick={handleDownloadSvg}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-brand-500 hover:bg-brand-400 text-slate-950 transition shadow-md shadow-brand-500/20"
                >
                  <Download className="w-4 h-4" />
                  Baixar Arquivo .SVG
                </button>
              )}
            </div>

            <div className="flex-1 min-h-[280px] rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-6 overflow-hidden">
              {error ? (
                <p className="text-xs text-rose-500 dark:text-rose-400">{error}</p>
              ) : svgResult ? (
                <div
                  className="w-64 h-64 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: svgResult }}
                />
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Envie uma imagem ao lado para visualizar o vetor SVG gerado.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
