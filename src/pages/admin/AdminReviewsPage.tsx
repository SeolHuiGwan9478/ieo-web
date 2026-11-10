import { useState, type FormEvent } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { adminApi, type ReviewFilter, type ReviewRow } from '../../api/admin'
import { REVIEW_TABS, businessCheckTag } from '../../admin/documentStatus'
import { Button, Card, Loading, PageHeader, Pagination, Table, Tabs, Tag } from '../../components/ui'
import { formatDateTime, formatRelative } from '../../lib/format'

const SIZE = 20

/** 심사 목록 (07 인계서 6.2). 차주 한 명이 한 줄. 심사 대기는 오래 기다린 차주부터 보여 준다 */
export function AdminReviewsPage() {
  const [status, setStatus] = useState<ReviewFilter>('PENDING')
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['admin', 'reviews', { status, q, page, size: SIZE }],
    queryFn: () => adminApi.reviews({ status, q, page, size: SIZE }),
    placeholderData: keepPreviousData,
  })

  const search = (e: FormEvent) => {
    e.preventDefault()
    setQ(draft.trim())
    setPage(0)
  }

  return (
    <>
      <PageHeader
        title="차주 서류 심사"
        description="차주가 낸 서류를 보고 승인하거나, 사유를 골라 반려해요. 필수 서류 4종이 모두 승인되면 인증된 차주가 돼요."
      />
      <Tabs<ReviewFilter>
        value={status}
        onChange={(v) => {
          setStatus(v)
          setPage(0)
        }}
        items={REVIEW_TABS.map((tab) => (tab.value === 'PENDING' ? { ...tab, count: query.data?.pendingDrivers } : tab))}
      />
      <form onSubmit={search} className="mb-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="이름, 휴대폰 뒷자리, 차량 번호"
          aria-label="차주 검색"
          className="h-11 flex-1 rounded-xl border border-line bg-white px-4 text-[14px] text-ink-strong outline-none placeholder:text-ink-sub focus:border-orange-500"
        />
        <Button type="submit" variant="secondary">
          찾기
        </Button>
        {q ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDraft('')
              setQ('')
              setPage(0)
            }}
          >
            지우기
          </Button>
        ) : null}
      </form>
      <Card padded={false}>
        {query.isPending ? (
          <Loading rows={5} />
        ) : (
          <>
            <Table<ReviewRow>
              rows={query.data?.items ?? []}
              rowKey={(r) => r.driverId}
              onRowClick={(r) => navigate(`/admin/drivers/${r.driverId}`)}
              empty={emptyMessage(status, q)}
              columns={[
                {
                  key: 'driver',
                  header: '차주',
                  cell: (r) => (
                    <div>
                      <p className="font-semibold">{r.name ?? '(이름 없음)'}</p>
                      <p className="text-[12.5px] text-ink-sub">{r.phone ?? '-'}</p>
                    </div>
                  ),
                },
                { key: 'plate', header: '차량 번호', cell: (r) => r.plateNumber ?? <span className="text-ink-sub">미등록</span> },
                {
                  key: 'progress',
                  header: '서류 진행',
                  cell: (r) => {
                    // 사업자등록증이 심사 대기면 국세청 조회 결과를 같이 보여 준다. 불일치·휴업·폐업은 빨강
                    const business = businessCheckTag(r.businessCheckResult, r.businessStatus)
                    return (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold tabular-nums">
                          {r.approvedRequired}/{r.requiredTotal}
                        </span>
                        {r.verified ? (
                          <Tag tone="green" dot>
                            인증됨
                          </Tag>
                        ) : null}
                        {r.pendingCount ? <Tag tone="yellow">대기 {r.pendingCount}</Tag> : null}
                        {r.rejectedCount ? <Tag tone="red">반려 {r.rejectedCount}</Tag> : null}
                        {business ? <Tag tone={business.tone}>{business.label}</Tag> : null}
                      </div>
                    )
                  },
                },
                {
                  key: 'when',
                  header: status === 'PENDING' ? '기다린 시간' : '마지막 제출',
                  cell: (r) =>
                    status === 'PENDING' && r.oldestPendingAt ? (
                      <span className="tabular-nums">
                        {formatRelative(r.oldestPendingAt)} <span className="text-[12px] text-ink-sub">{formatDateTime(r.oldestPendingAt)}</span>
                      </span>
                    ) : (
                      <span className="tabular-nums">{formatDateTime(r.latestSubmittedAt)}</span>
                    ),
                },
                { key: 'again', header: '재제출', cell: (r) => (r.resubmitted ? <Tag tone="gray">재제출</Tag> : <span className="text-ink-sub">-</span>) },
              ]}
            />
            {query.data ? <Pagination page={query.data.page} size={query.data.size} total={query.data.totalCount} onChange={setPage} /> : null}
          </>
        )}
      </Card>
    </>
  )
}

function emptyMessage(status: ReviewFilter, q: string) {
  if (q) return '찾는 차주가 없어요.'
  return {
    PENDING: '심사를 기다리는 서류가 없어요.',
    APPROVED: '아직 인증된 차주가 없어요.',
    REJECTED: '반려된 서류를 아직 다시 내지 않은 차주가 없어요.',
    ALL: '서류를 낸 차주가 아직 없어요.',
  }[status]
}
