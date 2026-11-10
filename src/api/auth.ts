import { api, deviceId } from './client'

export interface TokenResponse {
  accessToken: string
  refreshToken: string
}

export interface ExistingAccount {
  name: string
  role: 'DRIVER' | 'BROKER' | 'ADMIN'
  status: string
  joinedAt: string
  lastLoginAt: string | null
}

export interface PhoneVerifyResponse {
  phoneToken: string
  phoneTokenExpiresAt: string
  accountExists: boolean
  existingAccount: ExistingAccount | null
}

/** 소셜 로그인 공급자. 서버의 /api/auth/social/* 가 받는 값 */
export type SocialProvider = 'GOOGLE' | 'KAKAO'

/** 소셜 인증 확인 결과. 휴대폰 인증(PhoneVerifyResponse)과 같은 흐름으로 쓰도록 모양을 맞춘다 */
export interface SocialVerifyResponse {
  socialToken: string
  accountExists: boolean
  existingAccount: ExistingAccount | null
}

/** 가입에 쓰는 인증 토큰. 휴대폰 인증은 필수, 소셜로 들어왔으면 socialToken도 함께 보낸다 */
export type SignUpCredential = { phoneToken: string; socialToken?: string }

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
  /**
   * 소셜 로그인. 공급자가 준 토큰(Google은 ID 토큰, 카카오는 인가 코드)을 서버가 확인한다.
   * 서버: POST /api/auth/social/verify → socialToken, POST /api/auth/social/login.
   * 처음 오는 소셜 계정은 휴대폰 인증까지 마친 뒤 /api/auth/signup에 phoneToken과 socialToken을 함께 보낸다.
   * 그 번호로 가입한 계정이 이미 있으면 서버가 그 계정에 소셜 계정을 연결하고 로그인시킨다
   */
  socialVerify: (provider: SocialProvider, token: string) =>
    api<SocialVerifyResponse>('/api/auth/social/verify', {
      method: 'POST',
      // 카카오는 인가 코드를 받을 때 쓴 주소(redirectUri)가 같아야 토큰으로 바꿀 수 있다
      body: { provider, token, deviceId: deviceId(), redirectUri: provider === 'KAKAO' ? `${window.location.origin}/login` : undefined },
      auth: false,
    }),
  socialLogin: (socialToken: string) =>
    api<TokenResponse>('/api/auth/social/login', { method: 'POST', body: { socialToken, deviceId: deviceId() }, auth: false }),
  signUp: (credential: SignUpCredential, name: string, consents: Record<ConsentType, boolean>) =>
    api<TokenResponse>('/api/auth/signup', {
      method: 'POST',
      auth: false,
      body: {
        ...credential,
        deviceId: deviceId(),
        role: 'BROKER',
        name,
        consents: (Object.keys(consents) as ConsentType[]).map((type) => ({ type, version: CONSENT_VERSION, agreed: consents[type] })),
      },
    }),
}
