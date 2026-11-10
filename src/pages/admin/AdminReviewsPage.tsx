import { useState, type FormEvent } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import type { ReviewDetailBase, ReviewFilter, ReviewRowBase } from '../../api/admin'
import { REVIEW_TABS, businessCheckTag } from '../../admin/documentStatus'
import type { ReviewKindConfig } from '../../admin/reviewKinds'
import { Button, Card, Loading, PageHeader, Pagination, Table, Tabs, Tag } from '../../components/ui'
import { formatDateTime, formatRelative } from '../../lib/format'

const SIZE = 20

/**
 * 심사 목록 (07 인계서 6.2, 13장). 차주 한 명(또는 회사 하나)이 한 줄. 심사 대기는 오래 기다린 쪽부터 보여 준다.
 * 차주·주선사의 차이(제목, API, 앞 칸)는 config(reviewKinds.tsx)에 있다
 */
export function AdminReviewsPage<R extends ReviewRowBase, D extends ReviewDetailBase>({ config }: { config: ReviewKindConfig<R, D> }) {
  const [status, setStatus] = useState<ReviewFilter>('PENDING')
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['admin', config.kind, 'reviews', { status, q, page, size: SIZE }],
    queryFn: () => config.api.list({ status, q, page, size: SIZE }),
    placeholderData: keepPreviousData,
  })

  const search = (e: FormEvent) => {
    e.preventDefault()
    setQ(draft.trim())
    setPage(0)
  }

  return (
    <>
      <PageHeader title={config.title} description={config.listDescription} />
      <Tabs<ReviewFilter>
        value={status}
        onChange={(v) => {
          setStatus(v)
          setPage(0)
        }}
        items={REVIEW_TABS.map((tab) => (tab.value === 'PENDING' ? { ...tab, count: query.data ? config.api.pendingOf(query.data) : undefined } : tab))}
      />
      <form onSubmit={search} className="mb-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={config.searchPlaceholder}
          aria-label={`${config.subject} 검색`}
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
            <Table<R>
              rows={query.data?.items ?? []}
              rowKey={(r) => config.rowId(r)}
              onRowClick={(r) => navigate(config.detailPath(config.rowId(r)))}
              empty={q ? config.emptyMessages.search : config.emptyMessages[status]}
              columns={[
                ...config.columns,
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
