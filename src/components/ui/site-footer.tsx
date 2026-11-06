export interface FooterColumn {
  title: string
  links: { label: string; href: string }[]
}

/** 페이지 맨 아래 푸터: 왼쪽에 로고와 한 줄 소개, 오른쪽에 링크 묶음, 그 아래 저작권 줄 */
export function SiteFooter({ description, menuLabel, columns, copyright }: { description: string; menuLabel: string; columns: FooterColumn[]; copyright: string }) {
  return (
    <footer className="bg-foreground px-4 py-14 text-background [word-break:keep-all] sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <img src="/ieo_wordmark_white.svg" alt="ieo." className="h-8" />
          <p className="mt-4 text-sm leading-relaxed text-[#C5CCD6]">{description}</p>
        </div>
        <nav className="grid grid-cols-2 gap-10 sm:grid-cols-3" aria-label={menuLabel}>
          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-bold">{column.title}</p>
              <ul className="mt-4 space-y-3 text-sm text-[#C5CCD6]">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="transition-colors hover:text-background">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <p className="mx-auto mt-12 max-w-6xl border-t border-white/15 pt-6 text-xs text-[#C5CCD6]">{copyright}</p>
    </footer>
  )
}
