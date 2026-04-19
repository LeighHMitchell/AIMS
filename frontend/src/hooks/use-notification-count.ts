import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

export function useNotificationCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["notifications", "unread-count", userId],
    queryFn: async () => {
      const res = await apiFetch(`/api/notifications/user?userId=${userId}&limit=1`);
      const data = await res.json();
      return (data.unreadCount ?? 0) as number;
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}
