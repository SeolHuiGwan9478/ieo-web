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

  useEffect(() => {
    let active = true
    setError(null)
    setLoading(true)
    container.current?.replaceChildren()
    loadPostcode().then((Postcode) => {
      if (!active || !container.current) return
      new Postcode({ oncomplete: (result) => { if (active) onSelect(result) }, width: '100%', height: '100%' }).embed(container.current)
      setLoading(false)
    }).catch((e: unknown) => {
      if (active) {
        setError(e instanceof Error ? e.message : '주소 검색을 불러오지 못했어요.')
        setLoading(false)
      }
    })
    const element = container.current
    return () => { active = false; element?.replaceChildren() }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-strong/40 px-4 py-12" onClick={onClose}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-label="주소 검색" className="relative w-full max-w-[500px] rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button ref={closeButton} type="button" className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink-mid shadow-sm hover:bg-canvas" aria-label="주소 검색 닫기" onClick={onClose}><Icon name="close" className="h-5 w-5" /></button>
        {loading ? <p role="status" className="absolute inset-0 flex items-center justify-center text-[13px] text-ink-sub">주소 검색을 불러오는 중이에요.</p> : null}
        {error ? <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5"><ErrorText>{error}</ErrorText><Button type="button" size="sm" variant="secondary" onClick={() => setAttempt((v) => v + 1)}>다시 시도</Button></div> : null}
        <div ref={container} className="h-[min(520px,calc(100dvh-96px))] overflow-hidden rounded-xl bg-white" />
      </div>
    </div>, document.body,
  )
}
