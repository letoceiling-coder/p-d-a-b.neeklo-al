import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '../types'
import {
  apiLogin,
  clearAuth,
  getStoredUser,
  getToken,
  setAuth,
} from '../api/client'

interface AuthContextValue {
  user: User | null
  token: string | null
  isReady: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshFromStorage: () => void
  canManageUsers: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  const refreshFromStorage = useCallback(() => {
    setUser(getStoredUser())
    setTokenState(getToken())
  }, [])

  useEffect(() => {
    refreshFromStorage()
    setIsReady(true)
  }, [refreshFromStorage])

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password)
    setAuth(res.token, res.user)
    setTokenState(res.token)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setTokenState(null)
    setUser(null)
  }, [])

  const canManageUsers =
    user?.role === 'ADMIN' || user?.role === 'DEVELOPER'

  const value = useMemo(
    () => ({
      user,
      token,
      isReady,
      login,
      logout,
      refreshFromStorage,
      canManageUsers,
    }),
    [user, token, isReady, login, logout, refreshFromStorage, canManageUsers]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
