/**
 * 콘솔 에이전트 대화 모양 (2026-11-14, 시연용 데이터).
 * 메시지 하나는 여러 조각(parts)으로 되어 있다: 생각, 도구 호출, 웹 검색, 이미지 생성, 초안 카드, 글.
 * 서버 API가 붙으면 같은 모양으로 스트리밍 받아 그대로 그린다
 */

export type AgentRole = 'user' | 'assistant'

export interface ThinkingPart {
  kind: 'thinking'
  /** 생각한 시간(초). 진행 중이면 null */
  seconds: number | null
  /** 생각의 흐름을 짧은 줄로 */
  steps: string[]
}

export type ToolStatus = 'running' | 'done' | 'error'

export interface ToolCallPart {
  kind: 'tool'
  /** 서버 도구 이름 (예: orders.parseMessage) */
  name: string
  /** 화면에 보일 이름 (예: 오더 내용 읽기) */
  label: string
  args: Record<string, unknown>
  status: ToolStatus
  /** 끝나면 한 줄 요약 */
  summary?: string
  /** 끝나면 원래 응답 (펼쳐서 본다) */
  result?: unknown
  /** 걸린 시간(ms) */
  ms?: number
}

export interface WebSource {
  title: string
  url: string
  site: string
  snippet: string
  date?: string
}

export interface WebSearchPart {
  kind: 'web_search'
  query: string
  status: ToolStatus
  sources: WebSource[]
}

export interface ImagePart {
  kind: 'image'
  prompt: string
  status: 'generating' | 'done'
  /** 만든 이미지 (data URL 또는 주소) */
  src?: string
  size: string
}

export interface OrderDraftPart {
  kind: 'order_draft'
  pickup: string
  pickupWindow: string
  dropoff: string
  dropoffBy: string
  cargo: string
  vehicle: string
  fare: number
  payment: string
  routeAverage?: number
  regularDriver?: string
}

export interface DriverCandidate {
  name: string
  tag: '단골' | '인증'
  distanceKm: number
  completed: number
  lateCancels: number
  recommended?: boolean
}

export interface DriverComparePart {
  kind: 'driver_compare'
  orderLabel: string
  candidates: DriverCandidate[]
}

export interface MessageDraftPart {
  kind: 'message_draft'
  to: string
  text: string
  tripId?: number
}

export interface TextPart {
  kind: 'text'
  text: string
  /** 웹 검색 출처 번호 [1], [2] */
  citations?: number[]
}

export type AgentPart =
  | ThinkingPart
  | ToolCallPart
  | WebSearchPart
  | ImagePart
  | OrderDraftPart
  | DriverComparePart
  | MessageDraftPart
  | TextPart

export interface AgentMessage {
  id: string
  role: AgentRole
  /** 사람 메시지는 글 하나, 에이전트 메시지는 여러 조각 */
  parts: AgentPart[]
  at: string
}

export interface AgentThread {
  id: string
  title: string
  at: string
  messages: AgentMessage[]
}
