"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, UserRole, UserPermissions, getUserPermissions, USER_ROLES, Organization } from '@/types/user';
import { useRouter } from "next/navigation";

interface UserContextType {
  user: User | null;
  permissions: UserPermissions;
  setUser: (user: User | null) => void;
  logout: () => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Mock organizations for development
const mockOrganizations: Organization[] = [
  { id: "1", name: "World Bank", type: "development_partner", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "2", name: "UNDP", type: "development_partner", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "3", name: "Ministry of Finance", type: "partner_government", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "4", name: "Ministry of Education", type: "partner_government", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Initialize user state immediately from localStorage if available
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('aims_user');
      if (storedUser) {
        try {
          console.log("[useUser] Found stored user during initialization");
          return JSON.parse(storedUser);
        } catch (error) {
          console.error('[useUser] Failed to parse stored user during init:', error);
          localStorage.removeItem('aims_user');
        }
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false); // Start with false since we check synchronously
  const router = useRouter();

  // Save user to localStorage when it changes
  const handleSetUser = (newUser: User | null) => {
    if (newUser) {
      localStorage.setItem('aims_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('aims_user');
    }
    setUser(newUser);
  };

  const permissions = user ? getUserPermissions(user.role) : getUserPermissions(USER_ROLES.ORPHAN);

  const logout = () => {
    handleSetUser(null);
    router.push('/login');
  };

  return (
    <UserContext.Provider value={{ user, permissions, setUser: handleSetUser, logout, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Export mock data for development
export const mockUsers: User[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    title: "System Administrator",
    role: USER_ROLES.SUPER_USER,
    organizationId: "1",
    organization: mockOrganizations[0],
    phone: "555-1234",
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@worldbank.org",
    title: "Senior Program Manager",
    role: USER_ROLES.DEV_PARTNER_TIER_1,
    organizationId: "1",
    organization: mockOrganizations[0],
    phone: "555-5678",
    isActive: true,
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Mike Johnson",
    email: "mike@undp.org",
    title: "Project Coordinator",
    role: USER_ROLES.DEV_PARTNER_TIER_2,
    organizationId: "2",
    organization: mockOrganizations[1],
    phone: "555-9012",
    isActive: true,
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Sarah Williams",
    email: "sarah@mof.gov",
    title: "Director of Aid Coordination",
    role: USER_ROLES.GOV_PARTNER_TIER_1,
    organizationId: "3",
    organization: mockOrganizations[2],
    phone: "555-3456",
    isActive: true,
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "5",
    name: "Tom Brown",
    email: "tom@moe.gov",
    title: "Aid Officer",
    role: USER_ROLES.GOV_PARTNER_TIER_2,
    organizationId: "4",
    organization: mockOrganizations[3],
    phone: "555-7890",
    isActive: true,
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "6",
    name: "Emily Davis",
    email: "emily@example.com",
    title: "Consultant",
    role: USER_ROLES.ORPHAN,
    organizationId: undefined,
    organization: undefined,
    phone: "555-2345",
    isActive: true,
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "7",
    name: "David Wilson",
    email: "david@inactive.com",
    title: "Former Advisor",
    role: USER_ROLES.DEV_PARTNER_TIER_2,
    organizationId: "2",
    organization: mockOrganizations[1],
    phone: "555-6789",
    isActive: false,
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString(),
  },
];

export { mockOrganizations }; 