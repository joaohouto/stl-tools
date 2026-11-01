"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getProductBySlug, getDefaultParams } from "@/models/registry";
import { GeneratedPartMesh, TechnicalSpecReport } from "@/engine/types";
import { computeModelMetrics } from "@/engine/meshMetrics";
import SchemaForm from "@/components/customizer/SchemaForm";
import CostSummaryWidget from "@/components/calculator/CostSummaryWidget";
import {
  ArrowLeftIcon as ArrowLeft,
  FileTextIcon as FileText,
  ShareNetworkIcon as Share2,
  CheckIcon as Check,
} from "@phosphor-icons/react";

const ModelViewport = dynamic(
  () => import("@/components/viewer/ModelViewport"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[460px] w-full rounded-2xl border border-slate-800 bg-surface-800 flex items-center justify-center text-xs font-mono text-slate-400">
        Inicializando Motor 3D WebGL...
      </div>
    ),
  },
);

export default function ProductCustomizerPage() {
  const routeParams = useParams<{ slug: string }>();
  const slug = String(routeParams?.slug || "");
  const productModule = useMemo(() => getProductBySlug(slug), [slug]);

  const [values, setValues] = useState<Record<string, any>>(() =>
    productModule ? getDefaultParams(productModule) : {},
  );
  const [parts, setParts] = useState<GeneratedPartMesh[]>([]);
  const [ficha, setFicha] = useState<TechnicalSpecReport | undefined>(
    undefined,
  );
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
          console.error("[STLTools Generator Error]", err);
          setErrorMsg(err?.message || "Erro ao gerar geometria 3D.");
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
        <h1 className="text-2xl font-bold text-slate-100">
          Modelo não encontrado
        </h1>
        <p className="text-sm text-slate-400">
          O produto <code className="text-brand-400">{slug}</code> não existe no
          catálogo.
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-6">
      {/* First Fold: Occupies 100% of vertical screen height on desktop */}
      <div className="flex flex-col lg:h-[calc(100vh-5.5rem)] min-h-[600px] gap-3">
        {/* Compact Header Bar */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-lg bg-surface-800 hover:bg-slate-800 text-slate-300 hover:text-brand-400 border border-slate-700/60 transition"
              title="Voltar ao Catálogo"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-100 leading-tight">
                  {schema.name}
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block line-clamp-1">
                {schema.shortDescription}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-800 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-brand-400" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-brand-400" />
                <span className="hidden sm:inline">Compartilhar</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-xs text-rose-300 flex-shrink-0">
            {errorMsg}
          </div>
        )}

        {/* Studio Viewport (Left) + Customizer Panel (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
          {/* Left Column: 100% Height 3D Viewport */}
          <div className="lg:col-span-7 h-full min-h-[420px] lg:min-h-0 flex flex-col">
            <ModelViewport
              modelName={schema.name}
              modelSlug={schema.id}
              parts={parts}
              metrics={metrics}
              isGenerating={isGenerating}
            />
          </div>

          {/* Right Column: 100% Height Form + Simplified Cost Calculator with Independent Scroll */}
          <div className="lg:col-span-5 h-full min-h-0 flex flex-col">
            <div className="h-full overflow-y-auto pr-1 space-y-4 pb-2">
              <SchemaForm
                schema={schema}
                values={values}
                onChange={handleParamChange}
                onReset={handleReset}
              />
              <CostSummaryWidget metrics={metrics} partsCount={parts.length} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
