import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi, type SuspectedOrder } from '../../api/admin'
import { ORDER_STATUS, type OrderStatus } from '../../api/types'
import { Card, Empty, ErrorText, Loading, PageHeader, Tag } from '../../components/ui'
import { formatDateTime, formatMinutes, formatWon } from '../../lib/format'

/**
 * 재위탁 의심 오더 (DSP-041, 03 어드민 인계 4-1). 다른 주선사가 먼저 올린 모집 중 오더와 상하차지(각 500m 안)·상차 시간대가 겹쳐서
 * 서버가 등록할 때 표시해 둔 오더다. 우연히 겹칠 수도 있어 서버는 막지 않고, 운영자가 두 오더를 나란히 보고 판단한다.
 * 운영자에겐 오더 상세 화면이 없어서 견줄 값을 여기에 다 보여 준다. 확인한 뒤 이용 제한(DSP-043)은 아직 없다
 */
export function AdminSuspectedOrdersPage() {
  const query = useQuery({ queryKey: ['admin', 'suspected-orders'], queryFn: adminApi.suspectedOrders, refetchInterval: 60_000 })
  const rows = query.data ?? []
  return (
    <>
      <PageHeader
        title="재위탁 의심"
        description="다른 주선사가 먼저 올린 오더와 상차지·하차지(각 500m 안), 상차 시간대가 겹치는 오더예요. 우연히 겹칠 수도 있으니 두 오더를 견주어 보고 판단해 주세요. 오더는 막지 않고, 주선사와 차주에게는 보이지 않아요."
      />
      {query.isPending ? (
        <Card padded={false}>
          <Loading />
        </Card>
      ) : query.isError ? (
        <ErrorText>의심 오더를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</ErrorText>
      ) : rows.length === 0 ? (
        <Card>
          <Empty>겹치는 오더가 없어요.</Empty>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-[13px] text-ink-sub">
            최근 등록 순 {rows.length}건{rows.length >= 100 ? ' (최근 100건까지만 보여요)' : ''}
          </p>
          {rows.map((row) => (
            <SuspectedCard key={row.orderId} row={row} />
          ))}
        </div>
      )}
    </>
  )
}

function SuspectedCard({ row }: { row: SuspectedOrder }) {
  const fareGap = row.sourceFare == null ? null : row.sourceFare - row.fare
  const gapMinutes = row.sourceCreatedAt ? Math.round((new Date(row.createdAt).getTime() - new Date(row.sourceCreatedAt).getTime()) / 60_000) : null
  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <Tag tone="red">재위탁 의심</Tag>
        <span className="text-[14px] font-semibold text-ink-strong">
          {row.sourceBrokerName ?? '알 수 없음'} → {row.brokerName}
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-sub">
          {gapMinutes !== null ? <span>{gapMinutes < 1 ? '거의 같은 때 올라옴' : `${formatMinutes(gapMinutes)} 뒤에 다시 올라옴`}</span> : null}
          {fareGap !== null ? (
            <span className={fareGap > 0 ? 'font-semibold text-status-red' : ''}>
              {fareGap > 0 ? `운임 ${formatWon(fareGap)} 줄어듦` : fareGap < 0 ? `운임 ${formatWon(-fareGap)} 늘어남` : '운임 같음'}
            </span>
          ) : null}
        </span>
      </div>
      <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-line">
        <OrderSide
          title="먼저 올라온 오더"
          orderId={row.sourceOrderId}
          broker={row.sourceBrokerName}
          status={row.sourceStatus}
          pickup={row.sourcePickupAddress}
          dropoff={row.sourceDropoffAddress}
          pickupFrom={row.sourcePickupFrom}
          cargo={row.sourceCargoType}
          fare={row.sourceFare}
          createdAt={row.sourceCreatedAt}
        />
        <OrderSide
          title="나중에 올라온 오더"
          suspect
          orderId={row.orderId}
          broker={row.brokerName}
          status={row.status}
          pickup={row.pickupAddress}
          dropoff={row.dropoffAddress}
          pickupFrom={row.pickupFrom}
          cargo={row.cargoType}
          fare={row.fare}
          createdAt={row.createdAt}
        />
      </div>
    </Card>
  )
}

function OrderSide(props: {
  title: string
  suspect?: boolean
  orderId: number
  broker: string | null | undefined
  status: OrderStatus | null | undefined
  pickup: string | null | undefined
  dropoff: string | null | undefined
  pickupFrom: string | null | undefined
  cargo: string | null | undefined
  fare: number | null | undefined
  createdAt: string | null | undefined
}) {
  const items: { label: string; value: ReactNode }[] = [
    { label: '주선사', value: props.broker ?? '-' },
    { label: '상차지', value: props.pickup ?? '-' },
    { label: '하차지', value: props.dropoff ?? '-' },
    { label: '상차 시각', value: formatDateTime(props.pickupFrom) },
    { label: '화물', value: props.cargo || '-' },
    { label: '운임', value: <span className="font-semibold tabular-nums">{formatWon(props.fare)}</span> },
    { label: '등록', value: formatDateTime(props.createdAt) },
  ]
  return (
    <div className={`px-5 py-4 ${props.suspect ? 'bg-status-red-bg/40' : ''}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[13px] font-semibold text-ink-strong">{props.title}</span>
        <span className="text-[12px] tabular-nums text-ink-sub">오더 #{props.orderId}</span>
        {props.status ? <Tag tone={ORDER_STATUS[props.status].tone}>{ORDER_STATUS[props.status].label}</Tag> : null}
      </div>
      <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1.5 text-[13.5px]">
        {items.map((item) => (
          <div key={item.label} className="contents">
            <dt className="text-ink-sub">{item.label}</dt>
            <dd className="min-w-0 break-keep text-ink-strong">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
