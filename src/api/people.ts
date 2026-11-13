import { api } from './client'
import type { BodyType, Tonnage } from './types'
import type { MemberPosition } from './broker'

/** 담당자 (BRK-001 담당자 여러 명) */
export interface Member {
  userId: number
  name: string
  phone: string
  position: MemberPosition
  positionLabel: string
  me: boolean
  joinedAt: string
}

export interface SentInvitation {
  id: number
  phone: string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED' | 'EXPIRED'
  statusLabel: string
  invitedByName: string
  createdAt: string
  expiresAt: string
}

export const membersApi = {
  list: () => api<Member[]>('/api/brokers/me/members'),
  changePosition: (userId: number, position: MemberPosition) =>
    api<Member>(`/api/brokers/me/members/${userId}`, { method: 'PATCH', body: { position } }),
  remove: (userId: number) => api<void>(`/api/brokers/me/members/${userId}/remove`, { method: 'POST' }),
  leave: () => api<void>('/api/brokers/me/leave', { method: 'POST' }),
  invitations: () => api<SentInvitation[]>('/api/brokers/me/invitations'),
  invite: (phone: string) => api<SentInvitation>('/api/brokers/me/invitations', { method: 'POST', body: { phone } }),
  cancelInvitation: (id: number) => api<void>(`/api/brokers/me/invitations/${id}/cancel`, { method: 'POST' }),
}

/** 단골 차주 (BRK-002) */
export interface LinkedDriver {
  linkId: number
  driverUserId: number
  name: string
  phone: string
  plateNumber: string | null
  tonnage: Tonnage | null
  tonnageLabel: string | null
  bodyType: BodyType | null
  bodyTypeLabel: string | null
  linkedAt: string
  /** 필수 서류가 모두 승인된 인증 차주 (07 인계서 14장) */
  verified: boolean
  /** 이에오에서 완료한 운행 수, 상차 2시간 안에 차주가 취소한 수 (DSP-031) */
  completedTripCount: number
  lateCancelCount: number
}

export interface SentDriverInvitation {
  id: number
  phone: string
  status: 'PENDING' | 'LINKED' | 'DECLINED' | 'CANCELED' | 'UNLINKED' | 'EXPIRED'
  statusLabel: string
  invitedByName: string
  createdAt: string
  expiresAt: string
}

export const driversApi = {
  list: () => api<LinkedDriver[]>('/api/brokers/me/drivers'),
  unlink: (linkId: number) => api<void>(`/api/brokers/me/drivers/${linkId}/unlink`, { method: 'POST' }),
  invitations: () => api<SentDriverInvitation[]>('/api/brokers/me/driver-invitations'),
  invite: (phone: string) => api<SentDriverInvitation>('/api/brokers/me/driver-invitations', { method: 'POST', body: { phone } }),
  cancelInvitation: (linkId: number) => api<void>(`/api/brokers/me/driver-invitations/${linkId}/cancel`, { method: 'POST' }),
}
