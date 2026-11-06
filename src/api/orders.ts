import { api } from './client'
import type {
  BodyType,
  CancelReason,
  CargoCategory,
  ConfirmMode,
  ConsignmentType,
  DispatchRequestStatus,
  LoadingMethod,
  OrderStatus,
  PaymentType,
  Tonnage,
} from './types'

export interface OrderSite {
  id: number
  name: string
  address: string
  lat: number
  lng: number
}

/** 화주 쪽 숫자. 주선사만 본다 (차주 응답에는 없다). 청구운임을 안 적었으면 billedFare·fee·feeRate가 null */
export interface Billing {
  customerName: string | null
  /** 청구운임(화주에게 받는 돈) */
  billedFare: number | null
  /** 수수료 = 청구운임 − 지급운임 */
  fee: number | null
  /** 수수료율(%) = 수수료 ÷ 청구운임 */
  feeRate: number | null
}

/** 주선사 오더 (서버 OrderResponse) */
export interface Order {
  id: number
  status: OrderStatus
  open: boolean
  brokerId: number
  brokerName: string
  pickup: OrderSite
  dropoff: OrderSite
  pickupFrom: string
  pickupUntil: string
  dropoffBy: string
  cargoCategory: CargoCategory
  cargoCategoryLabel: string
  cargoType: string
  weightKg: number
  tonnage: Tonnage
  tonnageLabel: string
  bodyType: BodyType
  bodyTypeLabel: string
  loadingMethod: LoadingMethod
  loadingMethodLabel: string
  /** 지급운임 (차주에게 주는 돈) */
  fare: number
  paymentType: PaymentType
  paymentTypeLabel: string
  expectedPaymentDays: number
  consignmentType: ConsignmentType
  confirmMode: ConfirmMode
  targetDriverId: number | null
  createdAt: string
  pendingRequestCount: number | null
  billing: Billing | null
}

export interface OrderPage {
  items: Order[]
  totalCount: number
  page: number
  size: number
}

export interface Applicant {
  requestId: number
  status: DispatchRequestStatus
  driverName: string
  plateNumber: string
  tonnage: Tonnage
  tonnageLabel: string
  bodyType: BodyType
  bodyTypeLabel: string
  completedTripCount: number
  lateCancelCount: number
  requestedAt: string
  expiresAt: string
}

export interface SiteInput {
  siteId?: number
  site?: { name: string; address: string; lat: number; lng: number; geofenceRadiusM?: number }
}

export interface CreateOrderRequest {
  pickup: SiteInput
  dropoff: SiteInput
  pickupFrom: string
  pickupUntil: string
  dropoffBy: string
  cargoCategory: CargoCategory
  cargoType: string
  weightKg: number
  tonnage: Tonnage
  bodyType: BodyType
  loadingMethod: LoadingMethod
  /** 지급운임 (차주) */
  fare: number
  /** 청구운임 (화주). 비우고 feeRate를 주면 서버가 지급운임에서 계산한다 */
  billedFare?: number | null
  /** 수수료율(%). billedFare가 있으면 무시 */
  feeRate?: number | null
  customerName?: string | null
  paymentType: PaymentType
  expectedPaymentDays?: number | null
  consignmentType: ConsignmentType
  confirmMode: ConfirmMode
  targetDriverId?: number | null
}

export const ordersApi = {
  list: (params: { status?: OrderStatus | ''; page?: number; size?: number }) =>
    api<OrderPage>('/api/broker/orders', { query: { status: params.status || undefined, page: params.page, size: params.size } }),
  get: (orderId: number) => api<Order>(`/api/broker/orders/${orderId}`),
  create: (body: CreateOrderRequest) => api<Order>('/api/broker/orders', { method: 'POST', body }),
  applicants: (orderId: number) => api<Applicant[]>(`/api/broker/orders/${orderId}/requests`),
  confirm: (orderId: number, requestId: number) =>
    api<Order>(`/api/broker/orders/${orderId}/requests/${requestId}/confirm`, { method: 'POST' }),
  cancel: (orderId: number, body: { reason: CancelReason; memo?: string; reopen: boolean }) =>
    api<Order>(`/api/broker/orders/${orderId}/cancel`, { method: 'POST', body }),
  close: (orderId: number) => api<Order>(`/api/broker/orders/${orderId}/close`, { method: 'POST' }),
}

/** 수수료율(%)로 청구운임 계산: 지급운임 ÷ (1 − 율), 1,000원 단위 반올림. 서버 Order.billedFareFor와 같은 식 */
export function billedFareFor(fare: number, feeRate: number) {
  if (!Number.isFinite(fare) || !Number.isFinite(feeRate) || feeRate < 0 || feeRate >= 100) return null
  return Math.round(fare / (1 - feeRate / 100) / 1000) * 1000
}

/** 수수료율(%) = (청구 − 지급) ÷ 청구, 소수 첫째 자리 */
export function feeRateOf(fare: number, billedFare: number) {
  if (!billedFare) return null
  return Math.round(((billedFare - fare) / billedFare) * 1000) / 10
}
