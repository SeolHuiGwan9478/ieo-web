import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { ordersApi, type Applicant, type Order } from '../../api/orders'
import { ApiError } from '../../api/client'
import type { CancelReason } from '../../api/types'
import { CANCEL_REASONS, CONFIRM_MODE, CONSIGNMENT, ORDER_STATUS, REQUEST_STATUS } from '../../api/types'
import { Button, Card, DescList, ErrorText, LinkButton, Loading, Modal, PageHeader, SelectField, Table, Tag, TextareaField } from '../../components/ui'
import { formatDateTime, formatRelative, formatWon } from '../../lib/format'

/** 오더 상세: 정보 + 배차 요청한 차주 + 확정·취소·내리기 (DSP-020~032) */
export function OrderDetailPage() {
  const orderId = Number(useParams().orderId)
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)

  const order = useQuery({ queryKey: ['orders', orderId], queryFn: () => ordersApi.get(orderId) })
  const applicants = useQuery({ queryKey: ['orders', orderId, 'requests'], queryFn: () => ordersApi.applicants(orderId), refetchInterval: 15_000 })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    queryClient.invalidateQueries({ queryKey: ['trips'] })
  }
  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : '서버와 연결할 수 없어요.')

  const confirm = useMutation({ mutationFn: (requestId: number) => ordersApi.confirm(orderId, requestId), onSuccess: refresh, onError: fail })
  const close = useMutation({ mutationFn: () => ordersApi.close(orderId), onSuccess: refresh, onError: fail })
  const cancel = useMutation({
    mutationFn: (body: { reason: CancelReason; memo?: string; reopen: boolean }) => ordersApi.cancel(orderId, body),
    onSuccess: () => {
      setCancelOpen(false)
      refresh()
    },
    onError: fail,
  })

  if (order.isPending) return <Loading rows={6} />
  if (order.isError || !order.data) return <ErrorText>{order.error instanceof ApiError ? order.error.message : '오더를 불러오지 못했어요.'}</ErrorText>
  const o = order.data
  const pending = (applicants.data ?? []).filter((a) => a.status === 'PENDING')
  const others = (applicants.data ?? []).filter((a) => a.status !== 'PENDING')

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {o.pickup.name} <span className="text-ink-sub">→</span> {o.dropoff.name}
            <Tag tone={ORDER_STATUS[o.status].tone} dot>
              {o.status === 'CLOSED' && o.closeReason === 'EXPIRED' ? '상차 시간 지남' : o.status === 'CLOSED' && o.closeReason === 'UNLINKED' ? '단골 해제' : ORDER_STATUS[o.status].label}
            </Tag>
          </span>
        }
        description={`오더 #${o.id} · ${formatDateTime(o.createdAt)} 등록`}
        back={{ to: '/orders', label: '오더' }}
        action={
          <>
            <LinkButton to={`/orders/new?from=${o.id}`} variant="secondary">
              복사해서 올리기
            </LinkButton>
            {o.status !== 'CLOSED' ? (
              <LinkButton to={`/orders/${o.id}/edit`} variant="secondary">
                {o.status === 'ASSIGNED' ? '거래처·청구운임 수정' : '수정'}
              </LinkButton>
            ) : null}
            {o.status === 'OPEN' ? (
              <Button variant="secondary" loading={close.isPending} onClick={() => confirmDialog('이 오더를 내릴까요? 대기 중인 요청은 모두 마감돼요.') && close.mutate()}>
                오더 내리기
              </Button>
            ) : null}
            {o.status === 'ASSIGNED' ? (
              <Button variant="danger" onClick={() => setCancelOpen(true)}>
                배차 취소
              </Button>
            ) : null}
          </>
        }
      />
      <ErrorText>{error}</ErrorText>

      <div className="mt-4 grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          {o.status === 'OPEN' ? (
            <Card title={`배차 요청 ${pending.length}건`} padded={false}>
              <Table
                rows={pending}
                rowKey={(a) => a.requestId}
                empty={o.open ? '아직 요청한 차주가 없어요. 15초마다 새로 확인해요.' : '상차 시간이 지나 더 이상 요청을 받지 않아요.'}
                columns={applicantColumns((a) => (
                  <Button size="sm" loading={confirm.isPending} onClick={() => confirm.mutate(a.requestId)}>
                    확정
                  </Button>
                ))}
              />
            </Card>
          ) : null}
          {others.length > 0 ? (
            <Card title="지난 요청" padded={false}>
              <Table rows={others} rowKey={(a) => a.requestId} columns={applicantColumns((a) => <Tag tone={REQUEST_STATUS[a.status].tone}>{REQUEST_STATUS[a.status].label}</Tag>)} />
            </Card>
          ) : null}
          {o.status === 'CLOSED' ? (
            <Card title={closedNote(o.closeReason).title}>
              <p className="text-[14px] text-ink-mid">{closedNote(o.closeReason).body}</p>
              <LinkButton to={`/orders/new?from=${o.id}`} variant="primary" className="mt-4">
                같은 조건으로 다시 올리기
              </LinkButton>
            </Card>
          ) : null}
          {o.status === 'ASSIGNED' ? (
            <Card title="배차 확정됨">
              <p className="text-[14px] text-ink-mid">
                차주의 운행이 만들어졌어요. 위치·대기·인수증은{' '}
                <Link to="/trips" className="font-semibold text-orange-700">
                  진행 중 운행
                </Link>
                에서 봐요.
              </p>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Card title="상하차">
            <div className="space-y-4">
              <Place label="상차" name={o.pickup.name} address={o.pickup.address} when={`${formatDateTime(o.pickupFrom)} ~ ${formatDateTime(o.pickupUntil)}`} />
              <Place label="하차" name={o.dropoff.name} address={o.dropoff.address} when={`${formatDateTime(o.dropoffBy)}까지`} />
            </div>
          </Card>
          <Card title="화물·차량·운임">
            <DescList
              items={[
                { label: '화물', value: `${o.cargoCategoryLabel} · ${o.cargoType}` },
                { label: '무게', value: `${o.weightKg.toLocaleString()}kg` },
                { label: '차량', value: `${o.tonnageLabel} ${o.bodyTypeLabel}` },
                { label: '상하차', value: o.loadingMethodLabel },
                { label: '지급운임 (차주)', value: <span className="text-[16px] font-bold">{formatWon(o.fare)}</span> },
                ...(o.billing?.billedFare !== null && o.billing?.billedFare !== undefined
                  ? [
                      { label: '청구운임 (화주)', value: <span className="text-[16px] font-bold">{formatWon(o.billing.billedFare)}</span> },
                      {
                        label: '수수료',
                        value: (
                          <span className={o.billing.fee! < 0 ? 'text-status-red' : ''}>
                            {formatWon(o.billing.fee)} · {o.billing.feeRate}%
                            <span className="ml-2 text-[12px] font-normal text-ink-sub">차주에게는 안 보여요</span>
                          </span>
                        ),
                      },
                    ]
                  : [{ label: '청구운임 (화주)', value: <span className="text-ink-sub">안 적음</span> }]),
                { label: '거래처', value: o.billing?.customerName ?? <span className="text-ink-sub">-</span> },
                { label: '결제', value: o.paymentType === 'RECEIPT' ? `${o.paymentTypeLabel} · 전달 뒤 ${o.expectedPaymentDays}일` : o.paymentTypeLabel },
                { label: '운송 형태', value: CONSIGNMENT[o.consignmentType] },
                { label: '배차', value: o.targetDriverId ? '단골 차주 지정' : CONFIRM_MODE[o.confirmMode] },
              ]}
            />
          </Card>
        </div>
      </div>

      <CancelModal open={cancelOpen} onClose={() => setCancelOpen(false)} loading={cancel.isPending} onSubmit={(v) => cancel.mutate(v)} />
    </>
  )
}

function confirmDialog(message: string) {
  return window.confirm(message)
}

function Place({ label, name, address, when }: { label: string; name: string; address: string; when: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-canvas text-[11px] font-bold text-ink-mid">{label}</span>
      <div className="min-w-0">
        <p className="font-semibold text-ink-strong">{name}</p>
        <p className="text-[13px] text-ink-sub">{address}</p>
        <p className="mt-0.5 text-[13px] tabular-nums text-ink-mid">{when}</p>
      </div>
    </div>
  )
}

function applicantColumns(action: (a: Applicant) => React.ReactNode) {
  return [
    {
      key: 'driver',
      header: '차주',
      cell: (a: Applicant) => (
        <div>
          <p className="flex items-center gap-1.5 font-semibold">
            {a.driverName}
            {a.verified ? <Tag tone="orange">인증 차주</Tag> : null}
          </p>
          <p className="text-[12.5px] text-ink-sub">
            {a.plateNumber} · {a.tonnageLabel} {a.bodyTypeLabel}
          </p>
        </div>
      ),
    },
    {
      key: 'record',
      header: '이행 기록',
      cell: (a: Applicant) => (
        <span className="text-[13px]">
          완료 {a.completedTripCount}건{a.lateCancelCount > 0 ? <span className="text-status-red"> · 늦은 취소 {a.lateCancelCount}</span> : null}
        </span>
      ),
    },
    { key: 'when', header: '요청', cell: (a: Applicant) => <span className="text-[13px] text-ink-mid">{formatRelative(a.requestedAt)}</span> },
    { key: 'action', header: '', align: 'right' as const, cell: action },
  ]
}

function CancelModal({ open, onClose, loading, onSubmit }: { open: boolean; onClose: () => void; loading: boolean; onSubmit: (v: { reason: CancelReason; memo?: string; reopen: boolean }) => void }) {
  const { register, handleSubmit } = useForm<{ reason: CancelReason; memo: string; reopen: 'true' | 'false' }>({ defaultValues: { reason: 'SHIPPER_CANCELED', memo: '', reopen: 'true' } })
  return (
    <Modal open={open} onClose={onClose} title="배차 취소">
      <form onSubmit={handleSubmit((v) => onSubmit({ reason: v.reason, memo: v.memo.trim() || undefined, reopen: v.reopen === 'true' }))} className="space-y-4">
        <p className="text-[14px] text-ink-mid">차주의 운행이 취소되고 취소 기록이 남아요. 상차 2시간 이내면 차주 이행 기록에는 남지 않아요 (주선사 취소).</p>
        <p className="text-[13px] text-ink-sub">짐을 실은 뒤(운송 중·하차지)에는 기사님이 앱에서 취소할 수 없어서, 취소가 필요하면 기사님이 연락해 올 수 있어요.</p>
        <SelectField label="사유" options={CANCEL_REASONS} {...register('reason')} />
        <TextareaField label="메모 (선택)" placeholder="차주에게 보이지 않아요. 내부 기록용" maxLength={200} {...register('memo')} />
        <SelectField
          label="취소 뒤"
          options={[
            { value: 'true', label: '다시 모집 (오더를 마켓에 다시 올림)' },
            { value: 'false', label: '오더 내리기' },
          ]}
          {...register('reopen')}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            닫기
          </Button>
          <Button type="submit" variant="danger" loading={loading}>
            배차 취소
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** 마감 이유별 안내. UNLINKED는 지정한 단골 차주와 연결이 해제되어 서버가 마감한 오더 (BRK-011) */
function closedNote(reason: Order['closeReason']): { title: string; body: string } {
  switch (reason) {
    case 'EXPIRED':
      return { title: '상차 시간이 지나 마감됐어요', body: '상차 가능 시간이 끝날 때까지 배차되지 않아 자동으로 마감됐어요. 차주에게는 더 이상 보이지 않아요.' }
    case 'CANCELED':
      return { title: '배차가 취소되어 마감됐어요', body: '확정됐던 배차를 취소하면서 오더도 내렸어요. 지난 요청은 아래에 남아 있어요.' }
    case 'UNLINKED':
      return { title: '단골 해제로 마감됐어요', body: '이 오더를 지정한 단골 차주와 연결이 해제되어 자동으로 마감됐어요. 다시 모집하려면 아래 버튼으로 같은 조건을 불러와 마켓에 공개하거나 다른 단골 차주를 정해 주세요.' }
    default:
      return { title: '내린 오더예요', body: '마감된 오더는 다시 열 수 없어요. 같은 조건으로 다시 올리려면 아래 버튼을 눌러 주세요.' }
  }
}
