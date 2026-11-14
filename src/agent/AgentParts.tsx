import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon, IeoLoader, Tag } from '../components/ui'
import { formatWon } from '../lib/format'
import type {
  AgentPart,
  DriverComparePart,
  ImagePart,
  MessageDraftPart,
  OrderDraftPart,
  TextPart,
  ThinkingPart,
  ToolCallPart,
  WebSearchPart,
} from './types'

/**
 * 에이전트 메시지 조각 그리기 (2026-11-14). 생각·도구 호출·웹 검색·이미지 생성·초안 카드·글.
 * 초안 카드의 버튼은 사람이 눌러야 실행된다. 지금은 시연이라 실제로 올리거나 확정하지 않는다
 */
export function AgentPartView({ part, sources }: { part: AgentPart; sources: WebSearchPart['sources'] }) {
  switch (part.kind) {
    case 'thinking':
      return <ThinkingBlock part={part} />
    case 'tool':
      return <ToolCallCard part={part} />
    case 'web_search':
      return <WebSearchCard part={part} />
    case 'image':
      return <ImageCard part={part} />
    case 'order_draft':
      return <OrderDraftCard part={part} />
    case 'driver_compare':
      return <DriverCompareCard part={part} />
    case 'message_draft':
      return <MessageDraftCard part={part} />
    case 'text':
      return <TextBlock part={part} sources={sources} />
  }
}

/* ───────── 생각 ───────── */

export function ThinkingBlock({ part }: { part: ThinkingPart }) {
  const live = part.seconds == null
  const [open, setOpen] = useState(false)
  const expanded = open || live
  return (
    <div className="text-[13px]">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 text-ink-sub hover:text-ink-mid" disabled={live}>
        {live ? <IeoLoader width={26} className="text-orange-500" /> : <Icon name="spark" className="h-4 w-4" />}
        <span className="font-semibold">{live ? '생각하는 중…' : `${part.seconds}초 동안 생각했어요`}</span>
        {live ? null : <Icon name="chevron" className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`} />}
      </button>
      {expanded ? (
        <ol className="mt-2 space-y-1 border-l-2 border-line pl-3 text-ink-mid">
          {part.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}

/* ───────── 도구 호출 ───────── */

function StatusMark({ status }: { status: ToolCallPart['status'] }) {
  if (status === 'running') return <IeoLoader width={26} className="text-orange-500" />
  if (status === 'error') return <span className="flex h-5 w-5 items-center justify-center rounded-full bg-status-red-bg text-status-red"><Icon name="close" className="h-3 w-3" /></span>
  return <span className="flex h-5 w-5 items-center justify-center rounded-full bg-status-green-bg text-status-green"><Icon name="check" className="h-3 w-3" /></span>
}

export function ToolCallCard({ part }: { part: ToolCallPart }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-line bg-white">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-canvas text-ink-mid"><Icon name="tool" className="h-3.5 w-3.5" /></span>
        <span className="min-w-0 flex-1">
          <span className="text-[13px] font-semibold text-ink-strong">{part.label}</span>
          <span className="ml-2 font-mono text-[11.5px] text-ink-sub">{part.name}</span>
          {part.summary && part.status === 'done' ? <span className="block truncate text-[12.5px] text-ink-mid">{part.summary}</span> : null}
          {part.status === 'running' ? <span className="block text-[12.5px] text-ink-sub">부르는 중…</span> : null}
        </span>
        {part.ms != null && part.status === 'done' ? <span className="text-[11.5px] tabular-nums text-ink-sub">{part.ms}ms</span> : null}
        <StatusMark status={part.status} />
        <Icon name="chevron" className={`h-3.5 w-3.5 text-ink-sub transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="grid gap-2 border-t border-line px-3 py-2.5 md:grid-cols-2">
          <JsonBox title="보낸 값" value={part.args} />
          <JsonBox title="받은 값" value={part.status === 'done' ? part.result : '아직 없어요'} />
        </div>
      ) : null}
    </div>
  )
}

function JsonBox({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[11.5px] font-semibold text-ink-sub">{title}</p>
      <pre className="max-h-48 overflow-auto rounded-lg bg-canvas p-2.5 font-mono text-[11.5px] leading-relaxed text-ink-mid">{JSON.stringify(value, null, 2)}</pre>
    </div>
  )
}

/* ───────── 웹 검색 ───────── */

export function WebSearchCard({ part }: { part: WebSearchPart }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-status-blue-bg text-status-blue"><Icon name="globe" className="h-3.5 w-3.5" /></span>
        <span className="font-semibold text-ink-strong">웹 검색</span>
        <span className="min-w-0 flex-1 truncate text-ink-mid">“{part.query}”</span>
        {part.status === 'running' ? <IeoLoader width={26} className="text-orange-500" /> : <span className="text-[12px] text-ink-sub">출처 {part.sources.length}곳</span>}
      </div>
      {part.status === 'done' ? (
        <ol className="mt-2.5 grid gap-2 md:grid-cols-3">
          {part.sources.map((source, i) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer" className="block h-full rounded-lg bg-canvas p-2.5 hover:bg-orange-50">
                <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[11.5px] text-ink-sub">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-white text-[10px] font-bold text-ink-mid">{i + 1}</span>
                  <span className="truncate">{source.site}</span>
                  {source.date ? <span className="shrink-0">· {source.date}</span> : null}
                </span>
                <span className="mt-1 block text-[13px] font-semibold leading-snug text-ink-strong">{source.title}</span>
                <span className="mt-0.5 line-clamp-2 block text-[12px] text-ink-mid">{source.snippet}</span>
              </a>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}

/* ───────── 이미지 생성 ───────── */

export function ImageCard({ part }: { part: ImagePart }) {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-xl border border-line bg-white">
      {part.status === 'generating' || !part.src ? (
        <div className="flex aspect-square flex-col items-center justify-center gap-3 bg-[linear-gradient(110deg,#FFF3EE,45%,#FFE2D6,55%,#FFF3EE)] bg-[length:200%_100%] [animation:agent-shimmer_1.6s_linear_infinite]">
          <IeoLoader width={72} className="text-orange-500" />
          <span className="text-[13px] font-semibold text-orange-700">이미지 만드는 중…</span>
        </div>
      ) : (
        <img src={part.src} alt={part.prompt} className="block aspect-square w-full object-cover" />
      )}
      <div className="flex items-start gap-2 p-3">
        <Icon name="image" className="mt-0.5 h-4 w-4 shrink-0 text-ink-sub" />
        <p className="min-w-0 flex-1 text-[12.5px] text-ink-mid">{part.prompt}</p>
        {part.status === 'done' && part.src ? (
          <a href={part.src} download="ieo-안내.svg" className="shrink-0 text-[12.5px] font-semibold text-orange-700 hover:underline">
            내려받기
          </a>
        ) : null}
      </div>
      <p className="border-t border-line px-3 py-1.5 text-[11.5px] text-ink-sub">{part.size} · 시연용으로 만든 그림이에요</p>
    </div>
  )
}

/* ───────── 초안 카드 ───────── */

function DraftShell({ title, tag, children, actions }: { title: string; tag: ReactNode; children: ReactNode; actions: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[14px] font-bold text-ink-strong">{title}</p>
        {tag}
      </div>
      {children}
      <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
    </div>
  )
}

function DemoAction({ children, primary, done }: { children: ReactNode; primary?: boolean; done: string }) {
  const [clicked, setClicked] = useState(false)
  if (clicked) return <span className="rounded-lg bg-status-yellow-bg px-3 py-1.5 text-[12.5px] font-semibold text-status-yellow">{done}</span>
  return (
    <button
      type="button"
      onClick={() => setClicked(true)}
      className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ${primary ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-canvas text-ink-strong hover:bg-line'}`}
    >
      {children}
    </button>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-sub">{label}</dt>
      <dd className="text-ink-strong">{children}</dd>
    </>
  )
}

export function OrderDraftCard({ part }: { part: OrderDraftPart }) {
  const gap = part.routeAverage ? part.fare - part.routeAverage : 0
  return (
    <DraftShell
      title="오더 초안"
      tag={<Tag tone="orange">아직 안 올림</Tag>}
      actions={
        <>
          <DemoAction primary done="시연이라 실제로 올리지 않았어요">마켓에 올리기</DemoAction>
          {part.regularDriver ? <DemoAction done="시연이라 실제로 보내지 않았어요">단골 {part.regularDriver} 기사님에게만</DemoAction> : null}
          <Link to="/orders/new" className="rounded-lg bg-canvas px-3 py-1.5 text-[13px] font-semibold text-ink-strong hover:bg-line">
            고쳐서 올리기
          </Link>
        </>
      }
    >
      <dl className="grid grid-cols-[84px_1fr] gap-x-3 gap-y-1 text-[13px]">
        <Row label="상차">{part.pickup} · {part.pickupWindow}</Row>
        <Row label="하차">{part.dropoff} · {part.dropoffBy}</Row>
        <Row label="화물">{part.cargo}</Row>
        <Row label="차량">{part.vehicle}</Row>
        <Row label="운임">
          <b>{formatWon(part.fare)}</b> · {part.payment}
        </Row>
        {part.routeAverage ? (
          <Row label="노선 평균">
            {formatWon(part.routeAverage)}{' '}
            <span className={gap < 0 ? 'text-status-yellow' : 'text-status-green'}>({gap < 0 ? '' : '+'}{formatWon(gap)})</span>
          </Row>
        ) : null}
      </dl>
    </DraftShell>
  )
}

export function DriverCompareCard({ part }: { part: DriverComparePart }) {
  const best = part.candidates.find((c) => c.recommended)
  return (
    <DraftShell
      title="기사님 비교"
      tag={<span className="text-[12px] text-ink-sub">{part.orderLabel}</span>}
      actions={
        <>
          {best ? <DemoAction primary done="시연이라 실제로 확정하지 않았어요">{best.name} 기사님으로 확정</DemoAction> : null}
          <Link to="/orders" className="rounded-lg bg-canvas px-3 py-1.5 text-[13px] font-semibold text-ink-strong hover:bg-line">
            요청 목록 보기
          </Link>
        </>
      }
    >
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[12px] text-ink-sub">
            <th className="py-1 font-semibold">기사님</th>
            <th className="py-1 font-semibold">상차지까지</th>
            <th className="py-1 font-semibold">완료</th>
            <th className="py-1 font-semibold">늦은 취소</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {part.candidates.map((c) => (
            <tr key={c.name} className={`border-t border-line ${c.recommended ? 'bg-orange-50/70' : ''}`}>
              <td className="py-1.5">
                {c.name} <Tag tone={c.tag === '단골' ? 'orange' : 'blue'}>{c.tag}</Tag>
              </td>
              <td className="tabular-nums">{c.distanceKm}km</td>
              <td className="tabular-nums">{c.completed}건</td>
              <td className={`tabular-nums ${c.lateCancels > 0 ? 'text-status-red' : ''}`}>{c.lateCancels}</td>
              <td className="text-right">{c.recommended ? <Tag tone="green">추천</Tag> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DraftShell>
  )
}

export function MessageDraftCard({ part }: { part: MessageDraftPart }) {
  const [copied, setCopied] = useState(false)
  return (
    <DraftShell
      title={`${part.to}에게 보낼 문장`}
      tag={<Tag tone="yellow">복사해서 보내세요</Tag>}
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(part.text)
              setCopied(true)
            }}
            className="rounded-lg bg-orange-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-orange-700"
          >
            {copied ? '복사했어요' : '복사'}
          </button>
          {part.tripId ? (
            <Link to={`/trips/${part.tripId}`} className="rounded-lg bg-canvas px-3 py-1.5 text-[13px] font-semibold text-ink-strong hover:bg-line">
              운행 상세 열기
            </Link>
          ) : null}
        </>
      }
    >
      <p className="rounded-lg bg-canvas p-3 text-[13.5px] leading-relaxed text-ink-strong">{part.text}</p>
    </DraftShell>
  )
}

/* ───────── 글 (웹 검색 출처 번호) ───────── */

export function TextBlock({ part, sources }: { part: TextPart; sources: WebSearchPart['sources'] }) {
  const pieces = part.text.split(/(\[\d+\])/g)
  return (
    <p className="text-[14px] leading-relaxed text-ink-strong">
      {pieces.map((piece, i) => {
        const match = piece.match(/^\[(\d+)\]$/)
        if (!match) return <span key={i}>{piece}</span>
        const source = sources[Number(match[1]) - 1]
        return (
          <a
            key={i}
            href={source?.url}
            target="_blank"
            rel="noreferrer"
            title={source?.title}
            className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-status-blue-bg px-1 align-text-top text-[10.5px] font-bold text-status-blue"
          >
            {match[1]}
          </a>
        )
      })}
    </p>
  )
}
