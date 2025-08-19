// Local authentication hook for testing without Supabase
import { useState, useEffect } from 'react';
import { User } from '@/types/user';

// Mock user for local testing
const mockUser: User = {
  id: 'local-test-user',
  email: 'test@example.com',
  name: 'Test User',
  firstName: 'Test',
  lastName: 'User',
  role: 'super_user',
  organisation: 'Test Organization',
  department: 'Development',
  jobTitle: 'Test Administrator',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function useLocalAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading delay
    setTimeout(() => {
      // Check if user wants to be logged in (stored in localStorage)
      const isLoggedIn = localStorage.getItem('localAuthLoggedIn') === 'true';
      
      if (isLoggedIn) {
        // Load user data from localStorage if available
        const storedUser = localStorage.getItem('localAuthUser');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            setUser(mockUser);
          }
        } else {
          setUser(mockUser);
        }
      }
      
      setLoading(false);
    }, 500);
  }, []);

  const login = (email: string, password: string) => {
    // Simple mock login - accept any email/password for testing
    const loggedInUser = {
      ...mockUser,
      email: email,
      name: email.split('@')[0],
    };
    
    setUser(loggedInUser);
    localStorage.setItem('localAuthLoggedIn', 'true');
    localStorage.setItem('localAuthUser', JSON.stringify(loggedInUser));
    
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('localAuthLoggedIn');
    localStorage.removeItem('localAuthUser');
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    setUser(updatedUser);
    localStorage.setItem('localAuthUser', JSON.stringify(updatedUser));
  };

  return {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };
}
