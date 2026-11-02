"use client";

import React, { useEffect, useState } from "react";
import { useTheme, Theme } from "./ThemeProvider";
import { SunIcon, MoonIcon, DesktopIcon } from "@phosphor-icons/react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const options: { id: Theme; label: string; icon: React.ReactNode }[] = [
    {
      id: "light",
      label: "Modo Claro",
      icon: (
        <SunIcon
          className="w-4 h-4"
          weight={mounted && theme === "light" ? "fill" : "regular"}
        />
      ),
    },
    {
      id: "system",
      label: "Acompanhar Dispositivo (Sistema)",
      icon: (
        <DesktopIcon
          className="w-4 h-4"
          weight={mounted && theme === "system" ? "fill" : "regular"}
        />
      ),
    },
    {
      id: "dark",
      label: "Modo Escuro",
      icon: (
        <MoonIcon
          className="w-4 h-4"
          weight={mounted && theme === "dark" ? "fill" : "regular"}
        />
      ),
    },
  ];

  return (
    <div
      role="group"
      aria-label="Controle de Tema Claro / Escuro / Sistema"
      className="inline-flex items-center p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-surface-800 text-slate-500 dark:text-slate-400 transition"
    >
      {options.map((opt) => {
        const active = mounted && theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            title={opt.label}
            aria-label={opt.label}
            aria-pressed={active}
            className={`relative p-1.5 rounded-lg transition-all duration-200 ${
              active
                ? "bg-white dark:bg-surface-700 text-brand-600 dark:text-brand-400 shadow-sm font-semibold"
                : "hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/40"
            }`}
          >
            {opt.icon}
          </button>
        );
      })}
    </div>
  );
}
