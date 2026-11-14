import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { DEMO_THREADS, demoReplyFor, newUserMessage } from '../agent/demo'
import { AgentPartView } from '../agent/AgentParts'
import type { AgentMessage, AgentPart, AgentThread, WebSearchPart } from '../agent/types'
import { Icon, PageHeader, UpgradeNotice } from '../components/ui'
import { formatDateTime } from '../lib/format'

/** 30일 사용 한도 (시연 값). 오더·배차 건마다 받는 돈은 없고 플랜 안의 한도만 둔다 */
const MONTHLY_LIMIT = 300
const USED_DEMO = 42

const SUGGESTIONS = ['화주 카톡으로 오더 만들어 줘', '요청 온 기사님 비교해 줘', '이천→부산 건 화주 안내 이미지 만들어 줘', '다음 주 경부고속도로 공사 검색해 줘']

/**
 * 에이전트 (프로, 2026-11-14 시연). 배차 담당자가 말로 시키면 오더 초안·기사님 비교·화주 안내 문장과 이미지·웹 검색을 해 준다.
 * 실행(올리기·확정)은 늘 사람이 카드의 버튼으로 한다. 지금은 서버·LLM 없이 demo.ts의 대화로 흐름만 보여 준다
 */
export function AgentPage() {
  const { me } = useAuth()
  if (me?.plan.plan !== 'PRO') {
    return (
      <>
        <PageHeader title="에이전트" description="화주 카톡으로 오더 초안을 만들고, 요청 온 기사님을 비교해 추천해요." />
        <UpgradeNotice feature="에이전트" />
      </>
    )
  }
  return <AgentWorkspace />
}

function AgentWorkspace() {
  const [threads, setThreads] = useState<AgentThread[]>(DEMO_THREADS)
  const [activeId, setActiveId] = useState(DEMO_THREADS[0].id)
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [used, setUsed] = useState(USED_DEMO)
  const bottom = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])
  const active = threads.find((thread) => thread.id === activeId) ?? threads[0]

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [active.messages])
  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  const updateActive = (change: (messages: AgentMessage[]) => AgentMessage[]) =>
    setThreads((all) => all.map((thread) => (thread.id === active.id ? { ...thread, messages: change(thread.messages) } : thread)))

  /** 시연: 생각 → 도구 호출(부르는 중 → 끝) → 웹 검색·이미지 → 글 순서로 조각을 하나씩 흘려보낸다 */
  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || running) return
    setInput('')
    setRunning(true)
    setUsed((n) => n + 1)
    const replyId = `a${Date.now()}`
    const reply: AgentMessage = { id: replyId, role: 'assistant', at: new Date().toISOString(), parts: [] }
    if (active.messages.length === 0) {
      setThreads((all) => all.map((thread) => (thread.id === active.id ? { ...thread, title: trimmed.slice(0, 24) } : thread)))
    }
    updateActive((messages) => [...messages, newUserMessage(trimmed), reply])

    const setParts = (change: (parts: AgentPart[]) => AgentPart[]) =>
      updateActive((messages) => messages.map((m) => (m.id === replyId ? { ...m, parts: change(m.parts) } : m)))
    const later = (ms: number, run: () => void) => timers.current.push(window.setTimeout(run, ms))

    let at = 300
    demoReplyFor(trimmed).forEach((part, index) => {
      if (part.kind === 'thinking') {
        later(at, () => setParts((parts) => [...parts, { ...part, seconds: null }]))
        at += 1400
        later(at, () => setParts((parts) => parts.map((p, i) => (i === index ? part : p))))
      } else if (part.kind === 'tool' || part.kind === 'web_search') {
        later(at, () => setParts((parts) => [...parts, { ...part, status: 'running' }]))
        at += part.kind === 'web_search' ? 1500 : 700
        later(at, () => setParts((parts) => parts.map((p, i) => (i === index ? part : p))))
      } else if (part.kind === 'image') {
        later(at, () => setParts((parts) => [...parts, { ...part, status: 'generating' }]))
        at += 2200
        later(at, () => setParts((parts) => parts.map((p, i) => (i === index ? part : p))))
      } else {
        later(at, () => setParts((parts) => [...parts, part]))
      }
      at += 250
    })
    later(at, () => setRunning(false))
  }

  const newThread = () => {
    const thread: AgentThread = { id: `t${Date.now()}`, title: '새 대화', at: new Date().toISOString(), messages: [] }
    setThreads((all) => [thread, ...all])
    setActiveId(thread.id)
  }

  return (
    <>
      <PageHeader
        title="에이전트"
        description="오더 초안, 기사님 비교, 화주 안내, 웹 검색을 말로 맡겨요. 올리기·확정은 늘 버튼을 눌러야 돼요."
        action={<UsageMeter used={used} />}
      />
      <p className="mb-3 rounded-xl bg-orange-50 px-4 py-2.5 text-[13px] text-orange-700">시연용 대화예요. 실제로 오더를 올리거나 배차를 확정하지 않아요.</p>
      <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1fr)_240px]">
        <ThreadList threads={threads} activeId={active.id} onSelect={setActiveId} onNew={newThread} disabled={running} />

        <section className="flex h-[calc(100vh-230px)] min-h-[560px] flex-col rounded-2xl bg-white">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {active.messages.length === 0 ? <EmptyThread onPick={send} /> : null}
            {active.messages.map((message) => (
              <MessageView key={message.id} message={message} />
            ))}
            <div ref={bottom} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="border-t border-line p-3"
          >
            {active.messages.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" disabled={running} onClick={() => send(s)} className="rounded-full border border-line px-3 py-1 text-[12.5px] text-ink-mid hover:bg-canvas disabled:opacity-50">
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex items-end gap-2 rounded-xl border border-line bg-white px-3 py-2 focus-within:border-orange-500">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    send(input)
                  }
                }}
                rows={1}
                placeholder="무엇을 도와드릴까요? (예: 내일 대구 가는 오더 올려 줘)"
                className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-[14px] outline-none placeholder:text-ink-sub"
              />
              <button type="submit" disabled={running || !input.trim()} aria-label="보내기" className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 text-white disabled:bg-line disabled:text-ink-sub">
                <Icon name="send" className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>

        <aside className="hidden space-y-3 xl:block">
          <SideBox title="에이전트가 하는 일" items={['화주 메시지로 오더 초안 만들기', '요청 온 기사님 비교·추천', '화주 안내 문장과 이미지', '리포트 숫자 묻기, 웹 검색']} />
          <SideBox title="하지 않는 일" items={['오더 올리기·확정·취소를 혼자 하지 않아요', '화주·기사님에게 직접 보내지 않아요', '원래 볼 수 없는 연락처·위치는 안 보여요']} />
          <SideBox title="기록" items={['누가 시켰고 무엇을 실행했는지 남아요', '대화 내용은 30일 뒤 지워요']} />
        </aside>
      </div>
    </>
  )
}

function UsageMeter({ used }: { used: number }) {
  const ratio = Math.min(1, used / MONTHLY_LIMIT)
  return (
    <div className="w-44 rounded-xl bg-white px-3 py-2 text-[12.5px] text-ink-mid">
      이번 30일 <b className="tabular-nums text-ink-strong">{used}</b> / {MONTHLY_LIMIT}회
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-canvas">
        <div className="h-full rounded-full bg-orange-500" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}

function ThreadList({ threads, activeId, onSelect, onNew, disabled }: { threads: AgentThread[]; activeId: string; onSelect: (id: string) => void; onNew: () => void; disabled: boolean }) {
  return (
    <nav className="space-y-1 rounded-2xl bg-white p-2.5">
      <button type="button" onClick={onNew} disabled={disabled} className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13.5px] font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50">
        <Icon name="plus" className="h-4 w-4" />새 대화
      </button>
      {threads.map((thread) => (
        <button
          key={thread.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(thread.id)}
          className={`block w-full rounded-lg px-2.5 py-2 text-left disabled:cursor-not-allowed ${thread.id === activeId ? 'bg-canvas' : 'hover:bg-canvas/60'}`}
        >
          <span className="block truncate text-[13.5px] font-medium text-ink-strong">{thread.title}</span>
          <span className="text-[11.5px] text-ink-sub">{formatDateTime(thread.at)}</span>
        </button>
      ))}
    </nav>
  )
}

function EmptyThread({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
        <Icon name="agent" className="h-6 w-6" />
      </span>
      <p className="text-[16px] font-bold text-ink-strong">무엇을 맡길까요?</p>
      <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => onPick(s)} className="rounded-xl border border-line px-3 py-2.5 text-left text-[13px] text-ink-mid hover:border-orange-500 hover:bg-orange-50">
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageView({ message }: { message: AgentMessage }) {
  if (message.role === 'user') {
    const text = message.parts.map((p) => (p.kind === 'text' ? p.text : '')).join('')
    return (
      <div className="flex justify-end">
        <p className="max-w-[75%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-orange-600 px-4 py-2.5 text-[14px] text-white">{text}</p>
      </div>
    )
  }
  const sources = message.parts.flatMap((p) => (p.kind === 'web_search' ? p.sources : [])) as WebSearchPart['sources']
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500">
        <svg viewBox="14 47 94 26" width="22" fill="#fff" aria-hidden="true">
          <rect x="18" y="51" width="42" height="18" rx="9" />
          <circle cx="76" cy="60" r="9" />
          <circle cx="98" cy="60" r="6" />
        </svg>
      </span>
      <div className="min-w-0 flex-1 space-y-2.5">
        {message.parts.map((part, i) => (
          <AgentPartView key={i} part={part} sources={sources} />
        ))}
      </div>
    </div>
  )
}

function SideBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="mb-2 text-[13.5px] font-bold text-ink-strong">{title}</p>
      <ul className="space-y-1.5 text-[12.5px] text-ink-mid">
        {items.map((item) => (
          <li key={item} className="flex gap-1.5">
            <span className="text-orange-500">·</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
