import React from 'react';
import Link from 'next/link';
import { Box, Calculator, Wrench, Image as ImageIcon, Layers } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-surface-900/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/40 flex items-center justify-center group-hover:bg-brand-500/25 transition">
            <Box className="w-5 h-5 text-brand-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold tracking-tight text-slate-100 leading-none">
              stl<span className="text-brand-400">tools</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              CATÁLOGO PARAMÉTRICO 3D
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-200 hover:text-brand-400 hover:bg-slate-800/60 transition"
          >
            <Layers className="w-4 h-4 text-brand-400" />
            <span>Catálogo 3D</span>
          </Link>

          <Link
            href="/calculadora"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-200 hover:text-brand-400 hover:bg-slate-800/60 transition"
          >
            <Calculator className="w-4 h-4 text-brand-400" />
            <span>Calculadora de Custos</span>
          </Link>

          <Link
            href="/imagem-para-svg"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-200 hover:text-brand-400 hover:bg-slate-800/60 transition"
          >
            <ImageIcon className="w-4 h-4 text-brand-400" />
            <span>Imagem → SVG</span>
          </Link>

          <Link
            href="/oficina"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-brand-300 border border-slate-700 transition"
            title="Fábrica Interna de Novos Produtos Paramétricos"
          >
            <Wrench className="w-3.5 h-3.5 text-brand-400" />
            <span className="hidden sm:inline">Oficina de Modelos</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
