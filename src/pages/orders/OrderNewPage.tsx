import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { ordersApi, type CreateOrderRequest, type OrderSite } from '../../api/orders'
import { driversApi } from '../../api/people'
import { ApiError } from '../../api/client'
import { BODY_TYPES, CARGO_CATEGORIES, CONFIRM_MODE, CONSIGNMENT, LOADING_METHODS, PAYMENT_TYPES, TONNAGES } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { Button, Card, ErrorText, Field, PageHeader, SelectField } from '../../components/ui'
import { localInputToIso, localInputValue } from '../../lib/format'

/**
 * 오더 등록 (DSP-001). 필수 항목을 다 적어야 등록된다.
 * 상하차지는 이전에 쓴 곳을 고르거나 새로 적는다 (좌표는 아직 직접 입력. 지도·주소 검색은 보류)
 */
interface FormValues {
  pickupPreset: string
  pickupName: string
  pickupAddress: string
  pickupLat: string
  pickupLng: string
  dropoffPreset: string
  dropoffName: string
  dropoffAddress: string
  dropoffLat: string
  dropoffLng: string
  pickupFrom: string
  pickupUntil: string
  dropoffBy: string
  cargoCategory: CreateOrderRequest['cargoCategory']
  cargoType: string
  weightKg: string
  tonnage: CreateOrderRequest['tonnage']
  bodyType: CreateOrderRequest['bodyType']
  loadingMethod: CreateOrderRequest['loadingMethod']
  fare: string
  paymentType: CreateOrderRequest['paymentType']
  expectedPaymentDays: string
  consignmentType: CreateOrderRequest['consignmentType']
  confirmMode: CreateOrderRequest['confirmMode']
  targetDriverId: string
}

export function OrderNewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { me } = useAuth()
  const [error, setError] = useState<string | null>(null)

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

  const now = new Date()
  const in2h = new Date(now.getTime() + 2 * 3600_000)
  const { register, handleSubmit, watch, setValue, formState, setError: setFieldError } = useForm<FormValues>({
    defaultValues: {
      pickupPreset: '',
      dropoffPreset: '',
      pickupFrom: localInputValue(in2h),
      pickupUntil: localInputValue(new Date(in2h.getTime() + 2 * 3600_000)),
      dropoffBy: localInputValue(new Date(in2h.getTime() + 8 * 3600_000)),
      cargoCategory: 'GENERAL',
      tonnage: 'TON_5',
      bodyType: 'CARGO',
      loadingMethod: 'FORKLIFT',
      paymentType: 'RECEIPT',
      expectedPaymentDays: String(me?.settlementDays ?? 30),
      consignmentType: 'DIRECT',
      confirmMode: 'SELECT',
      targetDriverId: '',
    },
  })
  const pickupPreset = watch('pickupPreset')
  const dropoffPreset = watch('dropoffPreset')
  const paymentType = watch('paymentType')
  const targetDriverId = watch('targetDriverId')

  const applyPreset = (prefix: 'pickup' | 'dropoff', id: string) => {
    const site = sites.find((s) => String(s.id) === id)
    if (!site) return
    setValue(`${prefix}Name`, site.name)
    setValue(`${prefix}Address`, site.address)
    setValue(`${prefix}Lat`, String(site.lat))
    setValue(`${prefix}Lng`, String(site.lng))
  }

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

  const siteInput = (prefix: 'pickup' | 'dropoff', v: FormValues) => {
    const preset = prefix === 'pickup' ? v.pickupPreset : v.dropoffPreset
    const site = { name: v[`${prefix}Name`].trim(), address: v[`${prefix}Address`].trim(), lat: Number(v[`${prefix}Lat`]), lng: Number(v[`${prefix}Lng`]) }
    const presetSite = sites.find((s) => String(s.id) === preset)
    // 고른 곳에서 이름·주소·좌표를 안 바꿨으면 그 id로, 바꿨으면 새 상하차지
    if (presetSite && presetSite.name === site.name && presetSite.address === site.address && presetSite.lat === site.lat && presetSite.lng === site.lng) {
      return { siteId: presetSite.id }
    }
    return { site }
  }

  const onSubmit = (v: FormValues) =>
    create.mutate({
      pickup: siteInput('pickup', v),
      dropoff: siteInput('dropoff', v),
      pickupFrom: localInputToIso(v.pickupFrom),
      pickupUntil: localInputToIso(v.pickupUntil),
      dropoffBy: localInputToIso(v.dropoffBy),
      cargoCategory: v.cargoCategory,
      cargoType: v.cargoType.trim(),
      weightKg: Number(v.weightKg),
      tonnage: v.tonnage,
      bodyType: v.bodyType,
      loadingMethod: v.loadingMethod,
      fare: Number(v.fare),
      paymentType: v.paymentType,
      expectedPaymentDays: v.paymentType === 'RECEIPT' && v.expectedPaymentDays !== '' ? Number(v.expectedPaymentDays) : null,
      consignmentType: v.consignmentType,
      confirmMode: v.targetDriverId ? 'SELECT' : v.confirmMode,
      targetDriverId: v.targetDriverId ? Number(v.targetDriverId) : null,
    })

  const siteOptions = sites.map((s) => ({ value: String(s.id), label: `${s.name} · ${s.address}` }))
  const num = (field: keyof FormValues, label: string, opts: { min?: number; max?: number } = {}) =>
    register(field, {
      required: `${label}을(를) 입력해 주세요.`,
      validate: (val) => {
        const n = Number(val)
        if (Number.isNaN(n)) return '숫자로 입력해 주세요.'
        if (opts.min !== undefined && n < opts.min) return `${opts.min} 이상이어야 해요.`
        if (opts.max !== undefined && n > opts.max) return `${opts.max} 이하여야 해요.`
        return true
      },
    })

  return (
    <>
      <PageHeader title="오더 등록" description="상하차지, 시간, 화물, 차량, 운임, 결제를 빠짐없이 적어야 차주 화면에 올라가요." back={{ to: '/orders', label: '오더' }} />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {(['pickup', 'dropoff'] as const).map((prefix) => {
            const label = prefix === 'pickup' ? '상차지' : '하차지'
            const preset = prefix === 'pickup' ? pickupPreset : dropoffPreset
            return (
              <Card key={prefix} title={label}>
                <div className="space-y-3.5">
                  {sites.length > 0 ? (
                    <SelectField
                      label="이전에 쓴 곳에서 고르기"
                      placeholder="새로 적기"
                      options={siteOptions}
                      value={preset}
                      {...register(`${prefix}Preset`, { onChange: (e) => applyPreset(prefix, e.target.value) })}
                    />
                  ) : null}
                  <Field label="이름" required placeholder="평택 포승 물류센터" error={formState.errors[`${prefix}Name`]?.message} {...register(`${prefix}Name`, { required: '이름을 입력해 주세요.' })} />
                  <Field label="주소" required placeholder="경기 평택시 포승읍 평택항로 156" error={formState.errors[`${prefix}Address`]?.message} {...register(`${prefix}Address`, { required: '주소를 입력해 주세요.' })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="위도" required placeholder="36.9631" inputMode="decimal" error={formState.errors[`${prefix}Lat`]?.message} {...num(`${prefix}Lat`, '위도', { min: -90, max: 90 })} />
                    <Field label="경도" required placeholder="126.8337" inputMode="decimal" error={formState.errors[`${prefix}Lng`]?.message} {...num(`${prefix}Lng`, '경도', { min: -180, max: 180 })} />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        <Card title="시간">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="상차 가능 시작" required type="datetime-local" error={formState.errors.pickupFrom?.message} {...register('pickupFrom', { required: '시간을 골라 주세요.' })} />
            <Field label="상차 가능 마감" required type="datetime-local" error={formState.errors.pickupUntil?.message} {...register('pickupUntil', { required: '시간을 골라 주세요.' })} />
            <Field label="하차 기한" required type="datetime-local" error={formState.errors.dropoffBy?.message} {...register('dropoffBy', { required: '시간을 골라 주세요.' })} />
          </div>
        </Card>

        <Card title="화물과 차량">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField label="화물 종류" required options={CARGO_CATEGORIES} hint="냉동·냉장이면 차종도 냉동·냉장이어야 해요." {...register('cargoCategory')} />
            <Field label="품목" required placeholder="파레트 12개 (식품)" hint="인수증에 그대로 적혀요." error={formState.errors.cargoType?.message} {...register('cargoType', { required: '품목을 입력해 주세요.' })} />
            <Field label="무게 (kg)" required inputMode="numeric" placeholder="4500" error={formState.errors.weightKg?.message} {...num('weightKg', '무게', { min: 1, max: 50000 })} />
            <SelectField label="톤수" required options={TONNAGES} {...register('tonnage')} />
            <SelectField label="차종" required options={BODY_TYPES} {...register('bodyType')} />
            <SelectField label="상하차 방식" required options={LOADING_METHODS} {...register('loadingMethod')} />
          </div>
        </Card>

        <Card title="운임과 결제">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="운임 (원)" required inputMode="numeric" placeholder="450000" error={formState.errors.fare?.message} {...num('fare', '운임', { min: 0, max: 100_000_000 })} />
            <SelectField label="결제 방식" required options={PAYMENT_TYPES.map((p) => ({ value: p.value, label: `${p.label} — ${p.hint}` }))} {...register('paymentType')} />
            {paymentType === 'RECEIPT' ? (
              <Field label="지급 예정 (인수증 전달 뒤 일수)" inputMode="numeric" hint={`비우면 회사 정산 주기 ${me?.settlementDays ?? 30}일`} error={formState.errors.expectedPaymentDays?.message} {...register('expectedPaymentDays')} />
            ) : null}
            <SelectField label="운송 형태" options={Object.entries(CONSIGNMENT).map(([value, label]) => ({ value, label }))} {...register('consignmentType')} />
          </div>
        </Card>

        <Card title="배차 방식">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="지정 차주"
              placeholder="오더 마켓에 공개 (누구나 요청)"
              options={(drivers.data ?? []).map((d) => ({ value: String(d.driverUserId), label: `${d.name} · ${d.plateNumber ?? '차량 없음'}` }))}
              hint="단골 차주에게만 지정할 수 있어요. 지정하면 그 차주에게만 보여요."
              {...register('targetDriverId')}
            />
            <SelectField label="확정 방식" options={Object.entries(CONFIRM_MODE).map(([value, label]) => ({ value, label }))} disabled={Boolean(targetDriverId)} {...register('confirmMode')} />
          </div>
        </Card>

        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/orders')}>
            취소
          </Button>
          <Button type="submit" loading={create.isPending}>
            오더 올리기
          </Button>
        </div>
      </form>
    </>
  )
}
