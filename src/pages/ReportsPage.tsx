import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi, type ReportParams } from '../api/reports'
import { hasFeature } from '../api/broker'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Card, DescList, ErrorText, Field, Loading, PageHeader, Stat, ListTable, Tabs, Tag, UpgradeNotice } from '../components/ui'
import { formatDateTime, formatMinutes, formatPercent, formatPhone, formatWon, todayIso } from '../lib/format'

type Tab = 'routes' | 'sites' | 'company' | 'drivers' | 'metrics'

/** 운행 데이터 리포트 (BRK-040~044) + 신뢰 지표 (BRK-030~032). 리포트는 PRO 이상 */
export function ReportsPage() {
  const { me } = useAuth()
  const [tab, setTab] = useState<Tab>('company')
  const [period, setPeriod] = useState<ReportParams>({ from: todayIso(-89), to: todayIso() })
  const unlocked = hasFeature(me ?? undefined, 'REPORTS')

  return (
    <>
      <PageHeader title="리포트" description="완료된 운행의 실제 운임·시간·대기로 계산해요." />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { value: 'company', label: '내 회사' },
          { value: 'routes', label: '노선별 운임' },
          { value: 'sites', label: '상하차지 대기' },
          { value: 'drivers', label: '함께 일한 차주' },
          { value: 'metrics', label: '신뢰 지표' },
        ]}
      />
      {tab === 'metrics' ? (
        <MetricsTab />
      ) : !unlocked ? (
        <UpgradeNotice feature="운행 데이터 리포트" />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Field label="시작" type="date" value={period.from} onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))} className="grid grid-cols-[auto_11rem] items-center gap-x-3 [&>span]:mb-0" />
            <Field label="종료" type="date" value={period.to} onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))} className="grid grid-cols-[auto_11rem] items-center gap-x-3 [&>span]:mb-0" />
            <span className="text-[12.5px] text-ink-sub">최대 1년</span>
          </div>
          {tab === 'company' ? <CompanyTab period={period} /> : null}
          {tab === 'routes' ? <RoutesTab period={period} /> : null}
          {tab === 'sites' ? <SitesTab period={period} /> : null}
          {tab === 'drivers' ? <DriversTab period={period} /> : null}
        </>
      )}
    </>
  )
}

function useReport<T>(key: string, fn: (p: ReportParams) => Promise<T>, period: ReportParams) {
  return useQuery({ queryKey: ['reports', key, period], queryFn: () => fn(period) })
}

function QueryState({ query, children }: { query: { isPending: boolean; isError: boolean; error: unknown }; children: React.ReactNode }) {
  if (query.isPending) return <Loading rows={4} />
  if (query.isError) return <ErrorText>{query.error instanceof ApiError ? query.error.message : '불러오지 못했어요.'}</ErrorText>
  return <>{children}</>
}

function CompanyTab({ period }: { period: ReportParams }) {
  const q = useReport('company', reportsApi.company, period)
  const r = q.data
  return (
    <QueryState query={q}>
      {r ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="등록한 오더" value={r.orderCount} />
            <Stat label="배차된 운행" value={r.dispatchedCount} tone="blue" sub={r.avgConfirmMinutes !== null ? `등록 → 확정 평균 ${formatMinutes(r.avgConfirmMinutes)}` : undefined} />
            <Stat label="완료" value={r.completedCount} tone="green" sub={`대기비 청구 가능 ${formatWon(r.waitFeeTotal)}`} />
            <Stat label="취소" value={r.canceledCount} tone={r.canceledCount > 0 ? 'red' : undefined} sub={`주선사 ${r.canceledByBrokerCount} · 차주 ${r.canceledByDriverCount}`} />
          </div>
          <Card title="차량별 이행률" padded={false}>
            <ListTable
              rows={r.vehicles}
              rowKey={(v) => v.plateNumber}
              empty="기간 안에 배차된 운행이 없어요."
              columns={[
                { key: 'plate', header: '차량', cell: (v) => <span className="font-semibold">{v.plateNumber}</span> },
                { key: 'driver', header: '차주', cell: (v) => v.driverName },
                { key: 'd', header: '배차', align: 'right', cell: (v) => v.dispatched },
                { key: 'c', header: '완료', align: 'right', cell: (v) => v.completed },
                { key: 'x', header: '취소', align: 'right', cell: (v) => v.canceled },
                { key: 'p', header: '이행률', align: 'right', cell: (v) => <Percent value={v.completionPercent} /> },
              ]}
            />
          </Card>
        </div>
      ) : null}
    </QueryState>
  )
}

function RoutesTab({ period }: { period: ReportParams }) {
  const q = useReport('routes', reportsApi.routes, period)
  return (
    <QueryState query={q}>
      <Card title="노선별 실제 운임·소요 시간" action={<span className="text-[12.5px] text-ink-sub">모든 회사의 완료 운행 · {q.data?.minSamples}건부터 표시</span>} padded={false}>
        <ListTable
          rows={q.data?.routes ?? []}
          rowKey={(r) => `${r.pickupArea}>${r.dropoffArea}`}
          empty={`${q.data?.minSamples ?? 10}건 이상 완료된 노선이 아직 없어요.`}
          columns={[
            {
              key: 'route',
              header: '노선',
              cell: (r) => (
                <span className="font-semibold">
                  {r.pickupArea} <span className="text-ink-sub">→</span> {r.dropoffArea}
                </span>
              ),
            },
            { key: 'n', header: '건수', align: 'right', cell: (r) => r.tripCount },
            { key: 'avg', header: '평균 운임', align: 'right', cell: (r) => <span className="font-semibold">{formatWon(r.avgFare)}</span> },
            { key: 'med', header: '중앙값', align: 'right', cell: (r) => formatWon(r.medianFare) },
            { key: 'range', header: '최소~최대', align: 'right', cell: (r) => `${formatWon(r.minFare)} ~ ${formatWon(r.maxFare)}` },
            { key: 'dur', header: '평균 소요', align: 'right', cell: (r) => formatMinutes(r.avgDurationMinutes) },
            { key: 'trend', header: '월별', cell: (r) => <span className="text-[12.5px] text-ink-mid">{r.months.map((m) => `${m.month.slice(5)}월 ${m.tripCount}건`).join(' · ')}</span> },
          ]}
        />
      </Card>
    </QueryState>
  )
}

function SitesTab({ period }: { period: ReportParams }) {
  const q = useReport('sites', reportsApi.sites, period)
  return (
    <QueryState query={q}>
      <Card title="우리가 다니는 상하차지의 대기·작업 시간" action={<span className="text-[12.5px] text-ink-sub">평균은 그곳의 모든 회사 기록 · {q.data?.minSamples}건부터 표시</span>} padded={false}>
        <ListTable
          rows={q.data?.sites ?? []}
          rowKey={(s) => s.siteId}
          empty="아직 기록이 충분한 상하차지가 없어요."
          columns={[
            {
              key: 'site',
              header: '상하차지',
              cell: (s) => (
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-[12.5px] text-ink-sub">{s.address}</p>
                </div>
              ),
            },
            { key: 'n', header: '기록', align: 'right', cell: (s) => s.recordCount },
            { key: 'wait', header: '평균 대기', align: 'right', cell: (s) => <span className="font-semibold text-status-yellow">{formatMinutes(s.avgWaitMinutes)}</span> },
            { key: 'max', header: '최대 대기', align: 'right', cell: (s) => formatMinutes(s.maxWaitMinutes) },
            { key: 'work', header: '평균 작업', align: 'right', cell: (s) => formatMinutes(s.avgWorkMinutes) },
          ]}
        />
      </Card>
    </QueryState>
  )
}

function DriversTab({ period }: { period: ReportParams }) {
  const q = useReport('drivers', reportsApi.drivers, period)
  return (
    <QueryState query={q}>
      <Card title="함께 일한 차주의 이행 기록" action={<span className="text-[12.5px] text-ink-sub">정시 = 상차 예정 +30분 안 진입</span>} padded={false}>
        <ListTable
          rows={q.data?.drivers ?? []}
          rowKey={(d) => d.driverUserId}
          empty="기간 안에 우리 오더를 맡은 차주가 없어요."
          columns={[
            {
              key: 'name',
              header: '차주',
              cell: (d) => (
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    {d.name} {d.linked ? <Tag tone="orange">단골</Tag> : null}
                  </p>
                  {d.phone ? <p className="text-[12.5px] tabular-nums text-ink-sub">{formatPhone(d.phone)}</p> : null}
                </div>
              ),
            },
            { key: 'd', header: '배차', align: 'right', cell: (d) => d.dispatched },
            { key: 'c', header: '완료', align: 'right', cell: (d) => d.completed },
            { key: 'x', header: '취소', align: 'right', cell: (d) => (d.lateCancelCount > 0 ? <span className="text-status-red">{d.canceledCount} (늦은 취소 {d.lateCancelCount})</span> : d.canceledCount) },
            { key: 'ot', header: '정시 도착', align: 'right', cell: (d) => (d.onTimeBase > 0 ? <span><Percent value={d.onTimePercent} /> <span className="text-[12px] text-ink-sub">({d.onTimeCount}/{d.onTimeBase})</span></span> : <span className="text-ink-sub">-</span>) },
          ]}
        />
      </Card>
    </QueryState>
  )
}

function MetricsTab() {
  const q = useQuery({ queryKey: ['metrics'], queryFn: reportsApi.metrics })
  const m = q.data
  return (
    <QueryState query={q}>
      {m ? (
        <div className="space-y-5">
          <Card title="차주의 오더 카드에 보이는 우리 회사 지표">
            {m.published ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="평균 지급 소요일" value={`${m.avgPaymentDays ?? '-'}일`} sub="운행일 → 차주가 받은 날 (인수증 결제)" />
                <Stat label="지급 지연" value={formatPercent(m.latePaymentPercent)} tone={m.latePaymentPercent && m.latePaymentPercent > 20 ? 'red' : 'green'} sub="예정일 지난 건 중 늦게 받았거나 못 받은 비율" />
                <Stat label="대기비 지급" value={formatPercent(m.waitFeePaidPercent)} sub="청구된 대기비 중 받은 비율" />
                <Stat label="평균 대기" value={formatMinutes(m.avgWaitMinutes)} tone="yellow" sub="우리 운행에서 차주가 기다린 시간" />
              </div>
            ) : (
              <div className="rounded-xl bg-canvas p-5 text-[14px] text-ink-mid">
                <p className="font-semibold text-ink-strong">아직 기록을 쌓는 중이에요</p>
                <p className="mt-1">
                  최근 180일 완료 운행이 <b>{m.minSampleCount}건</b> 이상이면 공개돼요. 지금은 <b>{m.sampleCount}건</b>이에요. 그 전까지 차주에게는 "거래 기록 적음"으로 보여요.
                </p>
              </div>
            )}
          </Card>
          <Card title="어떻게 계산하나">
            <DescList
              items={[
                { label: '재료', value: '차주가 장부에서 "받음"을 누른 기록과 대기 기록. 별점이 아니라 실제 운행 데이터라 조작하기 어려워요.' },
                { label: '범위', value: '우리 회사 오더로 배차된 운행만, 지급 지표는 인수증 결제만, 최근 180일.' },
                { label: '공개', value: `완료 운행 ${m.minSampleCount}건부터. 회사 전체 숫자만 보이고 차주별로는 나오지 않아요.` },
                { label: '갱신', value: m.calculatedAt ? `${formatDateTime(m.calculatedAt)} 계산` : '아직 계산한 적 없음' },
              ]}
            />
          </Card>
        </div>
      ) : null}
    </QueryState>
  )
}

function Percent({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink-sub">-</span>
  const tone = value >= 90 ? 'text-status-green' : value >= 70 ? 'text-ink-strong' : 'text-status-red'
  return <span className={`font-semibold ${tone}`}>{value}%</span>
}
