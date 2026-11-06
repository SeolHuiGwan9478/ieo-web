import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Icon, Tag } from '../components/ui'

/** 왼쪽 메뉴 + 본문. 선택된 메뉴만 주황 */
const MENU: { to: string; label: string; icon: string; end?: boolean }[] = [
  { to: '/', label: '내 회사', icon: 'home', end: true },
  { to: '/orders', label: '오더', icon: 'orders' },
  { to: '/trips', label: '진행 중 운행', icon: 'truck' },
  { to: '/drivers', label: '단골 차주', icon: 'drivers' },
  { to: '/members', label: '담당자', icon: 'members' },
  { to: '/reports', label: '리포트', icon: 'chart' },
  { to: '/settings', label: '설정', icon: 'settings' },
]

export function AppLayout({ children }: { children: ReactNode }) {
  const { me, logout } = useAuth()
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col border-r border-line bg-white">
        <div className="px-6 pb-4 pt-6">
          <img src="/ieo_wordmark_orange.svg" alt="ieo." className="h-7" />
          <p className="mt-1 text-[12px] font-medium text-ink-sub">주선사 콘솔</p>
        </div>
        <nav className="flex flex-col gap-0.5 px-3">
          {MENU.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-semibold transition ${
                  isActive ? 'bg-orange-50 text-orange-700' : 'text-ink-mid hover:bg-canvas hover:text-ink-strong'
                }`
              }
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-line px-5 py-4">
          <p className="truncate text-[14px] font-bold text-ink-strong">{me?.name}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Tag tone="gray">{me?.positionLabel}</Tag>
            <Tag tone="orange">{me?.plan.planLabel}</Tag>
          </div>
          <button onClick={logout} className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-ink-sub hover:text-ink-mid">
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
