import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NavLink } from 'react-router'
import { adminApi, type AdminMe } from '../api/admin'
import { Icon } from '../components/ui'
import { AccountMenu } from '../layout/AccountMenu'
import { SideShell } from '../layout/SideShell'

/** 운영자 페이지 틀. 주선사 콘솔과 같은 생김새지만 메뉴는 차주·주선사 서류 심사와 재위탁 의심 오더다 */
export function AdminLayout({ me, onLogout, children }: { me: AdminMe; onLogout: () => void; children: ReactNode }) {
  // 심사 대기 차주·주선사 수. 목록 API가 탭과 상관없이 돌려준다. 승인·반려하면 화면이 ['admin'] 캐시를 통째로 새로 고친다
  const driverBadge = useQuery({
    queryKey: ['admin', 'driver', 'badge'],
    queryFn: () => adminApi.reviews({ status: 'PENDING', page: 0, size: 1 }),
    refetchInterval: 60_000,
  })
  const brokerBadge = useQuery({
    queryKey: ['admin', 'broker', 'badge'],
    queryFn: () => adminApi.brokerReviews({ status: 'PENDING', page: 0, size: 1 }),
    refetchInterval: 60_000,
  })
  const menu = [
    { to: '/admin/reviews', icon: 'drivers', label: '차주 서류 심사', pending: driverBadge.data?.pendingDrivers ?? 0 },
    { to: '/admin/brokers', icon: 'members', label: '주선사 서류 심사', pending: brokerBadge.data?.pendingBrokers ?? 0 },
    // 재위탁 의심은 처리 상태가 없어 숫자를 달지 않는다 (확인 뒤 제한 DSP-043은 아직 없다)
    { to: '/admin/suspected-orders', icon: 'alert', label: '재위탁 의심', pending: 0 },
  ]
  return (
    <SideShell
      subtitle="운영자"
      sidebar={
        <>
          <nav className="flex flex-col gap-0.5 px-3">
            {menu.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] font-medium transition ${
                    isActive ? 'bg-orange-50 font-semibold text-orange-700' : 'text-ink-mid hover:bg-canvas hover:text-ink-strong'
                  }`
                }
              >
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
                {item.label}
                {item.pending > 0 ? <span className="ml-auto rounded-md bg-orange-100 px-1.5 text-[11px] font-bold text-orange-700">{item.pending}</span> : null}
              </NavLink>
            ))}
          </nav>
          <AccountMenu name={me.name ?? '운영자'} badges={[{ label: '이에오 운영자', tone: 'orange' }]} items={[]} onLogout={onLogout} />
        </>
      }
    >
      {children}
    </SideShell>
  )
}
