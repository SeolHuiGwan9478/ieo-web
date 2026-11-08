import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { loadPostcode, type PostcodeResult } from '../lib/postcode'
import { Button, ErrorText, Icon } from './ui'

/** 검색 iframe은 폼 밖의 모달에 삽입한다. 선택한 주소는 호출한 상하차지에 반영한다. */
export function AddressSearch({ onSelect, onClose }: { onSelect: (result: PostcodeResult) => void; onClose: () => void }) {
  const container = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [viewportHeight, setViewportHeight] = useState(() => window.visualViewport?.height ?? window.innerHeight)
  // 검색 결과 수와 무관하게 같은 크기를 유지하고, 작은 화면에서만 높이를 제한한다.
  const searchHeight = Math.min(500, Math.max(80, viewportHeight - 112))

  useEffect(() => {
    const resize = () => setViewportHeight(window.visualViewport?.height ?? window.innerHeight)
    window.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      window.visualViewport?.removeEventListener('resize', resize)
    }
  }, [])

  useEffect(() => {
    let active = true
    let readyTimeout: number | undefined
    setError(null)
    setLoading(true)
    container.current?.replaceChildren()
    loadPostcode().then((Postcode) => {
      if (!active || !container.current) return
      readyTimeout = window.setTimeout(() => {
        if (active) { setLoading(false); setError('주소 검색 화면을 불러오지 못했어요. 다시 시도해 주세요.') }
      }, 15_000)
      new Postcode({
        oncomplete: (result) => { if (active) onSelect(result) },
        onresize: ({ height }) => {
          if (!active || !Number.isFinite(height) || height <= 0) return
          window.clearTimeout(readyTimeout)
          setLoading(false)
          setError(null)
        },
        width: '100%', height: '100%',
      }).embed(container.current)
    }).catch((e: unknown) => {
      if (active) {
        setError(e instanceof Error ? e.message : '주소 검색을 불러오지 못했어요.')
        setLoading(false)
      }
    })
    const element = container.current
    return () => { active = false; window.clearTimeout(readyTimeout); element?.replaceChildren() }
  }, [attempt, onSelect])

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return }
      if (event.key !== 'Tab') return
      const items = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), iframe, [tabindex="0"]')
      if (!items?.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
      previousFocus?.focus()
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-strong/40 p-4" onClick={onClose}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-label="주소 검색" className="w-full max-w-[536px] rounded-2xl bg-white p-3 shadow-xl sm:p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex h-8 justify-end">
          <button ref={closeButton} type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-sub hover:bg-canvas hover:text-ink-mid" aria-label="주소 검색 닫기" onClick={onClose}><Icon name="close" className="h-5 w-5" /></button>
        </div>
        <div className="relative">
          {loading ? <p role="status" className="absolute inset-0 flex items-center justify-center text-[13px] text-ink-sub">주소 검색을 불러오는 중이에요.</p> : null}
          {error ? <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5"><ErrorText>{error}</ErrorText><Button type="button" size="sm" variant="secondary" onClick={() => setAttempt((v) => v + 1)}>다시 시도</Button></div> : null}
          <div ref={container} className="overflow-hidden bg-white" style={{ height: searchHeight }} />
        </div>

      </div>
    </div>, document.body,
  )
}
