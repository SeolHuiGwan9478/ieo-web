import { api } from './client'

export type DashboardUnit = 'DAY' | 'WEEK' | 'MONTH'

export const DASHBOARD_UNITS: { value: DashboardUnit; label: string }[] = [
  { value: 'DAY', label: '일' },
  { value: 'WEEK', label: '주' },
  { value: 'MONTH', label: '월' },
]

/** 한 칸 (일·주·월). start·end는 한국 날짜, 기간 안으로 잘림 */
export interface DashboardBucket {
  start: string
  end: string
  orderCount: number
  completedCount: number
  canceledCount: number
  /** 그 칸에 완료된 운행의 지급운임 합계 (차주에게 줄 돈) */
  fareTotal: number
  /** 그 완료 운행들의 대기 증빙으로 계산된 대기비 합계 */
  waitFeeTotal: number
  /** 완료 운행 중 청구운임을 적은 건수. 아래 둘은 이 건들만 더한 값 */
  pricedCount: number
  /** 청구운임 합계 (화주에게 받는 돈) */
  billedTotal: number
  /** 수수료 합계 = 청구 − 지급 */
  feeTotal: number
}

export interface Dashboard {
  unit: DashboardUnit
  unitLabel: string
  from: string
  to: string
  total: DashboardBucket
  buckets: DashboardBucket[]
}

export interface DashboardParams {
  unit: DashboardUnit
  from?: string
  to?: string
}

export const dashboardApi = {
  /** 모든 플랜. from을 비우면 단위별 기본 기간 (30일 / 12주 / 6개월) */
  get: (p: DashboardParams) => api<Dashboard>('/api/brokers/me/dashboard', { query: { unit: p.unit, from: p.from, to: p.to } }),
}
