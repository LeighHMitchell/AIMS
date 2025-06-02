"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();
  const router = useRouter();

  console.log("[AuthGuard] Render - isLoading:", isLoading, "user:", user);

  useEffect(() => {
    console.log("[AuthGuard] useEffect - isLoading:", isLoading, "user:", user);
    if (!isLoading && !user) {
      console.log("[AuthGuard] No user found, redirecting to login...");
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    // Show a brief message while redirecting
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
} 