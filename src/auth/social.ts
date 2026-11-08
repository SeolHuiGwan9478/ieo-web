import type { SocialProvider } from '../api/auth'

/**
 * 소셜 로그인 공급자 연결. 키는 .env(커밋 안 됨)에서 읽는다.
 * - Google: VITE_GOOGLE_CLIENT_ID. Google Identity Services로 ID 토큰을 받는다
 * - 카카오: VITE_KAKAO_JS_KEY. 카카오 JavaScript SDK로 인가 코드를 받아 /login?provider=KAKAO&code=... 로 돌아온다
 * 키가 없으면 버튼은 "준비 중"으로 보이고 눌리지 않는다
 */
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined

export const socialReady: Record<SocialProvider, boolean> = {
  GOOGLE: Boolean(GOOGLE_CLIENT_ID),
  KAKAO: Boolean(KAKAO_JS_KEY),
}

const scripts = new Map<string, Promise<void>>()

function loadScript(src: string): Promise<void> {
  const loading = scripts.get(src)
  if (loading) return loading
  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script')
    el.src = src
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`스크립트를 불러오지 못했어요: ${src}`))
    document.head.appendChild(el)
  })
  scripts.set(src, promise)
  return promise
}

interface GoogleCredential {
  credential: string
}
interface GoogleAccounts {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (r: GoogleCredential) => void; cancel_on_tap_outside?: boolean }) => void
      prompt: (listener?: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean; getNotDisplayedReason: () => string }) => void) => void
    }
  }
}
interface KakaoSdk {
  isInitialized: () => boolean
  init: (key: string) => void
  Auth: { authorize: (options: { redirectUri: string; state?: string }) => void }
}

declare global {
  interface Window {
    google?: GoogleAccounts
    Kakao?: KakaoSdk
  }
}

/** Google 로그인 창을 띄우고 ID 토큰을 돌려준다. 사용자가 닫으면 null */
export async function signInWithGoogle(): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID) throw new Error('Google 로그인은 아직 준비 중이에요.')
  await loadScript('https://accounts.google.com/gsi/client')
  const google = window.google
  if (!google) throw new Error('Google 로그인을 불러오지 못했어요.')
  return new Promise((resolve) => {
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, cancel_on_tap_outside: true, callback: (r) => resolve(r.credential) })
    google.accounts.id.prompt((notice) => {
      if (notice.isNotDisplayed() || notice.isSkippedMoment()) resolve(null)
    })
  })
}

/** 카카오 로그인 페이지로 보낸다. 끝나면 /login?provider=KAKAO&code=... 로 돌아온다 */
export async function signInWithKakao(): Promise<void> {
  if (!KAKAO_JS_KEY) throw new Error('카카오 로그인은 아직 준비 중이에요.')
  await loadScript('https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js')
  const kakao = window.Kakao
  if (!kakao) throw new Error('카카오 로그인을 불러오지 못했어요.')
  if (!kakao.isInitialized()) kakao.init(KAKAO_JS_KEY)
  kakao.Auth.authorize({ redirectUri: `${window.location.origin}/login`, state: 'KAKAO' })
}

/** 카카오에서 돌아온 주소에서 인가 코드를 꺼낸다. 없으면 null */
export function kakaoCodeFromLocation(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('state') === 'KAKAO' ? params.get('code') : null
}
