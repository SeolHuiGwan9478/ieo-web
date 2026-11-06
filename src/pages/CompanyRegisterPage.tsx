import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { brokerApi, type CreateBrokerRequest } from '../api/broker'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Button, Card, ErrorText, Field } from '../components/ui'

/**
 * 회사 등록 (BRK-001). 등록한 계정이 대표가 된다.
 * 이미 등록된 사업자등록번호면 409 → 대표에게 초대를 요청해야 한다 (2-2 담당자 초대)
 */
export function CompanyRegisterPage() {
  const { refreshMe, logout } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState, setError: setFieldError } = useForm<CreateBrokerRequest & { settlementDays: number }>({
    defaultValues: { settlementDays: 30 },
  })

  const registerCompany = useMutation({
    mutationFn: (body: CreateBrokerRequest) => brokerApi.register(body),
    onSuccess: () => refreshMe(),
    onError: (e) => {
      if (e instanceof ApiError) {
        e.fieldErrors.forEach((f) => setFieldError(f.field as keyof CreateBrokerRequest, { message: f.reason }))
        setError(e.fieldErrors.length ? null : e.message)
      } else {
        setError('서버와 연결할 수 없어요.')
      }
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <img src="/ieo_wordmark_orange.svg" alt="ieo." className="mx-auto h-9" />
          <p className="mt-2 text-[14px] text-ink-sub">주선사 콘솔</p>
        </div>
        <Card>
          <form
            onSubmit={handleSubmit((v) =>
              registerCompany.mutate({
                name: v.name.trim(),
                businessNumber: v.businessNumber.replace(/\D/g, ''),
                licenseNumber: v.licenseNumber.trim(),
                representativeName: v.representativeName?.trim() || undefined,
                settlementDays: Number(v.settlementDays),
              }),
            )}
            className="space-y-4"
          >
            <div>
              <h1 className="text-[18px] font-bold">회사 등록</h1>
              <p className="mt-1 text-[14px] text-ink-sub">
                등록하는 분이 대표가 돼요. 회사가 이미 등록돼 있다면 대표에게 담당자 초대를 요청해 주세요.
              </p>
            </div>
            <Field label="상호" placeholder="한빛로지스" autoFocus error={formState.errors.name?.message} {...register('name', { required: '상호를 입력해 주세요.' })} />
            <Field
              label="사업자등록번호"
              placeholder="123-45-67891"
              inputMode="numeric"
              error={formState.errors.businessNumber?.message}
              {...register('businessNumber', {
                required: '사업자등록번호를 입력해 주세요.',
                validate: (v) => /^\d{10}$/.test(v.replace(/\D/g, '')) || '숫자 10자리를 확인해 주세요.',
              })}
            />
            <Field
              label="운송주선사업 허가 번호"
              placeholder="제2026-001호"
              error={formState.errors.licenseNumber?.message}
              {...register('licenseNumber', { required: '허가 번호를 입력해 주세요.' })}
            />
            <Field label="대표자 이름 (선택)" placeholder="홍길동" {...register('representativeName')} />
            <Field
              label="정산 주기 (일)"
              type="number"
              min={0}
              max={365}
              hint="인수증 결제 운임을 인수증 전달 뒤 며칠 안에 지급하는지. 차주 장부의 지급 예정일이 돼요."
              error={formState.errors.settlementDays?.message}
              {...register('settlementDays', { required: true, min: { value: 0, message: '0~365일' }, max: { value: 365, message: '0~365일' } })}
            />
            <ErrorText>{error}</ErrorText>
            <Button type="submit" className="w-full" loading={registerCompany.isPending}>
              등록하기
            </Button>
            <button type="button" onClick={logout} className="block w-full text-center text-[13px] text-ink-sub hover:text-ink-mid">
              다른 번호로 로그인
            </button>
          </form>
        </Card>
      </div>
    </div>
  )
}
