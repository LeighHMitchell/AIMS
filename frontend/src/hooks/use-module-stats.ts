import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import type { ModuleStats } from "@/types/project-bank";

export function useModuleStats() {
  return useQuery({
    queryKey: ["module-stats"],
    queryFn: async (): Promise<ModuleStats | null> => {
      const res = await apiFetch("/api/module-stats");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}
