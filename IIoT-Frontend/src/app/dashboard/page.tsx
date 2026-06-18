"use client";
import { useState, useEffect } from "react";
import { AlertTriangle, Network, Wifi, Loader2 } from "lucide-react";
import { AssetMap } from "@/components/maps/AssetMap";

const API_BASE = "http://localhost:8000/api";

export default function DashboardPage() {
  const [gateways, setGateways] = useState<any[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoadingStats(true);

        const token = localStorage.getItem("iiot_token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const resGateways = await fetch(`${API_BASE}/gateways/`, { 
          method: "GET", 
          cache: "no-store", 
          headers 
        });

        if (resGateways.ok) {
          const result = await resGateways.json();
          setGateways(result.data || []);
        } else {
          console.error("FastAPI menolak request gateways. Status:", resGateways.status);
        }

      } catch (err) {
        console.error("Gagal memuat statistik dashboard:", err);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalGateways = gateways.length;
  const onlineGateways = gateways.filter(g => g.status === "online").length;
  const activeAlarms = gateways.filter(g => g.status === "alarm").length;

  return (
    <div className="relative w-full h-full flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">

      {/* FLOATING HUD CAPSULE */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/80 p-4 px-8 rounded-3xl shadow-xl shadow-slate-200/10 dark:shadow-none flex items-center gap-10 transition-all duration-300">

        {/* Metrik 1: Total Gateways */}
        <div className="flex flex-col items-center justify-center gap-1.5 min-w-[70px]">
          <Network className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          {isLoadingStats ? (
            <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
          ) : (
            <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">
              {totalGateways} Gateways
            </span>
          )}
        </div>

        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800" />

        {/* Metrik 2: Online Gateways */}
        <div className="flex flex-col items-center justify-center gap-1.5 min-w-[70px]">
          <Wifi className={`w-5 h-5 ${onlineGateways > 0 ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
          {isLoadingStats ? (
            <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
          ) : (
            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">
              {onlineGateways} Online
            </span>
          )}
        </div>

        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800" />

        {/* Metrik 3: Active Alarms */}
        <div className="flex flex-col items-center justify-center gap-1.5 min-w-[70px]">
          <AlertTriangle className={`w-5 h-5 ${activeAlarms > 0 ? 'text-red-600 dark:text-red-500 animate-pulse' : 'text-slate-300 dark:text-slate-600'}`} />
          {isLoadingStats ? (
            <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
          ) : (
            <span className={`text-[11px] font-black uppercase tracking-tight ${activeAlarms > 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {activeAlarms} Active
            </span>
          )}
        </div>

      </div>

      {/* FULLSCREEN MAP */}
      <div className="w-full h-full absolute inset-0 z-10 bg-slate-100 dark:bg-slate-950 transition-colors duration-300">
        <AssetMap isFullScreen={true} />
      </div>

    </div>
  );
}