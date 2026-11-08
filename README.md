# ieo-console

이에오(Ieo) **주선사 웹 콘솔**. 주선사가 오더를 올리고, 배차를 확정하고, 운행 위치·대기 증빙·전자인수증을 보는 화면이다.
서버는 [ieo-server](https://github.com/SeolHuiGwan9478/ieo-server), 기획·요구사항은 [ieo-app/docs](https://github.com/SeolHuiGwan9478/ieo-app/tree/main/docs).

- 인계 문서: `ieo-app/docs/design/03_어드민_인계.md`, 서버 작업 기록: `06_주선사_인계_작업내용.md`

## 실행

```bash
npm install
cp .env.example .env     # 서버 주소 (기본 http://localhost:8080)
npm run dev              # http://localhost:5173 (.env의 VITE_PORT로 바꿀 수 있다)
```

- 서버(ieo-server)를 `local` 프로필로 먼저 띄운다. CORS는 `localhost:5173`이 허용돼 있다. 포트를 바꿨으면 서버 `.env`의 `ieo.cors.allowed-origins`에 넣는다.
- 로그인은 휴대폰 인증이다. 로컬 서버는 문자를 보내지 않고 **서버 로그의 `[문자 발송]` 줄**에 인증번호가 찍힌다.

## 구조

| 폴더 | 내용 |
|---|---|
| `src/api/` | 서버 호출. `client.ts`가 토큰·401 refresh·오류 형식을 한 곳에서 처리한다 |
| `src/auth/` | 로그인 상태와 내 회사(`GET /api/brokers/me`) |
| `src/layout/` | 왼쪽 메뉴 + 본문 |
| `src/pages/` | 화면 하나에 파일 하나 |
| `src/components/ui.tsx` | 카드·버튼·입력칸·꼬리표 |

## 만든 것

- Vite + React + TypeScript, React Router, TanStack Query, Tailwind CSS 4, react-hook-form
- 색은 `ieo-app/design/README.md` 그대로 (`src/index.css`의 `@theme`). 주황은 로고·주요 버튼·선택된 메뉴에만, 운행 상태는 신호등
- 서버 응답의 `xxxLabel`을 그대로 보여 준다. 콘솔에 번역표를 두지 않는다
- 시각은 UTC로 오가고 화면에서 한국 시간으로 바꾼다

## 상하차지 주소 검색

- 오더 등록에서 새 상하차지를 선택한 뒤 `주소 검색`으로 도로명·지번·건물명을 검색한다.
- 검색은 카카오 우편번호 서비스를 별도 모달에 삽입한다. 별도 JavaScript 키가 필요하지 않다.
- 주소 선택 후 인증된 `GET /api/brokers/me/addresses/geocode?address=...`로 좌표를 조회한다.
- 서버 `ieo-server/.env`에 `KAKAO_REST_API_KEY`를 설정하고 카카오디벨로퍼스에서 카카오맵을 활성화해야 한다.
- 키는 서버에만 둔다. 프론트의 `VITE_*` 변수에는 넣지 않는다.
- 상세주소는 좌표 변환 후 따로 입력한다. 기존 상하차지는 저장된 좌표를 그대로 사용한다.
- 주소·좌표 조회에 실패하면 재시도할 수 있으며, 좌표 확인 전에는 새 상하차지를 등록할 수 없다.
- DB 없는 좌표 조회 단위 테스트: 서버 폴더에서 `./gradlew test --tests '*AddressGeocodingServiceTest'` (JDK 21 필요).
## 로컬 공모전 시연

- 서버 `local` 프로필의 `ieo.auth.show-demo-code: true`일 때만 인증번호 발송 응답에 시연용 번호를 포함한다.
- 로그인 화면은 발송 성공 후 번호를 표시하며, 3분 후 또는 번호 변경·재발송 시 지운다.
- `prod`/`dev` 프로필에서는 해당 설정을 켜도 인증번호를 응답하지 않는다.
- 운임 자동 계산은 1원 단위로 반올림한다. 예: 청구 100원, 수수료율 10% → 지급 90원.

## 자주 쓰는 주소

- 오더 등록에서 상하차지 이름·주소·상세주소를 입력하고 위치 확인 후 `자주 쓰는 주소에 저장`을 누른다. 오더를 등록하기 전에도 저장할 수 있다.
- 각 카드 상단의 `자주 쓰는 주소`에서 고르면 이름·주소·상세주소·좌표를 자동 입력한다.
- 회사별 DB에 저장하므로 새로고침·재로그인 후에도 유지되며 같은 회사 직원끼리 공유한다.
- `저장 해제`는 주소록에서만 제거한다. 작성 중인 오더의 주소와 과거 운행은 유지된다.
- API: `GET/POST /api/brokers/me/saved-addresses`, `DELETE /api/brokers/me/saved-addresses/{id}`.
- 카카오 모달은 화면 바깥 16px, 안쪽 12px(데스크톱 16px) 여백을 둔다. 닫기는 우측 상단에 배치하며, `onresize` 콘텐츠 높이에 맞춰 초기 화면 전체 스크롤을 없앤다. 검색 결과가 화면보다 길 때는 검색 영역만 스크롤한다.

## 전체 화면 시연

로컬 시연 데이터와 로그인 안내는 `ieo-server/docs/console-demo.md`를 참고한다. 시연 계정은 `01098765432`, 회사는 `[시연] 한빛물류`다. 기존 계정은 로그아웃한 뒤 해당 번호로 로그인한다.
