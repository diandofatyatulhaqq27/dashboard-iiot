"use client";
import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  // 🌟 PERBAIKAN 1: Ambil 'resolvedTheme' dari useTheme untuk deteksi tema yang lebih akurat
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />;

  // 🌟 PERBAIKAN 2: Gunakan resolvedTheme sebagai kompas penentu saklar tema
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      // 🌟 PERBAIKAN 3: Jika saat ini dark, ganti ke light. Jika selain itu, paksa ke dark.
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="p-3 bg-white dark:bg-slate-800 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer"
      title="Tukar Tema Dashboard"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-500" />
      ) : (
        <Moon className="w-4 h-4 text-slate-600" />
      )}
    </button>
  );
}