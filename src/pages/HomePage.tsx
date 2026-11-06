import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { ordersApi } from '../api/orders'
import { tripsApi } from '../api/trips'
import { driversApi } from '../api/people'
import { reportsApi } from '../api/reports'
import { useAuth } from '../auth/AuthContext'
import { Card, DescList, Icon, LinkButton, PageHeader, Stat, Table, Tag } from '../components/ui'
import { formatBusinessNumber, formatDateTime, formatMinutes, formatPercent, formatWon } from '../lib/format'
import { ORDER_STATUS, TRIP_TONE } from '../api/types'

/** 첫 화면: 오늘 상황 한눈에 + 회사 정보 */
export function HomePage() {
  const { me } = useAuth()
  const openOrders = useQuery({ queryKey: ['orders', { status: 'OPEN', page: 0, size: 5 }], queryFn: () => ordersApi.list({ status: 'OPEN', page: 0, size: 5 }) })
  const trips = useQuery({ queryKey: ['trips', { tab: 'IN_PROGRESS', page: 0, size: 5 }], queryFn: () => tripsApi.list({ tab: 'IN_PROGRESS', page: 0, size: 5 }) })
  const drivers = useQuery({ queryKey: ['drivers'], queryFn: driversApi.list })
  const metrics = useQuery({ queryKey: ['metrics'], queryFn: reportsApi.metrics })
  if (!me) return null

  const pendingRequests = openOrders.data?.items.reduce((sum, o) => sum + (o.pendingRequestCount ?? 0), 0) ?? 0

  return (
    <>
      <PageHeader
        title={me.name}
        description="오늘 배차 상황을 한눈에 봐요."
        action={
          <LinkButton to="/orders/new">
            <Icon name="plus" className="h-4 w-4" /> 오더 등록
          </LinkButton>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="모집 중인 오더" value={openOrders.data?.totalCount ?? '…'} tone="blue" sub={pendingRequests > 0 ? `배차 요청 ${pendingRequests}건 대기` : '대기 중인 요청 없음'} />
        <Stat label="진행 중인 운행" value={trips.data?.totalCount ?? '…'} tone="yellow" />
        <Stat label="단골 차주" value={drivers.data?.length ?? '…'} />
        <Stat
          label="신뢰 지표"
          value={metrics.data?.published ? `지급 ${metrics.data.avgPaymentDays ?? '-'}일` : '기록 쌓는 중'}
          sub={metrics.data?.published ? `지연 ${formatPercent(metrics.data.latePaymentPercent)} · 대기 ${formatMinutes(metrics.data.avgWaitMinutes)}` : `완료 운행 ${metrics.data?.sampleCount ?? 0} / ${metrics.data?.minSampleCount ?? 20}건`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <Card title="진행 중인 운행" action={<Link to="/trips" className="text-[13px] font-semibold text-orange-700">전체 보기</Link>} padded={false}>
            <Table
              rows={trips.data?.items ?? []}
              rowKey={(t) => t.id}
              empty="진행 중인 운행이 없어요."
              columns={[
                { key: 'route', header: '구간', cell: (t) => <Link to={`/trips/${t.id}`} className="font-semibold hover:text-orange-700">{t.pickup.siteName} → {t.dropoff.siteName}</Link> },
                { key: 'driver', header: '차주', cell: (t) => `${t.driverName} · ${t.plateNumber}` },
                { key: 'status', header: '상태', cell: (t) => <Tag tone={TRIP_TONE[t.status]} dot>{t.statusLabel}</Tag> },
                { key: 'eta', header: 'ETA', cell: (t) => formatDateTime(t.etaAt) },
              ]}
            />
          </Card>
          <Card title="모집 중인 오더" action={<Link to="/orders" className="text-[13px] font-semibold text-orange-700">전체 보기</Link>} padded={false}>
            <Table
              rows={openOrders.data?.items ?? []}
              rowKey={(o) => o.id}
              empty="모집 중인 오더가 없어요. 오더를 올리면 차주들의 화면에 보여요."
              columns={[
                { key: 'route', header: '구간', cell: (o) => <Link to={`/orders/${o.id}`} className="font-semibold hover:text-orange-700">{o.pickup.name} → {o.dropoff.name}</Link> },
                { key: 'when', header: '상차', cell: (o) => formatDateTime(o.pickupFrom) },
                { key: 'fare', header: '운임', align: 'right', cell: (o) => formatWon(o.fare) },
                { key: 'req', header: '요청', align: 'right', cell: (o) => (o.pendingRequestCount ? <Tag tone="blue">{o.pendingRequestCount}명 대기</Tag> : <span className="text-ink-sub">-</span>) },
                { key: 'status', header: '', cell: (o) => <Tag tone={ORDER_STATUS[o.status].tone}>{o.open ? '모집 중' : ORDER_STATUS[o.status].label}</Tag> },
              ]}
            />
          </Card>
        </div>
        <div className="space-y-5 lg:col-span-2">
          <Card title="회사 정보" action={<Link to="/settings" className="text-[13px] font-semibold text-orange-700">설정</Link>}>
            <DescList
              items={[
                { label: '상호', value: me.name },
                { label: '사업자등록번호', value: formatBusinessNumber(me.businessNumber) },
                { label: '허가 번호', value: me.licenseNumber },
                { label: '대표자', value: me.representativeName ?? '-' },
                { label: '정산 주기', value: `인수증 전달 뒤 ${me.settlementDays}일` },
                { label: '플랜', value: <Tag tone="orange">{me.plan.planLabel}</Tag> },
              ]}
            />
          </Card>
          <Card title="차주에게 보이는 우리 회사">
            {metrics.data?.published ? (
              <DescList
                items={[
                  { label: '평균 지급', value: `${metrics.data.avgPaymentDays ?? '-'}일` },
                  { label: '지급 지연', value: formatPercent(metrics.data.latePaymentPercent) },
                  { label: '대기비 지급', value: formatPercent(metrics.data.waitFeePaidPercent) },
                  { label: '평균 대기', value: formatMinutes(metrics.data.avgWaitMinutes) },
                ]}
              />
            ) : (
              <p className="text-[13.5px] leading-relaxed text-ink-sub">
                완료 운행이 {metrics.data?.minSampleCount ?? 20}건을 넘으면 평균 지급 소요일, 지급 지연 비율, 대기비 지급 비율이 차주의 오더 카드에 보여요. 지금은 {metrics.data?.sampleCount ?? 0}건이에요.
              </p>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
