import { TripMap } from '../../components/TripMap'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { publicPageUrl, tripsApi, type Receipt, type TripStop } from '../../api/trips'
import { ApiError } from '../../api/client'
import { TRIP_TONE, WAIT_STATUS } from '../../api/types'
import { Button, Card, DescList, ErrorText, Icon, Loading, Modal, PageHeader, Tag } from '../../components/ui'
import { formatDateTime, formatMinutes, formatPhone, formatWon } from '../../lib/format'

/** 운행 상세 (BRK-020, 021): 위치·ETA, 상하차지 도착·작업·이탈 시각, 대기 증빙, 인수증 사진 */
export function TripDetailPage() {
  const tripId = Number(useParams().tripId)
  const query = useQuery({ queryKey: ['trips', tripId], queryFn: () => tripsApi.get(tripId), refetchInterval: 30_000 })
  if (query.isPending) return <Loading rows={6} />
  if (query.isError || !query.data) return <ErrorText>{query.error instanceof ApiError ? query.error.message : '운행을 불러오지 못했어요.'}</ErrorText>
  const t = query.data
  const moving = !['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(t.status)

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {t.pickup.siteName} <span className="text-ink-sub">→</span> {t.dropoff.siteName}
            <Tag tone={TRIP_TONE[t.status]} dot>
              {t.statusLabel}
            </Tag>
          </span>
        }
        description={
          <>
            운행 #{t.id}
            {t.orderId ? (
              <>
                {' · '}
                <Link to={`/orders/${t.orderId}`} className="text-orange-700 hover:underline">
                  오더 #{t.orderId}
                </Link>
              </>
            ) : null}
            {' · '}배차 {formatDateTime(t.createdAt)}
          </>
        }
        back={{ to: '/trips', label: '진행 중 운행' }}
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          {moving ? (
            <Card title="지금 어디쯤">
              {t.etaAt ? (
                <div className="flex items-end gap-6">
                  <div>
                    <p className="text-[13px] text-ink-sub">도착 예정</p>
                    <p className="text-[26px] font-bold tabular-nums text-status-blue">{formatDateTime(t.etaAt)}</p>
                  </div>
                  {t.progressPercent !== null ? (
                    <div className="flex-1 pb-2">
                      <div className="mb-1 flex justify-between text-[12px] text-ink-sub">
                        <span>이번 구간 진행</span>
                        <span>{t.progressPercent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-canvas">
                        <div className="h-full rounded-full bg-status-blue transition-all" style={{ width: `${t.progressPercent}%` }} />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-[14px] text-ink-mid">{t.location ? '상하차지에 머물러 있거나 길 안내 중이 아니라 도착 예정 시각이 없어요.' : t.locationVisible ? '차량 앱이 아직 위치를 보내지 않았어요. 출발하면 5분마다 들어와요.' : '단골 차주가 아니라 위치는 보이지 않고, 상태와 도착 예정만 보여요.'}</p>
              )}
              <TripMap key={t.id} trip={t} />
            </Card>
          ) : null}

          <Card title="상차지">
            <StopView stop={t.pickup} />
          </Card>
          <Card title="하차지">
            <StopView stop={t.dropoff} />
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Card title="차주">
            <DescList
              items={[
                {
                  label: '이름',
                  value: (
                    <span className="flex items-center gap-2">
                      {t.driverName} {t.linkedDriver ? <Tag tone="orange">단골</Tag> : null}
                    </span>
                  ),
                },
                { label: '연락처', value: t.driverPhone ? <a href={`tel:${t.driverPhone}`} className="text-orange-700">{formatPhone(t.driverPhone)}</a> : <span className="text-ink-sub">단골에게만 보여요</span> },
                { label: '차량', value: `${t.plateNumber} · ${t.tonnageLabel}` },
                { label: '지급운임 (차주)', value: `${formatWon(t.fare)} · ${t.paymentTypeLabel}` },
                ...(t.billedFare !== null
                  ? [
                      { label: '청구운임 (화주)', value: formatWon(t.billedFare) },
                      { label: '수수료', value: `${formatWon(t.fee)} · ${t.feeRate}%` },
                    ]
                  : []),
              ]}
            />
          </Card>
          <Card title="인수증">
            {t.receipt ? (
              <ReceiptPhotos tripId={t.id} receipt={t.receipt} />
            ) : t.paymentType === 'RECEIPT' ? (
              <p className="text-[13.5px] text-ink-sub">기사님이 아직 종이 인수증을 보내지 않았어요.</p>
            ) : (
              <p className="text-[13.5px] text-ink-sub">{t.paymentTypeLabel} 운행이라 인수증이 없어요.</p>
            )}
          </Card>
          <Card title="시각">
            <DescList
              items={[
                { label: '출발', value: formatDateTime(t.startedAt) },
                { label: '완료', value: formatDateTime(t.completedAt) },
                ...(t.canceledAt ? [{ label: '취소', value: formatDateTime(t.canceledAt) }] : []),
              ]}
            />
          </Card>
        </div>
      </div>
    </>
  )
}

function StopView({ stop }: { stop: TripStop }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold text-ink-strong">{stop.siteName}</p>
        <p className="text-[13px] text-ink-sub">{stop.address}</p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-4">
        <Moment label="예정" at={stop.plannedAt} />
        <Moment label="진입" at={stop.arrivedAt} active={stop.waitStatus === 'WAITING'} />
        <Moment label="작업 시작" at={stop.workStartedAt} active={stop.waitStatus === 'WORKING'} />
        <Moment label="이탈" at={stop.departedAt} />
      </ol>
      {stop.waitStatus ? (
        <p className="text-[13px] text-ink-mid">
          {WAIT_STATUS[stop.waitStatus]}
          {stop.edited ? <span className="ml-2 text-ink-sub">(차주가 시각을 고쳤어요)</span> : null}
        </p>
      ) : null}
      {stop.waitProof ? (
        <div className="rounded-xl bg-status-yellow-bg/60 p-4">
          <p className="mb-2 text-[13px] font-bold text-status-yellow">대기 증빙</p>
          <DescList
            columns={2}
            items={[
              { label: '대기', value: formatMinutes(stop.waitProof.waitMinutes) },
              { label: '청구 대상', value: formatMinutes(stop.waitProof.chargeableWaitMinutes) },
              { label: '대기비', value: <span className="font-bold">{formatWon(stop.waitProof.chargeableAmount)}</span> },
              { label: '작업', value: formatMinutes(stop.waitProof.workMinutes) },
            ]}
          />
          <div className="mt-3 flex items-center gap-3">
            <ExternalLink href={publicPageUrl(stop.waitProof.path)}>증빙 열기 (화주에게 전달)</ExternalLink>
            <span className="text-[12px] text-ink-sub">{formatDateTime(stop.waitProof.expiresAt)}까지</span>
          </div>
        </div>
      ) : stop.workStartedAt ? (
        <p className="text-[12.5px] text-ink-sub">대기 시간·대기비는 차주가 대기 증빙 링크를 만든 뒤에 보여요.</p>
      ) : null}
    </div>
  )
}

/** 받아 온 사진. 아직 받는 중이면 undefined, 못 받았으면 null */
type LoadedPhoto = { url: string; extension: string } | null | undefined

/**
 * 차주가 보낸 종이 인수증 사진 (POD-007). 로그인 토큰이 필요한 API라 <img src>로 바로 못 열고, 받아서 blob 주소로 보여 준다.
 * 보낸 뒤에는 사진이 바뀌지 않으므로 사진 id가 같으면 다시 받지 않는다
 */
function ReceiptPhotos({ tripId, receipt }: { tripId: number; receipt: Receipt }) {
  const { photos } = receipt
  const [loaded, setLoaded] = useState<Record<number, LoadedPhoto>>({})
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const photoKey = photos.map((photo) => photo.id).join(',')

  useEffect(() => {
    let active = true
    const objectUrls: string[] = []
    for (const photo of photos) {
      tripsApi
        .receiptPhoto(photo)
        .then((blob) => {
          if (!active) return
          const url = URL.createObjectURL(blob)
          objectUrls.push(url)
          setLoaded((prev) => ({ ...prev, [photo.id]: { url, extension: blob.type === 'image/png' ? 'png' : 'jpg' } }))
        })
        .catch(() => {
          if (active) setLoaded((prev) => ({ ...prev, [photo.id]: null }))
        })
    }
    return () => {
      active = false
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey])

  const count = photos.length
  const move = useCallback((step: number) => setOpenIndex((i) => (i === null ? i : (i + step + count) % count)), [count])
  useEffect(() => {
    if (openIndex === null || count < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') move(-1)
      if (e.key === 'ArrowRight') move(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openIndex, count, move])

  const close = useCallback(() => setOpenIndex(null), [])
  const open = openIndex === null ? null : loaded[photos[openIndex].id]

  return (
    <div className="space-y-3">
      <p className="text-[13.5px] text-ink-mid">
        <span className="font-semibold text-ink-strong">{formatDateTime(receipt.sentAt)}</span> 보냄 · 사진 {count}장
      </p>
      <ul className="flex flex-wrap gap-2">
        {photos.map((photo, index) => {
          const item = loaded[photo.id]
          return (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setOpenIndex(index)}
                disabled={!item}
                aria-label={`인수증 사진 ${index + 1} 크게 보기`}
                className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-line bg-canvas text-[12px] text-ink-sub transition hover:border-orange-600 disabled:pointer-events-none"
              >
                {item ? <img src={item.url} alt={`인수증 사진 ${index + 1}`} className="h-full w-full object-cover" /> : item === null ? '못 불러옴' : '불러오는 중'}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="text-[12px] text-ink-sub">사진을 누르면 크게 볼 수 있어요.</p>

      <Modal open={openIndex !== null} onClose={close} title={`인수증 사진 ${(openIndex ?? 0) + 1} / ${count}`} width="max-w-3xl">
        {open ? (
          <>
            <div className="flex max-h-[68vh] justify-center overflow-auto rounded-xl bg-canvas">
              <img src={open.url} alt={`인수증 사진 ${(openIndex ?? 0) + 1}`} className="max-h-[68vh] object-contain" />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                {count > 1 ? (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => move(-1)}>
                      이전
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => move(1)}>
                      다음
                    </Button>
                  </>
                ) : null}
              </div>
              <div className="flex items-center gap-4">
                <ExternalLink href={open.url}>새 탭에서 열기</ExternalLink>
                <a
                  href={open.url}
                  download={`인수증_운행${tripId}_${(openIndex ?? 0) + 1}.${open.extension}`}
                  className="text-[14px] font-semibold text-orange-700 hover:underline"
                >
                  내려받기
                </a>
              </div>
            </div>
          </>
        ) : (
          <ErrorText>사진을 불러오지 못했어요.</ErrorText>
        )}
      </Modal>
    </div>
  )
}

function Moment({ label, at, active }: { label: string; at: string | null; active?: boolean }) {
  return (
    <li className={`rounded-xl px-3 py-2.5 ${active ? 'bg-status-yellow-bg' : 'bg-canvas'}`}>
      <p className="text-[11.5px] text-ink-sub">{label}</p>
      <p className={`text-[14px] font-semibold tabular-nums ${at ? 'text-ink-strong' : 'text-ink-sub'}`}>{at ? formatDateTime(at) : '아직'}</p>
    </li>
  )
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[14px] font-semibold text-orange-700 hover:underline">
      {children} <Icon name="external" className="h-3.5 w-3.5" />
    </a>
  )
}
