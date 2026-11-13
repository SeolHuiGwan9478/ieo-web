import type { BentoCopy } from '@/components/ui/bento-features'
import type { GuideItem } from '@/components/ui/key-guide'
import type { Plan } from '@/components/ui/pricing-plans'
import type { FooterColumn } from '@/components/ui/site-footer'

/** 소개 페이지 문구. 언어를 더하려면 여기에 항목을 더하고 App.tsx에 주소를 넣는다 */
export type Lang = 'ko' | 'en'

export const LANDING_PATH: Record<Lang, string> = { ko: '/landing', en: '/landing/en' }

export interface LandingCopy {
  pageTitle: string
  nav: {
    items: { label: string; href: string }[]
    login: string
    download: string
    /** 지금 언어 표시와, 누르면 바뀔 언어 안내 */
    language: string
    switchTo: Lang
    switchLabel: string
  }
  showcase: { hint: string; tagline: string; off: string; label: string; tabs: { login: string; drive: string; wait: string; offer: string } }
  logos: { label: string; caption: string }
  /** 카드 여섯 장 묶음. 설명은 실제 기능이고, 경유가 숫자와 배차 요청 줄은 예시다 */
  bento: BentoCopy & { title: string; subtitle: string }
  /** 제목은 두 줄(앞줄, 주황 강조 줄), 설명은 문장마다 한 줄로 끊는다 */
  intro: { titleLead: string; titleAccent: string; subtitle: string[]; console: string; note: string }
  /** 스마트키 버튼으로 보는 처음 시작하는 법. 버튼 순서는 왼쪽, 위, 아래, 오른쪽 */
  guide: { title: string; subtitle: string; hint: string; items: [GuideItem, GuideItem, GuideItem, GuideItem] }
  pricing: { title: string; subtitle: string; period: string; recommended: string; note: string; plans: Plan[] }
  closing: { tagline: string }
  footer: { description: string; menuLabel: string; columns: FooterColumn[]; copyright: string }
}

// 기능·주선사 메뉴가 가리킬 섹션은 아직 일부만 있다. 섹션을 만들면 같은 id를 붙인다.
// 요금표는 기사님 플랜이다. 가격과 한도는 서버 DriverPlan과 같게 둔다 (베이직 무료, 프로 30일 30,000원. 12장 요금제).
// 결제는 아직 시연용이다
// 푸터의 회사·약관 링크는 아직 연결된 페이지가 없다
export const LANDING_COPY: Record<Lang, LandingCopy> = {
  ko: {
    pageTitle: '이에오 | 화물차 기사님을 위한 앱',
    nav: {
      items: [
        { label: '다운로드', href: '#download' },
        { label: '기능', href: '#features' },
        { label: '주선사', href: '#brokers' },
        { label: '요금제', href: '#pricing' },
      ],
      login: '로그인',
      download: '다운로드',
      language: 'KO',
      switchTo: 'en',
      switchLabel: 'View in English',
    },
    showcase: {
      hint: '눌러서 시동 걸기',
      tagline: '끝나는 곳에서, 다음이 이어집니다',
      off: '화면 끄기',
      label: '이에오 차량 앱 화면 예시',
      tabs: { login: '로그인', drive: '주행 중', wait: '대기 중', offer: '배차 수락' },
    },
    logos: { label: '지원 차량', caption: '현대자동차·기아 차량의 Pleos Connect용으로 만들고 있어요' },
    bento: {
      title: '이에오가 차 안에서 하는 일',
      subtitle: '차량 신호와 내비, 기름값 정보를 이어서 다음 짐까지 챙겨요.',
      pleos: { title: '처음부터 Pleos Connect 위에서', body: '차량 화면에서 바로 돌아가요. 기어와 속도를 읽고, 차량 내비와 음성 안내를 그대로 써요.' },
      hub: { title: '차가 알려 주는 대로 움직여요', body: '달리는 동안엔 음성으로만 알려요. 수락 창은 차가 완전히 섰을 때만 떠요.' },
      hubNodes: { signal: '기어·속도', navi: '차량 내비', voice: '음성 안내' },
      opinet: { title: '기름값은 오피넷 지역 평균으로', body: '하차지 지역의 경유 평균가로 공차 기름값을 계산해, 운임에서 뺀 실수익을 보여 줘요.' },
      opinetHead: '오늘 경유 평균',
      opinetUnit: '원/L',
      opinetRows: [
        { region: '전국', price: '1,842' },
        { region: '경기', price: '1,836', note: '6원 쌈' },
        { region: '경북', price: '1,829', note: '13원 쌈' },
      ],
      broker: { title: '주선사는 콘솔에서 확정해요', body: '차주가 수락한 배차 요청이 콘솔로 들어와요. 운행 현황, 대기 증빙, 인수증도 거기서 봐요.' },
      brokerRows: [
        { route: '평택 포승 → 대전 유성', driver: '김○○ · 5톤 카고' },
        { route: '안산 반월 → 청주 오창', driver: '이○○ · 5톤 윙' },
        { route: '인천 남동 → 부산 강서', driver: '박○○ · 11톤 카고' },
      ],
      brokerAction: '확정',
      ribbon: { title: '배차부터 장부까지 한 앱에서', body: '배차 요청, 대기 타이머, 인수증 사진, 음성 안내, 장부가 한 흐름으로 이어져요.' },
      motion: { title: '운행에서 다음 운행으로', body: '운행이 끝나갈 때 하차지 근처의 다음 오더를 미리 추천해요.' },
    },
    intro: {
      titleLead: '짐 내리기 전에,',
      titleAccent: '다음 짐부터 잡으세요',
      subtitle: ['하차지 근처 오더를 기름값 빼고 남는 돈 순으로 보여 드려요.', '대기 시간과 인수증도 차 안에서 바로 처리하세요.'],
      console: '주선사 콘솔 시작하기',
      note: '아래 화면에서 시동을 걸어 보세요.',
    },
    guide: {
      title: '처음이라면, 이렇게 시작하세요',
      subtitle: '차 키의 버튼을 순서대로 눌러 보세요. 첫 운행까지 네 단계예요.',
      hint: '키의 버튼을 눌러 보세요',
      items: [
        { label: '로그인', title: '휴대폰으로 QR 찍고 로그인', steps: ['차량 화면에 뜬 QR을 휴대폰으로 찍어요.', '휴대폰 번호와 인증번호로도 로그인할 수 있어요.', '한 번 로그인하면 다음부터는 바로 시작해요.'] },
        { label: '트럭 연결', title: '이 트럭을 내 차량으로 연결', steps: ['처음 로그인하면 이 트럭이 어느 차량인지 물어봐요.', '한 번 고르면 로그인할 때마다 그 차량으로 시작해요.', '내 차로 실을 수 있는 오더만 보여요.'] },
        { label: '단골 주선사', title: '함께 일하는 주선사와 연결', steps: ['주선사가 연결을 요청하면 화면에 알림이 떠요.', '수락하면 위치가 공유되고 지정 배차를 받을 수 있어요.', '설정에서 언제든 연결을 해제할 수 있어요.'] },
        { label: '첫 운행', title: '오더 잡고 첫 운행 시작', steps: ['근처 오더에서 실수익을 보고 배차를 요청해요.', '다른 앱에서 받은 배차도 내 배차에 넣을 수 있어요.', '길 안내를 누르면 차량 내비가 안내를 시작해요.'] },
      ],
    },
    pricing: {
      title: '필요한 만큼만 쓰세요',
      subtitle: '오더 보기와 배차는 모든 플랜에서 무료예요. 돈과 직결되는 기능만 골라 쓰면 돼요.',
      period: '/ 30일',
      recommended: '추천',
      note: '가격은 부가세 포함 예시이고, 출시 때 달라질 수 있어요.',
      plans: [
        { name: '베이직', tagline: '오더 보기와 배차는 계속 무료', price: '0원', features: ['오더 보기·배차 요청', '다음 배차 추천', '대기 시간 자동 기록', '인수증 사진 보내기', '이번 달 장부', '대기 증빙 보내기 30일 3건', '세금계산서 월 10장'] },
        { name: '프로', tagline: '증빙과 장부를 넉넉하게', price: '30,000원', recommended: true, features: ['베이직의 모든 기능', '대기 증빙 보내기 무제한', '전체 기간 장부', '장부 내보내기', '세금계산서 월 40장', '첫 30일 무료 체험'] },
      ],
    },
    closing: { tagline: '끝나는 곳에서, 다음이 이어집니다' },
    footer: {
      description: '화물차 차량 화면에서 다음 짐을 찾고, 대기 시간과 인수증까지 챙기는 앱이에요.',
      menuLabel: '푸터 메뉴',
      columns: [
        { title: '제품', links: [{ label: '다운로드', href: '#download' }, { label: '요금제', href: '#pricing' }, { label: '주선사 콘솔', href: '/login' }] },
        { title: '회사', links: [{ label: '소개', href: '#' }, { label: '문의', href: '#' }] },
        { title: '약관', links: [{ label: '이용약관', href: '#' }, { label: '개인정보 처리방침', href: '#' }] },
      ],
      copyright: '© 2026 이에오',
    },
  },
  en: {
    pageTitle: 'Ieo | The app for truck drivers',
    nav: {
      items: [
        { label: 'Download', href: '#download' },
        { label: 'Features', href: '#features' },
        { label: 'Brokers', href: '#brokers' },
        { label: 'Pricing', href: '#pricing' },
      ],
      login: 'Log in',
      download: 'Download',
      language: 'EN',
      switchTo: 'ko',
      switchLabel: '한국어로 보기',
    },
    showcase: {
      hint: 'Press to start',
      tagline: '끝나는 곳에서, 다음이 이어집니다',
      off: 'Turn the screen off',
      label: 'Sample screens from the Ieo in-vehicle app',
      tabs: { login: 'Login', drive: 'Driving', wait: 'Waiting', offer: 'Next load' },
    },
    logos: { label: 'Supported vehicles', caption: 'Being built for Pleos Connect on Hyundai and Kia vehicles' },
    bento: {
      title: 'What Ieo does in the cab',
      subtitle: 'It ties together vehicle signals, navigation and fuel prices to line up your next load.',
      pleos: { title: 'Built on Pleos Connect from day one', body: 'It runs right on the vehicle screen, reading gear and speed and using the car navigation and voice as they are.' },
      hub: { title: 'It follows what the truck tells it', body: 'While you drive it only speaks. The offer appears only once the truck has come to a full stop.' },
      hubNodes: { signal: 'Gear & speed', navi: 'Car navigation', voice: 'Voice' },
      opinet: { title: 'Fuel costs from Opinet regional averages', body: "Empty-run fuel is priced at the diesel average around your drop-off, then taken off the fare to show your net." },
      opinetHead: "Today's diesel average",
      opinetUnit: 'KRW/L',
      opinetRows: [
        { region: 'Nationwide', price: '1,842' },
        { region: 'Gyeonggi', price: '1,836', note: '6 lower' },
        { region: 'Gyeongbuk', price: '1,829', note: '13 lower' },
      ],
      broker: { title: 'Brokers confirm from the console', body: 'Dispatch requests a driver accepts land in the console, along with live trips, waiting proof and receipts.' },
      brokerRows: [
        { route: 'Pyeongtaek → Daejeon', driver: 'Kim · 5t cargo' },
        { route: 'Ansan → Cheongju', driver: 'Lee · 5t wing' },
        { route: 'Incheon → Busan', driver: 'Park · 11t cargo' },
      ],
      brokerAction: 'Confirm',
      ribbon: { title: 'From dispatch to ledger in one app', body: 'Dispatch requests, the waiting timer, receipt photos, voice guidance and the ledger follow one flow.' },
      motion: { title: 'From one haul to the next', body: 'As a trip winds down, Ieo recommends the next order around your drop-off ahead of time.' },
    },
    intro: {
      titleLead: 'Before you unload,',
      titleAccent: 'line up your next load',
      subtitle: ['See orders near your drop-off, ranked by what you keep after fuel.', 'Handle waiting time and receipts right from the cab.'],
      console: 'Broker console',
      note: 'Start it up on the screen below. The app itself is in Korean.',
    },
    guide: {
      title: 'New here? Start like this',
      subtitle: 'Press the buttons on the key in order. It takes four steps to your first haul.',
      hint: 'Press a button on the key',
      items: [
        { label: 'Log in', title: 'Scan the QR code and log in', steps: ['Scan the QR code on the vehicle screen with your phone.', 'You can also log in with your phone number and a code.', 'After the first login, it starts right away next time.'] },
        { label: 'Link the truck', title: 'Link this truck to your vehicle', steps: ['On first login, Ieo asks which of your vehicles this truck is.', 'Pick once and it starts with that vehicle every time.', 'You only see orders your truck can carry.'] },
        { label: 'Regular brokers', title: 'Connect with brokers you work with', steps: ['When a broker asks to connect, a notice appears on screen.', 'Accept to share your location and receive direct dispatch.', 'You can disconnect any time in Settings.'] },
        { label: 'First haul', title: 'Take an order and start driving', steps: ['Check the net profit on nearby orders and request dispatch.', 'You can also add jobs you got from other apps.', 'Tap guidance and the car navigation takes over.'] },
      ],
    },
    pricing: {
      title: 'Pay only for what you need',
      subtitle: 'Browsing orders and getting dispatched is free on every plan. Pay only for the features tied to your money.',
      period: '/ 30 days',
      recommended: 'Recommended',
      note: 'Prices are examples including VAT and may change at launch.',
      plans: [
        { name: 'Basic', tagline: 'Orders and dispatch stay free', price: '₩0', features: ['Browse orders and request dispatch', 'Next-load recommendations', 'Automatic waiting-time log', 'Receipt photos', "This month's ledger", '3 waiting proofs per 30 days', '10 tax invoices a month'] },
        { name: 'Pro', tagline: 'Plenty of room for proof and your ledger', price: '₩30,000', recommended: true, features: ['Everything in Basic', 'Unlimited waiting proofs', 'Full ledger history', 'Ledger export', '40 tax invoices a month', 'First 30 days free'] },
      ],
    },
    closing: { tagline: 'Where one haul ends, the next begins' },
    footer: {
      description: 'Find your next load on the truck screen, and keep track of waiting time and receipts.',
      menuLabel: 'Footer menu',
      columns: [
        { title: 'Product', links: [{ label: 'Download', href: '#download' }, { label: 'Pricing', href: '#pricing' }, { label: 'Broker console', href: '/login' }] },
        { title: 'Company', links: [{ label: 'About', href: '#' }, { label: 'Contact', href: '#' }] },
        { title: 'Legal', links: [{ label: 'Terms of service', href: '#' }, { label: 'Privacy policy', href: '#' }] },
      ],
      copyright: '© 2026 Ieo',
    },
  },
}
