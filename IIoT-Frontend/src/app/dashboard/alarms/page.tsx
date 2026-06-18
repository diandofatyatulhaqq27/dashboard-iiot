"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Edit2, X, Loader2, Trash2, RefreshCcw, AlertTriangle, Plus, Search, BellRing, ShieldAlert, Tag, CheckCircle2 } from "lucide-react";

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
  gateway_id: "",
  mqtt_key: "",
  message: "",
};

export default function AlarmsPage() {
  const [alarms, setAlarms] = useState<any[]>([]);
  const [gatewaysList, setGatewaysList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [editingAlarm, setEditingAlarm] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAlarmForm, setNewAlarmForm] = useState({ ...DEFAULT_FORM });

  const loggedInUser = getLocalUser();
  const userRole: string = loggedInUser?.role ?? "client_user";
  const isReadOnly = userRole === "rasindo_user" || userRole === "client_user";

  // ─── 1. FETCH ALARMS ─────────────────────────────────────────────────────
  const fetchAlarms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = `${API_BASE}/alarms/recent`;
      const res = await fetch(url, { method: "GET", cache: "no-store", headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Gagal menarik data alarm dari server.");
      const result = await res.json();
      setAlarms(result.data ?? []);
    } catch (err: any) {
      setError(err.message ?? "Terjadi kesalahan.");
      setAlarms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── 2. FETCH MASTER DATA (GATEWAYS LIST) ─────────────────────────────────
  const fetchMasterData = useCallback(async () => {
    try {
      const resGw = await fetch(`${API_BASE}/gateways/`, { headers: getAuthHeaders() });
      if (resGw.ok) {
        const gates = (await resGw.json()).data ?? [];
        setGatewaysList(gates);
        if (gates.length > 0) {
          setNewAlarmForm((prev) => ({ ...prev, gateway_id: String(gates[0].gateway_id) }));
        }
      }
    } catch (err) {
      console.error("fetchMasterData error:", err);
    }
  }, []);

  useEffect(() => {
    fetchAlarms();
    fetchMasterData();
  }, [fetchAlarms, fetchMasterData]);

  // ─── 3. CREATE ALARM (DEFAULT RESOLVED / OFF) ────────────────────────────
  const handleCreateAlarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return alert("Akses ditolak!");

    try {
      const res = await fetch(`${API_BASE}/alarms/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          gateway_id: parseInt(newAlarmForm.gateway_id, 10),
          mqtt_key: newAlarmForm.mqtt_key.trim(),
          message: newAlarmForm.message.trim(),
          severity: "NORMAL",
          status: "RESOLVED", 
        }),
      });

      if (res.ok) {
        alert("Master konfigurasi alarm berhasil didaftarkan!");
        setIsCreateModalOpen(false);
        setNewAlarmForm({ ...DEFAULT_FORM, gateway_id: gatewaysList[0]?.gateway_id ? String(gatewaysList[0].gateway_id) : "" });
        fetchAlarms();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData?.detail ?? "Gagal mendaftarkan alarm baru.");
      }
    } catch { alert("Gagal berkomunikasi dengan server."); }
  };

  // ─── 4. UPDATE ALARM ─────────────────────────────────────────────────────
  const handleUpdateAlarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return alert("Akses ditolak!");

    try {
      const res = await fetch(`${API_BASE}/alarms/${editingAlarm.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: editingAlarm.id,
          gateway_id: parseInt(String(editingAlarm.gateway_id), 10),
          mqtt_key: editingAlarm.mqtt_key.trim(),
          message: editingAlarm.message.trim(),
          severity: editingAlarm.severity || "CRITICAL",
          status: editingAlarm.status || "ACTIVE",
        }),
      });

      if (res.ok) {
        alert("Konfigurasi Alarm Berhasil Diperbarui!");
        setEditingAlarm(null);
        fetchAlarms();
      } else {
        alert("Gagal memperbarui konfigurasi sistem alarm.");
      }
    } catch { alert("Terjadi kesalahan koneksi."); }
  };

  // ─── 5. VERIFY / ACKNOWLEDGE ALARM (TOMBOL CEKLIS) 🌟 ────────────────────
  const handleVerifyAlarm = async (alarm: any) => {
    if (isReadOnly) return alert("Akses ditolak!");
    
    try {
      const res = await fetch(`${API_BASE}/alarms/${alarm.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: alarm.id,
          gateway_id: alarm.gateway_id,
          mqtt_key: alarm.mqtt_key,
          message: alarm.message,
          severity: "NORMAL",
          status: "RESOLVED", // Diubah paksa jadi OFF (0) kembali
        }),
      });

      if (res.ok) {
        fetchAlarms(); // Reload data tabel seketika
      } else {
        alert("Gagal memverifikasi alarm.");
      }
    } catch {
      alert("Terjadi masalah koneksi.");
    }
  };

  // ─── 6. DELETE ALARM ─────────────────────────────────────────────────────
  const handleDelete = async (alarmId: string, msg: string) => {
    if (isReadOnly) return alert("Akses ditolak!");
    if (!confirm(`Hapus master konfigurasi alarm untuk parameter: "${msg}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/alarms/${alarmId}`, { method: "DELETE", headers: getAuthHeaders() });
      if (res.ok) {
        alert("Master konfigurasi alarm berhasil dihapus dari sistem!");
        fetchAlarms();
      } else {
        alert("Gagal menghapus master alarm dari database.");
      }
    } catch { alert("Terjadi kesalahan koneksi ke server."); }
  };

  const getGatewayName = (gatewayId: number) => {
    const gw = gatewaysList.find((g) => g.gateway_id === gatewayId);
    return gw ? gw.name.toUpperCase() : `GATEWAY ID: ${gatewayId}`;
  };

  const filteredAlarms = alarms.filter((alarm) => {
    const q = searchQuery.toLowerCase();
    return (
      (alarm.message ?? "").toLowerCase().includes(q) ||
      (alarm.severity ?? "").toLowerCase().includes(q) ||
      (alarm.status ?? "").toLowerCase().includes(q) ||
      (alarm.mqtt_key ?? "").toLowerCase().includes(q) ||
      getGatewayName(alarm.gateway_id).toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 bg-transparent min-h-screen font-sans text-slate-900 dark:text-slate-100">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden transition-all duration-300">
        
        {/* TOOLBAR INTERNAL */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4 bg-white dark:bg-slate-800">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search alarm log, severity, mqtt key, or gateway..."
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
              <Plus className="w-4 h-4 stroke-[3]" /> Add Alarm
            </button>
          )}

          <button onClick={fetchAlarms} className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border-none cursor-pointer">
            <RefreshCcw className={`w-4 h-4 text-slate-500 dark:text-slate-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700">
                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-20">No.</th>
                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Triggered Gateway</th>
                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">MQTT Key Parameter</th>
                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Alarm Message / Event</th>
                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Severity Level</th>
                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Incident Time</th>
                <th className="p-6 text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-32">Status</th>
                <th className="p-6 text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
              {loading ? (
                <tr><td colSpan={8} className="p-24 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto" /></td></tr>
              ) : error ? (
                <tr><td colSpan={8} className="p-20 text-center text-rose-500 dark:text-rose-400 font-bold text-xs"><AlertTriangle className="w-5 h-5 mx-auto mb-2" /> {error}</td></tr>
              ) : filteredAlarms.length > 0 ? (
                filteredAlarms.map((alarm: any, index: number) => {
                  const isCritical = alarm.severity === "CRITICAL";
                  const isActive = alarm.status === "ACTIVE" || alarm.status === "1";

                  return (
                    <tr key={alarm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors text-xs">
                      <td className="p-6 font-mono text-slate-400 dark:text-slate-500 font-black">{index + 1}</td>
                      <td className="p-6 font-black text-slate-800 dark:text-slate-200 uppercase">{getGatewayName(alarm.gateway_id)}</td>
                      <td className="p-6">
                        <span className="font-mono text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 w-fit">
                          <Tag className="w-3 h-3" /> {alarm.mqtt_key || "UNMAPPED"}
                        </span>
                      </td>
                      <td className="p-6 font-bold text-slate-600 dark:text-slate-300">{alarm.message}</td>
                      <td className="p-6">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border uppercase tracking-wider ${
                          isActive 
                            ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40 animate-pulse" 
                            : "bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800"
                        }`}>
                          {isActive ? "CRITICAL" : "NORMAL"}
                        </span>
                      </td>
                      
                      {/* 🌟 LOGIKA BARU JALUR WAKTU (INCIDENT TIME) */}
                      <td className="p-6 font-mono font-bold text-slate-400 dark:text-slate-500">
                        {isActive && alarm.created_at 
                          ? new Date(alarm.created_at).toLocaleString("id-ID") 
                          : "—"
                        }
                      </td>

                      <td className="p-6 text-center">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-md border inline-block whitespace-nowrap ${
                          isActive 
                            ? "bg-rose-500 text-white border-rose-600 animate-pulse shadow-[0_0_8px_#ef4444]" 
                            : "bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800"
                        }`}>
                          {isActive ? "ACTIVE (1)" : "OFF (0)"}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex justify-center gap-2 items-center">
                          {/* 🌟 TOMBOL CEKLIS VERIFIED UNTUK ALARM YANG SEDANG AKTIF */}
                          {isActive && !isReadOnly && (
                            <button 
                              onClick={() => handleVerifyAlarm(alarm)} 
                              title="Verify/Acknowledge Alarm"
                              className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-md border-none bg-transparent cursor-pointer transition-all"
                            >
                              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                            </button>
                          )}
                          
                          {!isReadOnly && (
                            <>
                              <button onClick={() => setEditingAlarm({ ...alarm })} className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-md border-none bg-transparent cursor-pointer"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(alarm.id, alarm.message)} className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md border-none bg-transparent cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={8} className="p-24 text-center text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase italic tracking-[0.2em]">No dangerous leakages or critical alarms triggered.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: CREATE ALARM ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
              <h2 className="font-black text-xs uppercase tracking-widest text-slate-800 dark:text-slate-100 italic flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" /> Register Master Alarm
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 border-none bg-transparent cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateAlarm} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Parent IoT Gateway Target</label>
                <select className="w-full p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-xs font-black border-none ring-1 ring-slate-100 dark:ring-slate-700/50 outline-none text-slate-800 dark:text-slate-100 cursor-pointer focus:ring-2 focus:ring-blue-600" value={newAlarmForm.gateway_id} onChange={(e) => setNewAlarmForm({ ...newAlarmForm, gateway_id: e.target.value })} required>
                  {gatewaysList.length === 0 && <option value="" disabled>Loading gateways...</option>}
                  {gatewaysList.map((g) => <option key={g.gateway_id} value={g.gateway_id}>{g.name.toUpperCase()} (#ID: {g.gateway_id})</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">MQTT Telemetry Key Bind</label>
                <input type="text" placeholder="e.g., kd12b_gas_ppm, ahu_temp_level" className="w-full p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-xs font-mono font-bold border-none ring-1 ring-slate-100 dark:ring-slate-700/50 outline-none text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-600" value={newAlarmForm.mqtt_key} onChange={(e) => setNewAlarmForm({ ...newAlarmForm, mqtt_key: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Alarm Event Message Description</label>
                <input type="text" placeholder="CONTOH: KEBOCORAN GAS LIQUID AMMONIA DI AREA AHU PANEL" className="w-full p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-xs font-black border-none ring-1 ring-slate-100 dark:ring-slate-700/50 outline-none text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-600" value={newAlarmForm.message} onChange={(e) => setNewAlarmForm({ ...newAlarmForm, message: e.target.value })} required />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-900 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border-none cursor-pointer">Batal</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase shadow-lg border-none tracking-[0.2em] cursor-pointer hover:bg-blue-700">Trigger Alarm</button>
              </div>
            </form>
          </div>
        </div>
      )}  

      {/* ── MODAL: EDIT ALARM ── */}
      {editingAlarm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
              <h2 className="font-black text-xs uppercase tracking-widest text-slate-800 dark:text-slate-100 italic flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-600" /> Modify Alarm Description Event
              </h2>
              <button onClick={() => setEditingAlarm(null)} className="text-slate-400 border-none bg-transparent cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleUpdateAlarm} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Parent IoT Gateway Target</label>
                <select className="w-full p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-xs font-black border-none ring-1 ring-slate-100 dark:ring-slate-700/50 outline-none text-slate-800 dark:text-slate-100 cursor-pointer focus:ring-2 focus:ring-amber-500" value={editingAlarm.gateway_id ?? ""} onChange={(e) => setEditingAlarm({ ...editingAlarm, gateway_id: parseInt(e.target.value, 10) })} required>
                  {gatewaysList.map((g) => <option key={g.gateway_id} value={g.gateway_id}>{g.name.toUpperCase()} (#ID: {g.gateway_id})</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Alarm Event Message Description</label>
                <input type="text" className="w-full p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-xs font-black border-none ring-1 ring-slate-100 dark:ring-slate-700/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500" value={editingAlarm.message ?? ""} onChange={(e) => setEditingAlarm({ ...editingAlarm, message: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">MQTT Telemetry Key Bind</label>
                <input type="text" className="w-full p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-xs font-mono font-bold border-none ring-1 ring-slate-100 dark:ring-slate-700/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500" value={editingAlarm.mqtt_key ?? ""} onChange={(e) => setEditingAlarm({ ...editingAlarm, mqtt_key: e.target.value })} required />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingAlarm(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-900 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border-none cursor-pointer">Batal</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase shadow-lg border-none tracking-[0.2em] cursor-pointer hover:bg-blue-700">Update Status</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}