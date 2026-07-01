import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE, getAuthHeaders, getLocalUser } from "@/lib/api";

/**
 * Fetch the list of projects.
 *
 * Scoping mirrors the exact logic AssetMap used to have inline: only the
 * "admin" role sees ALL projects; every other role is scoped to their own
 * company_id. (Note: this is narrower than the isCompanyScoped convention
 * used on the alarms/monitoring/dashboard pages, where rasindo_operator
 * and rasindo_user also see everything — this hook intentionally keeps
 * AssetMap's original behavior unchanged. Flag if you want them unified.)
 */
export function useProjects(options?: { refetchInterval?: number }) {
  const loggedInUser = getLocalUser();
  const companyId = String(loggedInUser?.company_id ?? "");
  const userRole = loggedInUser?.role ?? "client_user";
  const isScoped = userRole !== "admin" && !!companyId;

  return useQuery({
    queryKey: ["projects", isScoped ? companyId : "all"],
    queryFn: async () => {
      const url = isScoped
        ? `${API_BASE}/projects/?company_id=${companyId}`
        : `${API_BASE}/projects/`;

      const res = await fetch(url, { method: "GET", cache: "no-store", headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Backend menolak permintaan atau sesi tidak sah");

      const result = await res.json();
      return (result.data ?? []) as any[];
    },
    staleTime: 5_000,
    refetchInterval: options?.refetchInterval,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      display_name: string;
      description: string;
      company_id: number;
      latitude: number;
      longitude: number;
      config: any[];
    }) => {
      const res = await fetch(`${API_BASE}/projects/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const rawText = await res.text();
        let errData: any = {};
        try { errData = JSON.parse(rawText); } catch {}
        throw new Error(errData?.detail ?? rawText ?? "Gagal menyimpan project.");
      }

      return res.json();
    },
    onSuccess: () => {
      // Invalidates every ["projects", ...] cache bucket regardless of
      // which company_id key it was stored under.
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Record<string, any> }) => {
      const res = await fetch(`${API_BASE}/projects/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.detail ?? "Gagal memperbarui data.");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/projects/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.detail ?? "Gagal menghapus project.");
      }

      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}