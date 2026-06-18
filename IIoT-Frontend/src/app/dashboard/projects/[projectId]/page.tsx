"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

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

export default function ProjectRedirectPage() {
  const router = useRouter();
  const { projectId } = useParams();

  useEffect(() => {
    if (!projectId) return;

    const redirect = async () => {
      try {
        // Ambil detail project — backend return gateways yang terikat ke project ini
        const res = await fetch(`${API_BASE}/projects/${projectId}`, {
          method: "GET",
          cache: "no-store",
          headers: getAuthHeaders(),
        });

        if (!res.ok) throw new Error("Gagal memuat project.");

        const result = await res.json();
        const gatewayList: any[] = result.data?.gateways ?? [];

        if (gatewayList.length > 0) {
          // Sort asc by gateway_id, ambil yang pertama
          const sorted = [...gatewayList].sort(
            (a, b) => (a.gateway_id ?? a.id ?? 0) - (b.gateway_id ?? b.id ?? 0)
          );
          const firstId = sorted[0].gateway_id ?? sorted[0].id;
          router.replace(`/dashboard/projects/${projectId}/${firstId}`);
        } else {
          router.replace(`/dashboard/projects/${projectId}/no-gateway`);
        }
      } catch (err) {
        console.error("Redirect error:", err);
        router.replace("/dashboard/projects");
      }
    };

    redirect();
  }, [projectId, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400" />
      <p className="mt-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
        Resolving topology gateway nodes...
      </p>
    </div>
  );
}