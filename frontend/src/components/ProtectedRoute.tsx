import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserRole } from "@/types/user";

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
    return <div>Loading...</div>;
  }

  if (!allowedRoles.includes(user.role as UserRole | 'admin')) {
    return <div>Unauthorized</div>;
  }

  return <>{children}</>;
} 