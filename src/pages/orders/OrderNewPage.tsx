import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { fareFor, feeRateOf, ordersApi, type CreateOrderRequest, type OrderSite } from '../../api/orders'
import { driversApi } from '../../api/people'
import { ApiError } from '../../api/client'
import { addressesApi } from '../../api/addresses'
import { AddressSearch } from '../../components/AddressSearch'
import type { PostcodeResult } from '../../lib/postcode'
import { BODY_TYPES, CARGO_CATEGORIES, CONFIRM_MODE, CONSIGNMENT, LOADING_METHODS, PAYMENT_TYPES, TONNAGES } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { Button, Card, ChipGroup, ErrorText, Field, PageHeader, SelectField } from '../../components/ui'
import { formatDateTime, formatWon, localInputValue } from '../../lib/format'

/**
 * 오더 등록 (DSP-001). 서버가 요구하는 항목은 그대로 두고 타이핑을 줄인다.
 * - 상하차지: 이전에 쓴 곳을 고르면 끝. 새 곳은 주소를 검색하면 좌표를 자동으로 조회한다
 * - 시간: 상차 날짜·시각 하나와 "상차 가능 폭", "하차 기한"을 고르면 세 시각이 계산된다
 * - 운임: 주선사가 일하는 순서대로. 화주 계약가(청구운임)와 수수료율을 적으면 차주 지급운임이 채워진다. 지급운임만 적어도 된다
 * - 결제·운송 형태·확정 방식·거래처: 회사 기본값으로 접어 둔다
 */
const NEW_SITE = 'new'
type PickupWindow = 'EXACT' | 'HOURS_2' | 'SAME_DAY'
type DropoffDeadline = 'SAME_DAY' | 'NEXT_MORNING' | 'CUSTOM'

const PICKUP_WINDOWS: { value: PickupWindow; label: string }[] = [
  { value: 'EXACT', label: '정시' },
  { value: 'HOURS_2', label: '2시간 안' },
  { value: 'SAME_DAY', label: '당일 아무 때나' },
]
const DROPOFF_DEADLINES: { value: DropoffDeadline; label: string }[] = [
  { value: 'SAME_DAY', label: '당일' },
  { value: 'NEXT_MORNING', label: '다음날 오전 9시' },
  { value: 'CUSTOM', label: '직접 정하기' },
]

interface FormValues {
  /** 저장된 상하차지 id. NEW_SITE면 새로 적는다 */
  pickupSite: string
  pickupName: string
  pickupAddress: string
  pickupDetailAddress: string
  pickupLat: string
  pickupLng: string
  dropoffSite: string
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

/** 상차 시작·마감. 정시는 30분 폭, 당일은 자정 직전까지. 날짜나 시각이 비어 있으면 null */
function pickupRange(date: string, time: string, window: PickupWindow): { from: Date; until: Date } | null {
  if (!date || !time) return null
  const from = new Date(`${date}T${time}`)
  if (Number.isNaN(from.getTime())) return null
  const until = new Date(from)
  if (window === 'EXACT') until.setMinutes(until.getMinutes() + 30)
  else if (window === 'HOURS_2') until.setHours(until.getHours() + 2)
  else until.setHours(23, 59, 0, 0)
  return { from, until }
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

export function OrderNewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { me } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [searchingSite, setSearchingSite] = useState<SitePrefix | null>(null)
  const [locating, setLocating] = useState({ pickup: false, dropoff: false })
  const [locationError, setLocationError] = useState<Record<SitePrefix, string | null>>({ pickup: null, dropoff: null })
  const requestVersion = useRef({ pickup: 0, dropoff: 0 })
  useEffect(() => () => { requestVersion.current.pickup++; requestVersion.current.dropoff++ }, [])

  // 이전 오더의 상하차지를 고를 수 있게
  const recent = useQuery({ queryKey: ['orders', { status: '', page: 0, size: 50 }], queryFn: () => ordersApi.list({ status: '', page: 0, size: 50 }) })
  const drivers = useQuery({ queryKey: ['drivers'], queryFn: driversApi.list })
  const sites = useMemo(() => {
    const map = new Map<number, OrderSite>()
    recent.data?.items.forEach((o) => {
      map.set(o.pickup.id, o.pickup)
      map.set(o.dropoff.id, o.dropoff)
    })
    return [...map.values()]
  }, [recent.data])
  /** 저장된 곳이 하나도 없으면 고를 것 없이 바로 적는다 */
  const isNewSite = (chosen: string) => sites.length === 0 || chosen === NEW_SITE

  const start = useMemo(defaultPickupStart, [])
  const { register, handleSubmit, watch, setValue, getValues, clearErrors, formState, setError: setFieldError } = useForm<FormValues>({
    defaultValues: {
      pickupSite: '',
      pickupName: '',
      pickupAddress: '',
      pickupDetailAddress: '',
      pickupLat: '',
      pickupLng: '',
      dropoffSite: '',
      dropoffName: '',
      dropoffAddress: '',
      dropoffDetailAddress: '',
      dropoffLat: '',
      dropoffLng: '',
      pickupDate: localInputValue(start).slice(0, 10),
      pickupTime: localInputValue(start).slice(11, 16),
      pickupWindow: 'HOURS_2',
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
  const pickupSite = watch('pickupSite')
  const dropoffSite = watch('dropoffSite')
  const pickupDate = watch('pickupDate')
  const pickupTime = watch('pickupTime')
  const pickupWindow = watch('pickupWindow')
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
    if (fareTouched || billedFare === '' || feeRate === '') return
    const computed = fareFor(Number(billedFare), Number(feeRate))
    setValue('fare', computed === null ? '' : String(computed), { shouldValidate: formState.isSubmitted })
  }, [billedFare, feeRate, fareTouched, setValue, formState.isSubmitted])
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

  const range = pickupRange(pickupDate, pickupTime, pickupWindow)
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

  const create = useMutation({
    mutationFn: (body: CreateOrderRequest) => ordersApi.create(body),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      navigate(`/orders/${order.id}`)
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        e.fieldErrors.forEach((f) => setFieldError(f.field as keyof FormValues, { message: f.reason }))
        setError(e.message)
      } else setError('서버와 연결할 수 없어요.')
    },
  })

  const siteInput = (prefix: SitePrefix, v: FormValues) => {
    const chosen = v[`${prefix}Site`]
    if (!isNewSite(chosen)) return { siteId: Number(chosen) }
    return { site: { name: v[`${prefix}Name`].trim(), address: [v[`${prefix}Address`].trim(), v[`${prefix}DetailAddress`].trim()].filter(Boolean).join(' '), lat: Number(v[`${prefix}Lat`]), lng: Number(v[`${prefix}Lng`]) } }
  }

  const onSubmit = (v: FormValues) => {
    for (const prefix of ['pickup', 'dropoff'] as const) {
      if (!isNewSite(v[`${prefix}Site`])) continue
      if (!v[`${prefix}Lat`] || !v[`${prefix}Lng`] || locating[prefix]) {
        return setFieldError(`${prefix}Address`, { message: '주소 검색으로 위치를 확인해 주세요.' })
      }
      if ([v[`${prefix}Address`].trim(), v[`${prefix}DetailAddress`].trim()].filter(Boolean).join(' ').length > 200) {
        return setFieldError(`${prefix}DetailAddress`, { message: '기본 주소와 상세주소를 합쳐 200자 이내로 입력해 주세요.' })
      }
    }
    const pickup = pickupRange(v.pickupDate, v.pickupTime, v.pickupWindow)
    if (!pickup) return setFieldError('pickupTime', { message: '상차 날짜와 시각을 골라 주세요.' })
    if (pickup.until <= pickup.from) return setFieldError('pickupTime', { message: '당일 상차는 자정 전 시각이어야 해요.' })
    const by = dropoffDeadlineAt(pickup.from, v.dropoffDeadline, v.dropoffBy)
    if (!by) return setFieldError('dropoffBy', { message: '하차 기한을 골라 주세요.' })
    if (by <= pickup.from) return setFieldError('dropoffBy', { message: '하차 기한은 상차 시작 뒤여야 해요.' })
    create.mutate({
      pickup: siteInput('pickup', v),
      dropoff: siteInput('dropoff', v),
      pickupFrom: pickup.from.toISOString(),
      pickupUntil: pickup.until.toISOString(),
      dropoffBy: by.toISOString(),
      cargoCategory: v.cargoCategory,
      cargoType: v.cargoType.trim(),
      weightKg: Number(v.weightKg),
      tonnage: v.tonnage,
      bodyType: v.bodyType,
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
    })
  }

  const siteOptions = [...sites.map((s) => ({ value: String(s.id), label: `${s.name} · ${s.address}` })), { value: NEW_SITE, label: '새 상하차지 적기' }]
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
  // 새 상하차지를 적을 때만 검사한다
  const siteText = (prefix: SitePrefix, field: 'Name' | 'Address', label: string) =>
    register(`${prefix}${field}`, { validate: (val, all) => !isNewSite(all[`${prefix}Site`]) || val.trim() !== '' || `${label}을(를) 입력해 주세요.` })
  const siteCoord = (prefix: SitePrefix, field: 'Lat' | 'Lng', min: number, max: number) =>
    register(`${prefix}${field}`, {
      validate: (val, all) => {
        if (!isNewSite(all[`${prefix}Site`])) return true
        const n = Number(val)
        if (val.trim() === '' || Number.isNaN(n)) return '주소 검색으로 위치를 확인해 주세요.'
        if (n < min || n > max) return `${min}~${max} 사이여야 해요.`
        return true
      },
    })

  return (
    <>
      <PageHeader
        title="오더 등록"
        description="상하차지, 상차 시간, 화물, 운임만 적으면 차주 화면에 올라가요. 결제와 배차 방식은 회사 기본값을 써요."
        back={{ to: '/orders', label: '오더' }}
      />
      {searchingSite ? <AddressSearch onSelect={selectAddress} onClose={() => setSearchingSite(null)} /> : null}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {(['pickup', 'dropoff'] as const).map((prefix) => {
            const label = prefix === 'pickup' ? '상차지' : '하차지'
            const chosen = prefix === 'pickup' ? pickupSite : dropoffSite
            return (
              <Card key={prefix} title={label}>
                <div className="space-y-3.5">
                  {sites.length > 0 ? (
                    <SelectField
                      label="어디서"
                      required
                      placeholder="이전에 쓴 곳에서 고르기"
                      options={siteOptions}
                      error={errorOf(`${prefix}Site`)}
                      {...register(`${prefix}Site`, { validate: (val) => val !== '' || `${label}를 골라 주세요.` })}
                    />
                  ) : null}
                  {isNewSite(chosen) ? (
                    <>
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
                    </>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>

        <Card title="상차 시간">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="상차 날짜" required type="date" error={errorOf('pickupDate')} {...register('pickupDate', { required: '날짜를 골라 주세요.' })} />
              <Field label="상차 시각" required type="time" step={1800} error={errorOf('pickupTime')} {...register('pickupTime', { required: '시각을 골라 주세요.' })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChipGroup label="상차 가능 폭" value={pickupWindow} options={PICKUP_WINDOWS} onChange={(v) => setValue('pickupWindow', v)} hint="정시는 30분 안에 상차를 시작해야 해요." />
              <ChipGroup label="하차 기한" value={deadlineChoice} options={DROPOFF_DEADLINES} onChange={(v) => setValue('dropoffDeadline', v)} />
            </div>
            {deadlineChoice === 'CUSTOM' ? (
              <Field label="하차 기한" required type="datetime-local" className="sm:max-w-xs" error={errorOf('dropoffBy')} {...register('dropoffBy', { required: '하차 기한을 골라 주세요.' })} />
            ) : (
              errorOf('dropoffBy') && <ErrorText>{errorOf('dropoffBy')}</ErrorText>
            )}
            {timeSummary ? <p className="rounded-xl bg-canvas px-3.5 py-2.5 text-[13.5px] font-medium text-ink-mid">{timeSummary}</p> : null}
          </div>
        </Card>

        <Card title="화물과 차량">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="품목" required placeholder="파레트 12개 (식품)" hint="인수증에 그대로 적혀요." error={errorOf('cargoType')} {...register('cargoType', { required: '품목을 입력해 주세요.' })} />
            <Field label="무게 (kg)" required inputMode="numeric" placeholder="4500" error={errorOf('weightKg')} {...num('weightKg', '무게', { min: 1, max: 50000 })} />
            <SelectField label="화물 종류" required options={CARGO_CATEGORIES} hint="냉동·냉장을 고르면 차종도 냉동·냉장으로 바뀌어요." {...register('cargoCategory')} />
            <SelectField label="톤수" required options={TONNAGES} {...register('tonnage')} />
            <SelectField label="차종" required options={BODY_TYPES} {...register('bodyType')} />
            <SelectField label="상하차 방식" required options={LOADING_METHODS} {...register('loadingMethod')} />
          </div>
        </Card>

        <Card title="운임">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="청구운임 (원, 화주와 계약한 금액)"
              inputMode="numeric"
              placeholder="600000"
              hint="주선사만 봐요. 비워도 돼요."
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
              hint="청구운임 기준이에요. 회사 기본값을 미리 채워요."
              error={errorOf('feeRate')}
              {...register('feeRate', { onChange: () => setFareTouched(false), min: { value: 0, message: '0~99.9%' }, max: { value: 99.9, message: '0~99.9%' } })}
            />
            <Field
              label="지급운임 (원, 차주에게)"
              required
              inputMode="numeric"
              placeholder="540000"
              hint={fareHint}
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
              <SelectField label="결제 방식" required options={PAYMENT_TYPES.map((p) => ({ value: p.value, label: `${p.label} — ${p.hint}` }))} {...register('paymentType')} />
              {paymentType === 'RECEIPT' ? (
                <Field
                  label="지급 예정 (인수증 전달 뒤 일수)"
                  inputMode="numeric"
                  hint={`비우면 회사 정산 주기 ${me?.settlementDays ?? 30}일`}
                  error={errorOf('expectedPaymentDays')}
                  {...register('expectedPaymentDays')}
                />
              ) : null}
              <SelectField label="운송 형태" options={Object.entries(CONSIGNMENT).map(([value, label]) => ({ value, label }))} {...register('consignmentType')} />
              <SelectField
                label="지정 차주"
                placeholder="오더 마켓에 공개 (누구나 요청)"
                options={(drivers.data ?? []).map((d) => ({ value: String(d.driverUserId), label: `${d.name} · ${d.plateNumber ?? '차량 없음'}` }))}
                hint="단골 차주에게만 지정할 수 있어요. 지정하면 그 차주에게만 보여요."
                {...register('targetDriverId')}
              />
              <SelectField label="확정 방식" options={Object.entries(CONFIRM_MODE).map(([value, label]) => ({ value, label }))} disabled={Boolean(targetDriverId)} {...register('confirmMode')} />
              <Field label="거래처 (화주)" placeholder="대한제강" maxLength={50} hint="주선사만 봐요." error={errorOf('customerName')} {...register('customerName')} />
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
          <Button type="button" variant="secondary" onClick={() => navigate('/orders')}>
            취소
          </Button>
          <Button type="submit" loading={create.isPending} disabled={locating.pickup || locating.dropoff}>
            오더 올리기
          </Button>
        </div>
      </form>
    </>
  )
}
