import type { ReactNode } from 'react'
import {
  adminApi,
  type BrokerReview,
  type BrokerReviewRow,
  type DocumentItem,
  type DriverReview,
  type DriverReviewRow,
  type RejectReason,
  type ReviewDetailBase,
  type ReviewListBase,
  type ReviewListParams,
  type ReviewRowBase,
} from '../api/admin'

/**
 * 심사 화면의 두 갈래: 차주 서류와 주선사 서류 (07 인계서 6장·13장).
 * 목록(AdminReviewsPage)·상세(AdminReviewDetailPage) 페이지는 하나씩이고, 여기 설정으로 제목·API·표 앞 칸·대조 정보 카드만 바꾼다
 */
export type ReviewKind = 'driver' | 'broker'

export interface ReviewKindConfig<R extends ReviewRowBase, D extends ReviewDetailBase> {
  kind: ReviewKind
  /** 메뉴·제목 */
  title: string
  subject: string
  listDescription: string
  detailDescription: string
  searchPlaceholder: string
  listPath: string
  detailPath: (id: number | string) => string
  rowId: (row: R) => number
  /** 표의 앞 칸들. 뒤의 서류 진행·기다린 시간·재제출은 공통 */
  columns: { key: string; header: ReactNode; cell: (row: R) => ReactNode }[]
  emptyMessages: Record<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL', string> & { search: string }
  detailTitle: (data: D) => string
  /** 서류 사진과 나란히 대조할 등록 정보 */
  infoCard: (data: D) => { title: string; items: { label: string; value: ReactNode }[] }
  allDoneMessage: string
  noNextMessage: string
  /** 반려 창 안내. 문구가 누구에게 보이는지 */
  rejectHint: string
  rejectNotePlaceholder: string
  otherReasonError: string
  api: {
    list: (params: ReviewListParams) => Promise<ReviewListBase<R>>
    /** 탭과 상관없이 심사 대기가 있는 차주(회사) 수. 메뉴 배지와 심사 대기 탭 숫자 */
    pendingOf: (list: ReviewListBase<R>) => number
    detail: (id: string) => Promise<D>
    file: (documentId: number) => Promise<Blob>
    approve: (documentId: number) => Promise<DocumentItem>
    reject: (documentId: number, body: { reasonCode: RejectReason; note?: string }) => Promise<DocumentItem>
    recheckBusiness: (documentId: number) => Promise<DocumentItem>
  }
}

const driver: ReviewKindConfig<DriverReviewRow, DriverReview> = {
  kind: 'driver',
  title: '차주 서류 심사',
  subject: '차주',
  listDescription: '차주가 낸 서류를 보고 승인하거나, 사유를 골라 반려해요. 필수 서류 4종이 모두 승인되면 인증된 차주가 돼요.',
  detailDescription: '서류 사진과 앱에 입력된 정보를 나란히 놓고 대조해요. 서류마다 승인하거나 사유를 골라 반려해요.',
  searchPlaceholder: '이름, 휴대폰 뒷자리, 차량 번호',
  listPath: '/admin/reviews',
  detailPath: (id) => `/admin/drivers/${id}`,
  rowId: (row) => row.driverId,
  columns: [
    {
      key: 'driver',
      header: '차주',
      cell: (r) => (
        <div>
          <p className="font-semibold">{r.name ?? '(이름 없음)'}</p>
          <p className="text-[12.5px] text-ink-sub">{r.phone ?? '-'}</p>
        </div>
      ),
    },
    { key: 'plate', header: '차량 번호', cell: (r) => r.plateNumber ?? <span className="text-ink-sub">미등록</span> },
  ],
  emptyMessages: {
    PENDING: '심사를 기다리는 서류가 없어요.',
    APPROVED: '아직 인증된 차주가 없어요.',
    REJECTED: '반려된 서류를 아직 다시 내지 않은 차주가 없어요.',
    ALL: '서류를 낸 차주가 아직 없어요.',
    search: '찾는 차주가 없어요.',
  },
  detailTitle: (data) => data.driver.name ?? '(이름 없음)',
  infoCard: (data) => ({
    title: '앱에 입력된 정보',
    items: [
      { label: '이름', value: data.driver.name ?? '-' },
      { label: '휴대폰', value: data.driver.phone ?? '-' },
      { label: '차량 번호', value: data.vehicle?.plateNumber ?? '미등록' },
      { label: '톤수·차종', value: data.vehicle ? `${data.vehicle.tonnageLabel} ${data.vehicle.bodyTypeLabel}` : '-' },
      { label: '차량 높이', value: data.vehicle?.heightM != null ? `${data.vehicle.heightM}m` : '-' },
      { label: '자격증 번호', value: data.driver.licenseNumber ?? '-' },
    ],
  }),
  allDoneMessage: '이 차주의 서류는 모두 처리했어요.',
  noNextMessage: '심사를 기다리는 다른 차주가 없어요.',
  rejectHint: '고른 사유의 문구가 차주에게 그대로 보여요. 차주는 반려된 서류만 다시 올릴 수 있어요.',
  rejectNotePlaceholder: '차주에게 보이는 글이에요',
  otherReasonError: '기타는 차주에게 보일 사유를 직접 적어 주세요.',
  api: {
    list: adminApi.reviews,
    pendingOf: (list) => ('pendingDrivers' in list ? Number(list.pendingDrivers) : 0),
    detail: adminApi.driver,
    file: adminApi.file,
    approve: adminApi.approve,
    reject: adminApi.reject,
    recheckBusiness: adminApi.recheckBusiness,
  },
}

const broker: ReviewKindConfig<BrokerReviewRow, BrokerReview> = {
  kind: 'broker',
  title: '주선사 서류 심사',
  subject: '주선사',
  listDescription: '주선사 회사가 낸 사업자등록증과 운송주선사업 허가증을 보고 승인하거나, 사유를 골라 반려해요. 둘 다 승인되면 인증된 주선사가 돼요.',
  detailDescription: '서류 사진과 회사 등록 정보를 나란히 놓고 대조해요. 사업자번호·허가 번호·상호·대표자가 사진과 같은지 봐요.',
  searchPlaceholder: '상호, 사업자번호, 허가 번호',
  listPath: '/admin/brokers',
  detailPath: (id) => `/admin/brokers/${id}`,
  rowId: (row) => row.brokerId,
  columns: [
    {
      key: 'broker',
      header: '주선사',
      cell: (r) => (
        <div>
          <p className="font-semibold">{r.name ?? '(상호 없음)'}</p>
          <p className="text-[12.5px] text-ink-sub">{r.representativeName ? `대표 ${r.representativeName}` : '대표자 미등록'}</p>
        </div>
      ),
    },
    {
      key: 'numbers',
      header: '사업자번호 · 허가 번호',
      cell: (r) => (
        <div className="tabular-nums">
          <p>{r.businessNumber}</p>
          <p className="text-[12.5px] text-ink-sub">{r.licenseNumber}</p>
        </div>
      ),
    },
  ],
  emptyMessages: {
    PENDING: '심사를 기다리는 회사 서류가 없어요.',
    APPROVED: '아직 인증된 주선사가 없어요.',
    REJECTED: '반려된 서류를 아직 다시 내지 않은 주선사가 없어요.',
    ALL: '서류를 낸 주선사가 아직 없어요.',
    search: '찾는 주선사가 없어요.',
  },
  detailTitle: (data) => data.broker.name,
  infoCard: (data) => ({
    title: '등록된 회사 정보',
    items: [
      { label: '상호', value: data.broker.name },
      { label: '사업자번호', value: data.broker.businessNumber },
      { label: '허가 번호', value: data.broker.licenseNumber },
      { label: '대표자', value: data.broker.representativeName ?? '미등록' },
      { label: '대표 담당자', value: data.broker.ownerName ? `${data.broker.ownerName} · ${data.broker.ownerPhone ?? '-'}` : '-' },
      { label: '담당자 수', value: `${data.broker.memberCount}명` },
    ],
  }),
  allDoneMessage: '이 회사의 서류는 모두 처리했어요.',
  noNextMessage: '심사를 기다리는 다른 주선사가 없어요.',
  rejectHint: '고른 사유의 문구가 주선사 콘솔의 설정 > 회사 서류에 그대로 보여요. 반려된 서류만 다시 올릴 수 있어요.',
  rejectNotePlaceholder: '주선사 담당자에게 보이는 글이에요',
  otherReasonError: '기타는 주선사에게 보일 사유를 직접 적어 주세요.',
  api: {
    list: adminApi.brokerReviews,
    pendingOf: (list) => ('pendingBrokers' in list ? Number(list.pendingBrokers) : 0),
    detail: adminApi.broker,
    file: adminApi.brokerFile,
    approve: adminApi.brokerApprove,
    reject: adminApi.brokerReject,
    recheckBusiness: adminApi.brokerRecheckBusiness,
  },
}

export const REVIEW_KINDS = { driver, broker }
