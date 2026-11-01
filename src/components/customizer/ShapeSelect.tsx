'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CaretDownIcon as ChevronDown, CheckIcon as Check } from '@phosphor-icons/react';
import { PHOSPHOR_SHAPE_SVGS } from '@/engine/cad';

export interface ShapeOption {
  id: string;
  label: string;
}

interface ShapeSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ShapeOption[];
  label?: string;
}

export function ShapeIcon({ shapeId, className = 'w-4 h-4' }: { shapeId: string; className?: string }) {
  const item = PHOSPHOR_SHAPE_SVGS[shapeId] || PHOSPHOR_SHAPE_SVGS.coracao;
  return (
    <svg viewBox={item.viewBox} className={className} aria-hidden="true">
      <path d={item.d} fill="currentColor" />
    </svg>
  );
}

export default function ShapeSelect({ value, onChange, options, label }: ShapeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value) || options[0] || { id: 'coracao', label: 'Coração' };

  // Fecha o dropdown ao clicar fora ou pressionar Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-slate-200">
          {label}
        </label>
      )}

      <div className="relative">
        {/* Shadcn-like Select Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-900 border border-slate-700 hover:border-slate-600 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition shadow-sm"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-brand-400 flex-shrink-0">
              <ShapeIcon shapeId={selected.id} className="w-4 h-4" />
            </span>
            <span className="truncate font-medium">{selected.label}</span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
              isOpen ? 'transform rotate-180 text-brand-400' : ''
            }`}
          />
        </button>

        {/* Shadcn-like Popover Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-full z-50 rounded-xl bg-surface-900 border border-slate-700 shadow-2xl p-1 max-h-64 overflow-y-auto">
            {options.map((opt) => {
              const isSelected = opt.id === selected.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition ${
                    isSelected
                      ? 'bg-brand-500/15 text-brand-300 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={isSelected ? 'text-brand-400' : 'text-slate-400'}>
                      <ShapeIcon shapeId={opt.id} className="w-4 h-4" />
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
