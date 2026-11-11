import { useEffect, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { brokerApi, type BrokerPlan } from '../api/broker'
import type { DocumentTypeItem } from '../api/admin'
import { settingsApi, type WaitPolicyInput } from '../api/settings'
import { ApiError } from '../api/client'
import { DOCUMENT_STATUS } from '../admin/documentStatus'
import { useAuth } from '../auth/AuthContext'
import { Button, Card, ErrorText, Field, Loading, PageHeader, SelectField, Tabs, Tag } from '../components/ui'
import { formatBusinessNumber, formatDateTime, formatWon, todayIso } from '../lib/format'

type SettingsTab = 'company' | 'wait' | 'documents' | 'plan'
const SETTINGS_TABS: { value: SettingsTab; label: string }[] = [
  { value: 'company', label: '회사 정보' },
  { value: 'wait', label: '대기비 정책' },
  { value: 'documents', label: '회사 서류' },
  { value: 'plan', label: '구독 플랜' },
]

/**
 * 설정. 다른 목록 화면과 같은 틀(제목 → 탭 → 묶음 하나)이다. 탭은 주소의 ?tab= 으로 고른다 (플랜 올리기·회사 서류 안내가 그 탭으로 바로 보낸다). 네 탭 모두 다른 화면처럼 본문 폭을 다 쓰고, 입력 칸은 두 줄로 나란히 놓는다.
 * 회사 정보·대기비 정책·플랜은 대표만 바꾸고, 회사 서류는 담당자 누구나 올린다
 */
export function SettingsPage() {
  const { me } = useAuth()
  const [params, setParams] = useSearchParams()
  if (!me) return null
  const isOwner = me.position === 'OWNER'
  const requested = params.get('tab')
  const tab: SettingsTab = SETTINGS_TABS.some((t) => t.value === requested) ? (requested as SettingsTab) : 'company'
  return (
    <>
      <PageHeader title="설정" description={isOwner ? undefined : '회사 설정은 대표만 바꿀 수 있어요. 회사 서류는 올릴 수 있어요.'} />
      <Tabs<SettingsTab> value={tab} onChange={(v) => setParams(v === 'company' ? {} : { tab: v }, { replace: true })} items={SETTINGS_TABS} />
      {tab === 'company' ? <CompanyCard isOwner={isOwner} /> : null}
      {tab === 'wait' ? <WaitPolicyCard isOwner={isOwner} /> : null}
      {tab === 'documents' ? <CompanyDocumentsCard /> : null}
      {tab === 'plan' ? <PlanCard isOwner={isOwner} /> : null}
    </>
  )
}

const DOCUMENTS_QUERY_KEY = ['brokers', 'documents'] as const

/**
 * 회사 서류 (07 인계서 13장). 사업자등록증과 운송주선사업 허가증을 사진으로 올리면 이에오 운영자가 심사한다.
 * 담당자 누구나 올릴 수 있다. 심사 중인 서류는 결과가 나올 때까지 다시 못 올리고, 반려·승인 뒤에는 새로 올린다
 */
function CompanyDocumentsCard() {
  const { me, refreshMe } = useAuth()
  const query = useQuery({ queryKey: DOCUMENTS_QUERY_KEY, queryFn: brokerApi.documents })
  const data = query.data
  // 운영자가 승인하면 오더 등록이 열리므로, 서류 인증 여부가 me와 다르면 me를 새로 읽는다
  const verified = data?.verified
  useEffect(() => {
    if (verified !== undefined && me && verified !== me.verified) void refreshMe()
  }, [verified, me, refreshMe])
  return (
    <Card
      title="회사 서류"
      action={
        data ? (
          data.verified ? (
            <Tag tone="green" dot>
              인증된 주선사
            </Tag>
          ) : (
            <Tag tone="gray">
              필수 {data.approvedRequired}/{data.requiredTotal} 승인
            </Tag>
          )
        ) : null
      }
    >
      <p className="mb-4 text-[13.5px] text-ink-sub">
        사업자등록증과 운송주선사업 허가증을 사진(JPG·PNG, 5MB 이하)으로 올리면 이에오 운영자가 확인해요. 둘 다 승인되어야 오더를 올릴 수 있어요.
        사진의 사업자번호({formatBusinessNumber(me!.businessNumber)})·허가 번호·상호·대표자가 회사 정보와 같아야 해요.
      </p>
      {query.isPending ? <Loading rows={2} /> : null}
      {query.isError ? <ErrorText>{query.error.message}</ErrorText> : null}
      {data ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.documents.map((item) => (
            <CompanyDocumentRow key={item.type} item={item} representativeName={me!.representativeName} />
          ))}
        </div>
      ) : null}
    </Card>
  )
}

function CompanyDocumentRow({ item, representativeName }: { item: DocumentTypeItem; representativeName: string | null }) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [openedOn, setOpenedOn] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [inputKey, setInputKey] = useState(0)
  const upload = useMutation({
    mutationFn: () => {
      const form = new FormData()
      form.append('type', item.type)
      form.append('file', file!)
      if (item.type === 'BUSINESS_REGISTRATION') {
        form.append('openedOn', openedOn)
        if (ownerName.trim()) form.append('ownerName', ownerName.trim())
      }
      return brokerApi.uploadDocument(form)
    },
    onSuccess: () => {
      setFile(null)
      setInputKey((k) => k + 1)
      setError(null)
      void queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY })
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : '서버와 연결할 수 없어요.'),
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('사진을 골라 주세요.')
      return
    }
    upload.mutate()
  }
  const latest = item.latest
  const canUpload = !latest || latest.status !== 'PENDING'
  const isBusiness = item.type === 'BUSINESS_REGISTRATION'
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-ink-strong">{item.label}</p>
          <p className="text-[12.5px] text-ink-sub">{latest ? `${formatDateTime(latest.submittedAt)} 제출` : '아직 올리지 않았어요'}</p>
        </div>
        {latest ? (
          <Tag tone={DOCUMENT_STATUS[latest.status].tone} dot>
            {DOCUMENT_STATUS[latest.status].label}
          </Tag>
        ) : (
          <Tag tone="gray">미제출</Tag>
        )}
      </div>
      {latest?.rejectMessage ? <p className="mt-2 text-[13px] text-status-red">반려 사유: {latest.rejectMessage}</p> : null}
      {latest?.businessCheck && latest.status === 'PENDING' ? <p className="mt-2 text-[12.5px] text-ink-mid">국세청 확인: {latest.businessCheck.summary}</p> : null}
      {canUpload ? (
        <form onSubmit={submit} className="mt-3 space-y-3">
          {isBusiness ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="개업일" type="date" required max={todayIso()} value={openedOn} onChange={(e) => setOpenedOn(e.target.value)} hint="사업자등록증에 적힌 개업연월일" />
              <Field
                label="대표자 이름"
                required={!representativeName}
                placeholder={representativeName ?? '사업자등록증의 대표자'}
                hint={representativeName ? `비우면 등록된 대표자 ${representativeName}로 조회해요` : '회사 정보에 대표자가 없어 꼭 적어요'}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>
          ) : null}
          <Field
            key={inputKey}
            label={latest ? '다시 올리기' : '사진'}
            type="file"
            accept="image/png,image/jpeg"
            hint="JPG·PNG, 5MB 이하. 글씨가 읽히게 밝은 곳에서 전체가 나오게 찍어 주세요."
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <ErrorText>{error}</ErrorText>
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={upload.isPending} disabled={!file}>
              올리기
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-3 text-[12.5px] text-ink-sub">운영자가 확인하는 중이에요. 결과가 나오면 다시 올릴 수 있어요.</p>
      )}
    </div>
  )
}

function CompanyCard({ isOwner }: { isOwner: boolean }) {
  const { me, refreshMe } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  type CompanyForm = { name: string; licenseNumber: string; representativeName: string; settlementDays: string; defaultFeeRate: string }
  const { register, handleSubmit, formState } = useForm<CompanyForm>({
    defaultValues: { name: me!.name, licenseNumber: me!.licenseNumber, representativeName: me!.representativeName ?? '', settlementDays: String(me!.settlementDays), defaultFeeRate: String(me!.defaultFeeRate) },
  })
  const update = useMutation({
    mutationFn: (v: CompanyForm) =>
      brokerApi.update({ name: v.name.trim(), licenseNumber: v.licenseNumber.trim(), representativeName: v.representativeName.trim() || undefined, settlementDays: Number(v.settlementDays), defaultFeeRate: Number(v.defaultFeeRate) }),
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
        <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
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
          hint="인수증 전달 뒤 며칠 안에 지급하는지. 오더의 지급 예정일 기본값이에요."
          error={formState.errors.settlementDays?.message}
          {...register('settlementDays', { required: true, min: { value: 0, message: '0~365일' }, max: { value: 365, message: '0~365일' } })}
        />
        <Field
          label="기본 수수료율 (%)"
          type="number"
          min={0}
          max={99.9}
          step={0.1}
          disabled={!isOwner}
          hint="오더 등록 때 청구운임·지급운임을 이 비율로 미리 계산해요. 0이면 계산하지 않아요."
          error={formState.errors.defaultFeeRate?.message}
          {...register('defaultFeeRate', { required: true, min: { value: 0, message: '0~99.9%' }, max: { value: 99.9, message: '0~99.9%' } })}
        />
        </div>
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
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-4">
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
            <div key={plan.code} className={`flex flex-col rounded-xl border p-4 ${active ? 'border-orange-500 bg-orange-50/60' : 'border-line'}`}>
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
                <Button variant="secondary" size="sm" className="mt-auto" loading={changePlan.isPending} onClick={() => changePlan.mutate(plan.code)}>
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
