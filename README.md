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
