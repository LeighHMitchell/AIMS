import { useUser } from './useUser'

export function useAuth() {
  const { user, isLoading } = useUser()
  
  return {
    user,
    loading: isLoading,
    error: null,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  }
} 