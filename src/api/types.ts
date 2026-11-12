/**
 * 서버 enum. 표기(label)가 응답에 같이 오는 것(xxxLabel)은 그걸 쓰고,
 * 응답에 표기가 없는 enum만 여기서 번역한다.
 */

export type Tonnage = 'TON_1' | 'TON_1_4' | 'TON_2_5' | 'TON_3_5' | 'TON_5' | 'TON_5_AXLE' | 'TON_8' | 'TON_11' | 'TON_14' | 'TON_18' | 'TON_25'
export type BodyType = 'CARGO' | 'WING' | 'BOX' | 'REFRIGERATED' | 'LIFT' | 'ETC'
export type LoadingMethod = 'FORKLIFT' | 'MANUAL'
export type PaymentType = 'PREPAID' | 'COLLECT' | 'RECEIPT'
export type CargoCategory = 'GENERAL' | 'COLD' | 'MOVING' | 'HAZARDOUS' | 'HEAVY' | 'LONG' | 'CONSTRUCTION' | 'FARM' | 'WASTE'
export type ConsignmentType = 'DIRECT' | 'SUBCONTRACT'
export type ConfirmMode = 'SELECT' | 'FIRST'
export type OrderStatus = 'OPEN' | 'ASSIGNED' | 'CLOSED'
export type DispatchRequestStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'WITHDRAWN' | 'CANCELED' | 'EXPIRED'
export type CancelReason = 'VEHICLE_PROBLEM' | 'SCHEDULE_CONFLICT' | 'SHIPPER_CANCELED' | 'CONDITION_CHANGED' | 'OTHER'
export type TripStatus = 'SCHEDULED' | 'TO_PICKUP' | 'AT_PICKUP' | 'IN_TRANSIT' | 'AT_DROPOFF' | 'COMPLETED' | 'CANCELLED'
export type WaitStatus = 'WAITING' | 'WORKING' | 'DONE'
export type WaitRounding = 'UP' | 'DOWN'

/** 등록 폼의 선택지. 표기는 서버 enum의 label과 같게 */
export const TONNAGES: { value: Tonnage; label: string }[] = [
  { value: 'TON_1', label: '1톤' },
  { value: 'TON_1_4', label: '1.4톤' },
  { value: 'TON_2_5', label: '2.5톤' },
  { value: 'TON_3_5', label: '3.5톤' },
  { value: 'TON_5', label: '5톤' },
  { value: 'TON_5_AXLE', label: '5톤 축' },
  { value: 'TON_8', label: '8톤' },
  { value: 'TON_11', label: '11톤' },
  { value: 'TON_14', label: '14톤' },
  { value: 'TON_18', label: '18톤' },
  { value: 'TON_25', label: '25톤' },
]
export const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'CARGO', label: '카고' },
  { value: 'WING', label: '윙바디' },
  { value: 'BOX', label: '탑차' },
  { value: 'REFRIGERATED', label: '냉동·냉장' },
  { value: 'LIFT', label: '리프트' },
  { value: 'ETC', label: '기타' },
]
export const LOADING_METHODS: { value: LoadingMethod; label: string }[] = [
  { value: 'FORKLIFT', label: '지게차' },
  { value: 'MANUAL', label: '수작업' },
]
export const PAYMENT_TYPES: { value: PaymentType; label: string; hint: string }[] = [
  { value: 'PREPAID', label: '선불', hint: '상차지에서 현장 지급' },
  { value: 'COLLECT', label: '착불', hint: '하차지에서 현장 지급' },
  { value: 'RECEIPT', label: '인수증', hint: '인수증 제출 후 정산 주기 안에 지급' },
]
export const CARGO_CATEGORIES: { value: CargoCategory; label: string }[] = [
  { value: 'GENERAL', label: '일반' },
  { value: 'COLD', label: '냉동·냉장' },
  { value: 'MOVING', label: '이사' },
  { value: 'HAZARDOUS', label: '위험물' },
  { value: 'HEAVY', label: '중량물' },
  { value: 'LONG', label: '장척물' },
  { value: 'CONSTRUCTION', label: '건자재' },
  { value: 'FARM', label: '농수산물' },
  { value: 'WASTE', label: '폐기물' },
]
export const CANCEL_REASONS: { value: CancelReason; label: string }[] = [
  { value: 'SHIPPER_CANCELED', label: '화주가 취소함' },
  { value: 'CONDITION_CHANGED', label: '운임·화물 조건이 바뀜' },
  { value: 'SCHEDULE_CONFLICT', label: '일정이 겹침' },
  { value: 'VEHICLE_PROBLEM', label: '차량 고장·사고' },
  { value: 'OTHER', label: '기타' },
]

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: 'blue' | 'green' | 'gray' }> = {
  OPEN: { label: '모집 중', tone: 'blue' },
  ASSIGNED: { label: '배차 확정', tone: 'green' },
  CLOSED: { label: '마감', tone: 'gray' },
}
export const REQUEST_STATUS: Record<DispatchRequestStatus, { label: string; tone: 'blue' | 'green' | 'gray' | 'red' }> = {
  PENDING: { label: '대기 중', tone: 'blue' },
  CONFIRMED: { label: '확정', tone: 'green' },
  DECLINED: { label: '마감됨', tone: 'gray' },
  WITHDRAWN: { label: '차주 철회', tone: 'gray' },
  CANCELED: { label: '취소', tone: 'red' },
  EXPIRED: { label: '만료', tone: 'gray' },
}
export const TRIP_TONE: Record<TripStatus, 'blue' | 'yellow' | 'green' | 'red' | 'gray'> = {
  SCHEDULED: 'gray',
  TO_PICKUP: 'blue',
  AT_PICKUP: 'yellow',
  IN_TRANSIT: 'blue',
  AT_DROPOFF: 'yellow',
  COMPLETED: 'green',
  CANCELLED: 'red',
}
export const WAIT_STATUS: Record<WaitStatus, string> = { WAITING: '대기 중', WORKING: '작업 중', DONE: '이탈' }
export const CONSIGNMENT: Record<ConsignmentType, string> = { DIRECT: '직접 운송', SUBCONTRACT: '재위탁' }
export const CONFIRM_MODE: Record<ConfirmMode, string> = { SELECT: '요청 중 골라서 확정', FIRST: '먼저 요청한 차주 자동 확정' }
