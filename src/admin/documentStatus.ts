import type { BusinessCheckResult, BusinessStatus, DocumentStatus, ReviewFilter } from '../api/admin'
import type { Tone } from '../components/ui'

export const DOCUMENT_STATUS: Record<DocumentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: '심사 대기', tone: 'yellow' },
  APPROVED: { label: '승인', tone: 'green' },
  REJECTED: { label: '반려', tone: 'red' },
}

export const REVIEW_TABS: { value: ReviewFilter; label: string }[] = [
  { value: 'PENDING', label: '심사 대기' },
  { value: 'APPROVED', label: '승인' },
  { value: 'REJECTED', label: '반려' },
  { value: 'ALL', label: '전체' },
]

/** 국세청 조회 결과 꼬리표 (목록·상세). 조회 안 함(SKIPPED)은 표시하지 않는다 */
export function businessCheckTag(result: BusinessCheckResult | null | undefined, status: BusinessStatus | null | undefined): { label: string; tone: Tone } | null {
  if (!result || result === 'SKIPPED') return null
  if (result === 'MISMATCH') return { label: '국세청 불일치', tone: 'red' }
  if (result === 'ERROR') return { label: '국세청 조회 실패', tone: 'gray' }
  if (status === 'CLOSED') return { label: '폐업 사업자', tone: 'red' }
  if (status === 'SUSPENDED') return { label: '휴업 사업자', tone: 'red' }
  return { label: '국세청 일치', tone: 'green' }
}
