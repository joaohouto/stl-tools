'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug, getDefaultParams } from '@/models/registry';
import { GeneratedPartMesh, TechnicalSpecReport } from '@/engine/types';
import { computeModelMetrics } from '@/engine/meshMetrics';
import ModelViewport from '@/components/viewer/ModelViewport';
import SchemaForm from '@/components/customizer/SchemaForm';
import CostSummaryWidget from '@/components/calculator/CostSummaryWidget';
import { ArrowLeft, FileText, Share2, Check } from 'lucide-react';

export default function ProductCustomizerPage() {
  const routeParams = useParams<{ slug: string }>();
  const slug = String(routeParams?.slug || '');
  const productModule = useMemo(() => getProductBySlug(slug), [slug]);

  const [values, setValues] = useState<Record<string, any>>(() =>
    productModule ? getDefaultParams(productModule) : {}
  );
  const [parts, setParts] = useState<GeneratedPartMesh[]>([]);
  const [ficha, setFicha] = useState<TechnicalSpecReport | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Reset values when switching product slug
  useEffect(() => {
    if (productModule) {
      setValues(getDefaultParams(productModule));
    }
  }, [productModule]);

  // Run parametric 3D generator with 120ms debounce
  useEffect(() => {
    if (!productModule) return;
    let cancelled = false;
    setIsGenerating(true);
    setErrorMsg(null);

    const timer = setTimeout(async () => {
      try {
        const res = await productModule.generate(values);
        if (!cancelled) {
          setParts(res.parts);
          setFicha(res.fichaTecnica);
          setIsGenerating(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[STLTools Generator Error]', err);
          setErrorMsg(err?.message || 'Erro ao gerar geometria 3D.');
          setIsGenerating(false);
        }
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [productModule, values]);

  const metrics = useMemo(() => computeModelMetrics(parts), [parts]);

  if (!productModule) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-100">Modelo não encontrado</h1>
        <p className="text-sm text-slate-400">
          O produto <code className="text-brand-400">{slug}</code> não existe no catálogo.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-slate-950 font-semibold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Catálogo
        </Link>
      </div>
    );
  }

  const { schema } = productModule;

  const handleParamChange = (name: string, val: any) => {
    setValues((prev) => ({ ...prev, [name]: val }));
  };

  const handleReset = () => {
    setValues(getDefaultParams(productModule));
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/" className="hover:text-brand-400 inline-flex items-center gap-1 transition">
              <ArrowLeft className="w-3.5 h-3.5" />
              Catálogo
            </Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">{schema.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
            {schema.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
            {schema.description}
          </p>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-800 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
        >
          {copiedLink ? (
            <>
              <Check className="w-4 h-4 text-brand-400" />
              Link Copiado!
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-brand-400" />
              Compartilhar Modelo
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/40 text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Main Two-Column Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sticky Column: 3D Viewport + Live Cost Calculator + Technical Spec */}
        <div className="lg:col-span-7 lg:sticky lg:top-20 space-y-5">
          <ModelViewport
            modelName={schema.name}
            modelSlug={schema.id}
            parts={parts}
            metrics={metrics}
            isGenerating={isGenerating}
          />

          <CostSummaryWidget metrics={metrics} partsCount={parts.length} />

          {ficha && (
            <div className="p-4 rounded-2xl border border-slate-800 bg-surface-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-400">
                <FileText className="w-4 h-4" />
                {ficha.title}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ficha.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-surface-900/90 border border-slate-800/80"
                  >
                    <div className="text-[11px] text-slate-400">{item.label}</div>
                    <div className="text-xs font-bold font-mono text-slate-100 mt-0.5">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Parametric Controls */}
        <div className="lg:col-span-5">
          <SchemaForm
            schema={schema}
            values={values}
            onChange={handleParamChange}
            onReset={handleReset}
          />
        </div>
      </div>
    </div>
  );
}
