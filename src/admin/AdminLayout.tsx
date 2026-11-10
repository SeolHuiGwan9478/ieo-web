import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NavLink } from 'react-router'
import { adminApi, type AdminMe } from '../api/admin'
import { Icon, Tag } from '../components/ui'

/** 운영자 페이지 틀. 주선사 콘솔과 같은 생김새지만 메뉴는 차주·주선사 서류 심사뿐이다 */
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
  ]
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col border-r border-line bg-white">
        <div className="px-6 pb-4 pt-6">
          <img src="/ieo_wordmark_orange.svg" alt="ieo." className="h-7" />
          <p className="mt-1 text-[12px] font-medium text-ink-sub">운영자</p>
        </div>
        <nav className="flex flex-col gap-0.5 px-3">
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-semibold transition ${
                  isActive ? 'bg-orange-50 text-orange-700' : 'text-ink-mid hover:bg-canvas hover:text-ink-strong'
                }`
              }
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
              {item.pending > 0 ? <span className="ml-auto rounded-md bg-orange-100 px-1.5 text-[11px] font-bold text-orange-700">{item.pending}</span> : null}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-line px-5 py-4">
          <p className="truncate text-[14px] font-bold text-ink-strong">{me.name ?? '운영자'}</p>
          <div className="mt-1.5">
            <Tag tone="orange">이에오 운영자</Tag>
          </div>
          <button onClick={onLogout} className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-ink-sub hover:text-ink-mid">
            <Icon name="logout" className="h-3.5 w-3.5" /> 로그아웃
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-10 py-8">{children}</div>
      </main>
    </div>
  )
}
