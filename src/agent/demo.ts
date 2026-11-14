import type { AgentMessage, AgentPart, AgentThread } from './types'

/**
 * 시연용 대화 (2026-11-14). 실제 서버·LLM 없이 화면과 흐름을 보여 준다.
 * 숫자와 이름은 로컬 시연 데이터(한빛물류, 김소연 기사님)에 맞췄다
 */

const LOGO = '<g fill="#FF6C37"><rect x="18" y="51" width="42" height="18" rx="9"/><circle cx="76" cy="60" r="9"/><circle cx="98" cy="60" r="6"/></g>'

/** 이미지 생성 결과를 흉내 낸 그림: 화주에게 보낼 도착 안내 카드 */
export function demoArrivalImage(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" font-family="Apple SD Gothic Neo, Pretendard, sans-serif">
  <rect width="800" height="800" fill="#FFF3EE"/>
  <circle cx="690" cy="110" r="190" fill="#FFE2D6"/>
  <circle cx="90" cy="760" r="150" fill="#FFE2D6"/>
  <g transform="translate(60 60) scale(1.6)">${LOGO.replace('<g fill', '<g transform="translate(-14 -47)" fill')}</g>
  <text x="60" y="230" font-size="30" fill="#C2410C" font-weight="700">한빛물류 운송 안내</text>
  <text x="60" y="300" font-size="58" fill="#191F28" font-weight="800">곧 도착해요</text>
  <rect x="60" y="350" width="680" height="250" rx="28" fill="#FFFFFF"/>
  <text x="100" y="420" font-size="28" fill="#8B95A1">구간</text>
  <text x="250" y="420" font-size="30" fill="#191F28" font-weight="700">이천 냉동창고 → 부산 신항 CY</text>
  <text x="100" y="490" font-size="28" fill="#8B95A1">차량</text>
  <text x="250" y="490" font-size="30" fill="#191F28" font-weight="700">80가4822 · 5톤 축</text>
  <text x="100" y="560" font-size="28" fill="#8B95A1">도착 예정</text>
  <text x="250" y="560" font-size="40" fill="#F25A22" font-weight="800">오늘 18:40</text>
  <rect x="60" y="640" width="680" height="4" rx="2" fill="#FFE2D6"/>
  <text x="60" y="700" font-size="24" fill="#4E5968">위치는 이에오로 실시간 확인하고 있어요. 문의 031-000-0000</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const t = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString()

export const DEMO_THREADS: AgentThread[] = [
  {
    id: 'order',
    title: '화주 카톡으로 오더 만들기',
    at: t(42),
    messages: [
      {
        id: 'o1',
        role: 'user',
        at: t(42),
        parts: [{ kind: 'text', text: '화주 카톡이야. "내일 오전 9~11시 평택 포승 상차, 대구 성서 하차 오후 5시까지, 음료 파레트 4.5톤 윙바디, 45만 인수증"' }],
      },
      {
        id: 'o2',
        role: 'assistant',
        at: t(41),
        parts: [
          {
            kind: 'thinking',
            seconds: 4,
            steps: [
              '상차·하차 장소와 시간, 화물, 차량, 운임, 결제 방식이 다 들어 있다',
              '"평택 포승"과 "대구 성서"는 우리 회사가 자주 쓴 상하차지와 같은지 찾아본다',
              '운임이 이 노선 평균과 비슷한지 리포트로 확인한다',
              '김소연 기사님이 이 노선을 자주 달렸다. 단골 지정도 고를 수 있게 한다',
            ],
          },
          {
            kind: 'tool',
            name: 'orders.parseMessage',
            label: '카톡 내용에서 오더 항목 뽑기',
            args: { text: '내일 오전 9~11시 평택 포승 상차, 대구 성서 하차 오후 5시까지 …' },
            status: 'done',
            summary: '상차·하차·시간·화물·차량·운임 6개 항목',
            ms: 820,
            result: { pickup: '평택 포승', pickupFrom: '2026-11-15T09:00', pickupUntil: '2026-11-15T11:00', dropoff: '대구 성서', dropoffBy: '2026-11-15T17:00', cargo: '음료 파레트', weightKg: 4500, tonnage: 'TON_5', bodyType: 'WING', fare: 450000, paymentType: 'RECEIPT' },
          },
          {
            kind: 'tool',
            name: 'sites.search',
            label: '자주 쓴 상하차지 찾기',
            args: { names: ['평택 포승', '대구 성서'] },
            status: 'done',
            summary: '평택 포승 물류센터 · 대구 성서 공단',
            ms: 140,
            result: [{ id: 1, name: '평택 포승 물류센터', address: '경기 평택시 포승읍 평택항로 156' }, { id: 4, name: '대구 성서 공단', address: '대구 달서구 성서공단로' }],
          },
          {
            kind: 'tool',
            name: 'reports.routeFare',
            label: '이 노선 최근 운임',
            args: { from: '평택 포승 물류센터', to: '대구 성서 공단', days: 90 },
            status: 'done',
            summary: '최근 90일 12건, 평균 47만 원',
            ms: 210,
            result: { trips: 12, averageFare: 470000, min: 420000, max: 520000 },
          },
          { kind: 'text', text: '오더 초안을 만들었어요. 운임 45만 원은 이 노선 최근 평균(47만 원)보다 조금 낮아요. 확인하고 올려 주세요.' },
          {
            kind: 'order_draft',
            pickup: '평택 포승 물류센터',
            pickupWindow: '11.15 09:00~11:00',
            dropoff: '대구 성서 공단',
            dropoffBy: '11.15 17:00까지',
            cargo: '일반 · 음료 파레트 · 4,500kg',
            vehicle: '5톤 윙바디 · 지게차',
            fare: 450000,
            payment: '인수증 · 30일',
            routeAverage: 470000,
            regularDriver: '김소연',
          },
        ],
      },
    ],
  },
  {
    id: 'drivers',
    title: '요청 온 기사님 비교',
    at: t(30),
    messages: [
      { id: 'd1', role: 'user', at: t(30), parts: [{ kind: 'text', text: '평택→대구 건 요청 온 기사님 중에 누가 좋아?' }] },
      {
        id: 'd2',
        role: 'assistant',
        at: t(29),
        parts: [
          { kind: 'thinking', seconds: 3, steps: ['오더 #63의 대기 중인 요청 3건을 본다', '거리, 완료 건수, 늦은 취소, 단골 여부를 같이 본다', '늦은 취소가 있으면 뒤로 둔다'] },
          { kind: 'tool', name: 'dispatch.listRequests', label: '배차 요청 불러오기', args: { orderId: 63, status: 'PENDING' }, status: 'done', summary: '대기 중 3건', ms: 95, result: [{ requestId: 41 }, { requestId: 42 }, { requestId: 43 }] },
          { kind: 'tool', name: 'drivers.records', label: '기사님 이행 기록', args: { driverIds: [21, 31, 33] }, status: 'done', summary: '3명 기록', ms: 160, result: { 21: { completed: 37, lateCancels: 0 }, 31: { completed: 12, lateCancels: 1 }, 33: { completed: 58, lateCancels: 0 } } },
          { kind: 'text', text: '단골이고 늦은 취소가 없는 김소연 기사님을 먼저 추천해요. 이○○ 기사님도 기록이 좋지만 상차지에서 31km 떨어져 있어요.' },
          {
            kind: 'driver_compare',
            orderLabel: '평택 포승 → 대구 성서 (오더 #63)',
            candidates: [
              { name: '김소연', tag: '단골', distanceKm: 12, completed: 37, lateCancels: 0, recommended: true },
              { name: '박○○', tag: '인증', distanceKm: 8, completed: 12, lateCancels: 1 },
              { name: '이○○', tag: '인증', distanceKm: 31, completed: 58, lateCancels: 0 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'shipper',
    title: '화주 안내 문장과 이미지',
    at: t(18),
    messages: [
      { id: 's1', role: 'user', at: t(18), parts: [{ kind: 'text', text: '이천→부산 건 지금 어디쯤인지 화주한테 보낼 문장이랑 카톡에 올릴 안내 이미지도 만들어 줘' }] },
      {
        id: 's2',
        role: 'assistant',
        at: t(17),
        parts: [
          { kind: 'thinking', seconds: 2, steps: ['운행 #22의 상태와 도착 예정을 본다', '기사님 연락처처럼 화주에게 보이면 안 되는 건 빼고 쓴다', '이미지는 회사 이름, 구간, 차량, 도착 예정만 크게'] },
          { kind: 'tool', name: 'trips.get', label: '운행 상태 보기', args: { tripId: 22 }, status: 'done', summary: '운송 중 · 도착 예정 18:40', ms: 120, result: { status: 'IN_TRANSIT', etaAt: '2026-11-14T18:40:00+09:00', plate: '80가4822' } },
          {
            kind: 'message_draft',
            to: '화주 (○○식품)',
            tripId: 22,
            text: '안녕하세요, 한빛물류입니다. 이천 냉동창고에서 출발한 차량(80가4822)은 지금 운송 중이고, 부산 신항 CY에 오늘 18:40쯤 도착할 예정입니다.',
          },
          { kind: 'image', prompt: '한빛물류 운송 안내 카드: 이천 냉동창고 → 부산 신항 CY, 80가4822, 오늘 18:40 도착 예정. 주황 계열, 글씨 크게', status: 'done', src: demoArrivalImage(), size: '800×800' },
        ],
      },
    ],
  },
  {
    id: 'web',
    title: '경부고속도로 공사 구간',
    at: t(6),
    messages: [
      { id: 'w1', role: 'user', at: t(6), parts: [{ kind: 'text', text: '다음 주 경부고속도로 대구 쪽 공사 구간 있어? 대구 가는 오더 시간 잡을 때 참고하게' }] },
      {
        id: 'w2',
        role: 'assistant',
        at: t(5),
        parts: [
          { kind: 'thinking', seconds: 3, steps: ['이에오 데이터에는 도로 공사 정보가 없다. 웹에서 찾는다', '한국도로공사·지자체 공지를 먼저 본다', '날짜가 다음 주(11.17~11.21)에 걸치는 것만 고른다'] },
          {
            kind: 'web_search',
            query: '경부고속도로 대구 공사 차로 통제 2026년 11월',
            status: 'done',
            sources: [
              { title: '고속도로 공사 구간 안내 (11월 셋째 주)', url: 'https://www.ex.co.kr/', site: 'ex.co.kr', snippet: '경부선 북대구IC~금호JC 부산 방향 2차로 통제, 11.17(월)~11.20(목) 22:00~06:00', date: '2026.11.12' },
              { title: '대구 북구 도로 통제 알림', url: 'https://www.buk.daegu.kr/', site: 'buk.daegu.kr', snippet: '서변대교 램프 보수공사로 11.18~11.19 주간 부분 통제', date: '2026.11.10' },
              { title: '로드플러스 실시간 교통', url: 'https://www.roadplus.co.kr/', site: 'roadplus.co.kr', snippet: '공사·사고 구간과 예상 지체 시간을 지도에서 확인할 수 있습니다', date: '실시간' },
            ],
          },
          {
            kind: 'text',
            text: '다음 주에는 경부선 북대구IC~금호JC 부산 방향이 11.17~11.20 밤 10시부터 아침 6시까지 2차로 통제돼요 [1]. 밤에 하차하는 오더는 30분쯤 여유를 두는 게 좋아요. 대구 북구 서변대교 램프도 11.18~11.19 낮에 부분 통제가 있어요 [2]. 출발 전에는 로드플러스로 다시 확인하세요 [3].',
            citations: [1, 2, 3],
          },
        ],
      },
    ],
  },
]

/** 입력한 말에 맞는 시연 응답. 실제로는 서버가 스트리밍으로 보낸다 */
export function demoReplyFor(text: string): AgentPart[] {
  if (/이미지|그림|포스터/.test(text)) return DEMO_THREADS[2].messages[1].parts.filter((p) => p.kind !== 'message_draft')
  if (/검색|공사|날씨|뉴스|도로/.test(text)) return DEMO_THREADS[3].messages[1].parts
  if (/기사|요청|누가|비교/.test(text)) return DEMO_THREADS[1].messages[1].parts
  if (/화주|문장|어디쯤|위치/.test(text)) return DEMO_THREADS[2].messages[1].parts.filter((p) => p.kind !== 'image')
  if (/오더|상차|하차|카톡|올려/.test(text)) return DEMO_THREADS[0].messages[1].parts
  return [
    { kind: 'thinking', seconds: 1, steps: ['어떤 일을 맡기려는지 확실하지 않다', '할 수 있는 일을 짧게 알려 준다'] },
    { kind: 'text', text: '지금 시연에서는 오더 초안 만들기, 요청 온 기사님 비교, 화주 안내 문장·이미지, 웹 검색을 해 볼 수 있어요. 예: "내일 대구 가는 오더 올려 줘"' },
  ]
}

export function newUserMessage(text: string): AgentMessage {
  return { id: `u${Date.now()}`, role: 'user', at: new Date().toISOString(), parts: [{ kind: 'text', text }] }
}
