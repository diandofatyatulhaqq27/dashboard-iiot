"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  AlertTriangle,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCcw,
  Building2,
  Cpu,
  Flame,
  CheckCircle2,
  XCircle,
  BellRing,
  ShieldAlert,
} from "lucide-react";

const API_BASE = "http://localhost:8000/api";

function getLocalUser(): any | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("iiot_user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("iiot_token") : "";
  const user = getLocalUser();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-User-Id": String(user?.id ?? ""),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "Belum pernah";
  const date = new Date(dateStr);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 5) return "Baru saja";
  if (diffSec < 60) return `${diffSec} detik lalu`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
  return `${Math.floor(diffSec / 86400)} hari lalu`;
}

export default function MonitoringPage() {
  const [gateways, setGateways] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const loggedInUser = getLocalUser();
  const userRole: string = loggedInUser?.role ?? "client_user";
  const userCompanyId: string = String(loggedInUser?.company_id ?? "");
  const isCompanyScoped = !["admin", "rasindo_operator", "rasindo_user"].includes(userRole);

  // ─── FETCH ALL OVERVIEW DATA ────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = getAuthHeaders();

      const gwUrl = isCompanyScoped && userCompanyId
        ? `${API_BASE}/gateways/?company_id=${userCompanyId}`
        : `${API_BASE}/gateways/`;

      const projUrl = isCompanyScoped && userCompanyId
        ? `${API_BASE}/projects/?company_id=${userCompanyId}`
        : `${API_BASE}/projects/`;

      const devUrl = isCompanyScoped && userCompanyId
        ? `${API_BASE}/devices/?company_id=${userCompanyId}`
        : `${API_BASE}/devices/?company_id=${loggedInUser?.company_id ?? 0}`;

      const [resGw, resProj, resComp, resAlarm, resDev] = await Promise.allSettled([
        fetch(gwUrl, { headers, cache: "no-store" }),
        fetch(projUrl, { headers, cache: "no-store" }),
        fetch(`${API_BASE}/companies/`, { headers, cache: "no-store" }),
        fetch(`${API_BASE}/alarms/`, { headers, cache: "no-store" }),
        fetch(devUrl, { headers, cache: "no-store" }),
      ]);

      if (resGw.status === "fulfilled" && resGw.value.ok) {
        const r = await resGw.value.json();
        setGateways(r.data ?? []);
      } else {
        setGateways([]);
      }

      if (resProj.status === "fulfilled" && resProj.value.ok) {
        const r = await resProj.value.json();
        setProjects(r.data ?? []);
      }

      if (resComp.status === "fulfilled" && resComp.value.ok) {
        const r = await resComp.value.json();
        setCompanies(r.data ?? []);
      }

      if (resAlarm.status === "fulfilled" && resAlarm.value.ok) {
        const r = await resAlarm.value.json();
        setAlarms(r.data ?? []);
      } else {
        setAlarms([]);
      }

      if (resDev.status === "fulfilled" && resDev.value.ok) {
        const r = await resDev.value.json();
        setDevices(r.data ?? []);
      } else {
        setDevices([]);
      }

      setLastSync(new Date());
    } catch (err: any) {
      console.error("fetchOverview error:", err);
      setError(err.message ?? "Gagal memuat data monitoring.");
    } finally {
      setLoading(false);
    }
  }, [isCompanyScoped, userCompanyId, loggedInUser?.company_id]);

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 15000); 
    return () => clearInterval(interval);
  }, [fetchOverview]);

  // ─── METRICS ─────────────────────────────────────────────────────────────
  const totalGateways = gateways.length;
  const onlineGateways = gateways.filter((g) => g.status === "online").length;
  const offlineGateways = totalGateways - onlineGateways;

  const activeAlarms = alarms.filter((a) => a.status === "ACTIVE");
  const criticalAlarms = activeAlarms.filter((a) => a.severity === "CRITICAL");
  const warningAlarms = activeAlarms.filter((a) => a.severity !== "CRITICAL");

  const totalDevices = devices.length;
  const onlineDevices = devices.filter((d) => d.status === "online" || d.status === "active").length;
  const offlineDevices = totalDevices - onlineDevices;

  // ─── HELPERS ────────────────────────────────────────────────────────────
  const projectName = (projectId: any) =>
    projects.find((p) => p.project_id === projectId)?.display_name ?? `Project #${projectId ?? "—"}`;

  const companyName = (companyId: any) =>
    companies.find((c) => c.id === companyId)?.name ?? `Tenant #${companyId ?? "—"}`;

  const gatewayName = (gatewayId: any) =>
    gateways.find((g) => g.gateway_id === gatewayId)?.name ?? `Gateway #${gatewayId ?? "—"}`;

  const deviceName = (deviceId: any) => {
    const d = devices.find((dv) => dv.device_id === deviceId);
    return d ? d.name : `Device #${deviceId ?? "—"}`;
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className="p-8 space-y-8 bg-transparent min-h-screen font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Gateways Online */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
            <Wifi className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Gateway Online</p>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-300 mt-1" />
            ) : (
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {onlineGateways}<span className="text-sm text-slate-400 font-bold"> / {totalGateways}</span>
              </p>
            )}
          </div>
        </div>

        {/* Gateways Offline */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${offlineGateways > 0 ? "bg-rose-50 dark:bg-rose-950/30" : "bg-slate-50 dark:bg-slate-900/40"}`}>
            <WifiOff className={`w-6 h-6 ${offlineGateways > 0 ? "text-rose-500" : "text-slate-300 dark:text-slate-600"}`} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Gateway Offline</p>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-300 mt-1" />
            ) : (
              <p className={`text-2xl font-black tracking-tight ${offlineGateways > 0 ? "text-rose-500" : "text-slate-800 dark:text-slate-100"}`}>
                {offlineGateways}
              </p>
            )}
          </div>
        </div>

        {/* Active Critical Alarms */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${criticalAlarms.length > 0 ? "bg-rose-50 dark:bg-rose-950/30" : "bg-slate-50 dark:bg-slate-900/40"}`}>
            <ShieldAlert className={`w-6 h-6 ${criticalAlarms.length > 0 ? "text-rose-500 animate-pulse" : "text-slate-300 dark:text-slate-600"}`} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Alarm Kritis Aktif</p>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-300 mt-1" />
            ) : (
              <p className={`text-2xl font-black tracking-tight ${criticalAlarms.length > 0 ? "text-rose-500" : "text-slate-800 dark:text-slate-100"}`}>
                {criticalAlarms.length}
              </p>
            )}
          </div>
        </div>

        {/* Total Active Alarms */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${warningAlarms.length > 0 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-slate-50 dark:bg-slate-900/40"}`}>
            <BellRing className={`w-6 h-6 ${warningAlarms.length > 0 ? "text-amber-500" : "text-slate-300 dark:text-slate-600"}`} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Alarm Lainnya Aktif</p>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-300 mt-1" />
            ) : (
              <p className={`text-2xl font-black tracking-tight ${warningAlarms.length > 0 ? "text-amber-500" : "text-slate-800 dark:text-slate-100"}`}>
                {warningAlarms.length}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* GATEWAY CONNECTIVITY LIST */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-black text-xs uppercase tracking-widest text-slate-800 dark:text-slate-100 italic flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-500" /> Gateway Link Status
          </h2>
          <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
            {totalGateways} Unit
          </span>
        </div>

        <div className="divide-y divide-slate-50 dark:divide-slate-700/40 max-h-[420px] overflow-y-auto">
          {loading ? (
            <div className="p-16 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : gateways.length === 0 ? (
            <div className="p-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 italic">
              Belum ada gateway terdaftar
            </div>
          ) : (
            gateways
              .slice()
              .sort((a, b) => {
                if (a.status === b.status) return 0;
                return a.status === "offline" ? -1 : 1;
              })
              .map((gw) => (
                <div key={gw.gateway_id} className="p-5 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${gw.status === "online" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase truncate">
                      {gw.name}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3" /> {projectName(gw.project_id)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${gw.status === "online" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40" : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40"}`}>
                      {gw.status}
                    </span>
                    <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                      {timeAgo(gw.last_ping)}
                    </p>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* PROJECT/SITE SUMMARY */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-black text-xs uppercase tracking-widest text-slate-800 dark:text-slate-100 italic flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-500" /> Site Project Summary
          </h2>
          <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
            {projects.length} Site
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700">
                <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Site</th>
                <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tenant</th>
                <th className="p-4 text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Gateways</th>
                <th className="p-4 text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Online</th>
                <th className="p-4 text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Alarm Aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 italic">
                    Belum ada project site terdaftar
                  </td>
                </tr>
              ) : (
                projects.map((proj) => {
                  const projGateways = gateways.filter((g) => g.project_id === proj.project_id);
                  const projOnline = projGateways.filter((g) => g.status === "online").length;
                  const projDeviceIds = devices.filter((d) => projGateways.some((g) => g.gateway_id === d.gateway_id)).map((d) => d.device_id);
                  const projAlarms = activeAlarms.filter((a) => projDeviceIds.includes(a.device_id));

                  return (
                    <tr key={proj.project_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors text-xs">
                      <td className="p-4 font-black text-slate-800 dark:text-slate-200 uppercase">
                        {proj.display_name}
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                        {companyName(proj.company_id)}
                      </td>
                      <td className="p-4 text-center font-black text-slate-700 dark:text-slate-300">
                        {projGateways.length}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md border ${projOnline === projGateways.length && projGateways.length > 0 ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40" : projOnline === 0 ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40" : "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40"}`}>
                          {projOnline} / {projGateways.length}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {projAlarms.length > 0 ? (
                          <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md border bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40 animate-pulse">
                            {projAlarms.length} Alarm
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md border bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800">
                            Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}