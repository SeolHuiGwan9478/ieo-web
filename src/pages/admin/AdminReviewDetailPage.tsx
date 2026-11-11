import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import type { BusinessCheck, DocumentItem, DocumentStatus, DocumentType, RejectReason, ReviewDetailBase, ReviewRowBase } from '../../api/admin'
import { ApiError } from '../../api/client'
import { DOCUMENT_STATUS, businessCheckTag } from '../../admin/documentStatus'
import type { ReviewKindConfig } from '../../admin/reviewKinds'
import { Button, Card, DescList, ErrorText, Loading, Modal, PageHeader, Tabs, Tag, TextareaField } from '../../components/ui'
import { formatDateTime } from '../../lib/format'

/**
 * 차주별·회사별 심사 상세 (07 인계서 6.3, 13장). 왼쪽은 서류 사진(확대·회전·서류 간 이동), 오른쪽은 등록된 정보와 확인 항목, 처리 이력.
 * 서류마다 승인하거나 사유를 골라 반려한다. 다른 운영자가 먼저 처리했으면 409를 받고 새로 고친다.
 * 사업자등록증은 국세청 진위확인 결과 카드가 붙고 "다시 조회"할 수 있다 (12장). 차주·주선사의 차이는 config(reviewKinds.tsx)에 있다
 */
export function AdminReviewDetailPage<R extends ReviewRowBase, D extends ReviewDetailBase>({ config }: { config: ReviewKindConfig<R, D> }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['admin', config.kind, 'detail', id],
    queryFn: () => config.api.detail(id!),
    enabled: Boolean(id),
  })
  const [selected, setSelected] = useState<DocumentType | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState<RejectReason | null>(null)
  const [note, setNote] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [nextBusy, setNextBusy] = useState(false)

  const documents = useMemo(() => query.data?.documents ?? [], [query.data])
  const submitted = useMemo(() => documents.filter((d) => d.latest !== null), [documents])
  // 처음에는 심사 대기 서류부터 보여 준다
  const current = submitted.find((d) => d.type === selected) ?? submitted.find((d) => d.latest?.status === 'PENDING') ?? submitted[0] ?? null
  const pendingLeft = submitted.filter((d) => d.latest?.status === 'PENDING').length

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin'] })
  const failed = (e: unknown) => {
    if (e instanceof ApiError && e.code === 'DOCUMENT_409_REVIEWED') {
      setNotice('다른 운영자가 먼저 처리했어요. 최신 상태로 새로 고쳤어요.')
      void refresh()
      return
    }
    setNotice(e instanceof Error ? e.message : '처리하지 못했어요.')
  }
  const approve = useMutation({
    mutationFn: (documentId: number) => config.api.approve(documentId),
    onSuccess: () => {
      setNotice(null)
      void refresh()
    },
    onError: failed,
  })
  const reject = useMutation({
    mutationFn: (input: { id: number; reasonCode: RejectReason; note?: string }) => config.api.reject(input.id, { reasonCode: input.reasonCode, note: input.note }),
    onSuccess: () => {
      setNotice(null)
      setRejecting(false)
      void refresh()
    },
    onError: (e) => {
      setRejecting(false)
      failed(e)
    },
  })
  const recheck = useMutation({
    mutationFn: (documentId: number) => config.api.recheckBusiness(documentId),
    onSuccess: () => {
      setNotice(null)
      void refresh()
    },
    onError: failed,
  })
  const busy = approve.isPending || reject.isPending || recheck.isPending

  const openReject = () => {
    // 국세청 조회가 불일치·휴업·폐업이면 그 사유를 미리 골라 둔다
    const check = current?.latest?.businessCheck
    setReason(check?.result === 'MISMATCH' ? 'BUSINESS_MISMATCH' : check?.result === 'MATCH' && check.status && check.status !== 'ACTIVE' ? 'BUSINESS_CLOSED' : null)
    setNote('')
    setReasonError(null)
    setRejecting(true)
  }
  const submitReject = () => {
    if (!current?.latest) return
    const option = query.data?.rejectReasons.find((r) => r.code === reason)
    if (!option) {
      setReasonError('반려 사유를 골라 주세요.')
      return
    }
    if (option.noteRequired && !note.trim()) {
      setReasonError(config.otherReasonError)
      return
    }
    reject.mutate({ id: current.latest.id, reasonCode: option.code, note: note.trim() || undefined })
  }

  /** 처리가 끝나면 다음 심사 대기 건으로 넘어간다 */
  const goNext = async () => {
    setNextBusy(true)
    try {
      const list = await config.api.list({ status: 'PENDING', page: 0, size: 5 })
      const next = list.items.find((r) => String(config.rowId(r)) !== id)
      if (next) {
        setSelected(null)
        navigate(config.detailPath(config.rowId(next)))
      } else {
        setNotice(config.noNextMessage)
      }
    } catch (e) {
      failed(e)
    } finally {
      setNextBusy(false)
    }
  }

  if (query.isPending) return <Loading rows={6} />
  if (query.isError) {
    return (
      <Card>
        <ErrorText>{query.error.message}</ErrorText>
        <Link to={config.listPath} className="mt-3 inline-block text-[14px] font-semibold text-orange-700 underline underline-offset-2">
          심사 목록으로
        </Link>
      </Card>
    )
  }
  const data = query.data
  const info = config.infoCard(data)

  return (
    <>
      <PageHeader
        back={{ to: config.listPath, label: '심사 목록' }}
        title={config.detailTitle(data)}
        description={config.detailDescription}
        action={
          <div className="flex items-center gap-2">
            {data.verified ? (
              <Tag tone="green" dot>
                인증됨
              </Tag>
            ) : (
              <Tag tone="gray">
                필수 {data.approvedRequired}/{data.requiredTotal} 승인
              </Tag>
            )}
            {pendingLeft ? <Tag tone="yellow">대기 {pendingLeft}</Tag> : null}
          </div>
        }
      />
      {notice ? (
        <div role="status" className="mb-4 rounded-xl bg-orange-50 px-4 py-3 text-[14px] text-orange-700">
          {notice}
        </div>
      ) : null}
      {pendingLeft === 0 && submitted.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 text-[14px]">
          <span className="text-ink-mid">{config.allDoneMessage}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigate(config.listPath)}>
              목록으로
            </Button>
            <Button size="sm" loading={nextBusy} onClick={goNext}>
              다음 심사 대기 건
            </Button>
          </div>
        </div>
      ) : null}

      <Tabs<DocumentType>
        value={current?.type ?? documents[0]?.type}
        onChange={setSelected}
        items={documents.map((d) => ({
          value: d.type,
          label: d.label,
          disabled: !d.latest,
          mark: d.latest ? (
            <span className={`h-1.5 w-1.5 rounded-full ${dotClass(d.latest.status)}`} aria-label={DOCUMENT_STATUS[d.latest.status].label} />
          ) : (
            <span className="text-[11px] font-medium text-ink-sub">미제출</span>
          ),
        }))}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <Card padded={false}>
          {current?.latest ? (
            <>
              <DocumentViewer
                key={current.latest.id}
                document={current.latest}
                fetchFile={config.api.file}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
                <div className="text-[14px]">
                  <span className="font-bold text-ink-strong">{current.label}</span>
                  <span className="ml-2">
                    <Tag tone={DOCUMENT_STATUS[current.latest.status].tone} dot>
                      {DOCUMENT_STATUS[current.latest.status].label}
                    </Tag>
                  </span>
                  <p className="mt-1 text-[12.5px] text-ink-sub">
                    {formatDateTime(current.latest.submittedAt)} 제출{current.latest.reviewedAt ? ` · ${formatDateTime(current.latest.reviewedAt)} 처리` : ''}
                  </p>
                  {current.latest.rejectMessage ? <p className="mt-1 text-[13px] text-status-red">반려 사유: {current.latest.rejectMessage}</p> : null}
                </div>
                {current.latest.status === 'PENDING' ? (
                  <div className="flex gap-2">
                    <Button variant="danger" disabled={busy} onClick={openReject}>
                      반려
                    </Button>
                    <Button loading={approve.isPending} disabled={busy} onClick={() => approve.mutate(current.latest!.id)}>
                      승인
                    </Button>
                  </div>
                ) : null}
              </div>
              {current.history.length > 1 ? <History items={current.history.slice(1)} /> : null}
            </>
          ) : (
            <div className="px-5 py-14 text-center text-[14px] text-ink-sub">아직 낸 서류가 없어요.</div>
          )}
        </Card>

        <div className="space-y-5">
          <Card title={info.title}>
            <DescList items={info.items} />
          </Card>
          {current?.latest?.businessCheck ? (
            <BusinessCheckCard
              check={current.latest.businessCheck}
              pending={current.latest.status === 'PENDING'}
              busy={busy}
              rechecking={recheck.isPending}
              onRecheck={() => recheck.mutate(current.latest!.id)}
            />
          ) : null}
          {current ? (
            <Card title={`${current.label}에서 볼 것`}>
              <ul className="space-y-2 text-[14px] text-ink-mid">
                {current.checks.map((check) => (
                  <li key={check} className="flex gap-2">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                    {check}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          <Card title="처리 이력">
            {data.events.length === 0 ? (
              <p className="text-[14px] text-ink-sub">아직 없어요.</p>
            ) : (
              <ol className="max-h-[320px] space-y-3 overflow-y-auto pr-1 text-[13.5px]">
                {data.events.map((event) => (
                  <li key={event.id}>
                    <p>
                      <span className="font-semibold text-ink-strong">{event.typeLabel}</span> <span className="text-ink-mid">· {event.documentTypeLabel}</span>
                    </p>
                    <p className="text-[12.5px] text-ink-sub">
                      {formatDateTime(event.at)} · {event.actorName ?? '-'}
                    </p>
                    {event.detail ? <p className={`text-[12.5px] ${event.type === 'REJECTED' ? 'text-status-red' : 'text-ink-mid'}`}>{event.detail}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <Modal open={rejecting} onClose={() => setRejecting(false)} title="반려 사유">
        <p className="mb-3 text-[13.5px] text-ink-sub">{config.rejectHint}</p>
        <div className="max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
          {data.rejectReasons.map((option) => (
            <label
              key={option.code}
              className={`flex cursor-pointer gap-3 rounded-xl border px-3.5 py-2.5 ${reason === option.code ? 'border-orange-500 bg-orange-50' : 'border-line hover:bg-canvas'}`}
            >
              <input
                type="radio"
                name="reason"
                className="mt-1 accent-orange-600"
                checked={reason === option.code}
                onChange={() => {
                  setReason(option.code)
                  setReasonError(null)
                }}
              />
              <span>
                <span className="block text-[14px] font-semibold text-ink-strong">{option.label}</span>
                <span className="block text-[12.5px] text-ink-sub">{option.message ?? '보일 사유를 직접 적어요'}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-4">
          <TextareaField
            label={reason === 'OTHER' ? '사유 (필수)' : '보충 설명 (선택)'}
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
            placeholder={config.rejectNotePlaceholder}
            error={reasonError ?? undefined}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRejecting(false)}>
            취소
          </Button>
          <Button variant="danger" loading={reject.isPending} onClick={submitReject}>
            반려하기
          </Button>
        </div>
      </Modal>
    </>
  )
}

/** 사업자등록증의 입력값과 국세청 진위확인 (07 인계서 12장). 조회는 입력된(등록된) 값 기준이라 사진의 번호·개업일·대표자와 같은지 먼저 본다 */
function BusinessCheckCard({ check, pending, busy, rechecking, onRecheck }: { check: BusinessCheck; pending: boolean; busy: boolean; rechecking: boolean; onRecheck: () => void }) {
  const tag = businessCheckTag(check.result, check.status)
  const look = check.attention ? 'bg-status-red-bg text-status-red' : check.result === 'MATCH' ? 'bg-status-green-bg text-status-green' : 'bg-canvas text-ink-mid'
  return (
    <Card
      title="국세청 사업자 확인"
      action={
        pending ? (
          <Button size="sm" variant="secondary" loading={rechecking} disabled={busy} onClick={onRecheck}>
            다시 조회
          </Button>
        ) : undefined
      }
    >
      <div className={`mb-4 rounded-xl px-3.5 py-2.5 text-[13.5px] ${look}`}>
        <p className="flex flex-wrap items-center gap-1.5">
          {tag ? (
            <Tag tone={tag.tone} dot>
              {tag.label}
            </Tag>
          ) : (
            <Tag tone="gray">{check.resultLabel ?? '조회 안 함'}</Tag>
          )}
          {check.stub ? <Tag tone="orange">시연용 응답</Tag> : null}
        </p>
        <p className="mt-1.5">{check.summary}</p>
      </div>
      <DescList
        items={[
          { label: '사업자번호', value: check.businessNumber },
          { label: '개업일', value: check.openedOn },
          { label: '대표자', value: check.ownerName },
          { label: '사업자 상태', value: check.statusLabel ?? '-' },
          { label: '과세 유형', value: check.taxType ?? '-' },
          ...(check.closedOn ? [{ label: '폐업일', value: check.closedOn }] : []),
          { label: '조회 시각', value: check.checkedAt ? formatDateTime(check.checkedAt) : '-' },
        ]}
      />
      <p className="mt-3 text-[12.5px] text-ink-sub">입력되거나 등록된 값으로 조회해요. 사진의 번호·개업일·대표자와 같은지 먼저 보고, 승인·반려는 운영자가 정해요.</p>
    </Card>
  )
}

/** 서류 사진. 로그인 토큰이 필요한 API라 <img src>로 바로 못 열고, 받아서 blob 주소로 보여 준다 */
function DocumentViewer({
  document,
  fetchFile,
}: {
  document: DocumentItem
  fetchFile: (documentId: number) => Promise<Blob>
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    fetchFile(document.id)
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : '사진을 불러오지 못했어요.')
      })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [document.id, fetchFile])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-2.5">
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}>
            축소
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}>
            확대
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setRotation((r) => (r + 90) % 360)}>
            회전
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setZoom(1)
              setRotation(0)
            }}
          >
            {Math.round(zoom * 100)}%
          </Button>
        </div>
      </div>
      <div className="h-[560px] overflow-auto bg-canvas">
        {error ? (
          <div className="flex h-full items-center justify-center">
            <ErrorText>{error}</ErrorText>
          </div>
        ) : url ? (
          <div className="flex min-h-full min-w-full items-center justify-center p-4">
            <img
              src={url}
              alt={`${document.typeLabel} 사진`}
              style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? '100%' : 'none', transform: `rotate(${rotation}deg)` }}
              className="rounded-lg shadow-sm transition-transform"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-ink-sub">사진을 불러오는 중이에요.</div>
        )}
      </div>
    </div>
  )
}

function History({ items }: { items: DocumentItem[] }) {
  return (
    <div className="border-t border-line px-5 py-4">
      <p className="mb-2 text-[13px] font-semibold text-ink-mid">이전 제출</p>
      <ul className="space-y-1.5 text-[13px]">
        {items.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-2">
            <Tag tone={DOCUMENT_STATUS[d.status].tone}>{DOCUMENT_STATUS[d.status].label}</Tag>
            <span className="text-ink-sub">{formatDateTime(d.submittedAt)} 제출</span>
            {d.rejectMessage ? <span className="text-status-red">{d.rejectMessage}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function dotClass(status: DocumentStatus) {
  return { PENDING: 'bg-status-yellow', APPROVED: 'bg-status-green', REJECTED: 'bg-status-red' }[status]
}
