import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router'
import { adminApi } from '../../api/admin'
import { authApi, type PhoneVerifyResponse } from '../../api/auth'
import { tokens } from '../../api/client'
import { ErrorText } from '../../components/ui'
import { CodeForm, PhoneForm } from '../LoginPage'

/**
 * 운영자 로그인 (07 인계서 6.1). 일반 로그인과 분리하고, 서버에서 운영자(ADMIN)로 지정한 번호만 들어온다.
 * 가입 화면은 없다. 운영자 계정은 scripts/seed-documents.py 또는 SQL로 만든다
 */
export function AdminLoginPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [demo, setDemo] = useState<{ code: string; expiresAt: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!demo) return
    const timeout = window.setTimeout(() => setDemo(null), Math.max(0, demo.expiresAt - Date.now()))
    return () => window.clearTimeout(timeout)
  }, [demo])

  const fail = (e: unknown) => setError(e instanceof Error ? e.message : '서버와 연결할 수 없어요.')

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
    onSuccess: async (result: PhoneVerifyResponse) => {
      // 운영자가 아닌 번호는 토큰을 받지 않는다. 가입도 여기서는 하지 않는다
      if (!result.accountExists || result.existingAccount?.role !== 'ADMIN') {
        setError('운영자 계정이 아니에요. 서버에서 운영자로 지정한 번호로만 들어올 수 있어요.')
        return
      }
      try {
        const token = await authApi.login(result.phoneToken)
        tokens.set(token.accessToken, token.refreshToken)
        const me = await adminApi.me()
        if (me.role !== 'ADMIN') {
          tokens.clear()
          setError('운영자 계정이 아니에요.')
          return
        }
        navigate('/admin/reviews', { replace: true })
      } catch (e) {
        tokens.clear()
        fail(e)
      }
    },
    onError: fail,
  })

  if (tokens.access && !verify.isPending) return <Navigate to="/admin/reviews" replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-line/70 bg-white p-8 shadow-[0_1px_3px_rgba(25,31,40,0.05)]">
        <img src="/ieo_wordmark_orange.svg" alt="ieo." className="h-8" />
        <p className="mt-5 text-[22px] font-bold tracking-tight text-ink-strong">운영자 로그인</p>
        <p className="mt-1.5 text-[14px] text-ink-sub">차주와 주선사의 서류를 심사하는 곳이에요. 이에오 운영자만 들어올 수 있어요.</p>
        <div className="mt-6">
          {step === 'phone' ? (
            <PhoneForm loading={sendCode.isPending} onSubmit={(v) => sendCode.mutate(v)} />
          ) : (
            <CodeForm
              phone={phone}
              demoCode={demo?.code ?? null}
              sending={sendCode.isPending}
              loading={verify.isPending}
              onSubmit={(code) => verify.mutate(code)}
              onBack={() => {
                setDemo(null)
                setError(null)
                setStep('phone')
              }}
              onResend={() => sendCode.mutate(phone)}
            />
          )}
          {error ? (
            <div className="mt-4">
              <ErrorText>{error}</ErrorText>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
