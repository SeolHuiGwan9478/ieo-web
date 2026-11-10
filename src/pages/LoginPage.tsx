import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router'
import { authApi, type ConsentType, type ExistingAccount, type PhoneVerifyResponse, type SignUpCredential, type SocialProvider, type SocialVerifyResponse } from '../api/auth'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { kakaoCodeFromLocation, signInWithGoogle, signInWithKakao, socialReady } from '../auth/social'
import { Button, ErrorText, Field, Modal } from '../components/ui'
import { LoginShowcase } from '../components/LoginShowcase'

/**
 * 주선사 콘솔 로그인 (01 로그인 설계).
 * - 휴대폰: 번호 → 인증번호 → 계정이 있으면 로그인, 없으면 이름·동의를 받아 가입
 * - 소셜: Google·카카오. 가입된 소셜 계정이면 바로 로그인. 처음이면 휴대폰 번호 인증 → 이름·동의 → 가입(소셜 계정이 함께 연결된다).
 *   그 번호로 이미 가입한 계정이 있으면 서버가 그 계정에 소셜 계정을 붙이고 로그인시킨다
 * 왼쪽은 차량 앱 시작 화면과 같은 주황 패널, 오른쪽이 로그인 폼(휴대폰이 먼저, 소셜 버튼은 아래)이다
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
  const [credential, setCredential] = useState<SignUpCredential | null>(null)
  // 소셜 확인은 됐지만 아직 가입 전인 사람. 번호 인증을 마치고 가입할 때 함께 보낸다
  const [pendingSocial, setPendingSocial] = useState<{ provider: SocialProvider; token: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [socialBusy, setSocialBusy] = useState<SocialProvider | null>(null)
  // 공급자 키가 아직 없을 때 띄우는 안내
  const [comingSoon, setComingSoon] = useState<SocialProvider | null>(null)

  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : '서버와 연결할 수 없어요.')

  const isDriver = (existing: ExistingAccount | null) => existing?.role === 'DRIVER'
  const DRIVER_MESSAGE = '차주로 가입된 계정이에요. 주선사 콘솔은 주선사 계정만 쓸 수 있어요.'

  const loginWith = async (issue: () => Promise<{ accessToken: string; refreshToken: string }>) => {
    try {
      const token = await issue()
      login(token.accessToken, token.refreshToken)
    } catch (e) {
      fail(e)
    }
  }

  /** 휴대폰 인증이 끝난 뒤 */
  const afterPhoneVerify = async (result: PhoneVerifyResponse) => {
    setError(null)
    if (isDriver(result.existingAccount)) {
      setError(DRIVER_MESSAGE)
      return
    }
    if (pendingSocial) {
      // 소셜로 들어온 사람: 번호가 처음이면 가입, 이미 있으면 서버가 그 계정에 소셜 계정을 붙인다
      setCredential({ phoneToken: result.phoneToken, socialToken: pendingSocial.token })
      setStep('signup')
      return
    }
    if (result.accountExists) {
      await loginWith(() => authApi.login(result.phoneToken))
      return
    }
    setCredential({ phoneToken: result.phoneToken })
    setStep('signup')
  }

  /** 소셜 확인이 끝난 뒤: 가입된 소셜 계정이면 로그인, 처음이면 번호 인증부터 */
  const afterSocialVerify = async (provider: SocialProvider, result: SocialVerifyResponse) => {
    setError(null)
    if (result.accountExists) {
      if (isDriver(result.existingAccount)) {
        setError(DRIVER_MESSAGE)
        return
      }
      await loginWith(() => authApi.socialLogin(result.socialToken))
      return
    }
    setPendingSocial({ provider, token: result.socialToken })
    setStep('phone')
  }

  const leaveSocial = () => {
    setPendingSocial(null)
    setError(null)
    setStep('phone')
  }

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
    onSuccess: afterPhoneVerify,
    onError: fail,
  })

  const social = useMutation({
    mutationFn: ({ provider, token }: { provider: SocialProvider; token: string }) => authApi.socialVerify(provider, token),
    onSuccess: (result, { provider }) => afterSocialVerify(provider, result),
    onError: fail,
    onSettled: () => setSocialBusy(null),
  })

  const signUp = useMutation({
    mutationFn: (input: { name: string; consents: Record<ConsentType, boolean> }) => authApi.signUp(credential!, input.name, input.consents),
    onSuccess: (token) => login(token.accessToken, token.refreshToken),
    onError: fail,
  })

  // 카카오 로그인 페이지에서 돌아왔으면 인가 코드를 서버에 넘긴다
  useEffect(() => {
    const code = kakaoCodeFromLocation()
    if (!code) return
    window.history.replaceState(null, '', '/login')
    setSocialBusy('KAKAO')
    social.mutate({ provider: 'KAKAO', token: code })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startGoogle = async () => {
    if (!socialReady.GOOGLE) {
      setComingSoon('GOOGLE')
      return
    }
    setSocialBusy('GOOGLE')
    setError(null)
    try {
      const idToken = await signInWithGoogle()
      if (!idToken) {
        setSocialBusy(null)
        return
      }
      social.mutate({ provider: 'GOOGLE', token: idToken })
    } catch (e) {
      setSocialBusy(null)
      fail(e)
    }
  }

  const startKakao = async () => {
    if (!socialReady.KAKAO) {
      setComingSoon('KAKAO')
      return
    }
    setSocialBusy('KAKAO')
    setError(null)
    try {
      await signInWithKakao()
    } catch (e) {
      setSocialBusy(null)
      fail(e)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* 왼쪽: 차량 앱 시작 화면과 같은 주황 패널 */}
      <aside className="hidden w-[44%] flex-col justify-between bg-orange-500 p-10 text-white lg:flex xl:p-14">
        <Link to="/landing" className="text-[14px] font-medium text-white/80 hover:text-white">← 이에오 소개</Link>
        <div className="mx-auto w-full max-w-md">
          <img src="/ieo_wordmark_white.svg" alt="ieo." className="w-[160px]" />
          <p className="mt-5 text-[24px] font-medium tracking-wide text-white/90">끝나는 곳에서, 다음이 이어집니다</p>
          <div className="mt-10">
            <LoginShowcase />
          </div>
        </div>
        <p className="text-[13px] text-white/70">주선사 콘솔 · © 2026 이에오</p>
      </aside>

      {/* 오른쪽: 로그인 */}
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <img src="/ieo_wordmark_orange.svg" alt="ieo." className="h-9" />
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-ink-strong">{pendingSocial ? '거의 다 됐어요' : '주선사 콘솔 로그인'}</h1>
          <p className="mt-1.5 text-[14px] text-ink-sub">
            {pendingSocial ? `${providerName(pendingSocial.provider)} 계정을 확인했어요. 휴대폰 번호를 인증하면 가입이 끝나요.` : '처음이면 로그인하면서 바로 가입돼요.'}
          </p>
          {pendingSocial && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-orange-50 px-3.5 py-2.5 text-[13px] text-orange-700">
              <span className="flex items-center gap-2 font-medium">
                {pendingSocial.provider === 'GOOGLE' ? <GoogleMark /> : <KakaoMark />}
                {providerName(pendingSocial.provider)} 계정 확인됨
              </span>
              <button type="button" onClick={leaveSocial} className="font-medium underline underline-offset-2 hover:text-orange-600">다른 방법으로</button>
            </div>
          )}

          <div className="mt-7">
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
            {step === 'signup' && <SignUpForm social={pendingSocial !== null} loading={signUp.isPending} onSubmit={(v) => signUp.mutate(v)} />}
            {error ? <div className="mt-4"><ErrorText>{error}</ErrorText></div> : null}
          </div>

          {step === 'phone' && !pendingSocial && (
            <>
              <div className="my-6 flex items-center gap-3 text-[12px] text-ink-sub">
                <span className="h-px flex-1 bg-line" />
                또는 소셜 계정으로
                <span className="h-px flex-1 bg-line" />
              </div>
              <div className="space-y-2.5">
                <SocialButton provider="GOOGLE" busy={socialBusy} onClick={startGoogle} />
                <SocialButton provider="KAKAO" busy={socialBusy} onClick={startKakao} />
              </div>
            </>
          )}

          {step === 'phone' && (
            <p className="mt-8 text-[12px] leading-relaxed text-ink-sub">
              로컬 서버에서는 인증번호가 문자 대신 서버 로그의 [문자 발송] 줄에 찍혀요.
            </p>
          )}
        </div>
      </main>

      <Modal open={comingSoon !== null} onClose={() => setComingSoon(null)} title={`${comingSoon === 'KAKAO' ? '카카오' : 'Google'} 로그인 준비 중`} width="max-w-sm">
        <p className="text-[14px] leading-relaxed text-ink-mid">
          {comingSoon === 'KAKAO' ? '카카오' : 'Google'} 로그인은 준비 중이에요. 지금은 휴대폰 번호로 로그인해 주세요. 처음이어도 번호 인증만 하면 바로 가입돼요.
        </p>
        <Button type="button" className="mt-5 w-full" onClick={() => setComingSoon(null)}>
          휴대폰 번호로 로그인하기
        </Button>
      </Modal>
    </div>
  )
}

/** 소셜 로그인 버튼. 공급자 키가 없으면 "준비 중" 꼬리표가 붙고, 누르면 안내 창이 뜬다 */
function SocialButton({ provider, busy, onClick }: { provider: SocialProvider; busy: SocialProvider | null; onClick: () => void }) {
  const ready = socialReady[provider]
  const label = provider === 'GOOGLE' ? 'Google로 로그인' : '카카오로 로그인'
  const style = provider === 'GOOGLE' ? 'border border-line bg-white text-ink-strong hover:bg-canvas' : 'bg-[#FEE500] text-[#191600] hover:brightness-95'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy !== null}
      aria-label={ready ? label : `${label} (준비 중)`}
      className={`relative flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl text-[15px] font-bold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${style}`}
    >
      {provider === 'GOOGLE' ? <GoogleMark /> : <KakaoMark />}
      {busy === provider ? '로그인 중…' : label}
      {!ready && <span className="absolute right-3 rounded-md bg-canvas px-1.5 py-0.5 text-[11px] font-medium text-ink-sub">준비 중</span>}
    </button>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 2.9-2.2 5.4-4.7 7.1l7.3 5.7c4.3-4 7.2-9.8 7.2-16.8z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2.1 1.4-4.9 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  )
}

function KakaoMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#191600" d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.2 4.7 6.6l-1 3.7c-.1.3.3.6.6.4l4.4-2.9c.4 0 .9.1 1.3.1 5.5 0 10-3.5 10-7.9S17.5 3 12 3z" />
    </svg>
  )
}

/** 숫자만 남기고 010-1234-5678 꼴로 하이픈을 넣는다 */
function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

export function PhoneForm({ loading, onSubmit }: { loading: boolean; onSubmit: (phone: string) => void }) {
  const { register, handleSubmit, formState } = useForm<{ phone: string }>()
  const phoneField = register('phone', {
    required: '휴대폰 번호를 입력해 주세요.',
    validate: (v) => /^01\d{8,9}$/.test(v.replace(/\D/g, '')) || '휴대폰 번호를 다시 확인해 주세요.',
  })
  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v.phone.replace(/\D/g, '')))} className="space-y-4">
      <h1 className="text-[18px] font-bold">휴대폰 번호로 로그인</h1>
      <Field
        label="휴대폰 번호"
        placeholder="010-1234-5678"
        inputMode="numeric"
        autoComplete="tel"
        maxLength={13}
        autoFocus
        error={formState.errors.phone?.message}
        {...phoneField}
        onChange={(e) => {
          // 칸의 글자를 하이픈 꼴로 바꾼 뒤 폼 라이브러리에 그대로 알린다
          e.target.value = formatPhone(e.target.value)
          void phoneField.onChange(e)
        }}
      />
      <Button type="submit" className="w-full" loading={loading}>
        인증번호 받기
      </Button>
    </form>
  )
}

export function CodeForm({
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
        <p className="mt-1 text-[14px] text-ink-sub">{formatPhone(phone)}로 보낸 6자리 숫자</p>
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

function providerName(provider: SocialProvider) {
  return provider === 'KAKAO' ? '카카오' : 'Google'
}

function SignUpForm({
  social,
  loading,
  onSubmit,
}: {
  /** 소셜로 들어온 가입이면 안내 문구가 다르다 */
  social: boolean
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
        <h1 className="text-[18px] font-bold">{social ? '마지막 단계예요' : '처음 오셨네요'}</h1>
        <p className="mt-1 text-[14px] text-ink-sub">
          {social
            ? '담당자 이름과 동의만 받으면 가입이 끝나요. 이 번호로 이미 가입돼 있다면 그 계정에 소셜 계정만 연결돼요.'
            : '담당자 이름과 동의만 받고 바로 시작해요. 회사는 다음 화면에서 등록해요.'}
        </p>
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
