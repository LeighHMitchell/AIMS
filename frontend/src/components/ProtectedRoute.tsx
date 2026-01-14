import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserRole } from "@/types/user";
import { LoadingText } from "@/components/ui/loading-text";

export function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: (UserRole | 'admin')[] }) {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    
    if (!allowedRoles.includes(user.role as UserRole | 'admin')) {
      router.push("/unauthorized");
    }
  }, [user, allowedRoles, router]);

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen"><LoadingText>Loading...</LoadingText></div>;
  }

  if (!allowedRoles.includes(user.role as UserRole | 'admin')) {
    return <div>Unauthorized</div>;
  }

  return <>{children}</>;
} 