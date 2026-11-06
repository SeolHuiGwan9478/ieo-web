import { api } from './client'
import type { DeliveryProofStatus, PaymentType, Tonnage, TripStatus, WaitStatus } from './types'

export type TripTab = 'IN_PROGRESS' | 'SCHEDULED' | 'FINISHED'

export interface WaitProofSummary {
  path: string
  issuedAt: string
  expiresAt: string
  waitMinutes: number | null
  chargeableWaitMinutes: number | null
  chargeableAmount: number | null
  workMinutes: number | null
  stayMinutes: number | null
}

export interface TripStop {
  type: 'PICKUP' | 'DROPOFF'
  siteName: string
  address: string
  lat: number
  lng: number
  plannedAt: string | null
  waitStatus: WaitStatus | null
  arrivedAt: string | null
  workStartedAt: string | null
  departedAt: string | null
  edited: boolean
  waitProof: WaitProofSummary | null
}

export interface Receipt {
  status: DeliveryProofStatus
  signerName: string | null
  signedAt: string | null
  hasPaperPhoto: boolean
  issueNote: string | null
  path: string
  expiresAt: string
}

/** 주선사 콘솔 운행 (서버 BrokerTripResponse) */
export interface Trip {
  id: number
  orderId: number | null
  status: TripStatus
  statusLabel: string
  driverUserId: number
  driverName: string
  driverPhone: string | null
  linkedDriver: boolean
  plateNumber: string
  tonnage: Tonnage
  tonnageLabel: string
  locationVisible: boolean
  location: { lat: number; lng: number; recordedAt: string } | null
  etaAt: string | null
  progressPercent: number | null
  /** 지급운임 (차주) */
  fare: number
  /** 청구운임·수수료·수수료율. 오더에 청구운임을 적었을 때만 */
  billedFare: number | null
  fee: number | null
  feeRate: number | null
  paymentType: PaymentType
  paymentTypeLabel: string
  pickup: TripStop
  dropoff: TripStop
  receipt: Receipt | null
  startedAt: string | null
  completedAt: string | null
  canceledAt: string | null
  createdAt: string
}

export interface TripPage {
  items: Trip[]
  totalCount: number
  page: number
  size: number
}

export const tripsApi = {
  list: (params: { tab: TripTab; page?: number; size?: number }) =>
    api<TripPage>('/api/brokers/me/trips', { query: params }),
  get: (tripId: number) => api<Trip>(`/api/brokers/me/trips/${tripId}`),
}

/** 공개 페이지(인수증·대기 증빙)는 서버가 정적 HTML로 준다 */
export function publicPageUrl(path: string) {
  const base = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:8080'
  return new URL(path, base).toString()
}
