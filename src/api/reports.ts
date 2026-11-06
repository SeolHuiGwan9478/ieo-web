import { api } from './client'

export interface ReportParams {
  from?: string
  to?: string
}

export interface RouteReport {
  from: string
  to: string
  minSamples: number
  routes: {
    pickupArea: string
    dropoffArea: string
    tripCount: number
    avgFare: number
    medianFare: number
    minFare: number
    maxFare: number
    avgDurationMinutes: number | null
    months: { month: string; tripCount: number; avgFare: number }[]
  }[]
}

export interface SiteReport {
  from: string
  to: string
  minSamples: number
  sites: {
    siteId: number
    name: string
    address: string
    recordCount: number
    avgWaitMinutes: number
    maxWaitMinutes: number
    avgWorkMinutes: number | null
  }[]
}

export interface CompanyReport {
  from: string
  to: string
  orderCount: number
  dispatchedCount: number
  completedCount: number
  canceledCount: number
  canceledByBrokerCount: number
  canceledByDriverCount: number
  avgConfirmMinutes: number | null
  waitFeeTotal: number
  vehicles: {
    plateNumber: string
    driverName: string
    dispatched: number
    completed: number
    canceled: number
    completionPercent: number | null
  }[]
}

export interface DriverReport {
  from: string
  to: string
  drivers: {
    driverUserId: number
    name: string
    phone: string | null
    linked: boolean
    dispatched: number
    completed: number
    canceledCount: number
    lateCancelCount: number
    onTimeCount: number
    onTimeBase: number
    onTimePercent: number | null
  }[]
}

/** 신뢰 지표 (BRK-030~032). 차주 오더 카드에 보이는 것과 같다 */
export interface BrokerMetrics {
  published: boolean
  sampleCount: number
  minSampleCount: number
  avgPaymentDays: number | null
  latePaymentPercent: number | null
  waitFeePaidPercent: number | null
  avgWaitMinutes: number | null
  calculatedAt: string | null
}

export const reportsApi = {
  routes: (p: ReportParams) => api<RouteReport>('/api/brokers/me/reports/routes', { query: { from: p.from, to: p.to } }),
  sites: (p: ReportParams) => api<SiteReport>('/api/brokers/me/reports/sites', { query: { from: p.from, to: p.to } }),
  company: (p: ReportParams) => api<CompanyReport>('/api/brokers/me/reports/company', { query: { from: p.from, to: p.to } }),
  drivers: (p: ReportParams) => api<DriverReport>('/api/brokers/me/reports/drivers', { query: { from: p.from, to: p.to } }),
  metrics: () => api<BrokerMetrics>('/api/brokers/me/metrics'),
}
