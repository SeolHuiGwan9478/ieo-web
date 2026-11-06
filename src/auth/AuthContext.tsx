import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, onSessionExpired, tokens } from '../api/client'
import { brokerApi, type MyBroker } from '../api/broker'

/**
 * 로그인 상태와 내 회사.
 * - loggedIn: 토큰이 있다
 * - me: GET /api/brokers/me. 소속이 없으면(404 BROKER_404_MEMBER) null → 회사 등록 화면으로
 */
interface AuthState {
  loggedIn: boolean
  me: MyBroker | null | undefined
  loadingMe: boolean
  noCompany: boolean
  login: (access: string, refresh: string) => void
  logout: () => void
  refreshMe: () => Promise<unknown>
}

const AuthContext = createContext<AuthState | null>(null)

export const ME_QUERY_KEY = ['brokers', 'me'] as const

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(() => Boolean(tokens.access))
  const queryClient = useQueryClient()

  const meQuery = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      try {
        return await brokerApi.me()
      } catch (error) {
        if (error instanceof ApiError && error.code === 'BROKER_404_MEMBER') return null
        throw error
      }
    },
    enabled: loggedIn,
    retry: false,
  })

  const logout = useCallback(() => {
    tokens.clear()
    setLoggedIn(false)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => onSessionExpired(logout), [logout])

  const value = useMemo<AuthState>(
    () => ({
      loggedIn,
      me: meQuery.data,
      loadingMe: loggedIn && meQuery.isPending,
      noCompany: loggedIn && meQuery.data === null,
      login: (access, refresh) => {
        tokens.set(access, refresh)
        setLoggedIn(true)
      },
      logout,
      refreshMe: () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
    }),
    [loggedIn, meQuery.data, meQuery.isPending, logout, queryClient],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider 안에서만 쓸 수 있어요')
  return context
}
