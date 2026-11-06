import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Banknote, Check, Clock, Forklift, Fuel, Home, MoveVertical, Package, Power, QrCode, ReceiptText, Settings, SkipForward, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'

const STAGE_W = 1500
const STAGE_H = 940
const OFFER_SECONDS = 15

export type ShowcaseScreen = 'login' | 'drive' | 'wait' | 'offer'
type Phase = 'off' | 'splash' | 'app'

export interface AppShowcaseProps {
  /** 꺼진 화면의 안내 문구 */
  hint: string
  /** 시작 화면의 로고 아래 문구 (앱의 splash_tagline) */
  tagline: string
  /** 화면 아래 탭 이름 */
  tabs: Record<ShowcaseScreen, string>
  offLabel: string
  /** 차량 화면 전체의 읽기용 설명 */
  label: string
}

/**
 * 차량 화면 틀 안에서 앱을 보여 준다. 시동 버튼 → 시작 화면(주황, 흰 로고) → 로그인, 그 뒤로는 탭으로 화면을 바꾼다.
 * 화면은 "이에오 화면 시안"과 앱의 로그인·시작 화면을 1500×940 크기 그대로 그리고 폭에 맞춰 축소한다.
 * 화면 속 글자는 앱 그대로 한국어이고, 숫자와 지명은 예시다
 */
export function AppShowcase({ hint, tagline, tabs, offLabel, label }: AppShowcaseProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  const [phase, setPhase] = useState<Phase>('off')
  const [screen, setScreen] = useState<ShowcaseScreen>('login')

  useEffect(() => {
    if (!frameRef.current) return
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / STAGE_W))
    observer.observe(frameRef.current)
    return () => observer.disconnect()
  }, [])

  // 시작 화면을 잠깐 보여 준 뒤 로그인 화면으로 넘어간다
  useEffect(() => {
    if (phase !== 'splash') return
    const timer = setTimeout(() => setPhase('app'), 3200)
    return () => clearTimeout(timer)
  }, [phase])

  const start = () => {
    setScreen('login')
    setPhase('splash')
  }

  return (
    <div>
      <div className="rounded-[20px] bg-foreground p-2 shadow-[0_30px_60px_-25px_rgba(25,31,40,0.5)] sm:p-3">
        <div ref={frameRef} className="relative overflow-hidden rounded-xl bg-white" style={{ height: STAGE_H * scale }}>
          <div
            role="group"
            aria-label={label}
            className="absolute left-0 top-0 origin-top-left text-left text-ink-strong [word-break:keep-all]"
            style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}
          >
            {phase === 'app' && (
              <div className="flex h-full bg-canvas motion-safe:animate-fade" aria-hidden="true">
                {screen === 'login' ? <LoginScreen tagline={tagline} /> : (
                  <>
                    <Rail />
                    <div className="relative min-w-0 flex-1 p-6">
                      {screen === 'drive' && <DriveScreen />}
                      {screen === 'wait' && <WaitScreen />}
                      {screen === 'offer' && <OfferScreen />}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 꺼진 화면: 시동 버튼 */}
            {phase === 'off' && (
              <div className="flex h-full flex-col items-center justify-center gap-10">
                {/* 자동차 시동 버튼: 어두운 테, 은색 링, 검은 홈, 밝은 회색 버튼 면 */}
                <button
                  type="button"
                  onClick={start}
                  aria-label={hint}
                  className="group flex h-[340px] w-[340px] cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(160deg,#4a4a4a,#1c1c1c)] shadow-[0_24px_40px_-12px_rgba(25,31,40,0.45)] focus-visible:outline-none focus-visible:ring-[10px] focus-visible:ring-orange-500/60"
                >
                  <span className="flex h-[292px] w-[292px] items-center justify-center rounded-full bg-[conic-gradient(from_210deg,#f4f4f4,#b9b9b9,#ececec,#a9a9a9,#f7f7f7,#bdbdbd,#f4f4f4)] shadow-[inset_0_2px_3px_rgba(255,255,255,0.9),inset_0_-3px_6px_rgba(0,0,0,0.25)]">
                    <span className="flex h-[212px] w-[212px] items-center justify-center rounded-full bg-[#1a1a1a] shadow-[inset_0_4px_10px_rgba(0,0,0,0.9)]">
                      <span className="flex h-[176px] w-[176px] flex-col items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_30%,#e2e2e2,#a8a8a8)] text-[25px] font-bold leading-[1.12] tracking-wide text-white shadow-[inset_0_2px_3px_rgba(255,255,255,0.7),inset_0_-4px_8px_rgba(0,0,0,0.25)] transition-transform duration-150 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)] group-hover:scale-[1.02] group-active:scale-[0.96]">
                        <span>ENGINE</span>
                        <span>START</span>
                        <span>STOP</span>
                      </span>
                    </span>
                  </span>
                </button>
                <p className="text-[40px] font-medium text-ink-mid">{hint}</p>
              </div>
            )}

            {/* 시작 화면: 가운데에서 주황이 퍼진다 */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-orange-500 motion-safe:transition-[clip-path] motion-safe:duration-700 motion-safe:ease-in-out"
              style={{ clipPath: `circle(${phase === 'splash' ? '150%' : '0%'} at 50% 44%)`, transitionDuration: phase === 'off' ? '0ms' : undefined }}
            >
              {phase === 'splash' && (
                <>
                  <img src="/ieo_wordmark_white.svg" alt="" className="w-[360px] motion-safe:animate-fade" style={{ animationDelay: '450ms' }} />
                  <p className="mt-12 text-[46px] font-medium tracking-wide text-white/90 motion-safe:animate-rise" style={{ animationDelay: '1300ms' }}>{tagline}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 화면 고르기 */}
      <div className="mt-4 flex min-h-11 flex-wrap items-center justify-center gap-2" role="tablist">
        {phase === 'app' && (
          <>
            {(Object.keys(tabs) as ShowcaseScreen[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={screen === key}
                onClick={() => setScreen(key)}
                className={cn('h-11 cursor-pointer rounded-full px-4 text-[15px] font-medium transition-colors motion-safe:animate-fade', screen === key ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}
              >
                {tabs[key]}
              </button>
            ))}
            <button type="button" onClick={() => setPhase('off')} aria-label={offLabel} title={offLabel} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground motion-safe:animate-fade">
              <Power className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------- 화면들 (1500×940 기준 크기) ---------- */

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-[26px] bg-white p-7', className)}>{children}</div>
}

function Pill({ tone, children }: { tone: 'blue' | 'yellow'; children: ReactNode }) {
  return (
    <span className={cn('inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[22px] font-bold', tone === 'blue' ? 'bg-status-blue-bg text-status-blue' : 'bg-status-yellow-bg text-status-yellow')}>
      {children}
    </span>
  )
}

function Rail() {
  const items = [
    { label: '홈', icon: Home, on: true },
    { label: '오더', icon: Truck },
    { label: '주유', icon: Fuel },
    { label: '장부', icon: ReceiptText },
    { label: '설정', icon: Settings },
  ]
  return (
    <div className="flex w-[112px] shrink-0 flex-col items-center gap-2.5 bg-white py-7">
      <img src="/ieo_icon_orange.svg" alt="" className="mb-[18px] h-[50px] w-[50px]" />
      {items.map(({ label, icon: Icon, on }) => (
        <div key={label} className={cn('flex h-[82px] w-[88px] flex-col items-center justify-center gap-1 rounded-[18px] text-[17px]', on ? 'bg-orange-50 font-bold text-orange-700' : 'text-ink-sub')}>
          <Icon className="h-8 w-8" />
          {label}
        </div>
      ))}
    </div>
  )
}

function LoginScreen({ tagline }: { tagline: string }) {
  return (
    <>
      <div className="flex w-[640px] shrink-0 flex-col items-center justify-center bg-orange-500">
        <img src="/ieo_wordmark_white.svg" alt="" className="w-[260px]" />
        <p className="mt-9 text-[30px] font-medium tracking-wide text-white/90">{tagline}</p>
      </div>
      <div className="flex flex-1 flex-col justify-center bg-white px-[110px]">
        <p className="text-[46px] font-bold">로그인</p>
        <p className="mt-2 text-[26px] text-ink-mid">휴대폰 번호로 로그인하세요</p>
        <div className="mt-10 flex gap-2 rounded-2xl bg-canvas p-2 text-[24px] font-medium">
          <span className="flex h-[64px] flex-1 items-center justify-center rounded-xl text-ink-mid">QR 로그인</span>
          <span className="flex h-[64px] flex-1 items-center justify-center rounded-xl bg-white font-bold">휴대폰 번호</span>
        </div>
        <div className="mt-8 rounded-2xl border-2 border-line px-6 py-4">
          <p className="text-[20px] text-ink-sub">휴대폰 번호</p>
          <p className="text-[32px] text-ink-sub">01012345678</p>
        </div>
        <div className="mt-6 flex h-[92px] items-center justify-center rounded-[20px] bg-orange-600 text-[28px] font-bold text-white">인증번호 받기</div>
      </div>
    </>
  )
}

function DriveScreen() {
  const progress = 67
  return (
    <div className="flex h-full flex-col justify-center gap-5">
      <Card>
        <Pill tone="blue"><Truck className="h-7 w-7" />하차지로 가는 중</Pill>
        <div className="mt-[22px] flex items-baseline gap-[18px]">
          <b className="text-[138px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">15:40</b>
          <span className="text-[34px] font-medium text-ink-mid">도착</span>
        </div>
        <div className="relative mt-[30px] h-[120px]">
          <span className="absolute -top-4 -translate-x-1/2 whitespace-nowrap text-[26px] font-bold text-status-blue" style={{ left: `${progress}%` }}>142km 남음</span>
          <div className="absolute inset-x-[18px] top-[54px] h-4 rounded-lg bg-[#E9ECEF]">
            <div className="h-full rounded-lg bg-status-blue" style={{ width: `${progress}%` }} />
          </div>
          <span className="absolute left-0 top-11 h-9 w-9 rounded-full bg-status-blue" />
          <span className="absolute right-0 top-11 h-9 w-9 rounded-full border-[9px] border-orange-600 bg-white" />
          <span className="absolute top-[30px] flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-status-blue text-white" style={{ left: `${progress}%` }}>
            <Truck className="h-[38px] w-[38px]" />
          </span>
        </div>
        <div className="mt-0.5 flex justify-between text-[26px] font-medium text-ink-mid"><span>평택 포승</span><b className="font-bold text-ink-strong">대구 성서</b></div>
      </Card>
      <div className="flex items-center gap-[22px] rounded-[26px] bg-status-blue-bg px-7 py-6">
        <SkipForward className="h-12 w-12 shrink-0 text-status-blue" />
        <div className="min-w-0 flex-1">
          <b className="block text-[34px] font-bold">칠곡 → 부산 강서</b>
          <span className="text-[24px] text-ink-mid">다음 배차 · 내일 06:00 상차 · 기어 P로 세우면 수락</span>
        </div>
        <div className="whitespace-nowrap text-[52px] font-extrabold text-status-blue">37<small className="ml-1.5 text-[26px] font-bold">만 원</small></div>
      </div>
    </div>
  )
}

function WaitScreen() {
  const circumference = 2 * Math.PI * 86
  const facts = [
    { icon: MoveVertical, value: '3.5m', label: '높이' },
    { icon: Forklift, value: '있음', label: '지게차' },
    { icon: Clock, value: '1:20', label: '평균 대기' },
  ]
  return (
    <div className="flex h-full gap-6">
      <Card className="flex min-w-0 flex-[1.1] flex-col items-center justify-center gap-[18px]">
        <Pill tone="yellow"><Clock className="h-7 w-7" />대기 중 · 평택 포승</Pill>
        <div className="relative h-[520px] w-[520px]">
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
            <circle cx="100" cy="100" r="86" fill="none" stroke="#E9ECEF" strokeWidth="15" />
            <circle cx="100" cy="100" r="86" fill="none" stroke="#A16207" strokeWidth="15" strokeLinecap="round" strokeDasharray={`${0.77 * circumference} ${circumference}`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <b className="text-[110px] font-extrabold leading-[1.05] tracking-[-0.02em] tabular-nums">1:32</b>
            <div className="mt-2.5 text-[28px] font-bold text-status-yellow">무료 28분 남음</div>
          </div>
        </div>
      </Card>
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <Card className="grid grid-cols-3 gap-2 px-4 py-6">
          {facts.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 text-center text-[20px] text-ink-sub">
              <Icon className="h-11 w-11 text-ink-mid" />
              <b className="text-[32px] font-extrabold text-ink-strong">{value}</b>
              {label}
            </div>
          ))}
        </Card>
        <div className="flex items-center gap-[18px] rounded-[26px] bg-status-yellow-bg px-7 py-6 text-status-yellow">
          <Banknote className="h-[46px] w-[46px] shrink-0" />
          <div className="flex-1 text-[24px] font-medium">무료 대기가 끝나면 30분마다</div>
          <b className="whitespace-nowrap text-[46px] font-extrabold">1만 원</b>
        </div>
        <div className="flex-1" />
        <div className="flex h-[92px] items-center justify-center gap-3 rounded-[20px] bg-orange-600 text-[28px] font-bold text-white"><Package className="h-[34px] w-[34px]" />상차 시작</div>
        <div className="flex h-[92px] items-center justify-center gap-3 rounded-[20px] bg-[#E9ECEF] text-[28px] font-bold text-ink-mid"><QrCode className="h-[34px] w-[34px]" />대기 증빙 보내기</div>
      </div>
    </div>
  )
}

function OfferScreen() {
  const [left, setLeft] = useState(OFFER_SECONDS)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => setLeft((n) => (n <= 1 ? OFFER_SECONDS : n - 1)), 1000)
    return () => clearInterval(timer)
  }, [])
  const circumference = 2 * Math.PI * 43
  const emptyShare = 12 // 빈 차 17km / 전체 147km

  return (
    <>
      <Card className="h-full opacity-90">
        <Pill tone="yellow">대기 중 · 대구 성서</Pill>
        <div className="mt-10 text-[110px] font-extrabold tabular-nums">0:08</div>
      </Card>
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-6">
        <div className="w-full max-w-[980px] rounded-[32px] bg-white px-[38px] py-[34px]">
          <div className="mb-6 flex items-center gap-[26px]">
            <div className="relative h-[116px] w-[116px] shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="43" fill="none" stroke="#E9ECEF" strokeWidth="11" />
                <circle cx="50" cy="50" r="43" fill="none" stroke="#F25A22" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${(left / OFFER_SECONDS) * circumference} ${circumference}`} style={{ transition: 'stroke-dasharray 1s linear' }} />
              </svg>
              <b className="absolute inset-0 flex items-center justify-center text-[44px] font-extrabold tabular-nums">{left}</b>
            </div>
            <div>
              <div className="text-[50px] font-extrabold leading-[1.2]">칠곡 → 부산 강서</div>
              <div className="mt-1 text-[25px] text-ink-mid">내일 06:00 · 5톤 윙 · ○○물류</div>
            </div>
          </div>
          <div className="flex gap-1.5 text-[24px] font-medium text-ink-mid">
            <span className="whitespace-nowrap" style={{ width: `${emptyShare}%` }}>빈 차 약 17km</span>
            <b className="ml-auto text-orange-700">짐 싣고 약 130km</b>
          </div>
          <div className="my-2 flex items-center gap-1.5">
            <div className="h-3.5 rounded-full bg-[repeating-linear-gradient(90deg,#8B95A1_0_12px,transparent_12px_22px)]" style={{ width: `${emptyShare}%` }} />
            <div className="h-3.5 flex-1 rounded-full bg-orange-600" />
          </div>
          <div className="relative flex justify-between text-[24px] text-ink-mid">
            <span>여기</span>
            <span className="absolute font-bold text-ink-strong" style={{ left: `${emptyShare}%` }}>칠곡</span>
            <span className="font-bold text-ink-strong">부산</span>
          </div>
          <div className="my-[22px] flex items-center gap-5 rounded-[22px] bg-status-green-bg px-[26px] py-[18px] text-status-green">
            <Banknote className="h-12 w-12 shrink-0" />
            <div className="flex-1 text-[24px]">운임 38만 − 기름값 0.8만</div>
            <b className="text-[66px] font-extrabold leading-none tabular-nums">37<small className="ml-1 text-[32px]">만 원</small></b>
          </div>
          <div className="grid grid-cols-[1fr_2fr] gap-3.5 text-[28px] font-bold">
            <div className="flex h-[92px] items-center justify-center gap-3 rounded-[20px] bg-[#E9ECEF] text-ink-mid"><SkipForward className="h-[34px] w-[34px]" />넘기기</div>
            <div className="flex h-[92px] items-center justify-center gap-3 rounded-[20px] bg-orange-600 text-white"><Check className="h-[34px] w-[34px]" />수락하고 배차 요청</div>
          </div>
        </div>
      </div>
    </>
  )
}
