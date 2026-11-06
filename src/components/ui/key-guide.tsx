import { useState, type KeyboardEvent } from 'react'
import { Handshake, Navigation, QrCode, Truck } from 'lucide-react'

export interface GuideItem {
  /** 키 버튼의 읽기용 이름이자 설명서 꼬리표 */
  label: string
  title: string
  /** 순서대로 따라 하는 단계 */
  steps: string[]
}

export interface KeyGuideProps {
  title: string
  subtitle: string
  /** 키 아래 안내 문구 */
  hint: string
  /** 버튼 네 개의 설명서. 순서는 왼쪽, 위, 아래, 오른쪽 버튼 */
  items: [GuideItem, GuideItem, GuideItem, GuideItem]
}

// 버튼 모양 두 가지. 아래·오른쪽 버튼은 위·왼쪽 버튼을 키 한가운데(260,150)를 중심으로 반 바퀴 돌린 것이다
const SIDE = 'M58 108C76 78 120 62 160 60Q174 60 170 74L118 228Q113 240 100 238C62 228 38 190 42 152C44 134 50 120 58 108Z'
const LEAF = 'M214 58C270 42 340 40 384 52Q398 57 388 68C362 98 300 126 250 128C214 129 196 112 198 90C199 74 204 62 214 58Z'

const BUTTONS = [
  { shape: SIDE, flipped: false, icon: QrCode, cx: 104, cy: 150 },
  { shape: LEAF, flipped: false, icon: Truck, cx: 288, cy: 86 },
  { shape: LEAF, flipped: true, icon: Handshake, cx: 232, cy: 214 },
  { shape: SIDE, flipped: true, icon: Navigation, cx: 416, cy: 150 },
]

/**
 * 스마트키 모양의 안내. 오른쪽 키의 버튼을 누르면 왼쪽에 그 단계의 설명서가 나온다.
 * 키는 은색 타원 몸통에 비스듬히 놓인 검은 버튼 네 개로 그렸다
 */
export function KeyGuide({ title, subtitle, hint, items }: KeyGuideProps) {
  const [selected, setSelected] = useState(0)
  const [presses, setPresses] = useState(0)
  const item = items[selected]

  const press = (index: number) => {
    setSelected(index)
    setPresses((n) => n + 1)
  }

  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      {/* 왼쪽: 문구와 설명서 */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{title}</h2>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground [text-wrap:balance]">{subtitle}</p>

        <div className="mt-8 min-h-[250px] rounded-3xl border border-border bg-muted p-6 sm:p-8" aria-live="polite">
          {/* 버튼을 바꿀 때마다 설명서가 다시 떠오른다 */}
          <div key={selected} className="motion-safe:animate-rise">
            <p className="flex items-center gap-2 text-sm font-bold text-orange-700">
              <span className="tabular-nums">0{selected + 1}</span>
              <span className="h-px w-6 bg-orange-700/40" aria-hidden="true" />
              {item.label}
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight">{item.title}</h3>
            <ol className="mt-5 space-y-3">
              {item.steps.map((step, i) => (
                <li key={step} className="flex gap-3 text-[17px] leading-relaxed">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* 오른쪽: 스마트키 */}
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 560 300" className="w-full max-w-[560px] overflow-visible drop-shadow-[0_26px_30px_rgba(25,31,40,0.3)] motion-safe:animate-bob [animation-duration:5s]">
          <defs>
            <linearGradient id="ieo-key-body" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f5f6f7" />
              <stop offset="0.3" stopColor="#b4bac2" />
              <stop offset="0.55" stopColor="#e8eaed" />
              <stop offset="1" stopColor="#8a919c" />
            </linearGradient>
            <radialGradient id="ieo-key-button" cx="0.35" cy="0.25" r="0.9">
              <stop offset="0" stopColor="#40454d" />
              <stop offset="1" stopColor="#0c0e11" />
            </radialGradient>
          </defs>

          {/* 열쇠고리 끈과 몸통 */}
          <rect x="498" y="134" width="58" height="32" rx="8" fill="#17191d" />
          <circle cx="536" cy="150" r="6" fill="#8a919c" />
          <ellipse cx="260" cy="150" rx="254" ry="144" fill="url(#ieo-key-body)" />
          <ellipse cx="260" cy="150" rx="250" ry="140" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" />

          {/* 누를 때마다 깜빡이는 표시등 */}
          <circle cx="188" cy="34" r="4" fill="#5b0f0f" />
          {presses > 0 && <circle key={presses} cx="188" cy="34" r="5" fill="#ef4444" className="motion-safe:animate-[fade_0.7s_ease-out_reverse_both]" />}

          {BUTTONS.map((button, i) => {
            const Icon = button.icon
            const on = selected === i
            return (
              <g
                key={items[i].label}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={items[i].label}
                onClick={() => press(i)}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  e.preventDefault()
                  press(i)
                }}
                className="group cursor-pointer outline-none"
              >
                <path
                  d={button.shape}
                  transform={button.flipped ? 'rotate(180 260 150)' : undefined}
                  fill="url(#ieo-key-button)"
                  stroke={on ? '#FF6C37' : '#000'}
                  strokeOpacity={on ? 1 : 0.5}
                  strokeWidth={on ? 4 : 1.5}
                  className="transition-[stroke-width] group-focus-visible:stroke-orange-500 group-focus-visible:[stroke-opacity:1] group-focus-visible:[stroke-width:5px] group-active:opacity-80"
                />
                <Icon x={button.cx - 17} y={button.cy - 17} width={34} height={34} strokeWidth={1.8} color={on ? '#FF6C37' : '#e5e7eb'} aria-hidden="true" />
              </g>
            )
          })}
        </svg>
        <p className="mt-8 text-[15px] text-muted-foreground">{hint}</p>
      </div>
    </div>
  )
}
