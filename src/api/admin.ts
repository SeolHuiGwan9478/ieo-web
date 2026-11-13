import { api, apiBlob } from './client'
import type { OrderStatus } from './types'

/**
 * 운영자 서류 심사 (docs/design/07_운영자_서류심사_인계.md 7장·13장). /api/admin/** 은 운영자(ADMIN) 계정만 통과한다.
 * 차주 서류와 주선사 서류는 같은 모양의 응답을 돌려주고, 화면도 src/admin/reviewKinds.tsx의 설정으로 같은 페이지를 쓴다
 */

export type DriverDocumentType = 'BUSINESS_REGISTRATION' | 'VEHICLE_REGISTRATION' | 'DRIVER_LICENSE' | 'FREIGHT_QUALIFICATION' | 'CONSIGNMENT_CONTRACT' | 'CARGO_INSURANCE'
export type BrokerDocumentType = 'BUSINESS_REGISTRATION' | 'BROKER_LICENSE'
export type DocumentType = DriverDocumentType | BrokerDocumentType
export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type RejectReason =
  | 'UNREADABLE'
  | 'CROPPED'
  | 'WRONG_DOCUMENT'
  | 'NAME_MISMATCH'
  | 'COMPANY_MISMATCH'
  | 'BUSINESS_MISMATCH'
  | 'BUSINESS_CLOSED'
  | 'VEHICLE_MISMATCH'
  | 'LICENSE_MISMATCH'
  | 'EXPIRED'
  | 'CONTRACT_REQUIRED'
  | 'OTHER'
export type ReviewFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
export type DocumentEventType = 'SUBMITTED' | 'BUSINESS_CHECKED' | 'VIEWED' | 'APPROVED' | 'REJECTED'
export type BusinessCheckResult = 'MATCH' | 'MISMATCH' | 'ERROR' | 'SKIPPED'
export type BusinessStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED'

/**
 * 사업자등록증에 붙는 입력값과 국세청 진위확인 결과 (07 인계서 12장). 조회는 입력한(또는 등록된) 값 기준이라 사진과 같은지는 운영자가 본다.
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

/** 서류 한 건. rejectMessage는 낸 사람에게 그대로 보이는 문구 */
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

/** 심사 목록 한 줄의 공통 부분 (차주 한 명 또는 회사 하나) */
export interface ReviewRowBase {
  name: string | null
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

export interface DriverReviewRow extends ReviewRowBase {
  driverId: number
  phone: string | null
  plateNumber: string | null
}

export interface BrokerReviewRow extends ReviewRowBase {
  brokerId: number
  businessNumber: string
  licenseNumber: string
  representativeName: string | null
}

export interface ReviewListBase<R> {
  items: R[]
  page: number
  size: number
  totalCount: number
}

/** pendingDrivers는 탭과 상관없이 심사 대기 서류가 있는 차주 수 (메뉴 배지) */
export interface DriverReviewList extends ReviewListBase<DriverReviewRow> {
  pendingDrivers: number
}

export interface BrokerReviewList extends ReviewListBase<BrokerReviewRow> {
  pendingBrokers: number
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

/** 심사 상세의 공통 부분. 서류·이력·반려 사유는 차주와 주선사가 같은 모양이다 */
export interface ReviewDetailBase {
  verified: boolean
  approvedRequired: number
  requiredTotal: number
  documents: DocumentTypeItem[]
  events: ReviewEvent[]
  rejectReasons: RejectReasonOption[]
}

export interface DriverReview extends ReviewDetailBase {
  driver: { id: number; name: string | null; phone: string | null; licenseNumber: string | null; status: string }
  vehicle: { id: number; plateNumber: string; tonnageLabel: string; bodyTypeLabel: string; heightM: number | null } | null
}

export interface BrokerReview extends ReviewDetailBase {
  broker: {
    id: number
    name: string
    businessNumber: string
    licenseNumber: string
    representativeName: string | null
    registeredAt: string
    memberCount: number
    ownerName: string | null
    ownerPhone: string | null
  }
}

/**
 * 재위탁 의심 오더 한 줄 (DSP-041, 03 어드민 인계 4-1). 다른 주선사가 먼저 올린 모집 중 오더와 상하차지(각 500m 안)·상차 시간대가 겹친 오더다.
 * source* 는 먼저 올라온 오더. 서버가 오래된 빌드면 source 쪽 상세가 안 올 수 있어 선택 값으로 둔다
 */
export interface SuspectedOrder {
  orderId: number
  brokerName: string
  sourceOrderId: number
  sourceBrokerName: string | null
  pickupAddress: string
  dropoffAddress: string
  pickupFrom: string
  fare: number
  createdAt: string
  status?: OrderStatus
  cargoType?: string | null
  sourcePickupAddress?: string | null
  sourceDropoffAddress?: string | null
  sourcePickupFrom?: string | null
  sourceFare?: number | null
  sourceCreatedAt?: string | null
  sourceStatus?: OrderStatus | null
  sourceCargoType?: string | null
}

export interface AdminMe {
  id: number
  phone: string | null
  name: string | null
  role: 'DRIVER' | 'BROKER' | 'ADMIN'
  status: string
}

/** 목록 조건. interface가 아니라 type인 이유: api()의 query(Record)에 그대로 넘기려면 색인 서명이 있어야 한다 */
export type ReviewListParams = {
  status: ReviewFilter
  q?: string
  page: number
  size: number
}

export const adminApi = {
  me: () => api<AdminMe>('/api/users/me'),

  /** 재위탁 의심 오더. 최근 등록 순. 서버가 전체 건수를 주지 않아 한 번에 100건까지만 받는다 */
  suspectedOrders: () => api<SuspectedOrder[]>('/api/admin/suspected-orders', { query: { page: 0, size: 100 } }),

  /** 차주 서류 심사 */
  reviews: (params: ReviewListParams) => api<DriverReviewList>('/api/admin/driver-documents', { query: params }),
  driver: (driverId: string | number) => api<DriverReview>(`/api/admin/drivers/${driverId}/documents`),
  /** 서류 사진. 열 때마다 서버가 열람 이력을 남긴다 */
  file: (documentId: number) => apiBlob(`/api/admin/driver-documents/${documentId}/file`),
  approve: (documentId: number) => api<DocumentItem>(`/api/admin/driver-documents/${documentId}/approve`, { method: 'POST' }),
  /** 국세청 진위확인을 다시 한다 (처음 조회가 실패했거나 키를 나중에 넣었을 때). 심사 대기인 사업자등록증만 */
  recheckBusiness: (documentId: number) => api<DocumentItem>(`/api/admin/driver-documents/${documentId}/business-check`, { method: 'POST' }),
  reject: (documentId: number, body: { reasonCode: RejectReason; note?: string }) =>
    api<DocumentItem>(`/api/admin/driver-documents/${documentId}/reject`, { method: 'POST', body }),

  /** 주선사 서류 심사 (07 인계서 13장). 회사 하나가 한 줄 */
  brokerReviews: (params: ReviewListParams) => api<BrokerReviewList>('/api/admin/broker-documents', { query: params }),
  broker: (brokerId: string | number) => api<BrokerReview>(`/api/admin/brokers/${brokerId}/documents`),
  brokerFile: (documentId: number) => apiBlob(`/api/admin/broker-documents/${documentId}/file`),
  brokerApprove: (documentId: number) => api<DocumentItem>(`/api/admin/broker-documents/${documentId}/approve`, { method: 'POST' }),
  brokerRecheckBusiness: (documentId: number) => api<DocumentItem>(`/api/admin/broker-documents/${documentId}/business-check`, { method: 'POST' }),
  brokerReject: (documentId: number, body: { reasonCode: RejectReason; note?: string }) =>
    api<DocumentItem>(`/api/admin/broker-documents/${documentId}/reject`, { method: 'POST', body }),
}
