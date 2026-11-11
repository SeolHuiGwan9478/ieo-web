import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ordersApi } from '../api/orders'
import { tripsApi } from '../api/trips'
import { driversApi } from '../api/people'
import { reportsApi } from '../api/reports'
import { DASHBOARD_UNITS, dashboardApi, type DashboardBucket, type DashboardParams, type DashboardUnit } from '../api/dashboard'
import { useAuth } from '../auth/AuthContext'
import { CompanyVerificationNotice } from '../components/CompanyVerificationNotice'
import { Card, Icon, LinkButton, Loading, PageHeader, Stat, Table, Tag } from '../components/ui'
import { formatDateTime, formatMinutes, formatPercent, formatWon, formatWonShort, todayIso } from '../lib/format'
import { ORDER_STATUS, TRIP_TONE } from '../api/types'

/** 첫 화면: 지금 처리할 것 + 기간별 실적 그래프 (일·주·월) */
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
        action={
          me.verified ? (
            <LinkButton to="/orders/new">
              <Icon name="plus" className="h-4 w-4" /> 오더 등록
            </LinkButton>
          ) : null
        }
      />
      <CompanyVerificationNotice />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="모집 중인 오더" value={openOrders.data?.totalCount ?? '…'} tone="blue" sub={pendingRequests > 0 ? `배차 요청 ${pendingRequests}건 대기` : '대기 중인 요청 없음'} />
        <Stat label="진행 중인 운행" value={trips.data?.totalCount ?? '…'} tone="yellow" />
        <Stat label="단골 차주" value={drivers.data?.length ?? '…'} />
        <Stat
          label="차주에게 보이는 신뢰 지표"
          value={metrics.data?.published ? `지급 ${metrics.data.avgPaymentDays ?? '-'}일` : '기록 쌓는 중'}
          sub={
            metrics.data?.published
              ? `지연 ${formatPercent(metrics.data.latePaymentPercent)} · 대기비 지급 ${formatPercent(metrics.data.waitFeePaidPercent)} · 대기 ${formatMinutes(metrics.data.avgWaitMinutes)}`
              : `완료 운행 ${metrics.data?.sampleCount ?? 0} / ${metrics.data?.minSampleCount ?? 20}건이 쌓이면 보여요`
          }
        />
      </div>

      <DashboardSection />

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
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
              { key: 'fare', header: '지급운임', align: 'right', cell: (o) => formatWonShort(o.fare) },
              { key: 'req', header: '요청', align: 'right', cell: (o) => (o.pendingRequestCount ? <Tag tone="blue">{o.pendingRequestCount}명 대기</Tag> : <span className="text-ink-sub">-</span>) },
              { key: 'status', header: '', cell: (o) => <Tag tone={ORDER_STATUS[o.status].tone}>{o.open ? '모집 중' : ORDER_STATUS[o.status].label}</Tag> },
            ]}
          />
        </Card>
      </div>
    </>
  )
}

/* ───────── 기간별 실적 (대시보드) ───────── */

/** 건수는 오더·완료·취소, 금액은 중개비를 표시해요. */
const COLOR = { order: '#2563EB', completed: '#F25A22', canceled: '#7C3AED', fee: '#7C3AED' }

type Preset = { label: string; unit: DashboardUnit; days?: number; months?: number }
const PRESETS: Preset[] = [
  { label: '최근 7일', unit: 'DAY', days: 7 },
  { label: '최근 30일', unit: 'DAY', days: 30 },
  { label: '최근 12주', unit: 'WEEK', days: 7 * 12 },
  { label: '최근 6개월', unit: 'MONTH', months: 6 },
  { label: '최근 12개월', unit: 'MONTH', months: 12 },
]

function presetParams(preset: Preset): DashboardParams {
  const to = todayIso()
  if (preset.months) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (preset.months - 1))
    return { unit: preset.unit, from: d.toISOString().slice(0, 10), to }
  }
  return { unit: preset.unit, from: todayIso(-(preset.days! - 1)), to }
}

function DashboardSection() {
  const [params, setParams] = useState<DashboardParams>(() => presetParams(PRESETS[3]))
  const dashboard = useQuery({ queryKey: ['dashboard', params], queryFn: () => dashboardApi.get(params) })
  const data = dashboard.data
  const activePreset = PRESETS.find((p) => {
    const q = presetParams(p)
    return q.unit === params.unit && q.from === params.from && q.to === params.to
  })

  return (
    <Card
      title="기간별 실적"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-0.5 rounded-lg bg-canvas p-0.5">
            {DASHBOARD_UNITS.map((u) => (
              <button
                key={u.value}
                type="button"
                onClick={() => setParams((p) => ({ ...p, unit: u.value }))}
                className={`h-7 rounded-md px-2.5 text-[12.5px] font-semibold transition ${params.unit === u.value ? 'bg-white text-ink-strong shadow-[0_1px_2px_rgba(25,31,40,0.08)]' : 'text-ink-sub hover:text-ink-mid'}`}
              >
                {u.label}
              </button>
            ))}
          </div>
          <input type="date" value={params.from ?? ''} max={params.to} onChange={(e) => setParams((p) => ({ ...p, from: e.target.value }))} className="h-8 rounded-lg border border-line px-2 text-[13px] tabular-nums" />
          <span className="text-[12px] text-ink-sub">~</span>
          <input type="date" value={params.to ?? ''} min={params.from} max={todayIso()} onChange={(e) => setParams((p) => ({ ...p, to: e.target.value }))} className="h-8 rounded-lg border border-line px-2 text-[13px] tabular-nums" />
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setParams(presetParams(p))}
            className={`h-7 rounded-full border px-3 text-[12.5px] font-medium transition ${activePreset?.label === p.label ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-line text-ink-mid hover:bg-canvas'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {dashboard.isError ? (
        <p className="text-[13.5px] text-status-red">실적을 불러오지 못했어요. 기간은 1년까지 고를 수 있어요.</p>
      ) : !data ? (
        <Loading rows={4} />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Total label="오더 등록" value={`${data.total.orderCount}건`} color={COLOR.order} />
            <Total label="완료 운행" value={`${data.total.completedCount}건`} color={COLOR.completed} />
            <Total label="취소" value={`${data.total.canceledCount}건`} color={COLOR.canceled} />
            <Total label="중개비 합계" value={formatWonShort(data.total.feeTotal)} color={COLOR.fee} hint={`청구운임을 입력한 완료 운행 ${data.total.pricedCount}건`} />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <ChartBlock title="건수" description={`${data.unitLabel}별 오더 등록·완료 운행·취소`}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.buckets} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EDEDED" />
                  <XAxis dataKey="start" tickFormatter={(v: string) => axisLabel(v, data.unit)} tick={{ fontSize: 11.5, fill: '#8B95A1' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11.5, fill: '#8B95A1' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(25,31,40,0.04)' }} content={<BucketTooltip unit={data.unit} kind="count" />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12.5, color: '#4E5968' }} />
                  <Bar dataKey="orderCount" name="오더 등록" fill={COLOR.order} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="completedCount" name="완료 운행" fill={COLOR.completed} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="canceledCount" name="취소" fill={COLOR.canceled} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBlock>
            <ChartBlock title="중개비 실적" description={`${data.unitLabel}별 중개비 (완료 운행 기준 · 원)`}>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.buckets} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EDEDED" />
                  <XAxis dataKey="start" tickFormatter={(v: string) => axisLabel(v, data.unit)} tick={{ fontSize: 11.5, fill: '#8B95A1' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tickFormatter={shortWon} tick={{ fontSize: 11.5, fill: '#8B95A1' }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip cursor={{ stroke: '#D1D6DB', strokeDasharray: '4 4' }} content={<BucketTooltip unit={data.unit} kind="amount" />} />
                  <Line type="linear" dataKey="feeTotal" name="중개비" stroke={COLOR.fee} strokeWidth={2.5} dot={{ r: 3, fill: COLOR.fee, stroke: '#FFFFFF', strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartBlock>
          </div>
          <p className="mt-4 text-[12.5px] text-ink-sub">
            중개비 = 청구운임 − 지급운임. 청구운임을 적은 완료 운행만 세고, 실제 입금 기준은 아니에요. 노선·상하차지·차주별은 <Link to="/reports" className="font-semibold text-orange-700">리포트</Link>에서 봐요.
          </p>
        </>
      )}
    </Card>
  )
}

function Total({ label, value, color, hint }: { label: string; value: string; color: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-canvas/70 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[12.5px] text-ink-sub">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
        {label}
      </p>
      <p className="mt-0.5 text-[18px] font-bold tabular-nums text-ink-strong">{value}</p>
      {hint ? <p className="text-[11.5px] text-ink-sub">{hint}</p> : null}
    </div>
  )
}

function ChartBlock({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[14px] font-bold">{title}</p>
      <p className="mb-2 text-[12.5px] text-ink-sub">{description}</p>
      {children}
    </div>
  )
}

/** 축 글자: 일은 "11/6", 주는 "11/3~", 월은 "2026.11" */
function axisLabel(start: string, unit: DashboardUnit) {
  const [y, m, d] = start.split('-')
  if (unit === 'MONTH') return `${y}.${Number(m)}`
  if (unit === 'WEEK') return `${Number(m)}/${Number(d)}~`
  return `${Number(m)}/${Number(d)}`
}

/** 툴팁 제목: 칸이 덮는 날짜 범위 */
function bucketLabel(b: DashboardBucket, unit: DashboardUnit) {
  const fmt = (s: string) => {
    const [y, m, d] = s.split('-')
    return `${y}.${Number(m)}.${Number(d)}`
  }
  if (unit === 'DAY') return fmt(b.start)
  if (unit === 'MONTH' && b.start.slice(8) === '01' && b.end === lastDayOf(b.start)) return `${b.start.slice(0, 4)}년 ${Number(b.start.slice(5, 7))}월`
  return `${fmt(b.start)} ~ ${fmt(b.end)}`
}

function lastDayOf(start: string) {
  const d = new Date(Number(start.slice(0, 4)), Number(start.slice(5, 7)), 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shortWon(value: number) {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1).replace(/\.0$/, '')}억`
  if (value >= 10_000) return `${Math.round(value / 10_000)}만`
  return String(value)
}

function BucketTooltip({ active, payload, unit, kind }: { active?: boolean; payload?: { payload: DashboardBucket }[]; unit: DashboardUnit; kind: 'count' | 'amount' }) {
  if (!active || !payload?.length) return null
  const b = payload[0].payload
  const rows =
    kind === 'count'
      ? [
          { label: '오더 등록', value: `${b.orderCount}건`, color: COLOR.order },
          { label: '완료 운행', value: `${b.completedCount}건`, color: COLOR.completed },
          { label: '취소', value: `${b.canceledCount}건`, color: COLOR.canceled },
        ]
      : [
          { label: '중개비', value: formatWon(b.feeTotal), color: COLOR.fee },
        ]
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2.5 text-[12.5px] shadow-[0_4px_16px_rgba(25,31,40,0.08)]">
      <p className="mb-1.5 font-semibold text-ink-strong">{bucketLabel(b, unit)}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-4 text-ink-mid">
          <span className="flex items-center gap-1.5">
            {r.color ? <span className="inline-block h-2 w-2 rounded-full" style={{ background: r.color }} /> : <span className="inline-block h-2 w-2" />}
            {r.label}
          </span>
          <span className="font-semibold tabular-nums text-ink-strong">{r.value}</span>
        </p>
      ))}
    </div>
  )
}
