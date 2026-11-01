'use client';

import React, { useState, useEffect } from 'react';

interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  fallbackValue?: number;
}

/**
 * Input numérico inteligente que permite apagar completamente o campo (valor vazio / null visual)
 * sem forçar '0' ou criar '02' durante a digitação.
 */
export default function NumericInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  fallbackValue,
  className = '',
  onBlur,
  onFocus,
  ...rest
}: NumericInputProps) {
  const [draft, setDraft] = useState<string>(String(value ?? ''));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(Number.isFinite(value) ? String(value) : '');
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDraft(raw);

    if (raw.trim() === '' || raw === '-' || raw === '.' || raw === '-.') {
      return;
    }

    const normalized = raw.replace(',', '.');
    const parsed = Number(normalized);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      onChange(parsed);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setDraft(Number.isFinite(value) ? String(value) : '');
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const normalized = draft.trim().replace(',', '.');
    const parsed = Number(normalized);

    if (normalized === '' || Number.isNaN(parsed) || !Number.isFinite(parsed)) {
      const fb = fallbackValue ?? min ?? 0;
      onChange(fb);
      setDraft(String(fb));
    } else {
      let clamped = parsed;
      if (min !== undefined && clamped < min) clamped = min;
      if (max !== undefined && clamped > max) clamped = max;
      onChange(clamped);
      setDraft(String(clamped));
    }

    onBlur?.(e);
  };

  return (
    <input
      type="number"
      inputMode="decimal"
      value={isFocused ? draft : Number.isFinite(value) ? String(value) : ''}
      min={min}
      max={max}
      step={step}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      {...rest}
    />
  );
}
