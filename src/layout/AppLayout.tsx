import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/ui'
import { AccountMenu } from './AccountMenu'

/** 왼쪽 메뉴 + 본문. 선택된 메뉴만 주황. 설정(구독 플랜은 그 안의 탭)·로그아웃은 맨 아래 계정 단추(AccountMenu)에 모았다 */
const MENU: { to: string; label: string; icon: string; end?: boolean }[] = [
  { to: '/', label: '내 회사', icon: 'home', end: true },
  { to: '/orders', label: '오더', icon: 'orders' },
  { to: '/trips', label: '진행 중 운행', icon: 'truck' },
  { to: '/drivers', label: '단골 차주', icon: 'drivers' },
  { to: '/members', label: '담당자', icon: 'members' },
  { to: '/reports', label: '리포트', icon: 'chart' },
]

export function AppLayout({ children }: { children: ReactNode }) {
  const { me, logout } = useAuth()
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col border-r border-line bg-white">
        <div className="px-5 pb-3 pt-5">
          <img src="/ieo_wordmark_orange.svg" alt="ieo." className="h-6" />
          <p className="mt-1 text-[12px] text-ink-sub">주선사 콘솔</p>
        </div>
        <nav className="flex flex-col gap-0.5 px-3">
          {MENU.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] font-medium transition ${
                  isActive ? 'bg-orange-50 font-semibold text-orange-700' : 'text-ink-mid hover:bg-canvas hover:text-ink-strong'
                }`
              }
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <AccountMenu
          name={me?.name ?? ''}
          badges={me ? [{ label: me.positionLabel, tone: 'gray' }, { label: me.plan.planLabel, tone: 'orange' }] : []}
          items={[{ to: '/settings', label: '설정', icon: 'settings' }]}
          onLogout={logout}
        />
      </aside>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-8 py-7">{children}</div>
      </main>
    </div>
  )
}
