import { useEffect, useRef, useState } from 'react'
import type { Trip } from '../api/trips'
import { formatDateTime, formatRelative } from '../lib/format'
import { loadKakaoMaps, validCoordinate, type KakaoMap, type KakaoMaps } from '../lib/kakaoMaps'

/** 위치는 서버가 공개한 마지막 좌표만 사용한다. 지도 SDK는 차량 GPS를 수집하지 않는다. */
export function TripMap({ trip }: { trip: Trip }) {
  const container = useRef<HTMLDivElement>(null)
  const fit = useRef<() => void>(() => {})
  const fitted = useRef(false)
  const [instance, setInstance] = useState<{ sdk: KakaoMaps; map: KakaoMap } | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const location = trip.locationVisible && validCoordinate(trip.location) ? trip.location : null
  const stale = location && Date.now() - new Date(location.recordedAt).getTime() > 10 * 60_000

  useEffect(() => {
    let disposed = false
    let observer: ResizeObserver | undefined
    loadKakaoMaps().then((sdk) => {
      if (disposed || !container.current) return
      const initial = [trip.dropoff, trip.pickup].find(validCoordinate)
      const map = new sdk.Map(container.current, { center: new sdk.LatLng(initial?.lat ?? 37.5665, initial?.lng ?? 126.978), level: 7 })
      observer = new ResizeObserver(() => map.relayout())
      observer.observe(container.current)
      setInstance({ sdk, map })
    }).catch((reason: unknown) => {
      if (!disposed) setError(reason instanceof Error ? reason.message : '지도를 불러오지 못했어요.')
    })
    return () => { disposed = true; observer?.disconnect() }
    // 좌표 갱신 시 지도를 새로 만들지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  useEffect(() => {
    if (!instance) return
    const { sdk, map } = instance
    const points = [
      { point: trip.pickup, label: '상차지', vehicle: false, color: '#2563EB' },
      { point: trip.dropoff, label: '하차지 · 목적지', vehicle: false, color: '#F25A22' },
      { point: location, label: `차량 · ${trip.plateNumber}`, vehicle: true, color: stale ? '#6B7280' : '#7C3AED' },
    ].filter((item) => validCoordinate(item.point))
    const bounds = new sdk.LatLngBounds()
    const overlays = points.flatMap(({ point, label, color, vehicle }, index) => {
      const position = new sdk.LatLng(point!.lat, point!.lng)
      bounds.extend(position)
      const content = document.createElement('div')
      content.textContent = label
      content.title = label
      content.style.cssText = `padding:7px 10px;border-radius:12px;background:${color};color:white;font:600 12px/1.4 sans-serif;border:2px solid white;box-shadow:0 2px 8px #0003;white-space:nowrap;transform:translateY(${vehicle ? '-24px' : '-46px'})`
      const labelOverlay = new sdk.CustomOverlay({ map, position, content, yAnchor: 1, zIndex: index + 1 })
      if (!vehicle) {
        const marker = document.createElement('div')
        marker.setAttribute('role', 'img')
        marker.setAttribute('aria-label', `${label} 위치 핀`)
        marker.style.cssText = 'width:32px;height:40px;pointer-events:none;filter:drop-shadow(0 2px 3px #0003)'
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('viewBox', '0 0 32 40')
        svg.setAttribute('width', '32')
        svg.setAttribute('height', '40')
        svg.setAttribute('aria-hidden', 'true')
        const pin = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        pin.setAttribute('d', 'M16 39C13 34 2 23 2 15a14 14 0 0 1 28 0c0 8-11 19-14 24Z')
        pin.setAttribute('fill', color)
        pin.setAttribute('stroke', 'white')
        pin.setAttribute('stroke-width', '2')
        const center = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        center.setAttribute('cx', '16')
        center.setAttribute('cy', '15')
        center.setAttribute('r', '5')
        center.setAttribute('fill', 'white')
        svg.append(pin, center)
        marker.append(svg)
        const pinOverlay = new sdk.CustomOverlay({ map, position, content: marker, yAnchor: 1, zIndex: index + 1 })
        return [labelOverlay, pinOverlay]
      }
      // 화면상 위치를 강조하는 원형 표시이며 GPS 정확도 반경을 뜻하지 않는다.
      const marker = document.createElement('div')
      marker.setAttribute('role', 'img')
      marker.setAttribute('aria-label', stale ? '차량 마지막 수신 위치' : '차량 위치')
      marker.style.cssText = `width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:${color}26;box-shadow:0 0 0 1px ${color}40;pointer-events:none`
      const dot = document.createElement('span')
      dot.style.cssText = `display:block;width:16px;height:16px;border:3px solid white;border-radius:50%;background:${color};box-shadow:0 1px 5px #0004;box-sizing:border-box`
      marker.append(dot)
      const positionOverlay = new sdk.CustomOverlay({ map, position, content: marker, yAnchor: 0.5, zIndex: 4 })
      return [labelOverlay, positionOverlay]
    })
    fit.current = () => { if (points.length) { map.relayout(); map.setBounds(bounds, 60, 80, 40, 80) } }
    if (!fitted.current && points.length) { fit.current(); fitted.current = true }
    return () => { overlays.forEach((overlay) => overlay.setMap(null)); fit.current = () => {} }
  }, [instance, trip.pickup.lat, trip.pickup.lng, trip.dropoff.lat, trip.dropoff.lng, trip.plateNumber, location?.lat, location?.lng, stale])

  return (
    <div className="mt-4 space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-line bg-canvas">
        <div ref={container} role="region" aria-label="차량 및 상하차지 지도" className="h-[300px] w-full sm:h-[360px]" />
        {!instance && !error ? <div className="absolute inset-0 flex items-center justify-center bg-canvas text-[13px] text-ink-sub" role="status">지도를 불러오는 중…</div> : null}
        {error ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas px-6 text-center text-[13px] text-ink-mid" role="alert"><p>{error}</p><button type="button" className="rounded-lg border border-line bg-white px-3 py-2 font-semibold" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>다시 시도</button></div> : null}
      </div>
      {instance ? <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-sub"><span>파랑 상차지 · 주황 하차지 · {stale ? '회색' : '보라'} 차량</span><button type="button" className="rounded-lg border border-line px-2.5 py-1.5 font-semibold text-ink-mid hover:bg-canvas" onClick={() => fit.current()}>전체 위치 보기</button></div> : null}
      {location ? <p className={`text-[12.5px] ${stale ? 'text-status-yellow' : 'text-ink-sub'}`}>마지막 수신 {formatDateTime(location.recordedAt, { seconds: true })} ({formatRelative(location.recordedAt)}){stale ? ' · 10분 이상 새 위치를 받지 못했어요.' : ''}</p> : <p className="text-[12.5px] text-ink-sub">{trip.locationVisible ? '차량 위치 수신 대기 중이에요. 상·하차지를 먼저 표시해요.' : '차량 위치는 비공개예요. 상·하차지만 표시해요.'}</p>}
      <p className="text-[12px] text-ink-sub">운행 정보는 30초마다 확인해요. 차량 위치는 앱에서 마지막으로 전송한 시점 기준이에요.</p>
    </div>
  )
}
