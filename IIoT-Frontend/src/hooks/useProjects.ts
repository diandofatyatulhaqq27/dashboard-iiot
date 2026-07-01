import { useQuery } from "@tanstack/react-query";
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