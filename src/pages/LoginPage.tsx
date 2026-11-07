import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { authApi, type ConsentType, type PhoneVerifyResponse } from '../api/auth'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Button, Card, ErrorText, Field } from '../components/ui'

/**
 * 휴대폰 인증 로그인 (01 로그인 설계).
 * 1) 번호 → 인증번호 발송  2) 인증번호 확인  3) 계정이 있으면 바로 로그인, 없으면 이름·동의를 받아 가입
 */
type Step = 'phone' | 'code' | 'signup'

export function LoginPage() {
  const { login } = useAuth()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [demo, setDemo] = useState<{ code: string; expiresAt: number } | null>(null)
  useEffect(() => {
    if (!demo) return
    const timeout = window.setTimeout(() => setDemo(null), Math.max(0, demo.expiresAt - Date.now()))
    return () => window.clearTimeout(timeout)
  }, [demo])
  const [verified, setVerified] = useState<PhoneVerifyResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : '서버와 연결할 수 없어요.')

  const sendCode = useMutation({
    mutationFn: (value: string) => authApi.sendCode(value),
    onMutate: () => setDemo(null),
    onSuccess: (result, value) => {
      setDemo(result?.demoCode ? { code: result.demoCode, expiresAt: Date.now() + result.expiresInSeconds * 1000 } : null)
      setPhone(value)
      setError(null)
      setStep('code')
    },
    onError: fail,
  })

  const verify = useMutation({
    mutationFn: (code: string) => authApi.verify(phone, code),
    onSuccess: async (result) => {
      setError(null)
      if (result.accountExists) {
        if (result.existingAccount?.role === 'DRIVER') {
          setError('차주로 가입된 번호예요. 주선사 콘솔은 주선사 계정만 쓸 수 있어요.')
          return
        }
        try {
          const token = await authApi.login(result.phoneToken)
          login(token.accessToken, token.refreshToken)
        } catch (e) {
          fail(e)
        }
        return
      }
      setVerified(result)
      setStep('signup')
    },
    onError: fail,
  })

  const signUp = useMutation({
    mutationFn: (input: { name: string; consents: Record<ConsentType, boolean> }) =>
      authApi.signUp(verified!.phoneToken, input.name, input.consents),
    onSuccess: (token) => login(token.accessToken, token.refreshToken),
    onError: fail,
  })

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <img src="/ieo_wordmark_orange.svg" alt="ieo." className="mx-auto h-9" />
          <p className="mt-2 text-[14px] text-ink-sub">주선사 콘솔</p>
        </div>
        <Card>
          {step === 'phone' && <PhoneForm loading={sendCode.isPending} onSubmit={(v) => sendCode.mutate(v)} />}
          {step === 'code' && (
            <CodeForm
              phone={phone}
              demoCode={demo?.code ?? null}
              sending={sendCode.isPending}
              loading={verify.isPending}
              onSubmit={(code) => verify.mutate(code)}
              onBack={() => { setDemo(null); setStep('phone') }}
              onResend={() => sendCode.mutate(phone)}
            />
          )}
          {step === 'signup' && <SignUpForm loading={signUp.isPending} onSubmit={(v) => signUp.mutate(v)} />}
          {error ? <div className="mt-4"><ErrorText>{error}</ErrorText></div> : null}
        </Card>
        <p className="mt-4 text-center text-[12px] text-ink-sub">
          휴대폰 인증으로 주선사 계정에 로그인해요.
        </p>
      </div>
    </div>
  )
}

function PhoneForm({ loading, onSubmit }: { loading: boolean; onSubmit: (phone: string) => void }) {
  const { register, handleSubmit, formState } = useForm<{ phone: string }>()
  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v.phone.replace(/\D/g, '')))} className="space-y-4">
      <h1 className="text-[18px] font-bold">휴대폰 번호로 로그인</h1>
      <Field
        label="휴대폰 번호"
        placeholder="01012345678"
        inputMode="numeric"
        autoFocus
        error={formState.errors.phone?.message}
        {...register('phone', {
          required: '휴대폰 번호를 입력해 주세요.',
          validate: (v) => /^01\d{8,9}$/.test(v.replace(/\D/g, '')) || '휴대폰 번호는 숫자만 입력해 주세요.',
        })}
      />
      <Button type="submit" className="w-full" loading={loading}>
        인증번호 받기
      </Button>
    </form>
  )
}

function CodeForm({
  phone,
  demoCode,
  sending,
  loading,
  onSubmit,
  onBack,
  onResend,
}: {
  phone: string
  demoCode: string | null
  sending: boolean
  loading: boolean
  onSubmit: (code: string) => void
  onBack: () => void
  onResend: () => void
}) {
  const { register, handleSubmit, formState } = useForm<{ code: string }>()
  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v.code))} className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold">인증번호 입력</h1>
        <p className="mt-1 text-[14px] text-ink-sub">{phone}로 보낸 6자리 숫자</p>
      </div>
      <Field
        label="인증번호"
        placeholder="000000"
        inputMode="numeric"
        maxLength={6}
        autoFocus
        error={formState.errors.code?.message}
        {...register('code', { required: '인증번호를 입력해 주세요.', pattern: { value: /^\d{6}$/, message: '인증번호는 6자리 숫자예요.' } })}
      />
      {demoCode ? <p role="status" className="rounded-xl bg-orange-50 px-3.5 py-3 text-[14px] text-orange-700">시연용 인증번호: <strong className="ml-1 text-[18px] tracking-widest">{demoCode}</strong><span className="mt-1 block text-[12px]">발급 후 3분간 유효해요.</span></p> : null}
      <Button type="submit" className="w-full" loading={loading} disabled={sending}>
        확인
      </Button>
      <div className="flex justify-between text-[13px] text-ink-sub">
        <button type="button" onClick={onBack} className="hover:text-ink-mid">번호 다시 입력</button>
        <button type="button" disabled={sending || loading} onClick={onResend} className="hover:text-ink-mid disabled:opacity-40">{sending ? '발송 중…' : '인증번호 다시 받기'}</button>
      </div>
    </form>
  )
}

function SignUpForm({
  loading,
  onSubmit,
}: {
  loading: boolean
  onSubmit: (v: { name: string; consents: Record<ConsentType, boolean> }) => void
}) {
  const { register, handleSubmit, formState } = useForm<{ name: string; terms: boolean; privacy: boolean; marketing: boolean }>()
  return (
    <form
      onSubmit={handleSubmit((v) => onSubmit({ name: v.name.trim(), consents: { TERMS: v.terms, PRIVACY: v.privacy, MARKETING: v.marketing } }))}
      className="space-y-4"
    >
      <div>
        <h1 className="text-[18px] font-bold">처음 오셨네요</h1>
        <p className="mt-1 text-[14px] text-ink-sub">담당자 이름과 동의만 받고 바로 시작해요. 회사는 다음 화면에서 등록해요.</p>
      </div>
      <Field
        label="담당자 이름"
        placeholder="홍길동"
        autoFocus
        error={formState.errors.name?.message}
        {...register('name', { required: '이름을 입력해 주세요.', maxLength: { value: 30, message: '이름은 30자까지예요.' } })}
      />
      <div className="space-y-2 rounded-xl bg-canvas p-3.5 text-[14px]">
        <Check label="이용약관 동의 (필수)" error={formState.errors.terms?.message} {...register('terms', { required: '필수 동의예요.' })} />
        <Check label="개인정보 수집·이용 동의 (필수)" error={formState.errors.privacy?.message} {...register('privacy', { required: '필수 동의예요.' })} />
        <Check label="마케팅 정보 수신 (선택)" {...register('marketing')} />
      </div>
      <Button type="submit" className="w-full" loading={loading}>
        가입하고 시작하기
      </Button>
    </form>
  )
}

function Check({ label, error, ...rest }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" className="h-4 w-4 accent-orange-600" {...rest} />
      <span className={error ? 'text-status-red' : 'text-ink-mid'}>{label}</span>
    </label>
  )
}
