import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Tag } from '../components/ui'

/** 왼쪽 메뉴 + 본문. 선택된 메뉴만 주황 */
const MENU: { to: string; label: string; soon?: boolean }[] = [
  { to: '/', label: '내 회사' },
  { to: '/orders', label: '오더', soon: true },
  { to: '/trips', label: '진행 중 운행', soon: true },
  { to: '/drivers', label: '단골 차주', soon: true },
  { to: '/members', label: '담당자', soon: true },
  { to: '/reports', label: '리포트', soon: true },
  { to: '/settings', label: '설정', soon: true },
]

export function AppLayout({ children }: { children: ReactNode }) {
  const { me, logout } = useAuth()
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-white">
        <div className="px-6 py-6">
          <img src="/ieo_wordmark_orange.svg" alt="ieo." className="h-7" />
          <p className="mt-1 text-[12px] text-ink-sub">주선사 콘솔</p>
        </div>
        <nav className="flex flex-col gap-0.5 px-3">
          {MENU.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-xl px-3 py-2.5 text-[15px] font-semibold transition ${
                  isActive ? 'bg-orange-50 text-orange-700' : 'text-ink-mid hover:bg-canvas'
                } ${item.soon ? 'pointer-events-none opacity-40' : ''}`
              }
            >
              {item.label}
              {item.soon ? <span className="text-[11px] font-normal">준비 중</span> : null}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-line px-6 py-5">
          <p className="truncate text-[14px] font-bold text-ink-strong">{me?.name}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <Tag tone="gray">{me?.positionLabel}</Tag>
            <Tag tone="orange">{me?.plan.planLabel}</Tag>
          </div>
          <button onClick={logout} className="mt-3 text-[13px] text-ink-sub hover:text-ink-mid">
            로그아웃
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-10 py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
