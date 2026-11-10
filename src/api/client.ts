/**
 * 서버 호출 한 곳. 토큰을 붙이고, 401이면 refresh 한 번 하고 다시 시도한다.
 * 서버 오류 형식은 { code, message, fieldErrors }로 하나다 (03 어드민 인계 "응답 규칙").
 */

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:8080'

/**
 * /admin 아래는 이에오 운영자 페이지다. 주선사 콘솔과 토큰을 따로 보관해서 두 로그인이 섞이지 않게 한다.
 * 페이지를 처음 열 때의 주소로 정하므로, 운영자 페이지와 주선사 콘솔은 서로 링크하지 않고 주소를 직접 연다
 */
export const ADMIN_SCOPE = window.location.pathname.startsWith('/admin')
const TOKEN_PREFIX = ADMIN_SCOPE ? 'ieo.admin' : 'ieo'
const ACCESS_KEY = `${TOKEN_PREFIX}.accessToken`
const REFRESH_KEY = `${TOKEN_PREFIX}.refreshToken`
const DEVICE_KEY = 'ieo.deviceId'

export interface FieldError {
  field: string
  reason: string
}

/** 서버가 돌려준 오류. message는 화면에 그대로 보여 줘도 되는 한국어 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: FieldError[] = [],
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

/** 브라우저마다 하나. 서버 로그인 API가 기기 id를 요구한다 */
export function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

/** 로그인이 풀렸을 때(refresh도 실패) 화면이 로그인으로 가게 알린다 */
const listeners = new Set<() => void>()
export function onSessionExpired(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** 로그인 없이 부르는 API (/api/auth/**, /api/public/**) */
  auth?: boolean
  query?: Record<string, string | number | boolean | null | undefined>
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options)
  if (response.status === 401 && options.auth !== false && (await refreshTokens())) {
    return parse<T>(await send(path, options))
  }
  return parse<T>(response)
}

/** 사진처럼 바이너리로 받는 API. 토큰을 붙이고 401이면 refresh 한 번 하고 다시 시도한다 */
export async function apiBlob(path: string): Promise<Blob> {
  let response = await send(path, {})
  if (response.status === 401 && (await refreshTokens())) response = await send(path, {})
  if (!response.ok) await parse<never>(response)
  return response.blob()
}

async function send(path: string, { method = 'GET', body, auth = true, query }: RequestOptions) {
  const url = new URL(path, API_BASE)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
    }
  }
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth && tokens.access) headers['Authorization'] = `Bearer ${tokens.access}`
  return fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T
  const text = await response.text()
  const data = text ? JSON.parse(text) : undefined
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.code ?? `HTTP_${response.status}`,
      data?.message ?? '서버와 연결할 수 없어요. 잠시 뒤 다시 시도해 주세요.',
      data?.fieldErrors ?? [],
    )
  }
  return data as T
}

let refreshing: Promise<boolean> | null = null

/** 동시에 여러 요청이 401을 받아도 refresh는 한 번만 */
function refreshTokens(): Promise<boolean> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

async function doRefresh(): Promise<boolean> {
  const refresh = tokens.refresh
  if (!refresh) {
    expire()
    return false
  }
  const response = await send('/api/auth/refresh', { method: 'POST', body: { refreshToken: refresh }, auth: false })
  if (!response.ok) {
    expire()
    return false
  }
  const data = (await response.json()) as { accessToken: string; refreshToken: string }
  tokens.set(data.accessToken, data.refreshToken)
  return true
}

function expire() {
  tokens.clear()
  listeners.forEach((listener) => listener())
}
