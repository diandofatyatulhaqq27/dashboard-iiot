"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Cpu, Edit2, X, Loader2, Trash2, RefreshCcw, AlertTriangle, Plus, HardDrive, Search } from "lucide-react";

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

const DEFAULT_FORM = {
  hmi_code: "",
  name: "",
  project_id: "",
};

export default function GatewaysPage() {
  const [gateways, setGateways] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [editingGateway, setEditingGateway] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGatewayForm, setNewGatewayForm] = useState({ ...DEFAULT_FORM });

  const loggedInUser = getLocalUser();
  const userRole: string = loggedInUser?.role ?? "client_user";
  const isReadOnly = userRole === "rasindo_user" || userRole === "client_user";

  // ─── 1. FETCH GATEWAYS ──────────────────────────────────────────────────
  const fetchGateways = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = getLocalUser();
      const currentRole: string = currentUser?.role ?? "client_user";
      const currentCompanyId: string = String(currentUser?.company_id ?? "");

      let url = `${API_BASE}/gateways/`;
      if (
        currentRole !== "admin" &&
        currentRole !== "rasindo_operator" &&
        currentRole !== "rasindo_user" &&
        currentCompanyId
      ) {
        url += `?company_id=${currentCompanyId}`;
      }

      const res = await fetch(url, { method: "GET", cache: "no-store", headers: getAuthHeaders() });

      if (!res.ok) throw new Error(`Gagal menarik data hardware. Status: ${res.status}`);

      const result = await res.json();
      const sorted = [...(result.data ?? [])].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
      setGateways(sorted);
    } catch (err: any) {
      setError(err.message ?? "Terjadi kesalahan.");
      setGateways([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── 2. FETCH MASTER DATA ────────────────────────────────────────────────
  const fetchMasterData = useCallback(async () => {
    try {
      const resProj = await fetch(`${API_BASE}/projects/`, { headers: getAuthHeaders() });
      if (resProj.ok) {
        const r = await resProj.json();
        const projs = r.data ?? [];
        setProjectsList(projs);
        if (projs.length > 0) {
          setNewGatewayForm((prev) => ({ ...prev, project_id: String(projs[0].project_id) }));
        }
      }
    } catch (err) {
      console.error("fetchMasterData error:", err);
    }
  }, []);

  useEffect(() => {
    fetchGateways();
    fetchMasterData();
  }, [fetchGateways, fetchMasterData]);

  // ─── 3. CREATE ───────────────────────────────────────────────────────────
  const handleCreateGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return alert("Akses ditolak!");
    if (!newGatewayForm.name.trim()) return alert("Nama gateway wajib diisi.");
    if (!newGatewayForm.project_id) return alert("Pilih project terlebih dahulu.");

    try {
      const res = await fetch(`${API_BASE}/gateways/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          hmi_code: newGatewayForm.hmi_code.trim().toUpperCase() || null,
          name: newGatewayForm.name.trim(),
          project_id: parseInt(newGatewayForm.project_id, 10),
          status: "offline",
        }),
      });

      if (res.ok) {
        alert("IoT Gateway Terminal Berhasil Didaftarkan!");
        setIsCreateModalOpen(false);
        setNewGatewayForm({ ...DEFAULT_FORM, project_id: projectsList[0]?.project_id ? String(projectsList[0].project_id) : "" });
        fetchGateways();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData?.detail ?? "Gagal mendaftarkan gateway.");
      }
    } catch { alert("Gagal berkomunikasi dengan server."); }
  };

  // ─── 4. UPDATE ───────────────────────────────────────────────────────────
  const handleUpdateGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return alert("Akses ditolak!");
    if (!editingGateway?.gateway_id) return;

    try {
      const res = await fetch(`${API_BASE}/gateways/${editingGateway.gateway_id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          hmi_code: editingGateway.hmi_code?.trim() || null,
          name: editingGateway.name.trim(),
          project_id: editingGateway.project_id ? parseInt(String(editingGateway.project_id), 10) : null,
          status: editingGateway.status,
        }),
      });

      if (res.ok) {
        alert("Konfigurasi hardware terminal berhasil diperbarui!");
        setEditingGateway(null);
        fetchGateways();
      } else {
        alert("Gagal memperbarui hardware.");
      }
    } catch { alert("Terjadi kesalahan koneksi saat memperbarui data."); }
  };

  // ─── 5. DELETE ───────────────────────────────────────────────────────────
  const handleDelete = async (gatewayId: number, displayName: string) => {
    if (isReadOnly) return alert("Akses ditolak!");
    if (!confirm(`Hapus Gateway "${displayName}"? Koneksi MQTT terminal ini akan terputus permanen.`)) return;

    try {
      const res = await fetch(`${API_BASE}/gateways/${gatewayId}`, { method: "DELETE", headers: getAuthHeaders() });
      if (res.ok) fetchGateways();
      else alert("Gagal menghapus gateway.");
    } catch { alert("Terjadi kesalahan koneksi."); }
  };

  // ─── FILTER ──────────────────────────────────────────────────────────────
  const filteredGateways = gateways.filter((gw) => {
    const q = searchQuery.toLowerCase();
    return (
      (gw.name ?? "").toLowerCase().includes(q) ||
      (gw.hmi_code ?? "").toLowerCase().includes(q)
    );
  });

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="p-8 bg-transparent min-h-screen font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden transition-all duration-300">

        {/* ── TOOLBAR INTERNAL ── */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4 bg-white dark:bg-slate-800">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search gateway records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-blue-100 dark:ring-blue-900/40 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 border-none"
            />
          </div>

          {!isReadOnly && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-md active:scale-95 transition-all border-none cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Add Gateway
            </button>
          )}

          <button
            onClick={fetchGateways}
            className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border-none cursor-pointer"
          >
            <RefreshCcw className={`w-4 h-4 text-slate-500 dark:text-slate-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700">
                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-20">No.</th>
                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">HMI Code</th>
                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Gateway Name</th>
                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Assigned Site Project</th>
                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Link Status</th>
                <th className="p-6 text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Control Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">Syncing hardware connectivity maps...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-rose-500 dark:text-rose-400 font-bold uppercase tracking-wider text-xs italic">
                    <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-rose-400" /> {error}
                  </td>
                </tr>
              ) : filteredGateways.length > 0 ? (
                filteredGateways.map((gateway: any, index: number) => (
                  <tr key={gateway.gateway_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group text-xs">
                    <td className="p-6 font-mono text-slate-400 dark:text-slate-500 font-black">{index + 1}</td>
                    <td className="p-6 font-mono text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">
                      {gateway.hmi_code || "—"}
                    </td>
                    <td className="p-6 font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-slate-400" /> {gateway.name}
                      </div>
                    </td>
                    <td className="p-6 font-black text-slate-700 dark:text-slate-300 uppercase">
                      {projectsList.find((p) => p.project_id === gateway.project_id)?.display_name ?? `ID: ${gateway.project_id ?? "—"}`}
                    </td>
                    <td className="p-6 font-black uppercase tracking-widest text-[10px]">
                      <span className={`px-2.5 py-1 rounded-md border ${gateway.status === "online" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40" : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40"}`}>
                        ● {gateway.status}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex justify-center gap-2">
                        {!isReadOnly && (
                          <>
                            <button onClick={() => setEditingGateway({ ...gateway })} className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-md transition-all border-none bg-transparent cursor-pointer" title="Modify Configuration">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(gateway.gateway_id, gateway.name)} className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-all border-none bg-transparent cursor-pointer" title="Decommission Hardware">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-24 text-center text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase italic tracking-[0.2em]">
                    Zero gateway controllers registered on this node link
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: CREATE GATEWAY ─────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
              <h2 className="font-black text-xs uppercase tracking-widest text-slate-800 dark:text-slate-100 italic flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Provision New IoT Gateway
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-400 border-none bg-transparent cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateGateway} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">HMI Code</label>
                <input type="text" placeholder="CONTOH: HMI-01" className="w-full p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-xs font-mono font-black tracking-widest text-blue-600 dark:text-blue-400 border-none ring-1 ring-slate-100 dark:ring-slate-700/50 focus:ring-2 focus:ring-blue-600 outline-none" value={newGatewayForm.hmi_code} onChange={(e) => setNewGatewayForm({ ...newGatewayForm, hmi_code: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Display Name</label>
                <input type="text" placeholder="CONTOH: MODBUS MASTER GATEWAY SEKTOR A" className="w-full p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-xs font-black border-none ring-1 ring-slate-100 dark:ring-slate-700/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none" value={newGatewayForm.name} onChange={(e) => setNewGatewayForm({ ...newGatewayForm, name: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Bind to Project Site</label>
                <select className="w-full p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-xs font-black border-none ring-1 ring-slate-100 dark:ring-slate-700/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none cursor-pointer" value={newGatewayForm.project_id} onChange={(e) => setNewGatewayForm({ ...newGatewayForm, project_id: e.target.value })} required>
                  {projectsList.length === 0 && <option value="" disabled>Loading projects...</option>}
                  {projectsList.map((p) => (
                    <option key={p.project_id} value={String(p.project_id)}>{p.display_name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Link Status (Otomatis)</label>
                <div className="w-full p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 border-none ring-1 ring-slate-100 dark:ring-slate-700/50 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                  OFFLINE — Otomatis ONLINE saat menerima data MQTT pertama
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border-none cursor-pointer">Batal</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase shadow-lg border-none tracking-[0.2em] cursor-pointer hover:bg-blue-700 transition-all">Register Link</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT GATEWAY ───────────────────────────────────────────── */}
      {editingGateway && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
              <h2 className="font-black text-xs uppercase tracking-widest text-slate-800 dark:text-slate-100 italic flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Edit Hardware Meta
              </h2>
              <button onClick={() => setEditingGateway(null)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-400 border-none bg-transparent cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateGateway} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">HMI Code</label>
                <input type="text" className="w-full p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-xs font-mono font-black tracking-widest text-blue-600 dark:text-blue-400 border-none ring-1 ring-slate-100 dark:ring-slate-700/50 focus:ring-2 focus:ring-blue-600 outline-none" value={editingGateway.hmi_code ?? ""} onChange={(e) => setEditingGateway({ ...editingGateway, hmi_code: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Hardware Asset Name</label>
                <input type="text" className="w-full p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-xs font-black border-none ring-1 ring-slate-100 dark:ring-slate-700/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all" value={editingGateway.name ?? ""} onChange={(e) => setEditingGateway({ ...editingGateway, name: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Assigned Site Project</label>
                <select className="w-full p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-xs font-black border-none ring-1 ring-slate-100 dark:ring-slate-700/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none cursor-pointer" value={String(editingGateway.project_id ?? "")} onChange={(e) => setEditingGateway({ ...editingGateway, project_id: e.target.value })}>
                  {projectsList.map((p) => (
                    <option key={p.project_id} value={String(p.project_id)}>{p.display_name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Hardware Link Status (Otomatis)</label>
                <div className={`w-full p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${editingGateway.status === "online" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40" : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40"}`}>
                  ● {editingGateway.status ?? "offline"}
                  <span className="ml-auto font-medium text-[9px] opacity-70 normal-case tracking-normal">dikontrol via MQTT heartbeat</span>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingGateway(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border-none cursor-pointer">Batal</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase shadow-lg border-none tracking-[0.2em] cursor-pointer hover:bg-blue-700 transition-all">Update Hardware</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}