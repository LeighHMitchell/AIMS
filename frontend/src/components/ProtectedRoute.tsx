import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserRole } from "@/types/user";

export function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: UserRole[] }) {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    
    if (!allowedRoles.includes(user.role)) {
      router.push("/unauthorized");
    }
  }, [user, allowedRoles, router]);

  if (!user) {
    return <div>Loading...</div>;
  }

  if (!allowedRoles.includes(user.role)) {
    return <div>Unauthorized</div>;
  }

  return <>{children}</>;
} 