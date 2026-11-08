import { useState, type ReactNode } from 'react'
import { Clock, Gauge, Navigation, QrCode, ReceiptText, Truck, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal } from '@/components/ui/reveal'

/** 카드 하나의 제목과 실제 기능 설명 한 줄 */
export interface BentoText {
  title: string
  body: string
}

export interface BentoCopy {
  pleos: BentoText
  hub: BentoText
  hubNodes: { signal: string; navi: string; voice: string }
  opinet: BentoText
  opinetHead: string
  opinetUnit: string
  /** 지역별 경유가 예시 */
  opinetRows: { region: string; price: string; note?: string }[]
  /** 주선사 콘솔의 배차 요청 줄 예시 */
  broker: BentoText
  brokerRows: { route: string; driver: string }[]
  brokerAction: string
  ribbon: BentoText
  motion: BentoText
}

/**
 * 카드 여섯 장으로 이루어진 소개 묶음. 넓은 화면은 세 칸(윗줄은 가운데가 넓다), 태블릿은 두 칸, 폰은 한 칸.
 * 카드 속 그림은 칸 너비에 맞춰 줄어들어 잘리지 않는다
 */
export function BentoFeatures({ copy }: { copy: BentoCopy }) {
  // SVG 안에서 길을 따라 움직이는 애니메이션은 CSS로 끌 수 없어서, 움직임 줄이기를 켠 사람에게는 아예 넣지 않는다
  const [moving] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1.25fr_1fr]">
        <Tile delayMs={0} text={copy.pleos} titleFirst>
          {/* 격자 한가운데 칸에 Pleos 로고 */}
          <div className="relative flex h-full min-h-[150px] items-center justify-center bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:72px_72px] bg-center">
            <span className="relative flex h-[72px] w-[144px] items-center justify-center bg-background ring-1 ring-border">
              <span className="absolute inset-0 hidden border-2 border-orange-500 motion-safe:block motion-safe:animate-[ping_2.6s_cubic-bezier(0,0,0.2,1)_infinite]" aria-hidden="true" />
              <img src="/logos/pleos.svg" alt="Pleos" className="relative h-6" />
            </span>
          </div>
        </Tile>

        <Tile delayMs={80} text={copy.hub}>
          <div className="flex h-full flex-col items-center justify-center pt-7">
            <span className="flex h-14 items-center rounded-2xl bg-background px-6 ring-1 ring-border">
              <img src="/ieo_wordmark_orange.svg" alt="ieo." className="h-7" />
            </span>
            <svg viewBox="0 0 240 44" className="h-11 w-60 text-border" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M120 0v44M120 0v14a12 12 0 0 1-12 12H52a12 12 0 0 0-12 12v6M120 0v14a12 12 0 0 0 12 12h56a12 12 0 0 1 12 12v6" />
              <path className="motion-safe:animate-flow" stroke="#FF6C37" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 16" d="M120 0v44M120 0v14a12 12 0 0 1-12 12H52a12 12 0 0 0-12 12v6M120 0v14a12 12 0 0 0 12 12h56a12 12 0 0 1 12 12v6" />
            </svg>
            <div className="flex w-60 justify-between">
              <Node delayMs={0} icon={<Gauge className="h-6 w-6" />} label={copy.hubNodes.signal} />
              <Node delayMs={400} icon={<Navigation className="h-6 w-6" />} label={copy.hubNodes.navi} />
              <Node delayMs={800} icon={<Volume2 className="h-6 w-6" />} label={copy.hubNodes.voice} />
            </div>
          </div>
        </Tile>

        <Tile delayMs={160} text={copy.opinet} titleFirst wide>
          <div className="mx-5 mt-5 rounded-t-xl bg-background pb-2 text-left ring-1 ring-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <span className="h-2 w-2 rounded-full bg-status-green motion-safe:animate-pulse" aria-hidden="true" />
                {copy.opinetHead}
              </span>
              <span>{copy.opinetUnit}</span>
            </div>
            <ul className="px-4 py-1.5 text-[15px]">
              {copy.opinetRows.map((row) => (
                <li key={row.region} className="flex items-baseline justify-between py-1.5">
                  <span>{row.region}</span>
                  <span className="tabular-nums">
                    {row.note && <span className="mr-2 text-[13px] font-medium text-status-green">{row.note}</span>}
                    <b>{row.price}</b>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Tile>

      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Tile delayMs={0} text={copy.broker} titleFirst>
          <div className="mx-5 mt-5 rounded-t-xl bg-background text-left ring-1 ring-border">
            <ul className="divide-y divide-border px-4">
              {copy.brokerRows.map((row, i) => (
                <li key={row.route} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold">{row.route}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">{row.driver}</span>
                  </span>
                  {/* 첫 줄은 확정된 모습, 나머지는 확정 전 */}
                  <span className={cn('shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-bold', i === 0 ? 'bg-status-green-bg text-status-green' : 'bg-orange-600 text-white')}>{copy.brokerAction}</span>
                </li>
              ))}
            </ul>
          </div>
        </Tile>

        <Tile delayMs={80} text={copy.ribbon}>
          <div className="flex h-full min-h-[130px] items-center justify-center gap-[3%] px-5 pt-7" aria-hidden="true">
            <Chip delayMs={0} className="-rotate-12 translate-y-2 bg-status-blue-bg text-status-blue"><Truck className="h-[45%] w-[45%]" /></Chip>
            <Chip delayMs={250} className="-rotate-6 bg-status-yellow-bg text-status-yellow"><Clock className="h-[45%] w-[45%]" /></Chip>
            <Chip delayMs={500} className="bg-orange-500 text-white"><QrCode className="h-[45%] w-[45%]" /></Chip>
            <Chip delayMs={750} className="rotate-6 bg-status-green-bg text-status-green"><Volume2 className="h-[45%] w-[45%]" /></Chip>
            <Chip delayMs={1000} className="translate-y-2 rotate-12 bg-foreground text-background"><ReceiptText className="h-[45%] w-[45%]" /></Chip>
          </div>
        </Tile>

        <Tile delayMs={160} text={copy.motion} titleFirst wide>
          <div className="flex h-full min-h-[130px] items-center justify-center overflow-hidden" aria-hidden="true">
            <svg viewBox="0 0 320 130" className="w-full max-w-[320px]" fill="none">
              <path id="ieo-bento-path" d="M-10 80 C 60 20, 110 20, 150 70 S 240 130, 330 40" stroke="var(--color-ink-sub)" strokeWidth="1.5" strokeDasharray="5 6" />
              <g>
                <rect x="-22" y="-22" width="44" height="44" rx="10" fill="#FF6C37" />
                <rect x="-15" y="-3.500" width="15.500" height="7" rx="3.500" fill="#fff" />
                <circle cx="6.500" cy="0" r="3.500" fill="#fff" />
                <circle cx="14.500" cy="0" r="2.300" fill="#fff" />
                {moving ? (
                  <animateMotion dur="7s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.6 1">
                    <mpath href="#ieo-bento-path" />
                  </animateMotion>
                ) : (
                  <animateMotion dur="1ms" fill="freeze" keyPoints="0.5;0.5" keyTimes="0;1" calcMode="linear">
                    <mpath href="#ieo-bento-path" />
                  </animateMotion>
                )}
              </g>
            </svg>
          </div>
        </Tile>
      </div>
    </div>
  )
}

function Tile({ text, titleFirst = false, wide = false, delayMs, children }: { text: BentoText; titleFirst?: boolean; wide?: boolean; delayMs: number; children: ReactNode }) {
  const words = (
    <div className="px-6 text-center">
      <h3 className="text-xl font-semibold leading-snug tracking-tight [text-wrap:balance]">{text.title}</h3>
      <p className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed text-muted-foreground [text-wrap:balance]">{text.body}</p>
    </div>
  )
  // 두 칸 배치(태블릿)에서는 세 번째 카드가 한 줄을 다 쓴다
  return (
    <Reveal delayMs={delayMs} className={cn('h-full', wide && 'md:col-span-2 lg:col-span-1')}>
      <div className="flex h-full min-h-[340px] flex-col overflow-hidden rounded-3xl border border-border bg-muted">
        {titleFirst && <div className="pt-8">{words}</div>}
        <div className="min-h-0 flex-1">{children}</div>
        {!titleFirst && <div className="pb-8 pt-5">{words}</div>}
      </div>
    </Reveal>
  )
}

function Node({ icon, label, delayMs }: { icon: ReactNode; label: string; delayMs: number }) {
  return (
    <span className="flex w-20 flex-col items-center gap-1.5 text-[13px] text-muted-foreground">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background motion-safe:animate-bob" style={{ animationDelay: `${delayMs}ms` }}>{icon}</span>
      {label}
    </span>
  )
}

function Chip({ className, delayMs, children }: { className: string; delayMs: number; children: ReactNode }) {
  return (
    <span className="aspect-square w-[17%] max-w-16 motion-safe:animate-bob" style={{ animationDelay: `${delayMs}ms` }}>
      <span className={cn('flex h-full w-full items-center justify-center rounded-2xl', className)}>{children}</span>
    </span>
  )
}
