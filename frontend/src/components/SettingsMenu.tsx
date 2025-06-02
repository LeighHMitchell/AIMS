"use client";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

export function SettingsMenu() {
  const { user, setUser } = useUser();
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Settings</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <div className="px-3 py-2 border-b mb-2">
          <div className="font-semibold">{user?.name}</div>
          <div className="text-xs text-gray-500">{user?.role}</div>
        </div>
        <DropdownMenuItem
          onClick={() => {
            setUser(null);
            router.push("/login");
          }}
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 