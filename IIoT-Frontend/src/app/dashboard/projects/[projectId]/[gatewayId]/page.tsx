"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Edit2, Check, Plus, LayoutGrid, Eye } from "lucide-react";
import { WidgetCard, WidgetSettingsPanel } from "@/components/widgets/WidgetCard";
import { WidgetItem } from "@/lib/widget-config";

// Konstanta konfigurasi API dasar
const API_BASE = "/api"; 

// Fungsi pembantu untuk otentikasi header (sesuaikan dengan sistem auth proyek Anda)
const getAuthHeaders = () => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    return token ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  }
  return { "Content-Type": "application/json" };
};

export default function GatewayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const gatewayId = params?.gatewayId as string;
  const projectId = searchParams?.get("project_id") || "";

  // ─── States ────────────────────────────────────────────────────────────────
  const [gatewayInfo, setGatewayInfo] = useState<any>(null);
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [latestPayload, setLatestPayload] = useState<Record<string, any>>({});
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // State Baru untuk Menyimpan Data Grafik Teragregasi dari Backend
  const [chartDataMap, setChartDataMap] = useState<Record<string, any[]>>({});

  // Mode Dashboard & Manajemen Layout/Widget
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editConfig, setEditConfig] = useState<WidgetItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // ─── Fetch Data Agregasi Grafik dari Server Backend ─────────────────────────
  const fetchChartDataForWidgets = useCallback(async (configList: WidgetItem[]) => {
    if (!gatewayId || !configList || configList.length === 0) return;

    // Filter hanya widget yang memerlukan data deret waktu historis (chart atau bar)
    const chartWidgets = configList.filter(item => item.type === "chart" || item.type === "bar");
    if (chartWidgets.length === 0) return;

    const newChartDataMap: Record<string, any[]> = {};

    await Promise.all(
      chartWidgets.map(async (item, idx) => {
        const isMulti = item.type === "chart" && (item.keys?.length ?? 0) > 1;
        const keysParam = isMulti ? item.keys!.join(",") : item.key;
        const rangeParam = item.range ?? "1h";

        if (!keysParam) return;

        try {
          const res = await fetch(
            `${API_BASE}/gateways/${gatewayId}/chart?range=${rangeParam}&keys=${keysParam}`,
            { method: "GET", cache: "no-store", headers: getAuthHeaders() }
          );
          if (res.ok) {
            const r = await res.json();
            // Gunakan key kombinasi unik agar data tidak tertukar antar-widget
            const mapKey = `${item.type}-${idx}-${item.key}`;
            newChartDataMap[mapKey] = r.data ?? [];
          }
        } catch (err) {
          console.error(`Gagal mengambil data chart untuk indeks ${idx}:`, err);
        }
      })
    );

    setChartDataMap(prev => ({ ...prev, ...newChartDataMap }));
  }, [gatewayId]);

  // ─── Fetch Utama Seluruh Data Gateway (Polling Loop) ────────────────────────
  const fetchAllData = useCallback(async () => {
    if (!gatewayId) return;
    try {
      const [resGw, resProject] = await Promise.all([
        fetch(`${API_BASE}/gateways/${gatewayId}`, { method: "GET", cache: "no-store", headers: getAuthHeaders() }),
        projectId 
          ? fetch(`${API_BASE}/projects/${projectId}`, { method: "GET", cache: "no-store", headers: getAuthHeaders() })
          : Promise.resolve(null)
      ]);

      if (resGw.ok) {
        const r = await resGw.json();
        const data = r.data;
        if (data) {
          setGatewayInfo(data);
          const activeLogs = data.logs ?? [];
          setLogs(activeLogs);

          // Ambil payload mentah teranyar untuk widget non-grafik
          if (activeLogs.length > 0) {
            setLatestPayload(activeLogs[activeLogs.length - 1].payload || {});
            
            // Cek status detak jantung gateway (online jika update < 1 menit)
            const lastLogTime = new Date(activeLogs[activeLogs.length - 1].created_at).getTime();
            const now = new Date().getTime();
            setIsOnline(now - lastLogTime < 60000);
          } else {
            setIsOnline(false);
          }

          const cfg: WidgetItem[] = data.config ?? [];
          // Jika tidak sedang mengedit, sinkronkan konfigurasi live dari server
          if (!isEditMode) {
            setEditConfig(cfg);
          }

          // Trigger pengambilan data chart teragregasi secara paralel
          fetchChartDataForWidgets(isEditMode ? editConfig : cfg);
        }
      }

      if (resProject && resProject.ok) {
        const rProj = await resProject.json();
        setProjectInfo(rProj.data);
      }
    } catch (error) {
      console.error("Error saat memuat data dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gatewayId, projectId, isEditMode, editConfig, fetchChartDataForWidgets]);

  // Siklus hidup efek untuk polling otomatis tiap 5 detik
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 5000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // ─── Fungsi Mutasi Konfigurasi Widget (Edit Mode) ──────────────────────────
  const handleAddWidget = () => {
    const newWidget: WidgetItem = {
      type: "value",
      label: "Sensor Baru",
      key: "sensor_key",
      color: "#3b82f6",
      divisor: 1,
    };
    const updated = [...editConfig, newWidget];
    setEditConfig(updated);
    setSelectedIdx(updated.length - 1);
  };

  const handleUpdateWidget = (idx: number, field: string, value: any) => {
    const updated = editConfig.map((item, i) => (i === idx ? { ...item, [field]: value } : item));
    setEditConfig(updated);
    
    // Jika field sensitif terhadap grafik berubah, langsung trigger fetch ulang khusus item tersebut
    if (field === "range" || field === "key" || field === "keys") {
      fetchChartDataForWidgets(updated);
    }
  };

  const handleRemoveWidget = (idx: number) => {
    const updated = editConfig.filter((_, i) => i !== idx);
    setEditConfig(updated);
    setSelectedIdx(null);
  };

  const handleSaveConfig = async () => {
    if (!gatewayId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/gateways/${gatewayId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: gatewayInfo?.name,
          hmi_code: gatewayInfo?.hmi_code,
          project_id: gatewayInfo?.project_id ? Number(gatewayInfo.project_id) : null,
          status: gatewayInfo?.status || "offline",
          config: editConfig,
        }),
      });

      if (res.ok) {
        setIsEditMode(false);
        setSelectedIdx(null);
        fetchAllData();
      } else {
        alert("Gagal menyimpan perubahan tata letak dashboard.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Memuat Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      {/* Area Utama Dashboard */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/60 px-6 py-4 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <button 
              onClick={() => router.push(projectId ? `/projects/${projectId}` : "/gateways")}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer text-slate-500"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight truncate">{gatewayInfo?.name || "Detail Gateway"}</h1>
                <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              </div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 truncate mt-0.5">
                {projectInfo?.name || "Tanpa Proyek"} • Kode HMI: <span className="font-mono">{gatewayInfo?.hmi_code || "-"}</span>
              </p>
            </div>
          </div>

          {/* Mode Kontrol Dashboard */}
          <div className="flex items-center gap-2 shrink-0">
            {isEditMode ? (
              <>
                <button
                  onClick={handleAddWidget}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 transition-all border-none cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Widget
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer shadow-sm shadow-blue-500/20"
                >
                  <Check className="w-3.5 h-3.5" /> {isSaving ? "Menyimpan..." : "Simpan Layout"}
                </button>
                <button
                  onClick={() => { setIsEditMode(false); setSelectedIdx(null); }}
                  className="px-4 py-2 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-wider text-slate-400 transition-all border-none cursor-pointer"
                >
                  Batal
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditMode(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Atur Tata Letak
              </button>
            )}
          </div>
        </div>

        {/* Grid Container untuk Widget-Widget */}
        <div className="p-6 flex-1">
          {editConfig.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <LayoutGrid className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Dashboard Kosong</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">Masuk ke mode pengaturan untuk menambahkan widget pemantauan IoT pertama Anda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[160px]">
              {editConfig.map((item, index) => {
                // Generate unique identifier map key
                const mapKey = `${item.type}-${index}-${item.key}`;
                const backendChartData = chartDataMap[mapKey] || [];

                return (
                  <div 
                    key={index} 
                    className={`h-full transition-all ${
                      selectedIdx === index && isEditMode ? "scale-[1.01]" : ""
                    }`}
                  >
                    <WidgetCard
                      item={item}
                      index={index}
                      isEditMode={isEditMode}
                      isSelected={selectedIdx === index}
                      isOnline={isOnline}
                      logs={logs}
                      latestPayload={latestPayload}
                      onSelect={setSelectedIdx}
                      serverChartData={backendChartData} // Melempar data olahan DB langsung ke widget
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Panel Pengaturan Widget (Hanya Muncul saat Mode Edit & Ada Widget Dipilih) */}
      {isEditMode && selectedIdx !== null && editConfig[selectedIdx] && (
        <div className="w-80 bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800/80 h-full shadow-xl z-30 flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
          <WidgetSettingsPanel
            item={editConfig[selectedIdx]}
            index={selectedIdx}
            onUpdate={handleUpdateWidget}
            onRemove={handleRemoveWidget}
            onClose={() => setSelectedIdx(null)}
          />
        </div>
      )}
    </div>
  );
}