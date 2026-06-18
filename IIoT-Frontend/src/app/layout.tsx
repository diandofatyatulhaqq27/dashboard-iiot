"use client";

import "./globals.css";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';
import { ThemeProvider } from "../components/theme/ThemeProvider";
import ThemeToggle from "../components/theme/ThemeToggle";
import 'maplibre-gl/dist/maplibre-gl.css';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Activity,
  BellRing, // 🌟 Diubah dari TabletSmartphone ke BellRing untuk modul Alarm
  PieChart,
  LogOut,
  ShieldCheck,
  FolderKanban,
  Network,
  Menu,
  X,
} from "lucide-react";
import myLogo from '@/assets/logoMasagi.png';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<{ name: string; role: string; company_id: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("iiot_user");
    if (savedUser) setUser(JSON.parse(savedUser));
    setIsLoading(false);
  }, [pathname]);

  // Tutup sidebar mobile tiap pindah halaman
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const showNavigation = !!user && !isAuthPage;

  const handleSignOut = () => {
    localStorage.removeItem("iiot_user");
    localStorage.removeItem("iiot_token");
    setUser(null);
    router.push("/login");
  };

  const getRoleLabel = (role: string | undefined) => {
    switch (role) {
      case "admin": return "Admin";
      case "rasindo_operator": return "Rasindo Operator";
      case "rasindo_user": return "Rasindo User";
      case "client_user": return "Client User";
      default: return "Operator";
    }
  };

  const pageLabel = () => {
    if (pathname.includes('admin')) return 'Administrator';
    if (pathname.includes('monitoring')) return 'Monitoring';
    if (pathname.includes('projects')) return 'Projects';
    if (pathname.includes('gateways')) return 'Gateways';
    if (pathname.includes('alarm')) return 'Alarms';
    if (pathname.includes('analytics')) return 'Analytics';
    return 'Dashboard';
  };

  const navLinks = [
    ...(user?.role === 'admin' ? [{ href: '/dashboard/admin', label: 'Administrator', icon: ShieldCheck, exact: false }] : []),
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/dashboard/monitoring', label: 'Monitoring', icon: Activity, exact: false },
    { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban, exact: false },
    { href: '/dashboard/gateways', label: 'Gateways', icon: Network, exact: false },
    { href: '/dashboard/alarms', label: 'Alarms', icon: BellRing, exact: false },
    { href: '/dashboard/analytics', label: 'Analytics', icon: PieChart, exact: false },
  ];

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 animate-pulse">
        Loading System Hardware Nodes...
      </div>
    );
  }

  const SidebarContent = () => (
    <>
      {/* Header Sidebar */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative w-24 h-24 rounded-2xl flex items-center justify-center bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 shadow-md p-2 overflow-hidden">
            <Image src={myLogo} alt="Logo Perusahaan" fill className="object-contain" priority />
          </div>
          <h1 className="font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase text-base leading-tight">
            MASAGI IIOT
          </h1>
        </div>

        {/* Profile Section */}
        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex items-center gap-3 border border-slate-100 dark:border-slate-700">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 border-2 border-white dark:border-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xs shadow-sm uppercase shrink-0">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 truncate uppercase tracking-tight">
              {user?.name || "User"}
            </p>
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              {getRoleLabel(user?.role)}
            </p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navLinks.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
              isActive(href, exact)
                ? 'bg-blue-600 text-white shadow-md shadow-blue-100 dark:shadow-none'
                : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" /> {label}
          </Link>
        ))}
      </nav>

      {/* Footer Logout */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-700">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-[11px] font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all uppercase tracking-widest border-none bg-transparent cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100">

      {/* ── SIDEBAR DESKTOP (md+) ─────────────────────────────────── */}
      {showNavigation && (
        <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hidden md:flex flex-col shrink-0">
          <SidebarContent />
        </aside>
      )}

      {/* ── SIDEBAR MOBILE OVERLAY ────────────────────────────────── */}
      {showNavigation && sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside className="fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-50 md:hidden">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── AREA UTAMA ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {showNavigation && (
          <header className="h-14 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 md:px-6 justify-between shrink-0">
            <div className="flex items-center gap-3">
              {/* Hamburger — hanya tampil di mobile */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors md:hidden border-none bg-transparent cursor-pointer"
              >
                <Menu className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                {pageLabel()}
              </span>
            </div>
            <ThemeToggle />
          </header>
        )}

        {/* Main Content */}
        <main className="flex-1 relative overflow-auto bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="antialiased text-sm">
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <LayoutContent>{children}</LayoutContent>
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}