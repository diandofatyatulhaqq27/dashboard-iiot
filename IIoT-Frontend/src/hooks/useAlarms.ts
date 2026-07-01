import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE, getAuthHeaders } from "@/lib/api";

const ALARMS_KEY = ["alarms"];

/**
 * Fetch the raw (unscoped) list of recent alarms from the server.
 * Company-scoping is applied by the caller (the page), since it depends
 * on the gateway list which is fetched separately via useGateways().
 */
export function useAlarms() {
  return useQuery({
    queryKey: ALARMS_KEY,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/alarms/recent`, {
        method: "GET",
        cache: "no-store",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Gagal menarik data alarm dari server.");

      const result = await res.json();
      return (result.data ?? []) as any[];
    },
    // Alarms are more time-sensitive than gateways, so keep staleTime
    // short — this just avoids duplicate fetches within the same render
    // burst, not a long-lived cache.
    staleTime: 5_000,
  });
}

export function useCreateAlarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      gateway_id: number;
      mqtt_key: string;
      name: string;
      message: string;
    }) => {
      const res = await fetch(`${API_BASE}/alarms/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.detail ?? "Gagal mendaftarkan alarm baru.");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate -> React Query refetches ["alarms"] automatically,
      // in any component currently mounted that uses useAlarms().
      queryClient.invalidateQueries({ queryKey: ALARMS_KEY });
    },
  });
}

export function useUpdateAlarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, any> }) => {
      const res = await fetch(`${API_BASE}/alarms/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Gagal memperbarui konfigurasi sistem alarm.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALARMS_KEY });
    },
  });
}

export function useDeleteAlarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/alarms/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Gagal menghapus master alarm dari database.");
      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALARMS_KEY });
    },
  });
}