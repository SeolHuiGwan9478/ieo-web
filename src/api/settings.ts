import { api } from './client'
import type { WaitRounding } from './types'

/** 대기비 정책 (WAIT-010~). 없으면 서버가 204 → null */
export interface WaitPolicy {
  id: number
  freeMinutes: number
  unitMinutes: number
  unitAmount: number
  maxAmount: number
  rounding: WaitRounding
  active: boolean
  createdAt: string
}

export interface WaitPolicyInput {
  freeMinutes: number
  unitMinutes: number
  unitAmount: number
  maxAmount: number
  rounding: WaitRounding
}

export const settingsApi = {
  waitPolicy: async () => (await api<WaitPolicy | undefined>('/api/brokers/me/wait-policy')) ?? null,
  replaceWaitPolicy: (body: WaitPolicyInput) => api<WaitPolicy>('/api/brokers/me/wait-policy', { method: 'PUT', body }),
}
