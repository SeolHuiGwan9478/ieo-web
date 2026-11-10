import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { ordersApi } from '../../api/orders'
import type { OrderStatus } from '../../api/types'
import { ORDER_STATUS } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { CompanyVerificationNotice } from '../../components/CompanyVerificationNotice'
import { Card, Icon, LinkButton, Loading, PageHeader, Pagination, Table, Tabs, Tag } from '../../components/ui'
import { formatDateTime, formatWon } from '../../lib/format'

type Filter = '' | OrderStatus
const SIZE = 20

/** 오더 목록 (DSP-001~). 상태별 탭, 대기 중인 요청 수 */
export function OrdersPage() {
  const { me } = useAuth()
  const [status, setStatus] = useState<Filter>('OPEN')
  const [page, setPage] = useState(0)
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['orders', { status, page, size: SIZE }],
    queryFn: () => ordersApi.list({ status, page, size: SIZE }),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader
        title="오더"
        description="올린 오더와 차주들의 배차 요청을 봐요."
        action={
          me?.verified ? (
            <LinkButton to="/orders/new">
              <Icon name="plus" className="h-4 w-4" /> 오더 등록
            </LinkButton>
          ) : null
        }
      />
      <CompanyVerificationNotice />
      <Tabs<Filter>
        value={status}
        onChange={(v) => {
          setStatus(v)
          setPage(0)
        }}
        items={[
          { value: 'OPEN', label: '모집 중' },
          { value: 'ASSIGNED', label: '배차 확정' },
          { value: 'CLOSED', label: '마감' },
          { value: '', label: '전체' },
        ]}
      />
      <Card padded={false}>
        {query.isPending ? (
          <Loading rows={5} />
        ) : (
          <>
            <Table
              rows={query.data?.items ?? []}
              rowKey={(o) => o.id}
              onRowClick={(o) => navigate(`/orders/${o.id}`)}
              empty={status === 'OPEN' ? '모집 중인 오더가 없어요. 오더를 올리면 조건이 맞는 차주들의 화면에 바로 보여요.' : '해당하는 오더가 없어요.'}
              columns={[
                {
                  key: 'route',
                  header: '구간',
                  cell: (o) => (
                    <div>
                      <p className="font-semibold">
                        {o.pickup.name} <span className="text-ink-sub">→</span> {o.dropoff.name}
                      </p>
                      <p className="text-[12.5px] text-ink-sub">
                        {o.cargoCategoryLabel} · {o.cargoType} · {(o.weightKg / 1000).toFixed(1)}t
                      </p>
                    </div>
                  ),
                },
                { key: 'when', header: '상차', cell: (o) => <span className="tabular-nums">{formatDateTime(o.pickupFrom)}</span> },
                { key: 'vehicle', header: '차량', cell: (o) => `${o.tonnageLabel} ${o.bodyTypeLabel}` },
                { key: 'fare', header: '지급운임', align: 'right', cell: (o) => <span className="font-semibold">{formatWon(o.fare)}</span> },
                {
                  key: 'fee',
                  header: '수수료',
                  align: 'right',
                  cell: (o) =>
                    o.billing?.fee !== null && o.billing?.fee !== undefined ? (
                      <span className="tabular-nums">
                        {formatWon(o.billing.fee)} <span className="text-[12px] text-ink-sub">{o.billing.feeRate}%</span>
                      </span>
                    ) : (
                      <span className="text-ink-sub">-</span>
                    ),
                },
                { key: 'pay', header: '결제', cell: (o) => o.paymentTypeLabel },
                {
                  key: 'req',
                  header: '요청',
                  align: 'right',
                  cell: (o) => (o.pendingRequestCount ? <Tag tone="blue">{o.pendingRequestCount}명 대기</Tag> : <span className="text-ink-sub">-</span>),
                },
                {
                  key: 'status',
                  header: '상태',
                  cell: (o) =>
                    o.status === 'OPEN' && !o.open ? <Tag tone="gray">상차 시간 지남</Tag> : <Tag tone={ORDER_STATUS[o.status].tone} dot>{ORDER_STATUS[o.status].label}</Tag>,
                },
              ]}
            />
            {query.data ? <Pagination page={query.data.page} size={query.data.size} total={query.data.totalCount} onChange={setPage} /> : null}
          </>
        )}
      </Card>
    </>
  )
}
