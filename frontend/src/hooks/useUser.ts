import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_superuser?: boolean;
}

interface UserProfile {
  permission_level: string;
}

interface UseUserReturn {
  user: User | null;
  permissions: string[];
  loading: boolean;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user/me/');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
          setPermissions(userData.permissions || []);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, permissions, loading };
}