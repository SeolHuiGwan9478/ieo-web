import { api, apiBlob } from './client'

/** 운영자 서류 심사 (docs/design/07_운영자_서류심사_인계.md 7장). /api/admin/** 은 운영자(ADMIN) 계정만 통과한다 */

export type DocumentType = 'BUSINESS_REGISTRATION' | 'VEHICLE_REGISTRATION' | 'DRIVER_LICENSE' | 'FREIGHT_QUALIFICATION' | 'CONSIGNMENT_CONTRACT' | 'CARGO_INSURANCE'
export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type RejectReason = 'UNREADABLE' | 'CROPPED' | 'WRONG_DOCUMENT' | 'NAME_MISMATCH' | 'BUSINESS_MISMATCH' | 'BUSINESS_CLOSED' | 'VEHICLE_MISMATCH' | 'EXPIRED' | 'CONTRACT_REQUIRED' | 'OTHER'
export type ReviewFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
export type DocumentEventType = 'SUBMITTED' | 'BUSINESS_CHECKED' | 'VIEWED' | 'APPROVED' | 'REJECTED'
export type BusinessCheckResult = 'MATCH' | 'MISMATCH' | 'ERROR' | 'SKIPPED'
export type BusinessStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED'

/**
 * 사업자등록증에 붙는 입력값과 국세청 진위확인 결과 (07 인계서 12장). 조회는 차주가 입력한 값 기준이라 사진과 같은지는 운영자가 본다.
 * 결과는 참고용이고 승인·반려는 운영자가 정한다. attention이면 불일치·휴업·폐업·조회 실패라 눈여겨본다
 */
export interface BusinessCheck {
  businessNumber: string
  openedOn: string
  ownerName: string
  result: BusinessCheckResult | null
  resultLabel: string | null
  status: BusinessStatus | null
  statusLabel: string | null
  taxType: string | null
  closedOn: string | null
  checkedAt: string | null
  summary: string
  attention: boolean
  /** 시연용 가짜 응답 (서버 NTS_STUB=true) */
  stub: boolean
}

/** 서류 한 건. rejectMessage는 차주에게 그대로 보이는 문구 */
export interface DocumentItem {
  id: number
  type: DocumentType
  typeLabel: string
  status: DocumentStatus
  statusLabel: string
  submittedAt: string
  reviewedAt: string | null
  rejectReason: RejectReason | null
  rejectReasonLabel: string | null
  rejectMessage: string | null
  rejectNote: string | null
  /** 사업자등록증에만 있다 */
  businessCheck: BusinessCheck | null
}

/** 서류 종류 하나. latest가 없으면 아직 낸 적 없음. history는 최근 제출이 앞 */
export interface DocumentTypeItem {
  type: DocumentType
  label: string
  required: boolean
  checks: string[]
  latest: DocumentItem | null
  history: DocumentItem[]
}

/** 심사 목록 한 줄 = 차주 한 명 */
export interface ReviewRow {
  driverId: number
  name: string | null
  phone: string | null
  plateNumber: string | null
  approvedRequired: number
  requiredTotal: number
  pendingCount: number
  rejectedCount: number
  verified: boolean
  latestSubmittedAt: string | null
  oldestPendingAt: string | null
  resubmitted: boolean
  /** 사업자등록증이 심사 대기일 때만: 국세청 조회 결과·사업자 상태, 눈여겨볼 건인지 */
  businessCheckResult: BusinessCheckResult | null
  businessStatus: BusinessStatus | null
  businessAttention: boolean
}

export interface ReviewList {
  items: ReviewRow[]
  page: number
  size: number
  totalCount: number
  /** 탭과 상관없이 심사 대기 서류가 있는 차주 수 (메뉴 배지) */
  pendingDrivers: number
}

export interface ReviewEvent {
  id: number
  type: DocumentEventType
  typeLabel: string
  documentId: number
  documentType: DocumentType
  documentTypeLabel: string
  at: string
  actorId: number
  actorName: string | null
  detail: string | null
}

export interface RejectReasonOption {
  code: RejectReason
  label: string
  message: string | null
  noteRequired: boolean
}

export interface DriverReview {
  driver: { id: number; name: string | null; phone: string | null; licenseNumber: string | null; status: string }
  vehicle: { id: number; plateNumber: string; tonnageLabel: string; bodyTypeLabel: string; heightM: number | null } | null
  verified: boolean
  approvedRequired: number
  requiredTotal: number
  documents: DocumentTypeItem[]
  events: ReviewEvent[]
  rejectReasons: RejectReasonOption[]
}

export interface AdminMe {
  id: number
  phone: string | null
  name: string | null
  role: 'DRIVER' | 'BROKER' | 'ADMIN'
  status: string
}

export const adminApi = {
  me: () => api<AdminMe>('/api/users/me'),
  reviews: (params: { status: ReviewFilter; q?: string; page: number; size: number }) =>
    api<ReviewList>('/api/admin/driver-documents', { query: params }),
  driver: (driverId: string | number) => api<DriverReview>(`/api/admin/drivers/${driverId}/documents`),
  /** 서류 사진. 열 때마다 서버가 열람 이력을 남긴다 */
  file: (documentId: number) => apiBlob(`/api/admin/driver-documents/${documentId}/file`),
  approve: (documentId: number) => api<DocumentItem>(`/api/admin/driver-documents/${documentId}/approve`, { method: 'POST' }),
  /** 국세청 진위확인을 다시 한다 (처음 조회가 실패했거나 키를 나중에 넣었을 때). 심사 대기인 사업자등록증만 */
  recheckBusiness: (documentId: number) => api<DocumentItem>(`/api/admin/driver-documents/${documentId}/business-check`, { method: 'POST' }),
  reject: (documentId: number, body: { reasonCode: RejectReason; note?: string }) =>
    api<DocumentItem>(`/api/admin/driver-documents/${documentId}/reject`, { method: 'POST', body }),
}
