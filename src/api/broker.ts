import { api } from './client'

export type BrokerPlan = 'BASIC' | 'PRO' | 'PRO_PLUS'
export type BrokerFeature = 'REPORTS' | 'DRIVER_RECORDS' | 'REPORT_EXPORT' | 'API_ACCESS'
export type MemberPosition = 'OWNER' | 'STAFF'

export interface PlanInfo {
  plan: BrokerPlan
  planLabel: string
  features: { code: BrokerFeature; label: string }[]
  limits: { members: number | null; shareLinksPerMonth: number | null; orderTemplates: number | null }
  startedAt: string | null
}

/** GET /api/brokers/me */
export interface MyBroker {
  id: number
  name: string
  businessNumber: string
  licenseNumber: string
  representativeName: string | null
  settlementDays: number
  /** 기본 수수료율(%). 오더 폼의 수수료율 기본값. 0이면 자동 계산 안 함 */
  defaultFeeRate: number
  position: MemberPosition
  positionLabel: string
  plan: PlanInfo
  createdAt: string
}

export interface CreateBrokerRequest {
  name: string
  businessNumber: string
  licenseNumber: string
  representativeName?: string
  settlementDays?: number
  defaultFeeRate?: number
}

export const brokerApi = {
  me: () => api<MyBroker>('/api/brokers/me'),
  register: (body: CreateBrokerRequest) => api<MyBroker>('/api/brokers', { method: 'POST', body }),
  update: (body: Partial<CreateBrokerRequest>) => api<MyBroker>('/api/brokers/me', { method: 'PATCH', body }),
  changePlan: (plan: BrokerPlan) => api<MyBroker>('/api/brokers/me/plan', { method: 'PUT', body: { plan } }),
}

export function hasFeature(me: MyBroker | undefined, feature: BrokerFeature) {
  return me?.plan.features.some((f) => f.code === feature) ?? false
}
