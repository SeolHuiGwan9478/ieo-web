import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { membersApi } from '../api/people'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Button, Card, ErrorText, Field, Modal, PageHeader, Table, Tag } from '../components/ui'
import { formatDateTime, formatPhone } from '../lib/format'

/** 담당자 관리 (BRK-001 담당자 여러 명). 초대·직책·내보내기는 대표만 */
export function MembersPage() {
  const { me, logout } = useAuth()
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const members = useQuery({ queryKey: ['members'], queryFn: membersApi.list })
  const invitations = useQuery({ queryKey: ['member-invitations'], queryFn: membersApi.invitations })
  const isOwner = me?.position === 'OWNER'
  const limit = me?.plan.limits.members ?? null

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['members'] })
    queryClient.invalidateQueries({ queryKey: ['member-invitations'] })
  }
  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : '서버와 연결할 수 없어요.')
  const changePosition = useMutation({ mutationFn: (v: { userId: number; position: 'OWNER' | 'STAFF' }) => membersApi.changePosition(v.userId, v.position), onSuccess: refresh, onError: fail })
  const remove = useMutation({ mutationFn: membersApi.remove, onSuccess: refresh, onError: fail })
  const cancel = useMutation({ mutationFn: membersApi.cancelInvitation, onSuccess: refresh, onError: fail })
  const leave = useMutation({ mutationFn: membersApi.leave, onSuccess: logout, onError: fail })

  const pending = (invitations.data ?? []).filter((i) => i.status === 'PENDING')
  const used = (members.data?.length ?? 0) + pending.length

  return (
    <>
      <PageHeader
        title="담당자"
        description={limit ? `지금 플랜은 담당자를 ${limit}명까지 둘 수 있어요 (${used}/${limit}, 대기 중인 초대 포함).` : '담당자 수 제한이 없는 플랜이에요.'}
        action={isOwner ? <Button onClick={() => setInviteOpen(true)}>번호로 초대</Button> : null}
      />
      <ErrorText>{error}</ErrorText>
      <div className="mt-4 space-y-5">
        <Card title="담당자" padded={false}>
          <Table
            rows={members.data ?? []}
            rowKey={(m) => m.userId}
            columns={[
              {
                key: 'name',
                header: '이름',
                cell: (m) => (
                  <span className="flex items-center gap-2 font-semibold">
                    {m.name} {m.me ? <Tag tone="gray">나</Tag> : null}
                  </span>
                ),
              },
              { key: 'phone', header: '연락처', cell: (m) => <span className="tabular-nums">{formatPhone(m.phone)}</span> },
              { key: 'pos', header: '직책', cell: (m) => <Tag tone={m.position === 'OWNER' ? 'orange' : 'gray'}>{m.positionLabel}</Tag> },
              { key: 'since', header: '합류', cell: (m) => <span className="text-[13px] text-ink-mid">{formatDateTime(m.joinedAt)}</span> },
              {
                key: 'action',
                header: '',
                align: 'right',
                cell: (m) =>
                  isOwner && !m.me ? (
                    <span className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => changePosition.mutate({ userId: m.userId, position: m.position === 'OWNER' ? 'STAFF' : 'OWNER' })}>
                        {m.position === 'OWNER' ? '담당자로' : '대표로'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => window.confirm(`${m.name}님을 회사에서 내보낼까요? 기록은 남고 소속만 끊겨요.`) && remove.mutate(m.userId)}>
                        내보내기
                      </Button>
                    </span>
                  ) : null,
              },
            ]}
          />
        </Card>
        <Card title={`수락 기다리는 초대 ${pending.length}건`} padded={false}>
          <Table
            rows={pending}
            rowKey={(i) => i.id}
            empty="기다리는 초대가 없어요."
            columns={[
              { key: 'phone', header: '번호', cell: (i) => <span className="tabular-nums font-semibold">{formatPhone(i.phone)}</span> },
              { key: 'status', header: '상태', cell: (i) => <Tag tone="blue">{i.statusLabel}</Tag> },
              { key: 'by', header: '초대한 사람', cell: (i) => i.invitedByName },
              { key: 'until', header: '기한', cell: (i) => <span className="text-[13px] text-ink-mid">{formatDateTime(i.expiresAt)}까지</span> },
              { key: 'action', header: '', align: 'right', cell: (i) => (isOwner ? <Button variant="ghost" size="sm" onClick={() => cancel.mutate(i.id)}>취소</Button> : null) },
            ]}
          />
        </Card>
        <div className="flex items-center justify-between rounded-2xl border border-line/70 bg-white px-5 py-4">
          <div>
            <p className="text-[14px] font-semibold">회사 나가기</p>
            <p className="text-[12.5px] text-ink-sub">나가면 이 회사의 콘솔을 더 쓸 수 없어요. 마지막 대표는 다른 담당자를 대표로 지정한 뒤에 나갈 수 있어요.</p>
          </div>
          <Button variant="danger" size="sm" loading={leave.isPending} onClick={() => window.confirm('정말 회사를 나갈까요?') && leave.mutate()}>
            나가기
          </Button>
        </div>
        <p className="text-[12.5px] text-ink-sub">초대받은 사람은 그 번호로 콘솔에 로그인하면 초대가 보여요. 문자 발송은 아직 붙지 않아서 초대한 사실을 따로 알려 주세요.</p>
      </div>
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} onDone={refresh} />
    </>
  )
}

function InviteModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState, reset } = useForm<{ phone: string }>()
  const invite = useMutation({
    mutationFn: (phone: string) => membersApi.invite(phone),
    onSuccess: () => {
      reset()
      setError(null)
      onDone()
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : '서버와 연결할 수 없어요.'),
  })
  return (
    <Modal open={open} onClose={onClose} title="담당자 초대">
      <form onSubmit={handleSubmit((v) => invite.mutate(v.phone.replace(/\D/g, '')))} className="space-y-4">
        <Field
          label="휴대폰 번호"
          placeholder="01012345678"
          inputMode="numeric"
          autoFocus
          error={formState.errors.phone?.message}
          {...register('phone', { required: '번호를 입력해 주세요.', validate: (v) => /^01\d{8,9}$/.test(v.replace(/\D/g, '')) || '휴대폰 번호는 숫자만 입력해 주세요.' })}
        />
        <p className="text-[13px] text-ink-sub">초대는 7일 동안 유효해요. 수락하면 담당자(STAFF)로 들어와요.</p>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            닫기
          </Button>
          <Button type="submit" loading={invite.isPending}>
            초대 보내기
          </Button>
        </div>
      </form>
    </Modal>
  )
}
