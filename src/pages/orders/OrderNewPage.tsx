import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { fareFor, feeRateOf, ordersApi, type CreateOrderRequest, type Order } from '../../api/orders'
import type { MyBroker } from '../../api/broker'
import { driversApi } from '../../api/people'
import { ApiError } from '../../api/client'
import { addressesApi, savedAddressesApi, type SavedAddress, type SaveAddressInput } from '../../api/addresses'
import { AddressSearch } from '../../components/AddressSearch'
import type { PostcodeResult } from '../../lib/postcode'
import { BODY_TYPES, CARGO_CATEGORIES, CONFIRM_MODE, CONSIGNMENT, LOADING_METHODS, PAYMENT_TYPES, TONNAGES } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { CompanyVerificationNotice } from '../../components/CompanyVerificationNotice'
import { Button, Card, ChipGroup, ErrorText, Field, LinkButton, Loading, PageHeader, SelectField, ToggleField } from '../../components/ui'
import { formatDateTime, formatWon, localInputValue } from '../../lib/format'

/**
 * 오더 등록·수정·복사 (DSP-001, BRK-010, DSP-004). 서버가 요구하는 항목은 그대로 두고 타이핑을 줄인다.
 * - 상하차지: 직접 입력을 기본으로 하고 자주 쓰는 주소는 별도 드롭다운으로 불러온다
 * - 시간: 상차 날짜·시각 하나와 "상차 가능 폭", "하차 기한"을 고르면 세 시각이 계산된다
 * - 운임: 주선사가 일하는 순서대로. 화주 계약가(청구운임)와 수수료율을 적으면 차주 지급운임이 채워진다. 지급운임만 적어도 된다
 * - 결제·운송 형태·확정 방식·거래처: 회사 기본값으로 접어 둔다
 * - 수정(/orders/:id/edit): 모집 중이면 전부 고치고, 확정 뒤에는 거래처·청구운임만 (나머지는 잠근다)
 * - 복사(/orders/new?from=id): 지난 오더의 조건을 그대로 채우고 상차 날짜만 오늘·내일로 옮긴다
 */
type PickupWindow = 'EXACT' | 'HOURS_2' | 'SAME_DAY' | 'CUSTOM'
type DropoffDeadline = 'SAME_DAY' | 'NEXT_MORNING' | 'CUSTOM'

const PICKUP_WINDOWS: { value: PickupWindow; label: string }[] = [
  { value: 'EXACT', label: '정시' },
  { value: 'HOURS_2', label: '2시간 안' },
  { value: 'SAME_DAY', label: '당일 아무 때나' },
  { value: 'CUSTOM', label: '직접 정하기' },
]
const DROPOFF_DEADLINES: { value: DropoffDeadline; label: string }[] = [
  { value: 'SAME_DAY', label: '당일' },
  { value: 'NEXT_MORNING', label: '다음날 오전 9시' },
  { value: 'CUSTOM', label: '직접 정하기' },
]

interface FormValues {
  pickupName: string
  pickupAddress: string
  pickupDetailAddress: string
  pickupLat: string
  pickupLng: string
  dropoffName: string
  dropoffAddress: string
  dropoffDetailAddress: string
  dropoffLat: string
  dropoffLng: string
  /** YYYY-MM-DD */
  pickupDate: string
  /** HH:mm */
  pickupTime: string
  pickupWindow: PickupWindow
  /** 상차 마감을 직접 정할 때만 (datetime-local) */
  pickupUntil: string
  dropoffDeadline: DropoffDeadline
  /** 하차 기한을 직접 정할 때만 (datetime-local) */
  dropoffBy: string
  cargoCategory: CreateOrderRequest['cargoCategory']
  cargoType: string
  weightKg: string
  tonnage: CreateOrderRequest['tonnage']
  bodyType: CreateOrderRequest['bodyType']
  loadingMethod: CreateOrderRequest['loadingMethod']
  /** 청구운임 (화주와 계약한 금액). 비워도 된다 */
  billedFare: string
  feeRate: string
  /** 지급운임 (차주에게). 차주 화면에 보인다 */
  fare: string
  customerName: string
  paymentType: CreateOrderRequest['paymentType']
  expectedPaymentDays: string
  consignmentType: CreateOrderRequest['consignmentType']
  confirmMode: CreateOrderRequest['confirmMode']
  targetDriverId: string
}

type SitePrefix = 'pickup' | 'dropoff'

/** 상차 시작·마감. 정시는 30분 폭, 당일은 자정 직전까지, 직접 정하면 적은 시각. 비어 있거나 잘못됐으면 null */
function pickupRange(date: string, time: string, window: PickupWindow, custom: string): { from: Date; until: Date } | null {
  if (!date || !time) return null
  const from = new Date(`${date}T${time}`)
  if (Number.isNaN(from.getTime())) return null
  if (window === 'CUSTOM') {
    if (!custom) return null
    const until = new Date(custom)
    return Number.isNaN(until.getTime()) ? null : { from, until }
  }
  const until = new Date(from)
  if (window === 'EXACT') until.setMinutes(until.getMinutes() + 30)
  else if (window === 'HOURS_2') until.setHours(until.getHours() + 2)
  else until.setHours(23, 59, 0, 0)
  return { from, until }
}

/** 저장된 상차 시작·마감이 어느 칩인지. 맞는 칩이 없으면 직접 정하기 */
function detectPickupWindow(from: Date, until: Date): PickupWindow {
  const diff = until.getTime() - from.getTime()
  if (diff === 30 * 60_000) return 'EXACT'
  if (diff === 2 * 3600_000) return 'HOURS_2'
  const endOfDay = new Date(from)
  endOfDay.setHours(23, 59, 0, 0)
  return until.getTime() === endOfDay.getTime() ? 'SAME_DAY' : 'CUSTOM'
}

/** 저장된 하차 기한이 어느 칩인지 */
function detectDeadline(from: Date, by: Date): DropoffDeadline {
  const sameDay = new Date(from)
  sameDay.setHours(23, 59, 0, 0)
  if (by.getTime() === sameDay.getTime()) return 'SAME_DAY'
  const nextMorning = new Date(from)
  nextMorning.setDate(nextMorning.getDate() + 1)
  nextMorning.setHours(9, 0, 0, 0)
  return by.getTime() === nextMorning.getTime() ? 'NEXT_MORNING' : 'CUSTOM'
}

/**
 * 기존 오더를 폼 값으로. 수정은 그대로, 복사는 상차 날짜만 오늘(한 시간 안이면 내일)로 옮기고 시각과 조건은 그대로 둔다.
 * 상세주소는 따로 저장되지 않아 주소 한 칸에 들어 있다
 */
function valuesFromOrder(order: Order, me: MyBroker | undefined, copy: boolean): FormValues {
  const from = new Date(order.pickupFrom)
  const until = new Date(order.pickupUntil)
  const by = new Date(order.dropoffBy)
  let start = from
  if (copy) {
    start = new Date()
    start.setHours(from.getHours(), from.getMinutes(), 0, 0)
    if (start.getTime() < Date.now() + 3600_000) start.setDate(start.getDate() + 1)
  }
  const shift = start.getTime() - from.getTime()
  const window = detectPickupWindow(from, until)
  const deadline = detectDeadline(from, by)
  const billing = order.billing
  return {
    pickupName: order.pickup.name,
    pickupAddress: order.pickup.address,
    pickupDetailAddress: '',
    pickupLat: String(order.pickup.lat),
    pickupLng: String(order.pickup.lng),
    dropoffName: order.dropoff.name,
    dropoffAddress: order.dropoff.address,
    dropoffDetailAddress: '',
    dropoffLat: String(order.dropoff.lat),
    dropoffLng: String(order.dropoff.lng),
    pickupDate: localInputValue(start).slice(0, 10),
    pickupTime: localInputValue(start).slice(11, 16),
    pickupWindow: window,
    pickupUntil: window === 'CUSTOM' ? localInputValue(new Date(until.getTime() + shift)) : '',
    dropoffDeadline: deadline,
    dropoffBy: deadline === 'CUSTOM' ? localInputValue(new Date(by.getTime() + shift)) : '',
    cargoCategory: order.cargoCategory,
    cargoType: order.cargoType,
    weightKg: String(order.weightKg),
    tonnage: order.tonnage,
    bodyType: order.bodyType,
    loadingMethod: order.loadingMethod,
    billedFare: billing?.billedFare != null ? String(billing.billedFare) : '',
    feeRate: billing?.feeRate != null ? String(billing.feeRate) : me?.defaultFeeRate ? String(me.defaultFeeRate) : '',
    fare: String(order.fare),
    customerName: billing?.customerName ?? '',
    paymentType: order.paymentType,
    expectedPaymentDays: String(order.expectedPaymentDays),
    consignmentType: order.consignmentType,
    confirmMode: order.confirmMode,
    targetDriverId: order.targetDriverId ? String(order.targetDriverId) : '',
  }
}

/** 확정 뒤 수정: 차주가 본 조건은 저장된 그대로 보내고, 거래처·청구운임만 폼에서 가져온다 */
function requestFromOrder(order: Order, v: FormValues): CreateOrderRequest {
  return {
    pickup: { siteId: order.pickup.id },
    dropoff: { siteId: order.dropoff.id },
    pickupFrom: order.pickupFrom,
    pickupUntil: order.pickupUntil,
    dropoffBy: order.dropoffBy,
    cargoCategory: order.cargoCategory,
    cargoType: order.cargoType,
    weightKg: order.weightKg,
    tonnage: order.tonnage,
    bodyType: order.bodyType,
    loadingMethod: order.loadingMethod,
    fare: order.fare,
    billedFare: v.billedFare !== '' ? Number(v.billedFare) : null,
    feeRate: null,
    customerName: v.customerName.trim() || null,
    paymentType: order.paymentType,
    expectedPaymentDays: order.expectedPaymentDays,
    consignmentType: order.consignmentType,
    confirmMode: order.confirmMode,
    targetDriverId: order.targetDriverId,
  }
}

/** 하차 기한. 당일은 상차일 자정 직전, 다음날은 오전 9시, 직접 정하면 적은 시각 */
function dropoffDeadlineAt(from: Date, deadline: DropoffDeadline, custom: string): Date | null {
  if (deadline === 'CUSTOM') {
    if (!custom) return null
    const d = new Date(custom)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(from)
  if (deadline === 'SAME_DAY') d.setHours(23, 59, 0, 0)
  else {
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
  }
  return d
}

/** 지금부터 2시간 뒤를 30분 단위로 올린 시각 */
function defaultPickupStart() {
  const d = new Date(Date.now() + 2 * 3600_000)
  d.setMinutes(d.getMinutes() + ((30 - (d.getMinutes() % 30)) % 30), 0, 0)
  return d
}

export function OrderNewPage({ mode = 'create' }: { mode?: 'create' | 'edit' }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { me } = useAuth()
  const params = useParams()
  const [search] = useSearchParams()
  /** 고칠 오더. 등록 화면이면 null */
  const editingId = mode === 'edit' && params.orderId ? Number(params.orderId) : null
  /** 복사해 올릴 원본 오더 (/orders/new?from=id) */
  const copyingId = mode === 'create' && search.get('from') ? Number(search.get('from')) : null
  const sourceId = editingId ?? copyingId
  const source = useQuery({ queryKey: ['orders', sourceId], queryFn: () => ordersApi.get(sourceId as number), enabled: sourceId !== null })
  /** 대기 중 요청이 있거나 배차가 확정된 오더: 거래처·청구운임만 고칠 수 있고 나머지는 잠근다 (서버도 막는다) */
  const assigned = editingId !== null && source.data?.status === 'ASSIGNED'
  const waitingRequests = editingId !== null && !assigned ? (source.data?.pendingRequestCount ?? 0) : 0
  const locked = assigned || waitingRequests > 0
  const [error, setError] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [savedChoice, setSavedChoice] = useState({ pickup: '', dropoff: '' })
  const [savedNotice, setSavedNotice] = useState<Record<SitePrefix, string | null>>({ pickup: null, dropoff: null })
  const [savedError, setSavedError] = useState<Record<SitePrefix, string | null>>({ pickup: null, dropoff: null })
  const [searchingSite, setSearchingSite] = useState<SitePrefix | null>(null)
  const [locating, setLocating] = useState({ pickup: false, dropoff: false })
  const [locationError, setLocationError] = useState<Record<SitePrefix, string | null>>({ pickup: null, dropoff: null })
  const requestVersion = useRef({ pickup: 0, dropoff: 0 })
  useEffect(() => () => { requestVersion.current.pickup++; requestVersion.current.dropoff++ }, [])

  const savedKey = ['saved-addresses', me?.id] as const
  const savedAddresses = useQuery({ queryKey: savedKey, queryFn: savedAddressesApi.list, enabled: Boolean(me) })
  const saveAddress = useMutation({
    mutationFn: ({ body }: { prefix: SitePrefix; body: SaveAddressInput }) => savedAddressesApi.save(body),
    onSuccess: (saved, { prefix }) => {
      queryClient.setQueryData<SavedAddress[]>(savedKey, (old = []) => [saved, ...old.filter((item) => item.id !== saved.id)])
      setSavedChoice((s) => ({ ...s, [prefix]: String(saved.id) }))
      setSavedNotice((s) => ({ ...s, [prefix]: '자주 쓰는 주소에 저장했어요.' }))
      setSavedError((s) => ({ ...s, [prefix]: null }))
    },
    onError: (e, { prefix }) => setSavedError((s) => ({ ...s, [prefix]: e instanceof ApiError ? e.message : '주소를 저장하지 못했어요. 서버 연결을 확인해 주세요.' })),
  })
  const removeAddress = useMutation({
    mutationFn: ({ id }: { prefix: SitePrefix; id: number }) => savedAddressesApi.remove(id),
    onSuccess: (_, { prefix, id }) => {
      queryClient.setQueryData<SavedAddress[]>(savedKey, (old = []) => old.filter((item) => item.id !== id))
      setSavedChoice((s) => ({ pickup: s.pickup === String(id) ? '' : s.pickup, dropoff: s.dropoff === String(id) ? '' : s.dropoff }))
      setSavedNotice((s) => ({ ...s, [prefix]: '저장을 해제했어요. 작성 중인 주소는 유지돼요.' }))
      setSavedError((s) => ({ ...s, [prefix]: null }))
    },
    onError: (e, { prefix }) => setSavedError((s) => ({ ...s, [prefix]: e instanceof ApiError ? e.message : '저장 해제를 완료하지 못했어요.' })),
  })

  const drivers = useQuery({ queryKey: ['drivers'], queryFn: driversApi.list })

  const start = useMemo(defaultPickupStart, [])
  const { register, handleSubmit, watch, setValue, getValues, clearErrors, reset, formState, setError: setFieldError } = useForm<FormValues>({
    defaultValues: {
      pickupName: '',
      pickupAddress: '',
      pickupDetailAddress: '',
      pickupLat: '',
      pickupLng: '',
      dropoffName: '',
      dropoffAddress: '',
      dropoffDetailAddress: '',
      dropoffLat: '',
      dropoffLng: '',
      pickupDate: localInputValue(start).slice(0, 10),
      pickupTime: localInputValue(start).slice(11, 16),
      pickupWindow: 'HOURS_2',
      pickupUntil: '',
      dropoffDeadline: 'SAME_DAY',
      dropoffBy: '',
      cargoCategory: 'GENERAL',
      cargoType: '',
      weightKg: '',
      tonnage: 'TON_5',
      bodyType: 'CARGO',
      loadingMethod: 'FORKLIFT',
      billedFare: '',
      feeRate: me?.defaultFeeRate ? String(me.defaultFeeRate) : '',
      fare: '',
      customerName: '',
      paymentType: 'RECEIPT',
      expectedPaymentDays: String(me?.settlementDays ?? 30),
      consignmentType: 'DIRECT',
      confirmMode: 'SELECT',
      targetDriverId: '',
    },
  })
  const locateAddress = useCallback(async (prefix: SitePrefix, address: string) => {
    const version = ++requestVersion.current[prefix]
    setValue(`${prefix}Lat`, '')
    setValue(`${prefix}Lng`, '')
    setLocating((s) => ({ ...s, [prefix]: true }))
    setLocationError((s) => ({ ...s, [prefix]: null }))
    try {
      const result = await addressesApi.geocode(address)
      if (version !== requestVersion.current[prefix] || getValues(`${prefix}Address`) !== address) return
      setValue(`${prefix}Lat`, String(result.lat), { shouldValidate: true })
      setValue(`${prefix}Lng`, String(result.lng), { shouldValidate: true })
    } catch (e) {
      if (version !== requestVersion.current[prefix]) return
      setLocationError((s) => ({ ...s, [prefix]: e instanceof ApiError ? e.message : '위치를 조회하지 못했어요. 서버 연결을 확인하고 다시 시도해 주세요.' }))
    } finally {
      if (version === requestVersion.current[prefix]) setLocating((s) => ({ ...s, [prefix]: false }))
    }
  }, [getValues, setValue])

  const selectAddress = useCallback((result: PostcodeResult) => {
    if (!searchingSite) return
    const prefix = searchingSite
    setSavedChoice((s) => ({ ...s, [prefix]: '' }))
    setSavedNotice((s) => ({ ...s, [prefix]: null }))
    setSavedError((s) => ({ ...s, [prefix]: null }))
    const address = (result.userSelectedType === 'R' ? result.roadAddress : result.jibunAddress) || result.address
    setValue(`${prefix}Address`, address, { shouldDirty: true, shouldValidate: true })
    setValue(`${prefix}DetailAddress`, '')
    if (!getValues(`${prefix}Name`).trim() && result.buildingName) {
      setValue(`${prefix}Name`, result.buildingName, { shouldDirty: true, shouldValidate: true })
    }
    clearErrors([`${prefix}Lat`, `${prefix}Lng`])
    setSearchingSite(null)
    void locateAddress(prefix, address)
  }, [searchingSite, getValues, setValue, clearErrors, locateAddress])
  const applySavedAddress = (prefix: SitePrefix, id: string) => {
    const saved = savedAddresses.data?.find((item) => String(item.id) === id)
    setSavedChoice((s) => ({ ...s, [prefix]: id }))
    setSavedNotice((s) => ({ ...s, [prefix]: null }))
    setSavedError((s) => ({ ...s, [prefix]: null }))
    if (!saved) return
    requestVersion.current[prefix]++
    setLocating((s) => ({ ...s, [prefix]: false }))
    setLocationError((s) => ({ ...s, [prefix]: null }))
    setSearchingSite(null)
    for (const [field, value] of Object.entries({ Name: saved.name, Address: saved.address, DetailAddress: saved.detailAddress, Lat: String(saved.lat), Lng: String(saved.lng) })) {
      setValue(`${prefix}${field}` as keyof FormValues, value, { shouldDirty: true, shouldValidate: true })
    }
    clearErrors([`${prefix}Name`, `${prefix}Address`, `${prefix}DetailAddress`, `${prefix}Lat`, `${prefix}Lng`])
    setSavedError((s) => ({ ...s, [prefix]: null }))
    setSavedNotice((s) => ({ ...s, [prefix]: '저장한 주소와 상세주소를 불러왔어요.' }))
  }

  const saveCurrentAddress = (prefix: SitePrefix) => {
    const name = getValues(`${prefix}Name`).trim()
    const address = getValues(`${prefix}Address`).trim()
    const detailAddress = getValues(`${prefix}DetailAddress`).trim()
    const latText = getValues(`${prefix}Lat`)
    const lngText = getValues(`${prefix}Lng`)
    if (!name || !address || !latText || !lngText || locating[prefix]) {
      setSavedError((s) => ({ ...s, [prefix]: '이름을 입력하고 주소 검색으로 위치를 확인한 뒤 저장해 주세요.' }))
      return
    }
    if ([address, detailAddress].filter(Boolean).join(' ').length > 200) {
      setSavedError((s) => ({ ...s, [prefix]: '기본 주소와 상세주소를 합쳐 200자 이내로 입력해 주세요.' }))
      return
    }
    setSavedNotice((s) => ({ ...s, [prefix]: null }))
    setSavedError((s) => ({ ...s, [prefix]: null }))
    saveAddress.mutate({ prefix, body: { name, address, detailAddress, lat: Number(latText), lng: Number(lngText) } })
  }
  const pickupDate = watch('pickupDate')
  const pickupTime = watch('pickupTime')
  const pickupWindow = watch('pickupWindow')
  const pickupUntilCustom = watch('pickupUntil')
  const deadlineChoice = watch('dropoffDeadline')
  const dropoffBy = watch('dropoffBy')
  const cargoCategory = watch('cargoCategory')
  const billedFare = watch('billedFare')
  const feeRate = watch('feeRate')
  const fare = watch('fare')
  const paymentType = watch('paymentType')
  const expectedPaymentDays = watch('expectedPaymentDays')
  const consignmentType = watch('consignmentType')
  const confirmMode = watch('confirmMode')
  const targetDriverId = watch('targetDriverId')
  const customerName = watch('customerName')
  const errorOf = (field: keyof FormValues) => formState.errors[field]?.message

  // 청구운임과 수수료율을 적으면 지급운임을 채운다. 지급운임을 직접 고친 뒤에는 건드리지 않는다
  const [fareTouched, setFareTouched] = useState(false)
  useEffect(() => {
    if (locked || fareTouched || billedFare === '' || feeRate === '') return
    const computed = fareFor(Number(billedFare), Number(feeRate))
    setValue('fare', computed === null ? '' : String(computed), { shouldValidate: formState.isSubmitted })
  }, [locked, billedFare, feeRate, fareTouched, setValue, formState.isSubmitted])

  // 기존 오더를 불러오면 폼을 그 값으로 채운다 (오더마다 한 번). 저장된 지급운임을 지키려고 자동 계산은 멈춘다
  const loadedFrom = useRef<number | null>(null)
  useEffect(() => {
    if (!source.data || sourceId === null || loadedFrom.current === sourceId) return
    loadedFrom.current = sourceId
    reset(valuesFromOrder(source.data, me ?? undefined, copyingId !== null))
    setFareTouched(true)
  }, [source.data, sourceId, copyingId, me, reset])
  const fee = billedFare !== '' && fare !== '' ? Number(billedFare) - Number(fare) : null
  const actualFeeRate = fee === null ? null : feeRateOf(Number(fare), Number(billedFare))
  const fareHint =
    fee !== null
      ? fee < 0
        ? '청구운임보다 많아요. 수수료가 마이너스예요.'
        : `수수료 ${formatWon(fee)}${actualFeeRate !== null ? ` · ${actualFeeRate}%` : ''}. 차주 화면에는 지급운임만 보여요.`
      : feeRate !== ''
        ? `청구운임을 비우면 수수료율 ${feeRate}%로 청구운임을 어림해 적어 둬요.`
        : '차주 화면에 보이는 금액이에요.'

  // 냉동·냉장 화물은 차종도 냉동·냉장이어야 서버가 받는다
  useEffect(() => {
    if (cargoCategory === 'COLD') setValue('bodyType', 'REFRIGERATED')
  }, [cargoCategory, setValue])

  const range = pickupRange(pickupDate, pickupTime, pickupWindow, pickupUntilCustom)
  const deadline = range ? dropoffDeadlineAt(range.from, deadlineChoice, dropoffBy) : null
  const timeSummary = range
    ? `${formatDateTime(range.from.toISOString())}부터 ${formatDateTime(range.until.toISOString())}까지 상차${
        deadline ? ` · ${formatDateTime(deadline.toISOString())}까지 하차` : ''
      }`
    : null

  const paymentLabel = PAYMENT_TYPES.find((p) => p.value === paymentType)?.label ?? ''
  const advancedSummary = [
    paymentType === 'RECEIPT' ? `${paymentLabel} · 전달 뒤 ${expectedPaymentDays || me?.settlementDays || 30}일 지급` : paymentLabel,
    CONSIGNMENT[consignmentType],
    targetDriverId ? '단골 차주 지정' : `마켓 공개 · ${CONFIRM_MODE[confirmMode]}`,
    customerName ? `거래처 ${customerName}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const saved = (order: Order) => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    navigate(`/orders/${order.id}`)
  }
  const failed = (e: unknown) => {
    if (e instanceof ApiError) {
      e.fieldErrors.forEach((f) => setFieldError(f.field as keyof FormValues, { message: f.reason }))
      setError(e.message)
    } else setError('서버와 연결할 수 없어요.')
  }
  const create = useMutation({ mutationFn: (body: CreateOrderRequest) => ordersApi.create(body), onSuccess: saved, onError: failed })
  const update = useMutation({ mutationFn: (body: CreateOrderRequest) => ordersApi.update(editingId as number, body), onSuccess: saved, onError: failed })
  const submitting = create.isPending || update.isPending

  const siteInput = (prefix: SitePrefix, v: FormValues) => {
    return { site: { name: v[`${prefix}Name`].trim(), address: [v[`${prefix}Address`].trim(), v[`${prefix}DetailAddress`].trim()].filter(Boolean).join(' '), lat: Number(v[`${prefix}Lat`]), lng: Number(v[`${prefix}Lng`]) } }
  }

  const onSubmit = (v: FormValues) => {
    if (locked && source.data) {
      update.mutate(requestFromOrder(source.data, v))
      return
    }
    for (const prefix of ['pickup', 'dropoff'] as const) {
      if (!v[`${prefix}Lat`] || !v[`${prefix}Lng`] || locating[prefix]) {
        return setFieldError(`${prefix}Address`, { message: '주소 검색으로 위치를 확인해 주세요.' })
      }
      if ([v[`${prefix}Address`].trim(), v[`${prefix}DetailAddress`].trim()].filter(Boolean).join(' ').length > 200) {
        return setFieldError(`${prefix}DetailAddress`, { message: '기본 주소와 상세주소를 합쳐 200자 이내로 입력해 주세요.' })
      }
    }
    const pickup = pickupRange(v.pickupDate, v.pickupTime, v.pickupWindow, v.pickupUntil)
    if (!pickup) {
      return v.pickupWindow === 'CUSTOM' && v.pickupDate && v.pickupTime
        ? setFieldError('pickupUntil', { message: '상차 마감을 골라 주세요.' })
        : setFieldError('pickupTime', { message: '상차 날짜와 시각을 골라 주세요.' })
    }
    if (pickup.until <= pickup.from) {
      return v.pickupWindow === 'CUSTOM'
        ? setFieldError('pickupUntil', { message: '상차 마감은 상차 시작 뒤여야 해요.' })
        : setFieldError('pickupTime', { message: '당일 상차는 자정 전 시각이어야 해요.' })
    }
    const by = dropoffDeadlineAt(pickup.from, v.dropoffDeadline, v.dropoffBy)
    if (!by) return setFieldError('dropoffBy', { message: '하차 기한을 골라 주세요.' })
    if (by <= pickup.from) return setFieldError('dropoffBy', { message: '하차 기한은 상차 시작 뒤여야 해요.' })
    const body: CreateOrderRequest = {
      pickup: siteInput('pickup', v),
      dropoff: siteInput('dropoff', v),
      pickupFrom: pickup.from.toISOString(),
      pickupUntil: pickup.until.toISOString(),
      dropoffBy: by.toISOString(),
      cargoCategory: v.cargoCategory,
      cargoType: v.cargoType.trim(),
      weightKg: Number(v.weightKg),
      tonnage: v.tonnage,
      // 냉동·냉장 화물은 차종 칸을 잠그는데, 잠긴(disabled) 칸의 값은 폼 라이브러리가 비워 보내므로 여기서 다시 채운다
      bodyType: v.cargoCategory === 'COLD' ? 'REFRIGERATED' : v.bodyType,
      loadingMethod: v.loadingMethod,
      fare: Number(v.fare),
      billedFare: v.billedFare !== '' ? Number(v.billedFare) : null,
      feeRate: v.billedFare === '' && v.feeRate !== '' ? Number(v.feeRate) : null,
      customerName: v.customerName.trim() || null,
      paymentType: v.paymentType,
      expectedPaymentDays: v.paymentType === 'RECEIPT' && v.expectedPaymentDays !== '' ? Number(v.expectedPaymentDays) : null,
      consignmentType: v.consignmentType,
      confirmMode: v.targetDriverId ? 'SELECT' : v.confirmMode,
      targetDriverId: v.targetDriverId ? Number(v.targetDriverId) : null,
    }
    if (editingId !== null) update.mutate(body)
    else create.mutate(body)
  }

  const num = (field: keyof FormValues, label: string, opts: { min?: number; max?: number; onChange?: () => void } = {}) =>
    register(field, {
      onChange: opts.onChange,
      required: `${label}을(를) 입력해 주세요.`,
      validate: (val) => {
        const n = Number(val)
        if (Number.isNaN(n)) return '숫자로 입력해 주세요.'
        if (opts.min !== undefined && n < opts.min) return `${opts.min} 이상이어야 해요.`
        if (opts.max !== undefined && n > opts.max) return `${opts.max} 이하여야 해요.`
        return true
      },
    })
  const siteText = (prefix: SitePrefix, field: 'Name' | 'Address', label: string) =>
    register(`${prefix}${field}`, { validate: (val) => val.trim() !== '' || `${label}을(를) 입력해 주세요.` })
  const siteCoord = (prefix: SitePrefix, field: 'Lat' | 'Lng', min: number, max: number) =>
    register(`${prefix}${field}`, {
      validate: (val) => {
        const n = Number(val)
        if (val.trim() === '' || Number.isNaN(n)) return '주소 검색으로 위치를 확인해 주세요.'
        if (n < min || n > max) return `${min}~${max} 사이여야 해요.`
        return true
      },
    })

  const editing = editingId !== null
  const header = (
    <PageHeader
      title={editing ? '오더 수정' : '오더 등록'}
      description={
        assigned
          ? '배차가 확정된 오더예요. 거래처와 청구운임만 고칠 수 있어요. 차주 화면의 조건을 바꾸려면 배차를 취소한 뒤 다시 모집하세요.'
          : waitingRequests > 0
            ? `배차 요청 ${waitingRequests}건이 기다리고 있어요. 차주가 본 조건은 그대로 두고 거래처와 청구운임만 고칠 수 있어요. 요청은 10분 안에 확정하지 않으면 만료되니 그 뒤에 고치세요.`
            : editing && source.data?.status === 'CLOSED'
              ? '내린 오더예요. 복사해서 새로 올릴 수 있어요.'
              : editing
            ? '고친 내용은 차주 화면에 바로 반영돼요.'
            : copyingId !== null
              ? '지난 오더를 복사했어요. 상차 날짜와 운임을 확인하고 올리세요.'
              : '상하차지, 상차 시간, 화물, 운임만 적으면 차주 화면에 올라가요. 결제와 배차 방식은 회사 기본값을 써요.'
      }
      back={editing ? { to: `/orders/${editingId}`, label: '오더 상세' } : { to: '/orders', label: '오더' }}
    />
  )
  if (sourceId !== null && source.isPending) {
    return (
      <>
        {header}
        <Loading rows={6} />
      </>
    )
  }
  if (sourceId !== null && (source.isError || !source.data)) {
    return (
      <>
        {header}
        <ErrorText>{source.error instanceof ApiError ? source.error.message : '오더를 불러오지 못했어요.'}</ErrorText>
      </>
    )
  }
  // 회사 서류가 승인되기 전에는 서버가 403(BROKER_403_UNVERIFIED)을 돌려주므로 폼을 보여 주지 않는다 (07 인계서 13장)
  if (!editing && me && !me.verified) {
    return (
      <>
        {header}
        <CompanyVerificationNotice />
        <Card>
          <p className="text-[14px] text-ink-mid">사업자등록증과 운송주선사업 허가증이 승인되면 바로 오더를 올릴 수 있어요. 설정의 회사 서류에서 심사 상태를 볼 수 있어요.</p>
          <div className="mt-4">
            <LinkButton to="/settings?tab=documents">회사 서류로</LinkButton>
          </div>
        </Card>
      </>
    )
  }
  if (editing && source.data?.status === 'CLOSED') {
    return (
      <>
        {header}
        <Card>
          <p className="text-[14px] text-ink-mid">내린 오더는 고칠 수 없어요. 같은 조건으로 새로 올리려면 복사하세요.</p>
          <div className="mt-4">
            <LinkButton to={`/orders/new?from=${editingId}`}>복사해서 올리기</LinkButton>
          </div>
        </Card>
      </>
    )
  }
  return (
    <>
      {header}
      {searchingSite ? <AddressSearch onSelect={selectAddress} onClose={() => setSearchingSite(null)} /> : null}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {(['pickup', 'dropoff'] as const).map((prefix) => {
            const label = prefix === 'pickup' ? '상차지' : '하차지'
            if (locked) {
              return (
                <Card key={prefix} title={label}>
                  <p className="font-semibold text-ink-strong">{watch(`${prefix}Name`)}</p>
                  <p className="mt-0.5 text-[13px] text-ink-sub">{watch(`${prefix}Address`)}</p>
                </Card>
              )
            }
            return (
              <Card key={prefix} title={label}>
                <div className="space-y-3.5">
                  <div className="rounded-xl bg-canvas/70 p-3">
                    <div className="flex items-end gap-2">
                      <SelectField className="min-w-0 flex-1" label="자주 쓰는 주소" aria-label={`${label} 자주 쓰는 주소`} value={savedChoice[prefix]} disabled={savedAddresses.isPending || savedAddresses.isError || !savedAddresses.data?.length} placeholder="직접 입력 (기본)" hint={savedAddresses.isPending ? '저장한 주소를 불러오는 중이에요.' : !savedAddresses.isError && !savedAddresses.data?.length ? '입력한 주소를 저장하면 여기서 불러올 수 있어요.' : undefined} options={(savedAddresses.data ?? []).map((item) => ({ value: String(item.id), label: `${item.name} · ${item.address}${item.detailAddress ? ` ${item.detailAddress}` : ''}` }))} onChange={(e) => applySavedAddress(prefix, e.target.value)} />
                      {savedChoice[prefix] ? <Button type="button" variant="ghost" size="sm" className="mb-1" loading={removeAddress.isPending} onClick={() => removeAddress.mutate({ prefix, id: Number(savedChoice[prefix]) })}>저장 해제</Button> : null}
                    </div>
                    {savedAddresses.isError ? <div className="mt-2"><ErrorText>저장한 주소를 불러오지 못했어요.</ErrorText><Button type="button" variant="ghost" size="sm" onClick={() => void savedAddresses.refetch()}>다시 불러오기</Button></div> : null}
                  </div>
                  <Field label="이름" required maxLength={100} placeholder="평택 포승 물류센터" error={errorOf(`${prefix}Name`)} {...siteText(prefix, 'Name', '이름')} />
                  <div className="flex items-start gap-2">
                    <Field className="min-w-0 flex-1" label="주소" required readOnly placeholder="주소 검색으로 선택해 주세요" error={errorOf(`${prefix}Address`)} {...siteText(prefix, 'Address', '주소')} />
                    <Button type="button" variant="secondary" className="mt-6" onClick={() => setSearchingSite(prefix)}>주소 검색</Button>
                  </div>

                  <Field label="상세주소 (선택)" error={errorOf(`${prefix}DetailAddress`)} placeholder="동·호수, 물류센터 진입로 등" maxLength={100} {...register(`${prefix}DetailAddress`)} />
                  <input type="hidden" {...siteCoord(prefix, 'Lat', -90, 90)} />
                  <input type="hidden" {...siteCoord(prefix, 'Lng', -180, 180)} />
                  <div aria-live="polite" className="text-[13px]">
                    {locating[prefix] ? <p role="status" className="text-ink-sub">선택한 주소의 위치를 확인하고 있어요.</p> : locationError[prefix] ? (
                      <div><ErrorText>{locationError[prefix]}</ErrorText><Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => void locateAddress(prefix, getValues(`${prefix}Address`))}>위치 다시 조회</Button></div>
                    ) : watch(`${prefix}Lat`) && watch(`${prefix}Lng`) ? <p className="text-status-green">위치를 확인했어요.</p> : errorOf(`${prefix}Lat`) || errorOf(`${prefix}Lng`) ? <ErrorText>주소 검색으로 위치를 확인해 주세요.</ErrorText> : <p className="text-ink-sub">주소를 선택하면 위치가 자동으로 입력돼요.</p>}
                  </div>
                  <div className="border-t border-line/70 pt-3">
                    <Button type="button" variant="ghost" size="sm" loading={saveAddress.isPending && saveAddress.variables?.prefix === prefix} disabled={locating[prefix] || removeAddress.isPending || (saveAddress.isPending && saveAddress.variables?.prefix !== prefix)} onClick={() => saveCurrentAddress(prefix)}>☆ 자주 쓰는 주소에 저장</Button>
                    {savedNotice[prefix] ? <p role="status" className="mt-1 text-[12.5px] text-status-green">{savedNotice[prefix]}</p> : null}
                    {savedError[prefix] ? <div className="mt-1"><ErrorText>{savedError[prefix]}</ErrorText></div> : null}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        <Card title="상차 시간">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="상차 날짜" required type="date" disabled={locked} error={errorOf('pickupDate')} {...register('pickupDate', { required: '날짜를 골라 주세요.' })} />
              <Field label="상차 시각" required type="time" step={1800} disabled={locked} error={errorOf('pickupTime')} {...register('pickupTime', { required: '시각을 골라 주세요.' })} />
            </div>
            {/* "직접 정하기" 입력 칸은 각자 고른 칩 바로 아래에 둔다. 한 줄에 몰아 두면 하차 기한 칸이 상차 쪽 자리로 밀려 헷갈린다 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <ChipGroup label="상차 가능 폭" value={pickupWindow} options={PICKUP_WINDOWS} disabled={locked} onChange={(v) => setValue('pickupWindow', v)} hint="정시는 30분 안에 상차를 시작해야 해요." />
                {pickupWindow === 'CUSTOM' ? (
                  <Field label="상차 마감" required type="datetime-local" disabled={locked} error={errorOf('pickupUntil')} {...register('pickupUntil', { required: '상차 마감을 골라 주세요.' })} />
                ) : null}
              </div>
              <div className="space-y-3">
                <ChipGroup label="하차 기한" value={deadlineChoice} options={DROPOFF_DEADLINES} disabled={locked} onChange={(v) => setValue('dropoffDeadline', v)} />
                {deadlineChoice === 'CUSTOM' ? (
                  <Field label="하차 기한 시각" required type="datetime-local" disabled={locked} error={errorOf('dropoffBy')} {...register('dropoffBy', { required: '하차 기한을 골라 주세요.' })} />
                ) : (
                  errorOf('dropoffBy') && <ErrorText>{errorOf('dropoffBy')}</ErrorText>
                )}
              </div>
            </div>
            {timeSummary ? <p className="rounded-xl bg-canvas px-3.5 py-2.5 text-[13.5px] font-medium text-ink-mid">{timeSummary}</p> : null}
          </div>
        </Card>

        <Card title="화물과 차량">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="품목" required placeholder="파레트 12개 (식품)" hint="인수증에 그대로 적혀요." disabled={locked} error={errorOf('cargoType')} {...register('cargoType', { required: '품목을 입력해 주세요.' })} />
            <Field label="무게 (kg)" required inputMode="numeric" placeholder="4500" disabled={locked} error={errorOf('weightKg')} {...num('weightKg', '무게', { min: 1, max: 50000 })} />
            <SelectField label="화물 종류" required options={CARGO_CATEGORIES} hint="냉동·냉장을 고르면 차종이 냉동·냉장으로 고정돼요." disabled={locked} {...register('cargoCategory')} />
            <SelectField label="톤수" required options={TONNAGES} disabled={locked} {...register('tonnage')} />
            <SelectField
              label="차종"
              required
              options={BODY_TYPES}
              disabled={locked || cargoCategory === 'COLD'}
              hint={cargoCategory === 'COLD' ? '냉동·냉장 화물은 냉동·냉장 차량만 실을 수 있어요.' : undefined}
              {...register('bodyType')}
            />
            <SelectField label="상하차 방식" required options={LOADING_METHODS} disabled={locked} {...register('loadingMethod')} />
          </div>
        </Card>

        <Card title="운임">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="청구운임 (원, 화주와 계약한 금액)"
              inputMode="numeric"
              placeholder="600000"
              hint="비워도 돼요. 차주에게는 안 보여요."
              error={errorOf('billedFare')}
              {...register('billedFare', {
                onChange: () => setFareTouched(false),
                validate: (val) => val === '' || (!Number.isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100_000_000) || '0 이상 숫자로 입력해 주세요.',
              })}
            />
            <Field
              label="수수료율 (%)"
              type="number"
              min={0}
              max={99.9}
              step={0.1}
              placeholder="10"
              hint="회사 기본값이 들어 있어요."
              disabled={locked}
              error={errorOf('feeRate')}
              {...register('feeRate', { onChange: () => setFareTouched(false), min: { value: 0, message: '0~99.9%' }, max: { value: 99.9, message: '0~99.9%' } })}
            />
            <Field
              label="지급운임 (원, 차주에게)"
              required
              inputMode="numeric"
              placeholder="540000"
              hint={assigned ? '확정된 운임이라 바꿀 수 없어요.' : locked ? '요청이 기다리는 동안은 바꿀 수 없어요.' : fareHint}
              disabled={locked}
              error={errorOf('fare')}
              {...num('fare', '지급운임', { min: 0, max: 100_000_000, onChange: () => setFareTouched(true) })}
            />
          </div>
        </Card>

        <Card
          title="결제·배차·거래처"
          action={
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdvancedOpen((open) => !open)}>
              {advancedOpen ? '접기' : '바꾸기'}
            </Button>
          }
        >
          {advancedOpen ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SelectField label="결제 방식" required options={PAYMENT_TYPES.map((p) => ({ value: p.value, label: `${p.label} — ${p.hint}` }))} disabled={locked} {...register('paymentType')} />
              {paymentType === 'RECEIPT' ? (
                <Field
                  label="지급 예정 (인수증 전달 뒤 일수)"
                  inputMode="numeric"
                  hint={`비우면 회사 정산 주기 ${me?.settlementDays ?? 30}일`}
                  disabled={locked}
                  error={errorOf('expectedPaymentDays')}
                  {...register('expectedPaymentDays')}
                />
              ) : null}
              <SelectField label="운송 형태" options={Object.entries(CONSIGNMENT).map(([value, label]) => ({ value, label }))} disabled={locked} {...register('consignmentType')} />
              <SelectField
                label="지정 차주"
                placeholder="오더 마켓에 공개 (누구나 요청)"
                options={(drivers.data ?? []).map((d) => ({ value: String(d.driverUserId), label: `${d.name} · ${d.plateNumber ?? '차량 없음'}` }))}
                hint="지정하면 그 차주에게만 보여요."
                disabled={locked}
                {...register('targetDriverId')}
              />
              {/* 확정 방식(DSP-005): 끄면 요청한 차주 중에 골라서, 켜면 먼저 요청한 차주로 바로 배차 */}
              <ToggleField
                title="배차 방식"
                label="선착순 자동 배차"
                checked={!targetDriverId && confirmMode === 'FIRST'}
                onChange={(on) => setValue('confirmMode', on ? 'FIRST' : 'SELECT', { shouldDirty: true })}
                disabled={locked || Boolean(targetDriverId)}
                hint={
                  targetDriverId
                    ? '지정 차주 오더는 그 차주가 요청하면 골라서 확정해요.'
                    : confirmMode === 'FIRST'
                      ? '켜짐: 가장 먼저 요청한 차주로 바로 배차가 확정돼요.'
                      : '꺼짐: 요청한 차주들의 기록을 보고 한 명을 골라 확정해요.'
                }
              />
              <Field label="거래처 (화주)" placeholder="대한제강" maxLength={50} error={errorOf('customerName')} {...register('customerName')} />
            </div>
          ) : (
            <div>
              <p className="text-[14.5px] font-medium text-ink-strong">{advancedSummary}</p>
              <p className="mt-1 text-[12.5px] text-ink-sub">회사 기본값이에요. 이 오더만 다르게 하려면 바꾸기를 누르세요.</p>
            </div>
          )}
        </Card>

        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(editing ? `/orders/${editingId}` : '/orders')}>
            취소
          </Button>
          <Button type="submit" loading={submitting} disabled={!locked && (locating.pickup || locating.dropoff)}>
            {editing ? '수정 저장' : '오더 올리기'}
          </Button>
        </div>
      </form>
    </>
  )
}
