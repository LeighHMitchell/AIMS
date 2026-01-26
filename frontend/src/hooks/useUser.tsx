"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, UserRole, UserPermissions, getUserPermissions, USER_ROLES, Organization } from '@/types/user';
import { useRouter } from "next/navigation";
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api-fetch';

interface UserContextType {
  user: User | null;
  permissions: UserPermissions;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null); // Always start with null to prevent hydration mismatches
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  // Load user from localStorage and setup Supabase auth listener
  useEffect(() => {
    const storedUser = localStorage.getItem('aims_user');
    if (storedUser) {
      try {
        console.log("[useUser] Found stored user after mount");
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('[useUser] Failed to parse stored user:', error);
        localStorage.removeItem('aims_user');
      }
    }

    let subscription: any = null;

    try {
      // Listen for Supabase auth changes
      const authResponse = supabase.auth.onAuthStateChange(
        async (event: any, session: any) => {
          console.log('[useUser] Supabase auth event:', event);
          
          if (event === 'SIGNED_IN' && session?.user) {
            // Check if we already have a user loaded (from email/password login)
            const currentStoredUser = localStorage.getItem('aims_user');
            const authSource = localStorage.getItem('aims_auth_source');
            
            if (currentStoredUser) {
              try {
                const parsed = JSON.parse(currentStoredUser);
                
                // If this is the same user, no need to update
                if (parsed.id === session.user.id) {
                  console.log('[useUser] User already loaded (same ID), skipping fetch');
                  return;
                }
                
                // If current user was logged in via email/password, DON'T override with OAuth session
                // This prevents the OAuth session from hijacking email/password logins
                if (authSource === 'email_password') {
                  console.log('[useUser] Current user was logged in via email/password, not overriding with OAuth session');
                  console.log('[useUser] Current user:', parsed.email, 'OAuth session:', session.user.email);
                  return;
                }
              } catch (e) {
                // Continue to fetch user
              }
            }
            
            // Mark this as an OAuth login
            localStorage.setItem('aims_auth_source', 'oauth');
            
            // Fetch user profile from our users table (needed for OAuth logins)
            console.log('[useUser] Fetching user profile for OAuth login:', session.user.email);
            try {
              const response = await apiFetch(`/api/users?email=${encodeURIComponent(session.user.email)}`);
              if (response.ok) {
                const userData = await response.json();
                // Handle both array and single object responses
                const userRecord = Array.isArray(userData) ? userData[0] : userData;
                if (userRecord && userRecord.email) {
                  console.log('[useUser] Loaded user profile after OAuth:', userRecord.email);
                  handleSetUser(userRecord);
                } else {
                  console.warn('[useUser] No user profile found for:', session.user.email);
                  // Create a minimal user object from OAuth data
                  const minimalUser = {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                    firstName: session.user.user_metadata?.full_name?.split(' ')[0] || '',
                    lastName: session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
                    profilePicture: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
                    role: 'public_user' as const,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  handleSetUser(minimalUser);
                }
              } else {
                console.error('[useUser] Failed to fetch user profile:', response.status);
              }
            } catch (fetchError) {
              console.error('[useUser] Error fetching user profile after OAuth:', fetchError);
            }
          }
          
          if (event === 'SIGNED_OUT') {
            console.log('[useUser] User signed out from Supabase');
            localStorage.removeItem('aims_auth_source');
            handleSetUser(null);
          }
        }
      );
      subscription = authResponse.data.subscription;
    } catch (error) {
      console.error('[useUser] Failed to setup Supabase auth listener:', error);
    }

    setIsLoading(false);
    setIsInitialized(true);

    // Cleanup subscription
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Save user to localStorage when it changes
  const handleSetUser = (newUser: User | null) => {
    if (newUser) {
      localStorage.setItem('aims_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('aims_user');
    }
    setUser(newUser);
  };

  const permissions = user ? getUserPermissions(user.role) : getUserPermissions(USER_ROLES.DEV_PARTNER_TIER_2);

  const refreshUser = async () => {
    if (!user?.email) return;
    
    try {
      console.log('[useUser] Refreshing user data from API');
      const response = await apiFetch(`/api/users?email=${encodeURIComponent(user.email)}`);
      if (response.ok) {
        const data = await response.json();
        // Handle both array and single object responses
        const users = Array.isArray(data) ? data : [data];
        const refreshedUser = users.find((u: User) => u.email === user.email);
        if (refreshedUser) {
          console.log('[useUser] User data refreshed successfully');
          handleSetUser(refreshedUser);
        }
      }
    } catch (error) {
      console.error('[useUser] Failed to refresh user data:', error);
    }
  };

  const logout = async () => {
    try {
      // Call Supabase logout endpoint
      await apiFetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('[useUser] Logout error:', error);
    }
    
    // Clear auth source tracking
    localStorage.removeItem('aims_auth_source');
    
    handleSetUser(null);
    router.push('/login');
  };

  return (
    <UserContext.Provider value={{ user, permissions, setUser: handleSetUser, refreshUser, logout, isLoading }}>
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
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    title: "System Administrator",
    jobTitle: "System Administrator",
    role: USER_ROLES.SUPER_USER,
    organizationId: "1",
    organisation: "World Bank",
    organization: mockOrganizations[0],
    phone: "555-1234",
    telephone: "555-1234",
    isActive: true,
    lastLogin: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Jane Smith",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane@worldbank.org",
    title: "Senior Program Manager",
    jobTitle: "Senior Program Manager",
    role: USER_ROLES.DEV_PARTNER_TIER_1,
    organizationId: "1",
    organisation: "World Bank",
    organization: mockOrganizations[0],
    phone: "555-5678",
    telephone: "555-5678",
    isActive: true,
    lastLogin: undefined,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Mike Johnson",
    firstName: "Mike",
    lastName: "Johnson",
    email: "mike@undp.org",
    title: "Project Coordinator",
    jobTitle: "Project Coordinator",
    role: USER_ROLES.DEV_PARTNER_TIER_2,
    organizationId: "2",
    organisation: "UNDP",
    organization: mockOrganizations[1],
    phone: "555-9012",
    telephone: "555-9012",
    isActive: true,
    lastLogin: undefined,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Sarah Williams",
    firstName: "Sarah",
    lastName: "Williams",
    email: "sarah@mof.gov",
    title: "Director of Aid Coordination",
    jobTitle: "Director of Aid Coordination",
    role: USER_ROLES.GOV_PARTNER_TIER_1,
    organizationId: "3",
    organisation: "Ministry of Finance",
    organization: mockOrganizations[2],
    phone: "555-3456",
    telephone: "555-3456",
    isActive: true,
    lastLogin: undefined,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "5",
    name: "Tom Brown",
    firstName: "Tom",
    lastName: "Brown",
    email: "tom@moe.gov",
    title: "Aid Officer",
    jobTitle: "Aid Officer",
    role: USER_ROLES.GOV_PARTNER_TIER_2,
    organizationId: "4",
    organisation: "Ministry of Education",
    organization: mockOrganizations[3],
    phone: "555-7890",
    telephone: "555-7890",
    isActive: true,
    lastLogin: undefined,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "6",
    name: "Emily Davis",
    firstName: "Emily",
    lastName: "Davis",
    email: "emily@example.com",
    title: "Consultant",
    jobTitle: "Consultant",
    role: USER_ROLES.DEV_PARTNER_TIER_2,
    organizationId: "2",
    organisation: "UNDP",
    organization: mockOrganizations[1],
    phone: "555-2345",
    telephone: "555-2345",
    isActive: true,
    lastLogin: undefined,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "7",
    name: "David Wilson",
    firstName: "David",
    lastName: "Wilson",
    email: "david@inactive.com",
    title: "Former Advisor",
    jobTitle: "Former Advisor",
    role: USER_ROLES.DEV_PARTNER_TIER_2,
    organizationId: "2",
    organisation: "UNDP",
    organization: mockOrganizations[1],
    phone: "555-6789",
    telephone: "555-6789",
    isActive: false,
    lastLogin: undefined,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString(),
  },
];

export { mockOrganizations }; 