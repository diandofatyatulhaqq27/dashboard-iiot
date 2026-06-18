"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar, Download, RefreshCcw,
  Loader2, ChevronLeft, ChevronRight, AlertTriangle, Filter, SlidersHorizontal, Cpu
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

export default function HistoricalAnalyticsPage() {
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [gatewaysList, setGatewaysList] = useState<any[]>([]); // SEMUA gateway (untuk mapping nama saat export/tabel)
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedGateway, setSelectedGateway] = useState<string>(""); // "" = semua gateway dalam project ini
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 25;

  // ─── 1. FETCH MASTER DATA (projects + semua gateway) ─────────────────────
  const fetchProjects = useCallback(async () => {
    try {
      const currentUser = getLocalUser();
      const currentRole: string = currentUser?.role ?? "client_user";
      const currentCompanyId: string = String(currentUser?.company_id ?? "");

      let url = `${API_BASE}/projects/`;
      if (currentRole !== "admin" && currentCompanyId) {
        url += `?company_id=${currentCompanyId}`;
      }

      const [resProj, resGw] = await Promise.all([
        fetch(url, { method: "GET", cache: "no-store", headers: getAuthHeaders() }),
        fetch(`${API_BASE}/gateways/`, { method: "GET", cache: "no-store", headers: getAuthHeaders() }),
      ]);

      if (resProj.ok) {
        const result = await resProj.json();
        const pList = result.data ?? [];
        setProjectsList(pList);
        if (pList.length > 0) setSelectedProject(String(pList[0].project_id));
      }

      if (resGw.ok) {
        const r = await resGw.json();
        setGatewaysList(r.data ?? []);
      }
    } catch (err) {
      console.error("Gagal memuat master data:", err);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // ─── Gateway yang terikat ke project terpilih (untuk dropdown filter) ────
  const gatewaysInSelectedProject = gatewaysList.filter(
    (g) => String(g.project_id) === String(selectedProject)
  );

  // Reset pilihan gateway setiap kali project berubah
  useEffect(() => {
    setSelectedGateway("");
  }, [selectedProject]);

  // ─── 2. FETCH HISTORICAL LOGS ────────────────────────────────────────────
  const fetchHistoricalData = useCallback(async () => {
    if (!selectedProject) return;
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE}/projects/${selectedProject}`, {
        method: "GET", cache: "no-store", headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Gagal memuat arsip log data. Status: ${res.status}`);
      }

      const result = await res.json();
      let fetchedLogs: any[] = result.data?.logs ?? [];

      // Filter berdasarkan gateway yang dipilih (jika ada)
      if (selectedGateway) {
        fetchedLogs = fetchedLogs.filter(
          (log: any) => String(log.gateway_id) === String(selectedGateway)
        );
      }

      if (startDate && startDate.trim() !== "") {
        const start = new Date(startDate + "T00:00:00").getTime();
        fetchedLogs = fetchedLogs.filter((log: any) => log.created_at && new Date(log.created_at).getTime() >= start);
      }
      if (endDate && endDate.trim() !== "") {
        const end = new Date(endDate + "T23:59:59").getTime();
        fetchedLogs = fetchedLogs.filter((log: any) => log.created_at && new Date(log.created_at).getTime() <= end);
      }

      fetchedLogs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setLogs(fetchedLogs);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message ?? "Terjadi kesalahan saat memuat data.");
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, selectedGateway, startDate, endDate]);

  useEffect(() => {
    if (selectedProject) fetchHistoricalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, selectedGateway]);

  // ─── CHANNEL & GATEWAY HELPERS ───────────────────────────────────────────
  const dynamicChannels = Array.from(
    new Set(logs.flatMap((log) => {
      if (!log.payload || typeof log.payload !== "object") return [];
      return Object.keys(log.payload);
    }))
  );

  const gatewayName = (gatewayId: any) =>
    gatewaysList.find((g) => g.gateway_id === gatewayId)?.name ?? `Gateway #${gatewayId ?? "—"}`;

  // ─── 3. EXPORT CSV ───────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (logs.length === 0) return alert("Tidak ada data untuk di-export!");
    const projectName = projectsList.find((p) => String(p.project_id) === String(selectedProject))?.display_name ?? selectedProject;
    const gwLabel = selectedGateway ? gatewayName(Number(selectedGateway)) : "SEMUA_GATEWAY";

    let csv = "data:text/csv;charset=utf-8,";
    csv += `AUDIT REPORT TELEMETRI DATA: ${String(projectName).toUpperCase()} - ${gwLabel.toUpperCase()}\n`;
    csv += ["No", "Gateway", ...dynamicChannels].join(",") + "\n";

    logs.forEach((log, i) => {
      const row = [
        i + 1,
        gatewayName(log.gateway_id),
        ...dynamicChannels.map((ch) => {
          const val = log.payload?.[ch];
          return val !== undefined ? (typeof val === "object" ? JSON.stringify(val).replace(/,/g, " ") : val) : "-";
        }),
      ];
      csv += row.join(",") + "\n";
    });

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `HISTORIS_LOG_PROJECT_${selectedProject}${selectedGateway ? `_GW${selectedGateway}` : ""}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── PAGINATION ──────────────────────────────────────────────────────────
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentLogsChunk = logs.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(logs.length / recordsPerPage);

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="p-8 bg-transparent min-h-screen font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 space-y-6">

      {/* ── MAIN CONTAINER ── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden transition-all duration-300">

        {/* ── TOOLBAR INTERNAL ── */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800">

          {/* Select Site */}
          <div className="flex items-center gap-2 min-w-[180px] flex-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-black border-none outline-none focus:ring-2 ring-blue-100 dark:ring-blue-900/40 cursor-pointer"
            >
              {projectsList.length === 0 && <option value="" disabled>Loading projects...</option>}
              {projectsList.map((p) => (
                <option key={p.project_id} value={String(p.project_id)} className="dark:bg-slate-800">
                  {p.display_name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Select Gateway (filter dropdown berdasarkan project terpilih) */}
          <div className="flex items-center gap-2 min-w-[180px] flex-1">
            <Cpu className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedGateway}
              onChange={(e) => setSelectedGateway(e.target.value)}
              disabled={!selectedProject}
              className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-black border-none outline-none focus:ring-2 ring-blue-100 dark:ring-blue-900/40 cursor-pointer disabled:opacity-40"
            >
              <option value="" className="dark:bg-slate-800">SEMUA GATEWAY</option>
              {gatewaysInSelectedProject.length === 0 && selectedProject && (
                <option value="" disabled>Tidak ada gateway di site ini</option>
              )}
              {gatewaysInSelectedProject.map((g) => (
                <option key={g.gateway_id} value={String(g.gateway_id)} className="dark:bg-slate-800">
                  {g.name.toUpperCase()}{g.hmi_code ? ` (${g.hmi_code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="flex items-center gap-2 min-w-[150px]">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-bold border-none outline-none focus:ring-2 ring-blue-100 dark:ring-blue-900/40"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-2 min-w-[150px]">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-bold border-none outline-none focus:ring-2 ring-blue-100 dark:ring-blue-900/40"
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-md active:scale-95 transition-all border-none cursor-pointer whitespace-nowrap disabled:opacity-40"
          >
            <Download className="w-4 h-4 stroke-[3]" /> Export CSV
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchHistoricalData}
            disabled={!selectedProject}
            className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border-none cursor-pointer disabled:opacity-40"
          >
            <RefreshCcw className={`w-4 h-4 text-slate-500 dark:text-slate-400 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ── TABLE INFO BAR ── */}
        <div className="px-6 py-3 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between">
          <span className="font-black text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Dynamic Channel Transmissions
          </span>
          <span className="text-[10px] font-mono font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/50">
            Total Records: {logs.length} Rows
          </span>
        </div>

        {/* ── TABLE ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700">
                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-16 text-center">Index</th>
                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-48">Gateway</th>
                {dynamicChannels.map((ch) => (
                  <th key={ch} className="p-6 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest border-l border-slate-100 dark:border-slate-700/60 bg-blue-50/20 dark:bg-blue-950/10">
                    {ch.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40 text-xs font-mono text-slate-600 dark:text-slate-400">
              {isLoading ? (
                <tr>
                  <td colSpan={2 + dynamicChannels.length} className="p-32 text-center font-sans">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto" />
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-3">Re-indexing telemetry records dari PostgreSQL...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={2 + dynamicChannels.length} className="p-20 text-center font-sans">
                    <AlertTriangle className="w-5 h-5 text-rose-400 mx-auto mb-2" />
                    <p className="text-rose-500 dark:text-rose-400 font-bold text-xs uppercase italic">{error}</p>
                  </td>
                </tr>
              ) : currentLogsChunk.length > 0 ? (
                currentLogsChunk.map((log, index) => (
                  <tr key={log.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="p-6 text-center text-slate-400 dark:text-slate-600 font-bold">{indexOfFirstRecord + index + 1}</td>
                    <td className="p-6 font-sans text-slate-800 dark:text-slate-300 font-black uppercase tracking-tight text-[11px]">
                      {gatewayName(log.gateway_id)}
                    </td>
                    {dynamicChannels.map((ch) => {
                      const val = log.payload?.[ch];
                      return (
                        <td key={ch} className="p-6 font-black border-l border-slate-100 dark:border-slate-700/40 text-slate-800 dark:text-slate-200">
                          {val !== undefined ? (typeof val === "object" ? JSON.stringify(val) : String(val)) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2 + dynamicChannels.length} className="p-24 text-center text-slate-400 dark:text-slate-500 font-sans text-[10px] font-black uppercase italic tracking-[0.2em]">
                    No historical logs found within this date parameters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION ── */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between font-sans">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Showing {indexOfFirstRecord + 1} – {Math.min(indexOfLastRecord, logs.length)} of {logs.length} records
            </p>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 cursor-pointer disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 cursor-pointer disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}