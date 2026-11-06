import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { brokerApi, type BrokerPlan } from '../api/broker'
import { settingsApi, type WaitPolicyInput } from '../api/settings'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Button, Card, ErrorText, Field, PageHeader, SelectField, Tag } from '../components/ui'
import { formatBusinessNumber, formatDateTime, formatWon } from '../lib/format'

/** 설정: 회사 정보·정산 주기(대표), 대기비 정책(대표), 플랜(대표) */
export function SettingsPage() {
  const { me } = useAuth()
  if (!me) return null
  const isOwner = me.position === 'OWNER'
  return (
    <>
      <PageHeader title="설정" description={isOwner ? '회사 정보, 정산 주기, 대기비 정책, 플랜을 바꿔요.' : '회사 설정은 대표만 바꿀 수 있어요. 보기만 할 수 있어요.'} />
      <div className="grid gap-5 lg:grid-cols-2">
        <CompanyCard isOwner={isOwner} />
        <WaitPolicyCard isOwner={isOwner} />
        <div className="lg:col-span-2">
          <PlanCard isOwner={isOwner} />
        </div>
      </div>
    </>
  )
}

function CompanyCard({ isOwner }: { isOwner: boolean }) {
  const { me, refreshMe } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const { register, handleSubmit, formState } = useForm<{ name: string; licenseNumber: string; representativeName: string; settlementDays: string }>({
    defaultValues: { name: me!.name, licenseNumber: me!.licenseNumber, representativeName: me!.representativeName ?? '', settlementDays: String(me!.settlementDays) },
  })
  const update = useMutation({
    mutationFn: (v: { name: string; licenseNumber: string; representativeName: string; settlementDays: string }) =>
      brokerApi.update({ name: v.name.trim(), licenseNumber: v.licenseNumber.trim(), representativeName: v.representativeName.trim() || undefined, settlementDays: Number(v.settlementDays) }),
    onSuccess: () => {
      setError(null)
      setSaved(true)
      refreshMe()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : '서버와 연결할 수 없어요.'),
  })
  return (
    <Card title="회사 정보">
      <form onSubmit={handleSubmit((v) => update.mutate(v))} className="space-y-4">
        <Field label="사업자등록번호" value={formatBusinessNumber(me!.businessNumber)} disabled hint="사업자등록번호는 바꿀 수 없어요." />
        <Field label="상호" disabled={!isOwner} error={formState.errors.name?.message} {...register('name', { required: '상호를 입력해 주세요.' })} />
        <Field label="운송주선사업 허가 번호" disabled={!isOwner} error={formState.errors.licenseNumber?.message} {...register('licenseNumber', { required: '허가 번호를 입력해 주세요.' })} />
        <Field label="대표자 이름" disabled={!isOwner} {...register('representativeName')} />
        <Field
          label="정산 주기 (일)"
          type="number"
          min={0}
          max={365}
          disabled={!isOwner}
          hint="인수증 결제 운임을 인수증 전달 뒤 며칠 안에 지급하는지. 오더의 지급 예정일 기본값이자 차주 장부의 지급 예정일이 돼요."
          error={formState.errors.settlementDays?.message}
          {...register('settlementDays', { required: true, min: { value: 0, message: '0~365일' }, max: { value: 365, message: '0~365일' } })}
        />
        <ErrorText>{error}</ErrorText>
        {isOwner ? (
          <div className="flex items-center justify-end gap-3">
            {saved ? <span className="text-[13px] text-status-green">저장했어요</span> : null}
            <Button type="submit" loading={update.isPending}>
              저장
            </Button>
          </div>
        ) : null}
      </form>
    </Card>
  )
}

function WaitPolicyCard({ isOwner }: { isOwner: boolean }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const policy = useQuery({ queryKey: ['wait-policy'], queryFn: settingsApi.waitPolicy })
  const { register, handleSubmit, formState, reset } = useForm<Record<keyof WaitPolicyInput, string>>({
    values: policy.data
      ? { freeMinutes: String(policy.data.freeMinutes), unitMinutes: String(policy.data.unitMinutes), unitAmount: String(policy.data.unitAmount), maxAmount: String(policy.data.maxAmount), rounding: policy.data.rounding }
      : { freeMinutes: '120', unitMinutes: '30', unitAmount: '10000', maxAmount: '50000', rounding: 'UP' },
  })
  const replace = useMutation({
    mutationFn: (v: Record<keyof WaitPolicyInput, string>) =>
      settingsApi.replaceWaitPolicy({ freeMinutes: Number(v.freeMinutes), unitMinutes: Number(v.unitMinutes), unitAmount: Number(v.unitAmount), maxAmount: Number(v.maxAmount), rounding: v.rounding as WaitPolicyInput['rounding'] }),
    onSuccess: () => {
      setError(null)
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: ['wait-policy'] })
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : '서버와 연결할 수 없어요.'),
  })
  const p = policy.data
  const num = (field: keyof WaitPolicyInput, min: number) => register(field, { required: '입력해 주세요.', min: { value: min, message: `${min} 이상` } })

  return (
    <Card
      title="대기비 정책"
      action={isOwner && !editing ? <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>{p ? '바꾸기' : '정하기'}</Button> : null}
    >
      {!editing ? (
        p ? (
          <div className="space-y-3 text-[14px]">
            <p className="text-[16px] font-bold">
              무료 {p.freeMinutes}분, 이후 {p.unitMinutes}분당 {formatWon(p.unitAmount)}, 최대 {formatWon(p.maxAmount)}
            </p>
            <p className="text-ink-mid">단위 시간 미만은 {p.rounding === 'UP' ? '올림' : '내림'}. {formatDateTime(p.createdAt)}부터 적용.</p>
            <p className="text-[12.5px] text-ink-sub">차주의 대기 증빙에 이 정책으로 계산한 대기비가 적혀요. 바꾸면 그 뒤에 시작된 대기부터 새 정책이에요.</p>
          </div>
        ) : (
          <p className="text-[14px] text-ink-sub">아직 정책이 없어요. 정책이 없으면 차주의 대기 증빙에 대기 시간만 남고 금액은 계산되지 않아요.</p>
        )
      ) : (
        <form onSubmit={handleSubmit((v) => replace.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="무료 대기 (분)" type="number" error={formState.errors.freeMinutes?.message} {...num('freeMinutes', 0)} />
            <Field label="단위 시간 (분)" type="number" error={formState.errors.unitMinutes?.message} {...num('unitMinutes', 1)} />
            <Field label="단위당 금액 (원)" type="number" error={formState.errors.unitAmount?.message} {...num('unitAmount', 0)} />
            <Field label="최대 금액 (원)" type="number" error={formState.errors.maxAmount?.message} {...num('maxAmount', 0)} />
          </div>
          <SelectField
            label="단위 미만 처리"
            options={[
              { value: 'UP', label: '올림 (10분 기다려도 한 단위)' },
              { value: 'DOWN', label: '내림 (단위를 채워야 계산)' },
            ]}
            {...register('rounding')}
          />
          <ErrorText>{error}</ErrorText>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { reset(); setEditing(false) }}>
              취소
            </Button>
            <Button type="submit" loading={replace.isPending}>
              저장
            </Button>
          </div>
        </form>
      )}
    </Card>
  )
}

const PLANS: { code: BrokerPlan; label: string; items: string[] }[] = [
  { code: 'BASIC', label: '베이직', items: ['담당자 1명', '오더 등록·배차 확정', '운행 위치·ETA, 대기 증빙, 전자인수증', '신뢰 지표'] },
  { code: 'PRO', label: '프로', items: ['담당자 10명', '운행 데이터 리포트', '함께 일한 차주 이행 기록', '화주 공유 링크 무제한 (준비 중)'] },
  { code: 'PRO_PLUS', label: '프로 플러스', items: ['담당자 무제한', '리포트 내려받기 (준비 중)', '외부 API 연동 (준비 중)', '오더 템플릿 무제한 (준비 중)'] },
]

function PlanCard({ isOwner }: { isOwner: boolean }) {
  const { me, refreshMe } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const changePlan = useMutation({
    mutationFn: (plan: BrokerPlan) => brokerApi.changePlan(plan),
    onSuccess: () => {
      setError(null)
      refreshMe()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : '서버와 연결할 수 없어요.'),
  })
  const current = me!.plan.plan
  return (
    <Card title="플랜" action={<Tag tone="orange">{me!.plan.planLabel}</Tag>}>
      <div className="grid gap-3 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const active = plan.code === current
          return (
            <div key={plan.code} className={`flex flex-col rounded-2xl border p-4 ${active ? 'border-orange-500 bg-orange-50/60' : 'border-line'}`}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[16px] font-bold">{plan.label}</p>
                {active ? <Tag tone="orange">사용 중</Tag> : null}
              </div>
              <ul className="mb-4 space-y-1.5 text-[13.5px] text-ink-mid">
                {plan.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-orange-600">·</span>
                    {item}
                  </li>
                ))}
              </ul>
              {!active && isOwner ? (
                <Button variant={plan.code === 'PRO' ? 'primary' : 'secondary'} size="sm" className="mt-auto" loading={changePlan.isPending} onClick={() => changePlan.mutate(plan.code)}>
                  이 플랜으로
                </Button>
              ) : null}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[12.5px] text-ink-sub">{isOwner ? '아직 결제가 없어서 바로 바뀌어요. 내려도 담당자와 데이터는 지우지 않고 보기만 제한돼요.' : '플랜은 대표만 바꿀 수 있어요.'}</p>
      <div className="mt-3"><ErrorText>{error}</ErrorText></div>
    </Card>
  )
}
