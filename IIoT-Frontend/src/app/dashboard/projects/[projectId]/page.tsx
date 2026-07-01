"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useProjectGateways } from "@/hooks/useGatewayDetail";

export default function ProjectRedirectPage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();

  const { data: gatewayList, isSuccess, isError } = useProjectGateways(projectId);

  useEffect(() => {
    if (!projectId) return;

    if (isError) {
      console.error("Redirect error: gagal memuat project.");
      router.replace("/dashboard/projects");
      return;
    }

    if (isSuccess) {
      if (gatewayList.length > 0) {
        const firstId = gatewayList[0].gateway_id ?? gatewayList[0].id;
        router.replace(`/dashboard/projects/${projectId}/${firstId}`);
      } else {
        router.replace(`/dashboard/projects/${projectId}/no-gateway`);
      }
    }
  }, [projectId, isSuccess, isError, gatewayList, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
      <p className="mt-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
        Resolving topology gateway nodes...
      </p>
    </div>
  );
}