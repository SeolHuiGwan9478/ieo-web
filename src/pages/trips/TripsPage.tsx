import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { tripsApi, type Trip, type TripTab } from '../../api/trips'
import { TRIP_TONE, WAIT_STATUS } from '../../api/types'
import { Card, PageHeader, ListTable, LIST_PAGE_SIZE, Tabs, Tag } from '../../components/ui'
import { formatDateTime, formatRelative } from '../../lib/format'

const SIZE = LIST_PAGE_SIZE

/** 진행 중 운행 (BRK-020). 위치·ETA는 30초마다 새로 받는다 */
export function TripsPage() {
  const [tab, setTab] = useState<TripTab>('IN_PROGRESS')
  const [page, setPage] = useState(0)
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['trips', { tab, page, size: SIZE }],
    queryFn: () => tripsApi.list({ tab, page, size: SIZE }),
    placeholderData: keepPreviousData,
    refetchInterval: tab === 'IN_PROGRESS' ? 30_000 : false,
  })

  return (
    <>
      <PageHeader title="진행 중 운행" description="위치는 단골 차주만, 도착 예정은 기사님이 공유에 동의했으면 보여요." />
      <Tabs<TripTab>
        value={tab}
        onChange={(v) => {
          setTab(v)
          setPage(0)
        }}
        items={[
          { value: 'IN_PROGRESS', label: '진행 중' },
          { value: 'SCHEDULED', label: '출발 전' },
          { value: 'FINISHED', label: '끝난 운행' },
        ]}
      />
      <Card padded={false}>
        <ListTable
              loading={query.isPending}
              pagination={query.data ? { page: query.data.page, size: query.data.size, total: query.data.totalCount, onChange: setPage } : undefined}
              rows={query.data?.items ?? []}
              rowKey={(t) => t.id}
              onRowClick={(t) => navigate(`/trips/${t.id}`)}
              empty={tab === 'IN_PROGRESS' ? '진행 중인 운행이 없어요. 배차를 확정하면 차주가 출발할 때 여기 보여요.' : '해당하는 운행이 없어요.'}
              columns={[
                {
                  key: 'route',
                  header: '구간',
                  cell: (t) => (
                    <div>
                      <p className="font-semibold">
                        {t.pickup.siteName} <span className="text-ink-sub">→</span> {t.dropoff.siteName}
                      </p>
                      <p className="text-[12.5px] text-ink-sub">상차 예정 {formatDateTime(t.pickup.plannedAt)}</p>
                    </div>
                  ),
                },
                {
                  key: 'driver',
                  header: '차주',
                  cell: (t) => (
                    <div>
                      <p className="font-semibold">
                        {t.driverName} {t.linkedDriver ? <Tag tone="orange">단골</Tag> : null}
                      </p>
                      <p className="text-[12.5px] text-ink-sub">
                        {t.plateNumber} · {t.tonnageLabel}
                      </p>
                    </div>
                  ),
                },
                { key: 'status', header: '상태', cell: (t) => <Status trip={t} /> },
                { key: 'where', header: '위치·ETA', cell: (t) => <Where trip={t} /> },
              ]}
        />
      </Card>
    </>
  )
}

function Status({ trip }: { trip: Trip }) {
  const stop = trip.status === 'AT_PICKUP' ? trip.pickup : trip.status === 'AT_DROPOFF' ? trip.dropoff : null
  return (
    <div className="space-y-1">
      <Tag tone={TRIP_TONE[trip.status]} dot>
        {trip.statusLabel}
      </Tag>
      {stop?.waitStatus ? (
        <p className="text-[12.5px] text-ink-sub">
          {WAIT_STATUS[stop.waitStatus]} · 진입 {formatRelative(stop.arrivedAt)}
        </p>
      ) : null}
    </div>
  )
}

function Where({ trip }: { trip: Trip }) {
  if (trip.status === 'SCHEDULED' || trip.status === 'COMPLETED' || trip.status === 'CANCELLED') return <span className="text-ink-sub">-</span>
  return (
    <div className="text-[13px]">
      {trip.etaAt ? (
        <p className="font-semibold text-status-blue">
          ETA {formatDateTime(trip.etaAt)}
          {trip.progressPercent !== null ? <span className="ml-1 text-ink-sub">({trip.progressPercent}%)</span> : null}
        </p>
      ) : (
        <p className="text-ink-sub">{trip.location ? '길 안내 중이 아님' : trip.locationVisible ? '위치 아직 안 옴' : '위치 비공개'}</p>
      )}
      {trip.location ? <p className="text-[12px] text-ink-sub">잰 시각 {formatRelative(trip.location.recordedAt)}</p> : null}
    </div>
  )
}
