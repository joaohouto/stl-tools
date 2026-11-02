'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CaretDownIcon as ChevronDown, CheckIcon as Check } from '@phosphor-icons/react';
import { PHOSPHOR_SHAPE_SVGS } from '@/engine/cad';
import { ShapeIcon } from './ShapeSelect';

export interface CustomSelectOption {
  value: string;
  label: string;
  fontFamily?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  label?: string;
  className?: string;
}

function getAutoIconForValue(val: string): React.ReactNode | null {
  if (val in PHOSPHOR_SHAPE_SVGS) {
    return <ShapeIcon shapeId={val} className="w-4 h-4" />;
  }
  if (val === 'cilindro') {
    return <ShapeIcon shapeId="circulo" className="w-4 h-4" />;
  }
  if (val === 'triangulo') {
    return (
      <svg viewBox="0 0 256 256" className="w-4 h-4" aria-hidden="true">
        <path
          d="M 142 36 L 232 196 C 238 207 230 220 218 220 H 38 C 26 220 18 207 24 196 L 114 36 C 120 25 136 25 142 36 Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return null;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  label,
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected =
    options.find((o) => String(o.value) === String(value)) ||
    options[0] || { value: '', label: 'Selecione...' };

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

  const selectedIcon = selected.icon ?? getAutoIconForValue(selected.value);

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">{label}</label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-surface-900 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition shadow-sm"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedIcon && (
              <span className="text-brand-500 dark:text-brand-400 flex-shrink-0">{selectedIcon}</span>
            )}
            <span
              className="truncate font-medium"
              style={
                selected.fontFamily
                  ? { fontFamily: `'${selected.fontFamily}', sans-serif`, fontSize: '13px' }
                  : undefined
              }
            >
              {selected.label}
            </span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-2 ${
              isOpen ? 'transform rotate-180 text-brand-500 dark:text-brand-400' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-full z-50 rounded-xl bg-white dark:bg-surface-900 border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-2xl p-1 max-h-64 overflow-y-auto">
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(selected.value);
              const optIcon = opt.icon ?? getAutoIconForValue(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition text-left ${
                    isSelected
                      ? 'bg-brand-500/15 text-brand-600 dark:text-brand-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {optIcon && (
                      <span className={isSelected ? 'text-brand-500 dark:text-brand-400' : 'text-slate-400'}>
                        {optIcon}
                      </span>
                    )}
                    <span
                      className="truncate"
                      style={
                        opt.fontFamily
                          ? { fontFamily: `'${opt.fontFamily}', sans-serif`, fontSize: '13px' }
                          : undefined
                      }
                    >
                      {opt.label}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400 flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
