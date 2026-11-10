import { useEffect, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, Outlet, useNavigate } from 'react-router'
import { adminApi } from '../api/admin'
import { onSessionExpired, tokens } from '../api/client'
import { Button } from '../components/ui'
import { AdminLayout } from './AdminLayout'

/**
 * /admin 아래 화면의 문지기. 토큰이 없으면 운영자 로그인으로, 운영자(ADMIN) 계정이 아니면 들여보내지 않는다.
 * 토큰은 주선사 콘솔과 따로 보관된다 (client.ts ADMIN_SCOPE)
 */
export function RequireAdmin() {
  const [loggedIn, setLoggedIn] = useState(() => Boolean(tokens.access))
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  useEffect(() => onSessionExpired(() => setLoggedIn(false)), [])

  const me = useQuery({ queryKey: ['admin', 'me'], queryFn: adminApi.me, enabled: loggedIn, retry: false })

  const logout = () => {
    tokens.clear()
    queryClient.clear()
    setLoggedIn(false)
    navigate('/admin/login', { replace: true })
  }

  if (!loggedIn) return <Navigate to="/admin/login" replace />
  if (me.isPending) return <Center>불러오는 중…</Center>
  if (me.isError || me.data.role !== 'ADMIN') {
    return (
      <Center>
        <div className="text-center">
          <p className="text-[16px] font-bold text-ink-strong">운영자 계정이 아니에요.</p>
          <p className="mt-1 text-[14px] text-ink-sub">차주 서류는 이에오 운영자만 볼 수 있어요.</p>
          <Button className="mt-5" variant="secondary" onClick={logout}>
            다른 계정으로 로그인
          </Button>
        </div>
      </Center>
    )
  }
  return (
    <AdminLayout me={me.data} onLogout={logout}>
      <Outlet />
    </AdminLayout>
  )
}

function Center({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center text-[15px] text-ink-sub">{children}</div>
}
