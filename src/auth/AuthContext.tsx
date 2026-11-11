import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ADMIN_SCOPE, ApiError, onSessionExpired, tokens } from '../api/client'
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
  /** 내 회사를 읽지 못한 이유 (예: 회사에서 나온 계정). 화면이 빈 목록 대신 이 문구를 보여 준다 */
  meError: string | null
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
    // 운영자 페이지(/admin)는 주선사 회사가 없으므로 부르지 않는다
    enabled: loggedIn && !ADMIN_SCOPE,
    retry: false,
    // 회사 서류가 승인되면(운영자가 처리) 새로고침 없이 오더 등록이 열리도록, 미인증 동안은 1분마다·창을 다시 볼 때 다시 읽는다
    refetchOnWindowFocus: true,
    refetchInterval: (query) => (query.state.data && !query.state.data.verified ? 60_000 : false),
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
      meError: loggedIn && meQuery.isError ? meQuery.error.message : null,
      noCompany: loggedIn && meQuery.data === null,
      login: (access, refresh) => {
        tokens.set(access, refresh)
        setLoggedIn(true)
      },
      logout,
      refreshMe: () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
    }),
    [loggedIn, meQuery.data, meQuery.isPending, meQuery.isError, meQuery.error, logout, queryClient],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider 안에서만 쓸 수 있어요')
  return context
}
