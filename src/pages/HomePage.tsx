import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { brokerApi, type BrokerPlan } from '../api/broker'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Button, Card, ErrorText, PageTitle, Tag } from '../components/ui'

/** 내 회사와 플랜. 플랜 전환은 대표만, 결제 없이 바로 (BILL-007 테스트 모드) */
const PLANS: { code: BrokerPlan; label: string; summary: string }[] = [
  { code: 'BASIC', label: '베이직', summary: '담당자 1명. 오더·배차·운행 확인·대기 증빙·인수증' },
  { code: 'PRO', label: '프로', summary: '담당자 10명. 운행 데이터 리포트, 단골 차주 이행 기록' },
  { code: 'PRO_PLUS', label: '프로 플러스', summary: '담당자 무제한. 리포트 내려받기, 외부 API 연동' },
]

export function HomePage() {
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
  if (!me) return null
  const isOwner = me.position === 'OWNER'

  return (
    <>
      <PageTitle>내 회사</PageTitle>
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-[16px] font-bold">회사 정보</h2>
          <dl className="space-y-3 text-[14px]">
            <Row label="상호">{me.name}</Row>
            <Row label="사업자등록번호">{formatBusinessNumber(me.businessNumber)}</Row>
            <Row label="허가 번호">{me.licenseNumber}</Row>
            <Row label="대표자">{me.representativeName ?? '-'}</Row>
            <Row label="정산 주기">인수증 전달 뒤 {me.settlementDays}일</Row>
            <Row label="내 직책">{me.positionLabel}</Row>
          </dl>
        </Card>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-bold">플랜</h2>
            <Tag tone="orange">{me.plan.planLabel}</Tag>
          </div>
          <ul className="space-y-2">
            {PLANS.map((plan) => {
              const current = plan.code === me.plan.plan
              return (
                <li key={plan.code} className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 ${current ? 'border-orange-500 bg-orange-50' : 'border-line'}`}>
                  <div>
                    <p className="text-[15px] font-bold">{plan.label}</p>
                    <p className="text-[13px] text-ink-sub">{plan.summary}</p>
                  </div>
                  {current ? (
                    <span className="shrink-0 whitespace-nowrap text-[13px] font-semibold text-orange-700">사용 중</span>
                  ) : isOwner ? (
                    <Button variant="secondary" className="h-9 px-3 text-[13px]" loading={changePlan.isPending} onClick={() => changePlan.mutate(plan.code)}>
                      바꾸기
                    </Button>
                  ) : null}
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-[12px] text-ink-sub">
            {isOwner ? '아직 결제가 없어서 바로 바뀌어요. 내려도 담당자와 데이터는 그대로예요.' : '플랜은 대표만 바꿀 수 있어요.'}
          </p>
          <div className="mt-3"><ErrorText>{error}</ErrorText></div>
        </Card>
      </div>
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <dt className="w-28 shrink-0 text-ink-sub">{label}</dt>
      <dd className="font-medium text-ink-strong">{children}</dd>
    </div>
  )
}

function formatBusinessNumber(value: string) {
  return value.length === 10 ? `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5)}` : value
}
