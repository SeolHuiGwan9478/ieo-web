import { api, deviceId } from './client'

export interface TokenResponse {
  accessToken: string
  refreshToken: string
}

export interface PhoneVerifyResponse {
  phoneToken: string
  phoneTokenExpiresAt: string
  accountExists: boolean
  existingAccount: { name: string; role: 'DRIVER' | 'BROKER'; status: string; joinedAt: string; lastLoginAt: string | null } | null
}

/** 가입 때 동의. 주선사는 이용약관·개인정보가 필수 (서버 ConsentType.requiredFor) */
export type ConsentType = 'TERMS' | 'PRIVACY' | 'MARKETING'
export const CONSENT_VERSION = '2026-11'

/**
 * 휴대폰 인증 → 로그인 또는 가입 (01 로그인 설계).
 * 인증번호는 로컬 서버에서는 문자가 아니라 서버 로그의 [문자 발송] 줄에 찍힌다
 */
export const authApi = {
  sendCode: (phone: string) => api<{ demoCode: string; expiresInSeconds: number } | void>('/api/auth/phone/code', { method: 'POST', body: { phone }, auth: false }),
  verify: (phone: string, code: string) =>
    api<PhoneVerifyResponse>('/api/auth/phone/verify', {
      method: 'POST',
      body: { phone, code, deviceId: deviceId() },
      auth: false,
    }),
  login: (phoneToken: string) =>
    api<TokenResponse>('/api/auth/phone/login', { method: 'POST', body: { phoneToken, deviceId: deviceId() }, auth: false }),
  signUp: (phoneToken: string, name: string, consents: Record<ConsentType, boolean>) =>
    api<TokenResponse>('/api/auth/signup', {
      method: 'POST',
      auth: false,
      body: {
        phoneToken,
        deviceId: deviceId(),
        role: 'BROKER',
        name,
        consents: (Object.keys(consents) as ConsentType[]).map((type) => ({ type, version: CONSENT_VERSION, agreed: consents[type] })),
      },
    }),
}
