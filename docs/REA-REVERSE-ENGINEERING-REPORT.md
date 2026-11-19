# STRANGER 2.0 · Phase 1 REA 리버스 엔지니어링 & 아키텍처 설계 보고서

> **분석 일시**: 2026-11-19  
> **REA 분석 대상**: `https://stranger-bssm.vercel.app/` (기존 STRANGER v0.1 배포본)  
> **정본 에셋/기획 소스**: `/Users/kimmingun/stranger/source/STRANGER-Latest.zip`, `/Users/kimmingun/stranger/source/*.pixil`, `/Users/kimmingun/unesco/README.md`, `/Users/kimmingun/unesco/ARGON-PROMPT.md`  
> **작성 원칙**: 근거 기반 REA(Evidence vs Unknowns 분리) 원칙에 따라 `https://stranger-bssm.vercel.app/`에서는 **핵심 게임성·세션 플로우·통신 구조·HUD 감각만 추출**하고, 구버전 맵/퍼즐/오브젝트/정적 캐릭터는 일절 재사용하지 않는다.

---

## 1. REA 분석 결과 (`https://stranger-bssm.vercel.app/`)

### 1-1. 검증된 사실 (Verified Evidence)
1. **기술 스택 및 런타임**:
   - Unity WebGL 빌드(`<title>Unity Web Player | STRANGER</title>`, IL2CPP `Web.wasm` 56.5MB + `Web.data` + `Web.framework.js` + `Web.loader.js`).
   - Vercel 정적 호스팅 및 Vercel Web Analytics(`/_vercel/insights/script.js`).
   - `#unity-container > canvas#unity-canvas` 풀스크린 다크(`#000`) 뷰포트, FMOD-WebAudio 브리지(`AudioContext`, `OfflineAudioContext`), `IndexedDB` 캐싱.
2. **멀티플레이어 & 실시간 동기화 구조**:
   - **백엔드**: Photon Cloud (ExitGames) — 로비 방 생성 시 글로벌 리전(`gcsing1089`, `gctok1009`, `gchk1004` 등) 지연시간 핑 테스트 후 `WebSocket` 연결.
   - **방 코드 형식**: **6자리 대문자 영숫자 코드** (관측 예시: `JGG236`), 6칸 개별 입력 UI 및 원클릭 방 생성(`"방을 만드는 중.."`).
   - **4인 고정 역할 배정**:
     1. `도윤` — 조작자 (`"퍼즐을 직접 만져요"`)
     2. `마리아` — 통역 (관계/순서 단서 발신)
     3. `린` — 내비게이터 (위치/방위/슬롯 단서 발신)
     4. `아이샤` — 관측자 (소거/상태 관측 단서 발신)
   - **솔로 / AI 봇 백필**: `+봇` 버튼 및 `"게임 시작 (빈 자리 3명은 봇)"`으로 1인 플레이 시에도 나머지 3역할이 AI 봇으로 자동 보충되어 방을 이동하고 단서를 `기록` 로그에 송출함.
3. **세션 및 라우팅 흐름 (단일 `/` 내 상태 전환)**:
   - `스플래시 (PARALLAX · 2026 유네스코학교 교육의 미래 프로젝트)`
   - → `타이틀` (어두운 중앙 홀 + 4개 녹색 발판 순차 점멸 + `STRANGER` / `"낯선 말, 하나가 되는 길"`, 메뉴: `시작하기 / 이어하기 / 설정 / 종료`)
   - → `팀 모으기` (`방 참가하기` 6자리 코드 / `방 만들기`)
   - → `캐릭터 선택 로비` (Stage 선택, 방 코드 표시, 난이도 토글, 4인 역할 카드, 닉네임, `+봇`, `게임 시작`)
   - → `인트로 컷신` (`"X 건너뛰기"` 지원 스토리 브리핑)
   - → `인게임 조작 온보딩 모달` (`조작 방법` 확인 후 탐색 시작)
   - → `인게임 탐색 & 방 전환` (최초 방문 방은 중앙 모달 설명, 재방문 시 상단 중앙 금색 테두리 배너)
   - → `협동 퍼즐 모달` → `전원 복구(조명 점등) 및 클리어`.
4. **코어 게임성·HUD·연출 감각**:
   - **정전/조명 대비**: 전원 복구 퍼즐 해결 전에는 어두운 비네트 + 플레이어 중심 스포트라이트 상태, 전원 복구 후 방 전체 조명이 밝게 점등.
   - **조작감**: `WASD`/방향키 이동, `E` 문맥 상호작용(`[E] → ...`), `C` 신호 휠, `H` 조작 안내, `P` 나가기 확인 모달, `X` 모달 닫기/건너뛰기.
   - **HUD 배치**: 좌측 상단 `목표` 패널(체크리스트), 우측 상단 `P 나가기 / C 신호 / H 조작`, 하단 중앙 `[E] → 대상`, 하단 우측 접이식·스크롤 가능 `기록` 무전 로그, 캐릭터 발밑 이름표(`도윤 (나)` 등).

### 1-2. 미확인 영역 (Unknowns — IL2CPP `Web.wasm` / `Web.data` 내부 캡슐화)
- 정확한 Unity 에디터 버전, 이동 속도/카메라 감쇠 상수(`px/s`), Photon SDK(PUN2 vs Fusion) 바이너리 패킷 스키마, Stage 1 후반부 방/엔딩 시퀀스 상세(초기 분전반 이후 3개 체크리스트 방은 미플레이).

---

## 2. 정본 기획·에셋 교차 분석 (`STRANGER 2.0` Clean-Room 아키텍처)

| 영역 | 구버전 v0.1 (`stranger-bssm`)에서 가져오는 것 | **STRANGER 2.0 정본(반드시 교체/신규 구현)** |
|---|---|---|
| **세션·게임성** | 스플래시→타이틀→팀 모으기(6자리 코드)→로비(4인 카드/+봇)→컷신(X 스킵)→탐색→전원 복구 조명 연출→HUD/로그 감각 | Vite + TypeScript + Canvas 2D(`imageSmoothingEnabled = false`) + WebAudio + 자체 Node `ws` WebSocket 룸 허브 + `BroadcastChannel` 다중 탭 동기화 + **솔로 1~4키 4역할 즉시 전환 테스트 모드** |
| **맵·충돌·포탈** | 방/층 전환 페이드 감각, `[E]` 프롬프트 | `STRANGER-Latest.zip/assets/map.json` (`2048×1664px`, `1F/2F/B1` 13개 방+14씬, `walkableRows`, `collision`, `portals` 26개, 바닥 포탈 하이라이트 & `[E] ○○실 이동` 프롬프트, 79종 최신 스프라이트) |
| **캐릭터 애니메이션** | 4인 이름·컬러 정체성, 발밑 이름표 | `/Users/kimmingun/stranger/source/*.pixil` 4종 (`32×64px`) 레이어 추출·육안 검증 완료 스프라이트시트(상/하/좌/우 Idle+Walk 4프레임, 린 `vietnam (1).pixil` 삿갓 오버레이 합성 포함, 인게임 `30×50px`, 발판 `14×8px`) |
| **소통 시스템** | `C` 키 방사형 무전 + 기록 로그 | **C-Menu 2.0 4분류 20토큰 조합 패킷** (아이콘+색상+한글 3요소 동시 표기, 1~2토큰 조합, 상단 12초 공유 무전 배너 + 모달 우측 상단 최근 2패킷 Pin + 캐릭터 머리 위 말풍선) |
| **퍼즐·클리어** | 정전→전원 복구 시 전역 조명 점등 연출 | `STRANGER-Puzzle-UI-Design.md` + `puzzles-au.js` 기반 **16개 무반복 어몽어스/구스구스덕 스타일 태스크(P01~P16)**, `map.json` 58개 오브젝트 1:1 연동, **P09 완료 시 박물관 전역 점등**, **P16 2부 모달 없는 `2F · atrium` `gather-1..4` 4/4 현장 집결 → 박물관 정식 개관 대관식 엔딩** |

---

## 3. 모듈 구성 아키텍처 (`/Users/kimmingun/stranger`)

- `scripts/setup-assets.mjs` — `STRANGER-Latest.zip` → `public/assets/` 정본 추출
- `scripts/inspect-pixil-layers.mjs` & `scripts/build-characters.mjs` — `.pixil` 레이어 컨택트 시트 검수 및 `public/assets/characters/spritesheet.png` + `animations.json` 생성
- `server/wsRoomHub.mjs` & `server/index.mjs` — 6자리 방 코드 기반 실시간 WebSocket 룸 허브 및 프로덕션 서버
- `src/net/sessionClient.ts` — WebSocket + `BroadcastChannel` + 솔로/봇 하이브리드 세션 클라이언트
- `src/audio/soundEngine.ts` — WebAudio API 기반 절차적 SFX/앰비언트 BGM 엔진
- `src/game/worldEngine.ts` — 픽셀 완벽 2D 맵/충돌/포탈/조명/4역할 패시브 HUD/캐릭터 애니메이터
- `src/game/botController.ts` — 비인간 역할 AI 봇 순찰, 단서 무전 지원, P16 4/4 자동 집결 지원
- `src/ui/screens.ts`, `src/ui/minimap.ts`, `src/ui/cMenuWheel.ts` — 스플래시~로비~컷신~미니맵~C-Menu 2.0 20토큰 방사형 휠
- `src/puzzles/puzzleCatalog.ts`, `src/puzzles/taskModal.ts`, `src/puzzles/boardsAct1Act2.ts`, `src/puzzles/boardsAct3Act4.ts` — 어몽어스 스타일 공통 프레임 + P01~P16 무반복 16종 손맛 인터랙션 보드 + 대관식 엔딩
