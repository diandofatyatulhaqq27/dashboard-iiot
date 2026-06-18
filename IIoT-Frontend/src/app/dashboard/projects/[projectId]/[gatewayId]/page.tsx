"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";
import {
  Settings, Save, ArrowLeft, Activity, Plus, Trash2,
  LayoutGrid, Loader2, ChevronLeft, ChevronRight, Cpu, Maximize2
} from "lucide-react";

const API_BASE = "http://localhost:8000/api";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return { "Content-Type": "application/json" };
  const token = localStorage.getItem("iiot_token") ?? "";
  const user = (() => { try { return JSON.parse(localStorage.getItem("iiot_user") ?? "null"); } catch { return null; } })();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-User-Id": String(user?.id ?? ""),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

const SIZE_OPTIONS = [
  { value: "small", label: "Kecil", colSpan: "col-span-1" },
  { value: "medium", label: "Sedang", colSpan: "md:col-span-2" },
  { value: "large", label: "Besar", colSpan: "md:col-span-2 xl:col-span-3" },
];

const getSizeClass = (size: string | undefined, isChart: boolean) => {
  const found = SIZE_OPTIONS.find((s) => s.value === size);
  if (found) return found.colSpan;
  return isChart ? "md:col-span-2" : "col-span-1";
};

const RANGE_OPTIONS = [
  { value: "1h", label: "1 Jam", ms: 60 * 60 * 1000 },
  { value: "6h", label: "6 Jam", ms: 6 * 60 * 60 * 1000 },
  { value: "24h", label: "24 Jam", ms: 24 * 60 * 60 * 1000 },
  { value: "7d", label: "7 Hari", ms: 7 * 24 * 60 * 60 * 1000 },
  { value: "30d", label: "30 Hari", ms: 30 * 24 * 60 * 60 * 1000 },
];

export default function GatewayDetailPage() {
  const router = useRouter();
  const { projectId, gatewayId } = useParams();

  const [logs, setLogs] = useState<any[]>([]);
  const [gatewayInfo, setGatewayInfo] = useState<any>(null);
  const [projectGateways, setProjectGateways] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [editConfig, setEditConfig] = useState<any[]>([]);

  const user = (() => { try { return JSON.parse(localStorage.getItem("iiot_user") ?? "null"); } catch { return null; } })();
  const userRole: string = user?.role ?? "client_user";
  const isReadOnly = userRole === "rasindo_user" || userRole === "client_user";

  const fetchAllData = useCallback(async () => {
    if (!projectId || !gatewayId) return;
    try {
      const [resGw, resProject, resDev] = await Promise.all([
        fetch(`${API_BASE}/gateways/${gatewayId}`, {
          method: "GET", cache: "no-store", headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/projects/${projectId}`, {
          method: "GET", cache: "no-store", headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/devices/?gateway_id=${gatewayId}`, {
          method: "GET", cache: "no-store", headers: getAuthHeaders(),
        }),
      ]);

      if (resGw.ok) {
        const r = await resGw.json();
        const data = r.data;
        if (data) {
          setGatewayInfo(data);
          setLogs(data.logs ?? []);
          if (!isEditingConfig) {
            setEditConfig(data.config ?? []);
          }
        }
      }

      if (resProject.ok) {
        const r = await resProject.json();
        const gwInProject: any[] = r.data?.gateways ?? [];
        const sorted = [...gwInProject].sort((a, b) =>
          (a.gateway_id ?? a.id ?? 0) - (b.gateway_id ?? b.id ?? 0)
        );
        setProjectGateways(sorted);
      }

      if (resDev.ok) {
        const r = await resDev.json();
        setDevices(r.data ?? []);
      }
    } catch (err) {
      console.error("fetchAllData error:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, gatewayId, isEditingConfig]);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 5000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const currentIndex = projectGateways.findIndex(
    (g) => String(g.gateway_id ?? g.id) === String(gatewayId)
  );

  const handlePrev = () => {
    if (currentIndex > 0) {
      const gw = projectGateways[currentIndex - 1];
      router.push(`/dashboard/projects/${projectId}/${gw.gateway_id ?? gw.id}`);
    }
  };

  const handleNext = () => {
    if (currentIndex < projectGateways.length - 1) {
      const gw = projectGateways[currentIndex + 1];
      router.push(`/dashboard/projects/${projectId}/${gw.gateway_id ?? gw.id}`);
    }
  };

  const isOnline = (() => {
    if (!gatewayInfo?.last_ping) return false;
    const diffSec = (Date.now() - new Date(gatewayInfo.last_ping).getTime()) / 1000;
    return diffSec < 60;
  })();

  const addWidget = () => {
    if (isReadOnly) return;
    setEditConfig([...editConfig, { key: "", label: "", type: "value", unit: "", size: "small", range: "1h" }]);
  };

  const removeWidget = (i: number) => {
    if (isReadOnly) return;
    setEditConfig(editConfig.filter((_, idx) => idx !== i));
  };

  const updateWidget = (i: number, field: string, val: string) => {
    if (isReadOnly) return;
    const updated = [...editConfig];
    updated[i][field] = val;
    setEditConfig(updated);
  };

  const handleSaveConfig = async () => {
    if (isReadOnly) return alert("Akses ditolak!");
    try {
      const res = await fetch(`${API_BASE}/gateways/${gatewayId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          gateway_id: Number(gatewayId),
          name: gatewayInfo?.name ?? "",
          hmi_code: gatewayInfo?.hmi_code ?? null,
          project_id: Number(projectId),
          company_id: gatewayInfo?.company_id ?? null,
          status: gatewayInfo?.status ?? "offline",
          config: editConfig,
        }),
      });

      if (res.ok) {
        alert("Layout widget berhasil disimpan!");
        setIsEditingConfig(false);
        fetchAllData();
      } else {
        const result = await res.json().catch(() => ({}));
        alert(result?.detail ?? "Gagal menyimpan konfigurasi.");
      }
    } catch { alert("Gagal menghubungi server."); }
  };

  if (loading && !gatewayInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="mt-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Syncing telemetry data streams...
        </p>
      </div>
    );
  }

  const latestPayload = (() => {
    if (logs.length === 0) return {};
    const rawPayload = logs[logs.length - 1].payload;
    
    // Jika backend mengirimkan dalam bentuk string, kita parse manual
    if (typeof rawPayload === "string") {
      try {
        return JSON.parse(rawPayload);
      } catch {
        return {};
      }
    }
    return rawPayload ?? {};
  })();

  const getChartData = (item: any) => {
    const rangeOpt = RANGE_OPTIONS.find((r) => r.value === (item.range ?? "1h")) ?? RANGE_OPTIONS[0];
    const cutoff = Date.now() - rangeOpt.ms;

    const filtered = logs.filter((l) => {
      if (!l.created_at) return false;
      return new Date(l.created_at).getTime() >= cutoff;
    });

    const sampled = filtered.length > 200
      ? filtered.filter((_, i) => i % Math.ceil(filtered.length / 200) === 0)
      : filtered;

    return sampled.map((l) => ({
      time: rangeOpt.ms > 24 * 60 * 60 * 1000
        ? new Date(l.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
        : new Date(l.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      val: Number(l.payload?.[item.key] ?? 0),
    }));
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen font-sans text-slate-900 dark:text-slate-100">

      {/* ── HEADER PANEL ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/projects")}
            className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all bg-white dark:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-black tracking-tighter text-slate-800 dark:text-slate-100 uppercase italic">
                {gatewayInfo?.name ?? "Loading Node..."}
              </h1>
              <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                isOnline
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40 animate-pulse"
                  : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40"
              }`}>
                {isOnline ? "● Active Stream" : "○ Link Offline"}
              </span>
              {gatewayInfo?.hmi_code && (
                <span className="px-2 py-1 rounded-lg text-[9px] font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 uppercase">
                  HMI: {gatewayInfo.hmi_code}
                </span>
              )}
            </div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
              Project #{projectId} · Gateway #{gatewayId} · {devices.length} Device Terdaftar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {projectGateways.length > 1 && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 rounded-2xl shadow-sm h-11">
              <button
                onClick={handlePrev}
                disabled={currentIndex <= 0}
                className="p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer transition-all border-none bg-transparent text-slate-700 dark:text-slate-300 h-full flex items-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-1 flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-black text-[10px] uppercase tracking-wider italic whitespace-nowrap">
                <Cpu className="w-3.5 h-3.5 text-blue-500" />
                Node {currentIndex + 1} / {projectGateways.length}
              </div>
              <button
                onClick={handleNext}
                disabled={currentIndex >= projectGateways.length - 1}
                className="p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer transition-all border-none bg-transparent text-slate-700 dark:text-slate-300 h-full flex items-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {!isReadOnly && (
            <div className="flex gap-2 h-11">
              {isEditingConfig && (
                <button
                  onClick={handleSaveConfig}
                  className="flex items-center gap-2 px-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all cursor-pointer border-none h-full"
                >
                  <Save className="w-4 h-4" /> Simpan Layout
                </button>
              )}
              <button
                onClick={() => setIsEditingConfig(!isEditingConfig)}
                className={`flex items-center gap-2 px-5 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm cursor-pointer h-full ${
                  isEditingConfig
                    ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                    : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                }`}
              >
                <Settings className="w-4 h-4" /> {isEditingConfig ? "Batal" : "Atur Widget"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Widget Grid */}
        <div className="flex-1">
          {editConfig.length === 0 && !isEditingConfig ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-16 text-center">
              <LayoutGrid className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Belum ada widget — klik "Atur Widget" untuk menambahkan
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {editConfig.map((item: any, index: number) => {
                const isChart = item.type === "chart";
                const sizeClass = getSizeClass(item.size, isChart);
                const activeRange = RANGE_OPTIONS.find((r) => r.value === (item.range ?? "1h")) ?? RANGE_OPTIONS[0];

                return (
                  <div
                    key={index}
                    className={`bg-white dark:bg-slate-800 rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col p-6 ${
                      isEditingConfig
                        ? "border-blue-400 dark:border-blue-500 ring-4 ring-blue-50 dark:ring-blue-950/30 shadow-xl"
                        : "border-slate-200 dark:border-slate-700 shadow-sm"
                    } ${sizeClass}`}
                  >
                    {isEditingConfig ? (
                      <div className="space-y-3 relative">
                        <button
                          onClick={() => removeWidget(index)}
                          className="absolute -top-1 -right-1 p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors border-none bg-transparent cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="pt-4 space-y-3">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Label Widget</label>
                            <input
                              placeholder="Contoh: Gas Detector PPM"
                              className="w-full mt-1 bg-slate-50 dark:bg-slate-900/60 border-none rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 ring-blue-100 dark:ring-blue-900/40 text-slate-800 dark:text-slate-200"
                              value={item.label}
                              onChange={(e) => updateWidget(index, "label", e.target.value)}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">MQTT Key</label>
                              <input
                                placeholder="e.g., gas_ppm"
                                className="w-full mt-1 bg-slate-50 dark:bg-slate-900/60 border-none rounded-xl p-3 text-xs font-mono font-bold outline-none focus:ring-2 ring-blue-100 dark:ring-blue-900/40 text-blue-600 dark:text-blue-400"
                                value={item.key}
                                onChange={(e) => updateWidget(index, "key", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Satuan</label>
                              <input
                                type="text"
                                autoCapitalize="none"
                                placeholder="e.g., PPM"
                                className="w-full mt-1 bg-slate-50 dark:bg-slate-900/60 border-none rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 ring-blue-100 dark:ring-blue-900/40 text-slate-800 dark:text-slate-200 normal-case"
                                value={item.unit}
                                onChange={(e) => updateWidget(index, "unit", e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipe Widget</label>
                              <select
                                className="w-full mt-1 bg-slate-50 dark:bg-slate-900/60 border-none rounded-xl p-3 text-xs font-black outline-none focus:ring-2 ring-blue-100 dark:ring-blue-900/40 text-slate-800 dark:text-slate-200 cursor-pointer"
                                value={item.type}
                                onChange={(e) => updateWidget(index, "type", e.target.value)}
                              >
                                <option value="value">REAL-TIME VALUE</option>
                                <option value="chart">AREA CHART</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                <Maximize2 className="w-2.5 h-2.5" /> Ukuran
                              </label>
                              <select
                                className="w-full mt-1 bg-slate-50 dark:bg-slate-900/60 border-none rounded-xl p-3 text-xs font-black outline-none focus:ring-2 ring-blue-100 dark:ring-blue-900/40 text-slate-800 dark:text-slate-200 cursor-pointer"
                                value={item.size ?? "small"}
                                onChange={(e) => updateWidget(index, "size", e.target.value)}
                              >
                                {SIZE_OPTIONS.map((s) => (
                                  <option key={s.value} value={s.value}>{s.label.toUpperCase()}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {isChart && (
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Rentang Waktu Chart</label>
                              <select
                                className="w-full mt-1 bg-amber-50/50 dark:bg-amber-950/20 border-none rounded-xl p-3 text-xs font-black outline-none focus:ring-2 ring-amber-200 dark:ring-amber-900/40 text-amber-700 dark:text-amber-400 cursor-pointer"
                                value={item.range ?? "1h"}
                                onChange={(e) => updateWidget(index, "range", e.target.value)}
                              >
                                {RANGE_OPTIONS.map((r) => (
                                  <option key={r.value} value={r.value}>{r.label.toUpperCase()} TERAKHIR</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-4">
                          <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" : "bg-rose-400"}`} />
                            {item.label || "SENSOR FIELD"}
                          </h2>
                          {isChart ? (
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/40 px-2 py-1 rounded-md">
                              {activeRange.label}
                            </span>
                          ) : (
                            <Activity className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                          )}
                        </div>

                        {isChart ? (
                          <div className="h-48 w-full mt-auto pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={getChartData(item)}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="time" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                                <Tooltip
                                  contentStyle={{ fontSize: "10px", fontWeight: "700", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="val"
                                  stroke="#3b82f6"
                                  fillOpacity={0.08}
                                  fill="#3b82f6"
                                  strokeWidth={2.5}
                                  dot={false}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-2 py-4 mt-auto">
                            <span className={`text-6xl font-black tracking-tighter transition-all ${isOnline ? "text-slate-800 dark:text-slate-100" : "text-slate-200 dark:text-slate-700"}`}>
                              {latestPayload[item.key] ?? "—"}
                            </span>
                            <span className="text-xs font-black text-slate-400 dark:text-slate-500 tracking-wider">
                              {item.unit || "—"}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {isEditingConfig && !isReadOnly && (
                <button
                  onClick={addWidget}
                  className="border-4 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center p-12 text-slate-400 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 hover:text-blue-600 transition-all group bg-transparent cursor-pointer"
                >
                  <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform text-slate-300 dark:text-slate-600 group-hover:text-blue-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Tambah Widget</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── SIDEBAR META (SINKRON DENGAN THEMING) ── */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm sticky top-20 space-y-5">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <LayoutGrid className="w-4 h-4" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Meta Properties</span>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Link Status</label>
              <div className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border w-fit ${
                isOnline
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40"
                  : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40"
              }`}>
                ● {isOnline ? "Online" : "Offline"}
              </div>
            </div>

            {devices.length > 0 && (
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Registered Devices</label>
                <div className="space-y-1.5">
                  {devices.map((dv) => (
                    <div key={dv.device_id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase truncate">{dv.name}</span>
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 ml-2 shrink-0">{dv.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Last Ping</label>
              <p className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
                {gatewayInfo?.last_ping
                  ? new Date(gatewayInfo.last_ping).toLocaleString("id-ID")
                  : "— Belum ada data —"}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Log Records (last 1000)</label>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{logs.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}