import { Globe } from 'lucide-react'
import { Link } from 'react-router'

export interface NavItem {
  label: string
  href: string
}

export interface NavBarProps {
  /** 로고를 누르면 가는 곳 */
  homeTo: string
  /** 로고 옆에 놓이는 메뉴 */
  items: NavItem[]
  /** 지금 보고 있는 언어 표시 (예: KO). 누르면 languageTo로 가서 다른 언어로 바뀐다 */
  language: string
  languageTo: string
  /** 언어 전환 버튼의 읽기용 이름 (예: View in English) */
  languageLabel: string
  loginLabel: string
  loginTo: string
  downloadLabel: string
  downloadHref: string
}

/** 소개 페이지 상단 바: 왼쪽에 로고와 메뉴, 오른쪽에 언어·로그인·다운로드 */
export function NavBar({ homeTo, items, language, languageTo, languageLabel, loginLabel, loginTo, downloadLabel, downloadHref }: NavBarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background motion-safe:animate-drop">
      <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-8">
        <div className="flex items-center gap-8">
          <Link to={homeTo} aria-label="ieo.">
            <img src="/ieo_wordmark_orange.svg" alt="" className="h-7" />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-foreground md:flex">
            {items.map((item) => (
              <a key={item.label} href={item.href} className="transition-colors hover:text-muted-foreground">
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium sm:gap-3">
          <Link to={languageTo} aria-label={languageLabel} title={languageLabel} className="flex items-center gap-1.5 rounded-full px-2 py-2 text-muted-foreground transition-colors hover:text-foreground sm:mr-1 sm:gap-2">
            <Globe className="h-4 w-4" aria-hidden="true" />
            {language}
          </Link>
          <Link to={loginTo} className="rounded-full border border-border px-4 py-2 text-foreground transition-colors hover:bg-accent">
            {loginLabel}
          </Link>
          <a href={downloadHref} className="rounded-full bg-foreground px-4 py-2 text-background transition-opacity hover:opacity-90">
            {downloadLabel}
          </a>
        </div>
      </div>
    </header>
  )
}
