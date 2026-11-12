import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

/** 로그인 화면 왼쪽에서 돌아가는 콘솔 장면. 숫자와 지명은 예시다 */
export const SCENES = [
  { label: '오더를 올리고 배차 요청을 확정해요', caption: '배차 요청' },
  { label: '운행 현황과 도착 예정을 전화 없이 봐요', caption: '운행 현황' },
  { label: '대기 증빙과 인수증 사진을 한곳에서 받아요', caption: '증빙·인수증' },
] as const

const INTERVAL_MS = 4200

export function LoginShowcase() {
  const [scene, setScene] = useState(0)
  // 한 장면 안에서 일어나는 동작(확정, 진행, 서명)의 단계
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => setScene((s) => (s + 1) % SCENES.length), INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setTick(0)
    const t1 = setTimeout(() => setTick(1), 1300)
    const t2 = setTimeout(() => setTick(2), 2500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [scene])

  return (
    <div>
      {/* 장면 카드 */}
      <div key={scene} className="rounded-2xl bg-white p-4 text-ink-strong shadow-[0_24px_40px_-20px_rgba(90,25,0,0.6)] motion-safe:animate-rise" aria-hidden="true">
        <p className="mb-3 flex items-center justify-between text-[12px] text-ink-sub">
          <span className="font-bold text-ink-mid">{SCENES[scene].caption}</span>
          <span className="tabular-nums">{scene + 1} / {SCENES.length}</span>
        </p>
        {scene === 0 && <DispatchScene tick={tick} />}
        {scene === 1 && <TripsScene tick={tick} />}
        {scene === 2 && <ProofScene tick={tick} />}
      </div>

      {/* 설명 줄. 누르면 그 장면으로 */}
      <ul className="mt-8 space-y-2.5 text-[16px]">
        {SCENES.map((entry, i) => (
          <li key={entry.caption}>
            <button
              type="button"
              onClick={() => setScene(i)}
              aria-current={scene === i}
              className={`flex w-full cursor-pointer items-start gap-3 text-left transition-colors ${scene === i ? 'text-white' : 'text-white/60 hover:text-white/85'}`}
            >
              <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full transition-all ${scene === i ? 'w-4 bg-white' : 'bg-white/60'}`} aria-hidden="true" />
              {entry.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const ROWS = [
  { route: '평택 포승 → 대전 유성', driver: '김○○ · 5톤 카고' },
  { route: '안산 반월 → 청주 오창', driver: '이○○ · 5톤 윙' },
  { route: '인천 남동 → 부산 강서', driver: '박○○ · 11톤 카고' },
]

/** 들어온 배차 요청을 확정하는 장면: 첫 줄이 '확정' → '확정됨'으로 바뀐다 */
function DispatchScene({ tick }: { tick: number }) {
  return (
    <ul className="divide-y divide-line">
      {ROWS.map((row, i) => {
        const done = i === 0 && tick >= 1
        return (
          <li key={row.route} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-bold">{row.route}</span>
              <span className="block text-[12px] text-ink-sub">{row.driver}</span>
            </span>
            <span className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition-colors ${done ? 'bg-status-green-bg text-status-green' : 'bg-orange-600 text-white'}`}>
              {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              {done ? '확정됨' : '확정'}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** 운행 현황 장면: 진행 막대가 늘어나고 도착 예정이 보인다 */
function TripsScene({ tick }: { tick: number }) {
  const trips = [
    { route: '인천 → 평택', status: '운행 중', tone: 'bg-status-blue-bg text-status-blue', eta: '14:20 도착', progress: tick >= 1 ? 76 : 58 },
    { route: '평택 → 대구', status: '대기 중', tone: 'bg-status-yellow-bg text-status-yellow', eta: '상차 대기 42분', progress: 100 },
  ]
  return (
    <ul className="space-y-3">
      {trips.map((trip) => (
        <li key={trip.route} className="rounded-xl bg-canvas p-3">
          <div className="flex items-center justify-between text-[14px]">
            <span className="font-bold">{trip.route}</span>
            <span className={`rounded-md px-2 py-0.5 text-[12px] font-bold ${trip.tone}`}>{trip.status}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-status-blue transition-[width] duration-1000 ease-out" style={{ width: `${trip.progress}%` }} />
          </div>
          <p className="mt-1.5 text-[12px] text-ink-sub">{trip.eta}</p>
        </li>
      ))}
    </ul>
  )
}

/** 대기 증빙과 인수증 장면: 기사님이 찍은 종이 인수증 사진이 들어온다 */
function ProofScene({ tick }: { tick: number }) {
  const arrived = tick >= 2
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-status-yellow-bg p-3 text-status-yellow">
        <p className="text-[12px] font-bold">대기 증빙 · 평택 포승</p>
        <p className="mt-1 flex items-baseline justify-between">
          <span className="text-[14px]">대기 1시간 42분</span>
          <span className="text-[18px] font-extrabold">대기비 30,000원</span>
        </p>
      </div>
      <div className={`flex items-center justify-between rounded-xl p-3 transition-colors ${arrived ? 'bg-status-green-bg' : 'bg-canvas'}`}>
        <div>
          <p className="text-[12px] font-bold text-ink-mid">인수증 · 대전 유성</p>
          <p className={`mt-0.5 text-[14px] font-bold ${arrived ? 'text-status-green' : 'text-ink-sub'}`}>{arrived ? '사진 2장 도착' : tick >= 1 ? '기사님이 사진 보내는 중…' : '하차 완료'}</p>
        </div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${arrived ? 'bg-status-green text-white' : 'bg-white text-ink-sub'}`}>
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      </div>
    </div>
  )
}
