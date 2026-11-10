import type { DocumentItem, DocumentTypeItem } from './admin'
import { api, apiBlob, apiForm } from './client'

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

/** GET /api/brokers/me/documents. 회사 서류 2종(사업자등록증·운송주선사업 허가증)의 최신 상태. verified면 둘 다 승인된 인증된 주선사 */
export interface BrokerDocuments {
  verified: boolean
  approvedRequired: number
  requiredTotal: number
  documents: DocumentTypeItem[]
}

export const brokerApi = {
  me: () => api<MyBroker>('/api/brokers/me'),
  register: (body: CreateBrokerRequest) => api<MyBroker>('/api/brokers', { method: 'POST', body }),
  update: (body: Partial<CreateBrokerRequest>) => api<MyBroker>('/api/brokers/me', { method: 'PATCH', body }),
  changePlan: (plan: BrokerPlan) => api<MyBroker>('/api/brokers/me/plan', { method: 'PUT', body: { plan } }),
  /** 회사 서류 (07 인계서 13장). 담당자 누구나 올릴 수 있고 이에오 운영자가 심사한다 */
  documents: () => api<BrokerDocuments>('/api/brokers/me/documents'),
  /** multipart: type, file(JPG·PNG 5MB), 사업자등록증은 openedOn(·ownerName) */
  uploadDocument: (form: FormData) => apiForm<DocumentItem>('/api/brokers/me/documents', form),
  documentFile: (documentId: number) => apiBlob(`/api/brokers/me/documents/${documentId}/file`),
}

export function hasFeature(me: MyBroker | undefined, feature: BrokerFeature) {
  return me?.plan.features.some((f) => f.code === feature) ?? false
}
