import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

/** 흰 묶음(카드). 연회색 바탕 위에 놓는다 */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(25,31,40,0.04)] ${className}`}>{children}</section>
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
}

/** 주요 버튼은 주황(한 화면에 하나), 보조 버튼은 회색 */
export function Button({ variant = 'primary', loading, disabled, className = '', children, ...rest }: ButtonProps) {
  const base = 'inline-flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-xl px-5 text-[15px] font-bold transition disabled:opacity-50'
  const look = {
    primary: 'bg-orange-600 text-white hover:bg-orange-700',
    secondary: 'bg-canvas text-ink-mid hover:bg-line',
    danger: 'bg-status-red-bg text-status-red hover:bg-red-100',
  }[variant]
  return (
    <button className={`${base} ${look} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? '잠시만요…' : children}
    </button>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
}

export function Field({ label, error, hint, className = '', ...rest }: FieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-mid">{label}</span>
      <input
        className={`h-11 w-full rounded-xl border bg-white px-3.5 text-[15px] outline-none transition placeholder:text-ink-sub focus:border-orange-500 ${
          error ? 'border-status-red' : 'border-line'
        }`}
        {...rest}
      />
      {error ? <span className="mt-1 block text-[13px] text-status-red">{error}</span> : null}
      {!error && hint ? <span className="mt-1 block text-[13px] text-ink-sub">{hint}</span> : null}
    </label>
  )
}

/** 오류 문구 한 줄 (서버 message를 그대로) */
export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="rounded-xl bg-status-red-bg px-3.5 py-2.5 text-[14px] text-status-red">{children}</p>
}

/** 꼬리표: 옅은 바탕 위에 진한 글자. 색만으로 구분하지 않고 글자를 함께 쓴다 */
export function Tag({ tone, children }: { tone: 'blue' | 'yellow' | 'green' | 'red' | 'gray' | 'orange'; children: ReactNode }) {
  const look = {
    blue: 'bg-status-blue-bg text-status-blue',
    yellow: 'bg-status-yellow-bg text-status-yellow',
    green: 'bg-status-green-bg text-status-green',
    red: 'bg-status-red-bg text-status-red',
    gray: 'bg-canvas text-ink-mid',
    orange: 'bg-orange-50 text-orange-700',
  }[tone]
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[12px] font-semibold ${look}`}>{children}</span>
}

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h1 className="text-[22px] font-bold text-ink-strong">{children}</h1>
      {action}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-[14px] text-ink-sub">{children}</p>
}
