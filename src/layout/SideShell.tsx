import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { Icon } from '../components/ui'

/**
 * 왼쪽 메뉴 + 본문 틀. 주선사 콘솔과 운영자 페이지가 같이 쓴다.
 * 넓은 화면(lg 이상)에서는 메뉴가 왼쪽에 붙어 있고, 좁은 화면에서는 위쪽 줄의 메뉴 단추를 누르면 왼쪽에서 서랍처럼 나온다.
 * 서랍은 다른 주소로 가거나 바깥·Esc를 누르면 닫힌다
 */
export function SideShell({ subtitle, sidebar, children }: { subtitle: string; sidebar: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const brand = (
    <div>
      <img src="/ieo_wordmark_orange.svg" alt="ieo." className="h-6" />
      <p className="mt-1 text-[12px] text-ink-sub">{subtitle}</p>
    </div>
  )
  return (
    <div className="min-h-screen lg:flex">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-2.5 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="-ml-1 rounded-md p-1.5 text-ink-mid hover:bg-canvas" aria-label="메뉴 열기">
          <Icon name="menu" className="h-5 w-5" />
        </button>
        <img src="/ieo_wordmark_orange.svg" alt="ieo." className="h-5" />
        <span className="text-[12px] text-ink-sub">{subtitle}</span>
      </header>
      {open ? <div className="fixed inset-0 z-40 bg-ink-strong/40 lg:hidden" onClick={() => setOpen(false)} /> : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[240px] shrink-0 flex-col border-r border-line bg-white transition-transform lg:sticky lg:top-0 lg:z-auto lg:w-[220px] lg:translate-x-0 ${
          open ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between px-5 pb-3 pt-5">
          {brand}
          <button type="button" onClick={() => setOpen(false)} className="-mr-2 rounded-md p-1 text-ink-sub hover:bg-canvas lg:hidden" aria-label="메뉴 닫기">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        {sidebar}
      </aside>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</div>
      </main>
    </div>
  )
}
