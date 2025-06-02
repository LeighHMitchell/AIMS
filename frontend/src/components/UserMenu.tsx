"use client";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { user, setUser } = useUser();
  const router = useRouter();

  if (!user) return null;

  return (
    <div className="flex flex-col items-end gap-2 p-2 min-w-[180px]">
      <div className="text-sm text-gray-700">
        <div>Logged in as <b>{user.name}</b></div>
        <div className="text-xs text-gray-500">{user.role}</div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setUser(null);
          router.push("/login");
        }}
      >
        Log out
      </Button>
    </div>
  );
} 