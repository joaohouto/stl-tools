'use client';

import React, { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Center, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { GeneratedPartMesh, MeshMetrics } from '@/engine/types';
import { Download, Layers, Box, Maximize2, Sparkles } from 'lucide-react';
import {
  exportMergedSTL,
  exportPartsZIP,
  exportMultiColor3MF,
  triggerBrowserDownload,
} from '@/engine/exporters';

interface ModelViewportProps {
  modelName: string;
  modelSlug: string;
  parts: GeneratedPartMesh[];
  metrics: MeshMetrics;
  isGenerating: boolean;
}

function SceneContent({ parts }: { parts: GeneratedPartMesh[] }) {
  // Rotate -90 deg on X so Z-up CAD coordinates become Y-up in Three.js camera space
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <Center top>
        <group>
          {parts.map((part) => (
            <mesh key={part.name} geometry={part.geometry} castShadow receiveShadow>
              <meshStandardMaterial
                color={part.color}
                roughness={0.35}
                metalness={0.08}
              />
            </mesh>
          ))}
        </group>
      </Center>
    </group>
  );
}

export default function ModelViewport({
  modelName,
  modelSlug,
  parts,
  metrics,
  isGenerating,
}: ModelViewportProps) {
  const handleDownloadSTL = () => {
    const bytes = exportMergedSTL(parts, modelSlug);
    triggerBrowserDownload(bytes, `${modelSlug}.stl`, 'model/stl');
  };

  const handleDownloadZIP = () => {
    const bytes = exportPartsZIP(parts, modelName, modelSlug);
    triggerBrowserDownload(bytes, `${modelSlug}-kit-cores.zip`, 'application/zip');
  };

  const handleDownload3MF = () => {
    const bytes = exportMultiColor3MF(parts, modelName);
    triggerBrowserDownload(bytes, `${modelSlug}-multicor.3mf`, 'model/3mf');
  };

  const { x, y, z } = metrics.boundingBoxMm;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-surface-800 overflow-hidden shadow-2xl">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-800/80 bg-surface-900/60">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              isGenerating ? 'bg-amber-400 animate-pulse' : 'bg-brand-500'
            }`}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {isGenerating ? 'Gerando Geometria 3D...' : 'Preview 3D Interativo (Mesa 256×256mm)'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1 bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700/70">
            <Maximize2 className="w-3.5 h-3.5 text-brand-400" />
            {x.toFixed(1)} × {y.toFixed(1)} × {z.toFixed(1)} mm
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700/70">
            <Box className="w-3.5 h-3.5 text-brand-400" />
            {metrics.volumeCm3.toFixed(1)} cm³
          </span>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="relative h-[400px] sm:h-[460px] w-full bg-gradient-to-b from-[#0d121b] to-[#151d2a]">
        <Canvas
          shadows
          camera={{ position: [0, 115, 165], fov: 38, near: 1, far: 2000 }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight
            position={[120, 180, 120]}
            intensity={1.35}
            castShadow
          />
          <directionalLight position={[-120, 90, -100]} intensity={0.55} />
          <pointLight position={[0, 140, -80]} intensity={0.4} color="#16d8aa" />

          {parts.length > 0 && <SceneContent parts={parts} />}

          {/* Bambu Lab 256x256mm Print Bed Grid */}
          <Grid
            position={[0, -0.05, 0]}
            args={[256, 256]}
            cellSize={10}
            cellThickness={0.6}
            cellColor="#1e293b"
            sectionSize={50}
            sectionThickness={1.2}
            sectionColor="#16d8aa"
            fadeDistance={420}
            fadeStrength={1}
          />
          <ContactShadows
            position={[0, -0.02, 0]}
            opacity={0.45}
            scale={240}
            blur={2.2}
            far={80}
          />
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.08}
            minDistance={30}
            maxDistance={500}
          />
        </Canvas>

        {/* Legend of Colored Parts */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
          {parts.map((p) => (
            <div
              key={p.name}
              className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-full text-xs text-slate-200"
            >
              <span
                className="w-3 h-3 rounded-full border border-white/20"
                style={{ backgroundColor: p.color }}
              />
              <span>{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Download Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 bg-surface-900/90 border-t border-slate-800">
        <div className="text-xs text-slate-400">
          <span className="text-slate-200 font-medium">Pronto para Fatiar:</span> Malha 100% fechada ({metrics.trianglesCount.toLocaleString('pt-BR')} triângulos)
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadSTL}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-brand-500 hover:bg-brand-400 text-slate-950 transition shadow-lg shadow-brand-500/20"
          >
            <Download className="w-4 h-4" />
            Baixar .STL Único
          </button>

          {parts.length > 1 && (
            <>
              <button
                onClick={handleDownloadZIP}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition"
                title="Baixa um arquivo .STL para cada cor + guia de impressão"
              >
                <Layers className="w-4 h-4 text-brand-400" />
                Baixar .ZIP (Peças p/ Cor)
              </button>

              <button
                onClick={handleDownload3MF}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition"
                title="Arquivo .3MF com múltiplos objetos para Bambu Studio / OrcaSlicer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                Baixar .3MF (Bambu/Orca)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
