import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { driversApi } from '../api/people'
import { ApiError } from '../api/client'
import { Button, Card, ErrorText, Field, Modal, PageHeader, ListTable, Tabs, Tag } from '../components/ui'
import { formatDateTime, formatPhone } from '../lib/format'

/**
 * 단골 차주 (BRK-002): 번호로 연결 요청 → 차주가 차량 앱에서 수락 → 위치 공유·지정 배차.
 * 매일 하는 일이라 대표가 아닌 담당자도 요청·해제·취소를 할 수 있다 (서버도 직책을 가리지 않는다)
 */
export function DriversPage() {
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [tab, setTab] = useState<'linked' | 'pending'>('linked')
  const [error, setError] = useState<string | null>(null)
  const drivers = useQuery({ queryKey: ['drivers'], queryFn: driversApi.list })
  const invitations = useQuery({ queryKey: ['driver-invitations'], queryFn: driversApi.invitations })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['drivers'] })
    queryClient.invalidateQueries({ queryKey: ['driver-invitations'] })
    // 단골을 해제하면 운행 목록·상세의 "단골" 꼬리표와 위치 공개 여부가 바뀌므로 같이 새로 읽는다
    queryClient.invalidateQueries({ queryKey: ['trips'] })
  }
  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : '서버와 연결할 수 없어요.')
  const unlink = useMutation({ mutationFn: driversApi.unlink, onSuccess: refresh, onError: fail })
  const cancel = useMutation({ mutationFn: driversApi.cancelInvitation, onSuccess: refresh, onError: fail })

  const pending = (invitations.data ?? []).filter((i) => i.status === 'PENDING')

  return (
    <>
      <PageHeader
        title="단골 차주"
        description="단골 차주는 운행 중 위치가 보이고, 지정 배차를 받을 수 있어요."
        action={<Button onClick={() => setInviteOpen(true)}>번호로 연결 요청</Button>}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'linked', label: '연결된 차주', count: drivers.data?.length ?? 0 },
          { value: 'pending', label: '보낸 요청', count: pending.length },
        ]}
      />
      <ErrorText>{error}</ErrorText>
      <Card padded={false}>
        {tab === 'linked' ? (
          <ListTable
            rows={drivers.data ?? []}
            rowKey={(d) => d.linkId}
            empty="아직 연결된 차주가 없어요. 자주 일하는 차주의 번호로 연결을 요청해 보세요."
            columns={[
              {
                key: 'name',
                header: '차주',
                cell: (d) => (
                  <span className="flex items-center gap-1.5">
                    <span className="font-semibold">{d.name}</span>
                    {d.verified ? <Tag tone="orange">인증 차주</Tag> : null}
                  </span>
                ),
              },
              { key: 'phone', header: '연락처', cell: (d) => <a href={`tel:${d.phone}`} className="tabular-nums hover:text-orange-700">{formatPhone(d.phone)}</a> },
              { key: 'vehicle', header: '차량', cell: (d) => (d.plateNumber ? `${d.plateNumber} · ${d.tonnageLabel} ${d.bodyTypeLabel}` : <span className="text-ink-sub">차량 없음</span>) },
              {
                key: 'record',
                header: '이행 기록',
                cell: (d) => (
                  <span className="text-[13px]">
                    완료 {d.completedTripCount}건{d.lateCancelCount > 0 ? <span className="text-status-red"> · 늦은 취소 {d.lateCancelCount}</span> : null}
                  </span>
                ),
              },
              { key: 'since', header: '연결', cell: (d) => <span className="text-[13px] text-ink-mid">{formatDateTime(d.linkedAt)}</span> },
              {
                key: 'action',
                header: '',
                align: 'right',
                cell: (d) => (
                  <Button variant="ghost" size="sm" onClick={() => window.confirm(`${d.name} 차주와의 연결을 해제할까요? 진행 중인 운행은 그대로예요.`) && unlink.mutate(d.linkId)}>
                    해제
                  </Button>
                ),
              },
            ]}
          />
        ) : (
          <ListTable
            rows={pending}
            rowKey={(i) => i.id}
            empty="기다리는 요청이 없어요."
            columns={[
              { key: 'phone', header: '번호', cell: (i) => <span className="tabular-nums font-semibold">{formatPhone(i.phone)}</span> },
              { key: 'status', header: '상태', cell: (i) => <Tag tone="blue">{i.statusLabel}</Tag> },
              { key: 'by', header: '요청한 사람', cell: (i) => i.invitedByName },
              { key: 'until', header: '기한', cell: (i) => <span className="text-[13px] text-ink-mid">{formatDateTime(i.expiresAt)}까지</span> },
              { key: 'action', header: '', align: 'right', cell: (i) => <Button variant="ghost" size="sm" onClick={() => cancel.mutate(i.id)}>취소</Button> },
            ]}
          />
        )}
      </Card>
      <p className="mt-3 text-[12.5px] text-ink-sub">
        차주는 차량 앱(정차 중)에서 요청을 수락해요. 가입 전 번호도 요청할 수 있어요. 문자 발송은 아직 없어서 요청한 사실을 따로 알려 주세요.
      </p>
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} onDone={refresh} />
    </>
  )
}

function InviteModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState, reset } = useForm<{ phone: string }>()
  const invite = useMutation({
    mutationFn: (phone: string) => driversApi.invite(phone),
    onSuccess: () => {
      reset()
      setError(null)
      onDone()
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : '서버와 연결할 수 없어요.'),
  })
  return (
    <Modal open={open} onClose={onClose} title="단골 연결 요청">
      <form onSubmit={handleSubmit((v) => invite.mutate(v.phone.replace(/\D/g, '')))} className="space-y-4">
        <Field
          label="차주 휴대폰 번호"
          placeholder="01012345678"
          inputMode="numeric"
          autoFocus
          error={formState.errors.phone?.message}
          {...register('phone', { required: '번호를 입력해 주세요.', validate: (v) => /^01\d{8,9}$/.test(v.replace(/\D/g, '')) || '휴대폰 번호는 숫자만 입력해 주세요.' })}
        />
        <p className="text-[13px] text-ink-sub">차주가 수락하면 우리 운행 중 위치와 도착 예정 시각이 공유돼요. 요청은 7일 동안 유효해요.</p>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            닫기
          </Button>
          <Button type="submit" loading={invite.isPending}>
            요청 보내기
          </Button>
        </div>
      </form>
    </Modal>
  )
}
