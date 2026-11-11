import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Icon, Tag, type Tone } from '../components/ui'

export interface AccountMenuItem {
  to: string
  label: string
  icon: string
}

/**
 * 왼쪽 메뉴 맨 아래의 계정 단추. 이름 아래에 직책·플랜 꼬리표가 붙고, 누르면 위로 작은 창이 열려 설정과 로그아웃이 나온다.
 * 주선사 콘솔과 운영자 페이지가 같이 쓴다. 바깥을 누르거나 Esc를 누르면 닫힌다
 */
export function AccountMenu({ name, badges, items, onLogout }: { name: string; badges: { label: string; tone: Tone }[]; items: AccountMenuItem[]; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const tags = (
    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {badges.map((badge) => (
        <Tag key={badge.label} tone={badge.tone}>
          {badge.label}
        </Tag>
      ))}
    </span>
  )
  const row = 'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] font-medium text-ink-mid transition hover:bg-canvas hover:text-ink-strong'
  return (
    <div ref={root} className="relative mt-auto border-t border-line p-3">
      {open ? (
        <div role="menu" className="absolute bottom-full left-3 right-3 mb-1 overflow-hidden rounded-xl border border-line bg-white shadow-[0_8px_24px_rgba(25,31,40,0.12)]">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-[14px] font-semibold text-ink-strong">{name}</p>
            {tags}
          </div>
          {items.length > 0 ? (
            <div className="border-b border-line py-1">
              {items.map((item) => (
                <Link key={item.to} to={item.to} role="menuitem" className={row} onClick={() => setOpen(false)}>
                  <Icon name={item.icon} className="h-[17px] w-[17px]" />
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}
          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              className={row}
              onClick={() => {
                setOpen(false)
                onLogout()
              }}
            >
              <Icon name="logout" className="h-[17px] w-[17px]" />
              로그아웃
            </button>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-canvas ${open ? 'bg-canvas' : ''}`}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-ink-strong">{name}</span>
          {tags}
        </span>
        <Icon name="chevron" className={`h-4 w-4 shrink-0 text-ink-sub transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    </div>
  )
}
