"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { LoadingText } from "@/components/ui/loading-text";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isLoading && !user) {
      console.log("[AuthGuard] No user found, redirecting to login...");
      router.push("/login");
    }
  }, [user, isLoading, router, isMounted]);

  // Always render the same structure on server and client
  // Use suppressHydrationWarning to prevent hydration warnings
  return (
    <div suppressHydrationWarning>
      {children}
      {/* Show loading overlay only after mount and when loading */}
      {isMounted && isLoading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <LoadingText>Loading...</LoadingText>
        </div>
      )}
      {/* Show redirect message only after mount and when not loading and no user */}
      {isMounted && !isLoading && !user && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      )}
    </div>
  );
} 