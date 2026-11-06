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
  fare: number
  paymentType: PaymentType
  paymentTypeLabel: string
  expectedPaymentDays: number
  consignmentType: ConsignmentType
  confirmMode: ConfirmMode
  targetDriverId: number | null
  createdAt: string
  pendingRequestCount: number | null
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
  fare: number
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
