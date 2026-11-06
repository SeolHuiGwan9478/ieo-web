import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { publicPageUrl, tripsApi, type TripStop } from '../../api/trips'
import { ApiError } from '../../api/client'
import { PROOF_STATUS, TRIP_TONE, WAIT_STATUS } from '../../api/types'
import { Card, DescList, ErrorText, Icon, Loading, PageHeader, Tag } from '../../components/ui'
import { formatDateTime, formatMinutes, formatPhone, formatRelative, formatWon } from '../../lib/format'

/** 운행 상세 (BRK-020, 021): 위치·ETA, 상하차지 도착·작업·이탈 시각, 대기 증빙, 전자인수증 */
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
              {t.location ? (
                <DescList
                  items={[
                    { label: '마지막 위치', value: <span className="tabular-nums">{t.location.lat.toFixed(5)}, {t.location.lng.toFixed(5)}</span> },
                    { label: '잰 시각', value: `${formatDateTime(t.location.recordedAt, { seconds: true })} (${formatRelative(t.location.recordedAt)})` },
                  ]}
                />
              ) : null}
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
                { label: '운임', value: `${formatWon(t.fare)} · ${t.paymentTypeLabel}` },
              ]}
            />
          </Card>
          <Card title="전자인수증">
            {t.receipt ? (
              <div className="space-y-3">
                <DescList
                  items={[
                    { label: '상태', value: <Tag tone={t.receipt.status === 'PENDING' ? 'gray' : 'green'}>{PROOF_STATUS[t.receipt.status]}</Tag> },
                    { label: '수하인', value: t.receipt.signerName ?? '-' },
                    { label: '서명 시각', value: formatDateTime(t.receipt.signedAt) },
                    { label: '종이 인수증', value: t.receipt.hasPaperPhoto ? '사진 있음' : '-' },
                    ...(t.receipt.issueNote ? [{ label: '이상 사항', value: <span className="text-status-red">{t.receipt.issueNote}</span> }] : []),
                  ]}
                />
                <ExternalLink href={publicPageUrl(t.receipt.path)}>인수증 열기</ExternalLink>
                <p className="text-[12px] text-ink-sub">링크는 {formatDateTime(t.receipt.expiresAt)}까지 열려요.</p>
              </div>
            ) : (
              <p className="text-[13.5px] text-ink-sub">수하인이 서명하거나 차주가 종이 인수증 사진을 올리면 여기 보여요.</p>
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
