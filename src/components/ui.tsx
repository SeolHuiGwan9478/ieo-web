import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router'

/* ───────── 묶음 ───────── */

export function Card({ children, className = '', title, action, padded = true }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; padded?: boolean }) {
  return (
    <section className={`rounded-2xl border border-line/70 bg-white shadow-[0_1px_3px_rgba(25,31,40,0.05)] ${className}`}>
      {title !== undefined ? (
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-bold text-ink-strong">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  )
}

export function PageHeader({ title, description, action, back }: { title: ReactNode; description?: ReactNode; action?: ReactNode; back?: { to: string; label: string } }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {back ? (
          <Link to={back.to} className="mb-1 inline-flex items-center gap-1 text-[13px] text-ink-sub hover:text-ink-mid">
            <Icon name="back" className="h-3.5 w-3.5" /> {back.label}
          </Link>
        ) : null}
        <h1 className="truncate text-[24px] font-bold tracking-[-0.01em] text-ink-strong">{title}</h1>
        {description ? <p className="mt-1 text-[14px] text-ink-sub">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 gap-2">{action}</div> : null}
    </div>
  )
}

/** 숫자 타일 */
export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'blue' | 'green' | 'red' | 'yellow' }) {
  const color = tone ? { blue: 'text-status-blue', green: 'text-status-green', red: 'text-status-red', yellow: 'text-status-yellow' }[tone] : 'text-ink-strong'
  return (
    <div className="rounded-2xl border border-line/70 bg-white px-5 py-4">
      <p className="text-[13px] text-ink-sub">{label}</p>
      <p className={`mt-1 text-[24px] font-bold tabular-nums tracking-[-0.01em] ${color}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-[12px] text-ink-sub">{sub}</p> : null}
    </div>
  )
}

/* ───────── 버튼 ───────── */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  loading?: boolean
}

/** 주요 버튼은 주황(한 화면에 하나), 보조 버튼은 회색 */
export function Button({ variant = 'primary', size = 'md', loading, disabled, className = '', children, ...rest }: ButtonProps) {
  const base = 'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl font-bold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40'
  const dims = size === 'sm' ? 'h-9 px-3.5 text-[13px]' : 'h-11 px-5 text-[15px]'
  const look = {
    primary: 'bg-orange-600 text-white hover:bg-orange-700',
    secondary: 'bg-canvas text-ink-mid hover:bg-line',
    ghost: 'bg-transparent text-ink-mid hover:bg-canvas',
    danger: 'bg-status-red-bg text-status-red hover:bg-red-100',
  }[variant]
  return (
    <button className={`${base} ${dims} ${look} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
}

export function LinkButton({ to, children, variant = 'primary', className = '' }: { to: string; children: ReactNode; variant?: 'primary' | 'secondary'; className?: string }) {
  const look = variant === 'primary' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-canvas text-ink-mid hover:bg-line'
  return (
    <Link to={to} className={`inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-5 text-[15px] font-bold transition ${look} ${className}`}>
      {children}
    </Link>
  )
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />
}

/* ───────── 입력 ───────── */

const inputClass = (error?: string) =>
  `h-11 w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink-strong outline-none transition placeholder:text-ink-sub/70 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-canvas ${
    error ? 'border-status-red' : 'border-line'
  }`

function FieldFrame({ label, error, hint, className = '', children, required }: { label: string; error?: string; hint?: string; className?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-ink-mid">
        {label}
        {required ? <span className="text-orange-600">*</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-[12.5px] text-status-red">{error}</span> : null}
      {!error && hint ? <span className="mt-1 block text-[12.5px] text-ink-sub">{hint}</span> : null}
    </label>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string; required?: boolean }
export function Field({ label, error, hint, className = '', required, ...rest }: FieldProps) {
  return (
    <FieldFrame label={label} error={error} hint={hint} className={className} required={required}>
      <input className={inputClass(error)} {...rest} />
    </FieldFrame>
  )
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; hint?: string; required?: boolean; options: { value: string; label: string }[]; placeholder?: string }
export function SelectField({ label, error, hint, className = '', required, options, placeholder, ...rest }: SelectProps) {
  return (
    <FieldFrame label={label} error={error} hint={hint} className={className} required={required}>
      <select className={inputClass(error)} {...rest}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  )
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: string }
export function TextareaField({ label, error, hint, className = '', ...rest }: TextareaProps) {
  return (
    <FieldFrame label={label} error={error} hint={hint} className={className}>
      <textarea className={`${inputClass(error)} h-auto min-h-24 py-2.5`} {...rest} />
    </FieldFrame>
  )
}

/** 고를 것이 몇 개 안 될 때 드롭다운 대신 쓰는 칩. 고른 것만 주황 테두리 */
export function ChipGroup<T extends string>({ label, value, onChange, options, hint, error, required, className = '' }: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  hint?: string
  error?: string
  required?: boolean
  className?: string
}) {
  return (
    <div className={className} role="group" aria-label={label}>
      <span className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-ink-mid">
        {label}
        {required ? <span className="text-orange-600">*</span> : null}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={`h-10 rounded-xl border px-3.5 text-[14px] font-semibold transition ${
                active ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-line bg-white text-ink-mid hover:bg-canvas'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      {error ? <span className="mt-1 block text-[12.5px] text-status-red">{error}</span> : null}
      {!error && hint ? <span className="mt-1 block text-[12.5px] text-ink-sub">{hint}</span> : null}
    </div>
  )
}

/** 오류 문구 (서버 message를 그대로) */
export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p className="flex items-start gap-2 rounded-xl bg-status-red-bg px-3.5 py-2.5 text-[13.5px] text-status-red">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

/* ───────── 표시 ───────── */

export type Tone = 'blue' | 'yellow' | 'green' | 'red' | 'gray' | 'orange'

/** 꼬리표: 옅은 바탕 위에 진한 글자. 색만으로 구분하지 않고 글자를 함께 쓴다 */
export function Tag({ tone, children, dot }: { tone: Tone; children: ReactNode; dot?: boolean }) {
  const look = {
    blue: 'bg-status-blue-bg text-status-blue',
    yellow: 'bg-status-yellow-bg text-status-yellow',
    green: 'bg-status-green-bg text-status-green',
    red: 'bg-status-red-bg text-status-red',
    gray: 'bg-canvas text-ink-mid',
    orange: 'bg-orange-50 text-orange-700',
  }[tone]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-semibold ${look}`}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canvas text-ink-sub">
        <Icon name="inbox" className="h-6 w-6" />
      </div>
      <p className="text-[14px] text-ink-sub">{children}</p>
      {action}
    </div>
  )
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5 p-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-xl bg-canvas" />
      ))}
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="mb-4 flex gap-1 rounded-xl border border-line bg-canvas p-1">
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[14px] font-semibold transition ${
              active ? 'bg-white text-ink-strong shadow-[0_1px_2px_rgba(25,31,40,0.08)]' : 'text-ink-sub hover:text-ink-mid'
            }`}
          >
            {item.label}
            {item.count !== undefined ? <span className={`rounded-md px-1.5 text-[11px] ${active ? 'bg-orange-50 text-orange-700' : 'bg-white/60'}`}>{item.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

/** 표. 열 정의로 그린다 */
export function Table<T>({ columns, rows, rowKey, onRowClick, empty }: {
  columns: { key: string; header: ReactNode; cell: (row: T) => ReactNode; align?: 'left' | 'right'; width?: string }[]
  rows: T[]
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  empty?: ReactNode
}) {
  if (rows.length === 0) return <Empty>{empty ?? '아직 없어요.'}</Empty>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="border-b border-line text-left text-[12.5px] text-ink-sub">
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-2.5 font-semibold ${c.align === 'right' ? 'text-right' : ''}`} style={{ width: c.width }}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-line/60 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-orange-50/40' : ''}`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-3 align-middle ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({ page, size, total, onChange }: { page: number; size: number; total: number; onChange: (p: number) => void }) {
  const last = Math.max(0, Math.ceil(total / size) - 1)
  if (total <= size) return null
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-ink-sub">
      <span>
        전체 {total}건 · {page + 1} / {last + 1} 페이지
      </span>
      <div className="flex gap-1">
        <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => onChange(page - 1)}>
          이전
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= last} onClick={() => onChange(page + 1)}>
          다음
        </Button>
      </div>
    </div>
  )
}

export function DescList({ items, columns = 1 }: { items: { label: string; value: ReactNode }[]; columns?: 1 | 2 }) {
  return (
    <dl className={`grid gap-x-8 gap-y-3 text-[14px] ${columns === 2 ? 'sm:grid-cols-2' : ''}`}>
      {items.map((item) => (
        <div key={item.label} className="flex gap-4">
          <dt className="w-28 shrink-0 text-ink-sub">{item.label}</dt>
          <dd className="min-w-0 font-medium text-ink-strong">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** 가운데 뜨는 창. Esc로 닫힌다 */
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-strong/40 p-4" onClick={onClose}>
      <div className={`w-full ${width} rounded-2xl bg-white p-6 shadow-xl`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-sub hover:bg-canvas" aria-label="닫기">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** 잠긴 기능 안내 (PLAN-003) */
export function UpgradeNotice({ feature, needed = '프로' }: { feature: string; needed?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-orange-100 bg-orange-50/60 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
        <Icon name="lock" className="h-6 w-6" />
      </div>
      <p className="text-[16px] font-bold text-ink-strong">{feature}은(는) {needed} 플랜부터 쓸 수 있어요</p>
      <p className="text-[13.5px] text-ink-sub">설정에서 플랜을 올리면 바로 열려요. 아직 결제는 없어요.</p>
      <LinkButton to="/settings" variant="secondary">
        설정으로
      </LinkButton>
    </div>
  )
}

/* ───────── 아이콘 (선 아이콘, currentColor) ───────── */

const ICONS: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  orders: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  truck: <><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>,
  drivers: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 4.5a3.2 3.2 0 0 1 0 6.4M20.5 19a5.5 5.5 0 0 0-4-5.3" /></>,
  members: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="m15 18-6-6 6-6" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>,
  inbox: <><path d="M3 13h5l2 3h4l2-3h5" /><path d="M5 4h14l2 9v7H3v-7z" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  external: <path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />,
  pin: <><path d="M12 21s7-6.5 7-11.5a7 7 0 0 0-14 0C5 14.5 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  logout: <path d="M10 17l5-5-5-5M15 12H3M21 3v18" />,
}

export function Icon({ name, className = 'h-5 w-5' }: { name: keyof typeof ICONS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}
