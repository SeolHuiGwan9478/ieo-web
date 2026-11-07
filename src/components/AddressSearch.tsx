import { useEffect, useRef, useState } from 'react'
import { loadPostcode, type PostcodeResult } from '../lib/postcode'
import { Button, ErrorText } from './ui'

/** 폼 안에서도 Enter가 오더 등록으로 이어지지 않도록 검색은 iframe 안에서 진행한다. */
export function AddressSearch({ onSelect, onClose }: { onSelect: (result: PostcodeResult) => void; onClose: () => void }) {
  const container = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setError(null)
    setLoading(true)
    container.current?.replaceChildren()
    loadPostcode().then((Postcode) => {
      if (!active || !container.current) return
      new Postcode({ oncomplete: (result) => { if (active) onSelect(result) }, width: '100%', height: 420 }).embed(container.current)
      setLoading(false)
    }).catch((e: unknown) => {
      if (active) { setError(e instanceof Error ? e.message : '주소 검색을 불러오지 못했어요.'); setLoading(false) }
    })
    const element = container.current
    return () => { active = false; element?.replaceChildren() }
  }, [attempt, onSelect])

  useEffect(() => { closeButton.current?.focus() }, [])

  return (
    <section className="rounded-xl border border-line bg-canvas p-3" aria-label="주소 검색">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold">도로명·지번·건물명으로 검색</p>
        <button ref={closeButton} type="button" className="rounded-lg px-3 py-2 text-[13px] font-semibold text-ink-mid hover:bg-line" onClick={onClose}>닫기</button>
      </div>
      {loading ? <p role="status" className="py-3 text-[13px] text-ink-sub">주소 검색을 불러오는 중이에요.</p> : null}
      {error ? <div role="alert"><ErrorText>{error}</ErrorText><Button type="button" size="sm" variant="secondary" onClick={() => setAttempt((v) => v + 1)}>다시 시도</Button></div> : null}
      <div ref={container} className="overflow-hidden rounded-lg bg-white" />
    </section>
  )
}