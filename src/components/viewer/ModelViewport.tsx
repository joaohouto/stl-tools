'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GeneratedPartMesh, MeshMetrics } from '@/engine/types';
import {
  DownloadSimpleIcon as Download,
  StackIcon as Layers,
  CubeIcon as Box,
  ArrowsOutIcon as Maximize2,
  SparkleIcon as Sparkles,
  ArrowCounterClockwiseIcon as RotateCcw,
} from '@phosphor-icons/react';
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

export default function ModelViewport({
  modelName,
  modelSlug,
  parts,
  metrics,
  isGenerating,
}: ModelViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    partsGroup: THREE.Group;
  } | null>(null);

  // Initialize Three.js Scene, Camera, Renderer, Lights & 256x256mm Print Bed Grid once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 440;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, width / height, 1, 2500);
    camera.position.set(0, 130, 185);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 25;
    controls.maxDistance = 600;
    controls.target.set(0, 18, 0);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
    keyLight.position.set(120, 200, 140);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.left = -160;
    keyLight.shadow.camera.right = 160;
    keyLight.shadow.camera.top = 160;
    keyLight.shadow.camera.bottom = -160;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 600;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
    fillLight.position.set(-130, 100, -110);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xf97316, 0.6, 500);
    rimLight.position.set(0, 140, -120);
    scene.add(rimLight);

    // 256x256mm Print Bed Plate & Grid (Bambu Lab style)
    const bedPlateGeom = new THREE.PlaneGeometry(256, 256);
    const bedPlateMat = new THREE.MeshStandardMaterial({
      color: 0x0f1623,
      roughness: 0.85,
      metalness: 0.1,
    });
    const bedPlate = new THREE.Mesh(bedPlateGeom, bedPlateMat);
    bedPlate.rotation.x = -Math.PI / 2;
    bedPlate.position.y = -0.2;
    bedPlate.receiveShadow = true;
    scene.add(bedPlate);

    const majorGrid = new THREE.GridHelper(256, 25, 0xf97316, 0x1e293b);
    majorGrid.position.y = 0;
    scene.add(majorGrid);

    // Group that holds generated CAD parts (rotated -90 deg around X so CAD +Z is Up +Y)
    const partsGroup = new THREE.Group();
    partsGroup.rotation.x = -Math.PI / 2;
    scene.add(partsGroup);

    sceneRef.current = { scene, camera, renderer, controls, partsGroup };

    let frameId = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 440;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Update 3D meshes whenever `parts` change
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;

    const { partsGroup } = ctx;

    // Clear previous meshes & materials
    while (partsGroup.children.length > 0) {
      const child = partsGroup.children[0] as THREE.Mesh;
      partsGroup.remove(child);
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    if (parts.length === 0) return;

    // Compute overall CAD bounding box so we center X/Y at 0 and sit Zmin on the bed (Z=0)
    const overallBox = new THREE.Box3();
    for (const part of parts) {
      if (!part.geometry.boundingBox) {
        part.geometry.computeBoundingBox();
      }
      if (part.geometry.boundingBox) {
        overallBox.union(part.geometry.boundingBox);
      }
    }

    const center = new THREE.Vector3();
    overallBox.getCenter(center);
    const minZ = isFinite(overallBox.min.z) ? overallBox.min.z : 0;

    for (const part of parts) {
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(part.color || '#f97316'),
        roughness: 0.34,
        metalness: 0.08,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(part.geometry, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = false; // Prevents self-shadow acne / dark central square in preview
      // Center in CAD X/Y and place bottom of assembly at Z = 0
      mesh.position.set(-center.x, -center.y, -minZ);
      partsGroup.add(mesh);
    }
  }, [parts]);

  const handleResetCamera = () => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    ctx.camera.position.set(0, 130, 185);
    ctx.controls.target.set(0, 18, 0);
    ctx.controls.update();
  };

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
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-surface-800 overflow-hidden shadow-2xl">
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

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1 bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700/70">
            <Maximize2 className="w-3.5 h-3.5 text-brand-400" />
            {x.toFixed(1)} × {y.toFixed(1)} × {z.toFixed(1)} mm
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700/70">
            <Box className="w-3.5 h-3.5 text-brand-400" />
            {metrics.volumeCm3.toFixed(1)} cm³
          </span>
          <button
            type="button"
            onClick={handleResetCamera}
            title="Centralizar Câmera 3D"
            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D WebGL Viewport Container */}
      <div className="relative flex-1 min-h-[380px] w-full bg-gradient-to-b from-[#0d121b] to-[#151d2a]">
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

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
