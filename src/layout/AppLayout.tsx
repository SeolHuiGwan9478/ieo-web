import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/ui'
import { AccountMenu } from './AccountMenu'
import { SideShell } from './SideShell'

/** 왼쪽 메뉴 + 본문(SideShell, 좁은 화면에선 서랍 메뉴). 선택된 메뉴만 주황. 설정(구독 플랜은 그 안의 탭)·로그아웃은 맨 아래 계정 단추(AccountMenu)에 모았다 */
const MENU: { to: string; label: string; icon: string; end?: boolean; badge?: string }[] = [
  { to: '/', label: '내 회사', icon: 'home', end: true },
  { to: '/orders', label: '오더', icon: 'orders' },
  { to: '/trips', label: '진행 중 운행', icon: 'truck' },
  { to: '/drivers', label: '단골 차주', icon: 'drivers' },
  { to: '/members', label: '담당자', icon: 'members' },
  { to: '/reports', label: '리포트', icon: 'chart' },
  // 에이전트는 프로 기능 (2026-11-14 시연). 베이직이면 페이지에서 플랜 안내를 보여 준다
  { to: '/agent', label: '에이전트', icon: 'agent', badge: 'PRO' },
]

export function AppLayout({ children }: { children: ReactNode }) {
  const { me, logout } = useAuth()
  return (
    <SideShell
      subtitle="주선사 콘솔"
      sidebar={
        <>
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
                {item.badge ? <span className="ml-auto rounded-md bg-orange-100 px-1.5 py-px text-[10.5px] font-extrabold text-orange-700">{item.badge}</span> : null}
              </NavLink>
            ))}
          </nav>
          <AccountMenu
            name={me?.name ?? ''}
            badges={me ? [{ label: me.positionLabel, tone: 'gray' }, { label: me.plan.planLabel, tone: 'orange' }] : []}
            items={[{ to: '/settings', label: '설정', icon: 'settings' }]}
            onLogout={logout}
          />
        </>
      }
    >
      {children}
    </SideShell>
  )
}
