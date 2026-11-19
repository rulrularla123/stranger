import type { MapPortal, PuzzleDef, RoomState } from '../types/stranger.ts';

export interface DifficultyConfig {
  showTargetHints: boolean;
  p08DriftPerSec: number;
  p08RpmTolerance: number;
  p09HoldMs: number;
  p14HoldMs: number;
  p15TolerancePx: number;
}

const DIFFICULTY_PRESETS: Record<string, DifficultyConfig> = {
  쉬움: {
    showTargetHints: true,
    p08DriftPerSec: 0,
    p08RpmTolerance: 50,
    p09HoldMs: 1200,
    p14HoldMs: 1200,
    p15TolerancePx: 14,
  },
  보통: {
    showTargetHints: false,
    p08DriftPerSec: 3.5,
    p08RpmTolerance: 30,
    p09HoldMs: 2000,
    p14HoldMs: 2000,
    p15TolerancePx: 8,
  },
  어려움: {
    showTargetHints: false,
    p08DriftPerSec: 6.0,
    p08RpmTolerance: 20,
    p09HoldMs: 2500,
    p14HoldMs: 2500,
    p15TolerancePx: 6,
  },
};

export function getDifficultyConfig(difficulty: string): DifficultyConfig {
  return DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS['보통'];
}

export const ROOM_INTROS: Record<
  string,
  { kicker: string; title: string; body: string; puzzlesHint: string }
> = {
  '1F:hall': {
    kicker: '1F · 중앙 로비',
    title: '필리핀 역사박물관 중앙 복도',
    body: '태풍 정전으로 사방의 전시실 황동 자물쇠가 닫혔습니다. 먼저 북측 안내 데스크 방명록(이안)과 바닥 나침반(린)을 맞춰 1층 4개 전시관을 개방하세요.',
    puzzlesHint: 'P01 (나침반 방위 개방)',
  },
  '1F:life': {
    kicker: '1F · 1막 전시관',
    title: '생활사 전시실 (Bahay Kubo & Manunggul)',
    body: '필리핀 전통 고상 가옥 바하이 쿠보의 3층위 단면 모형과 마눙굴 항아리 뚜껑이 흩어져 있습니다. 타갈로그어 주석과 기어 실측을 모아 카이가 복원하세요.',
    puzzlesHint: 'P02 (바하이 쿠보) · P03 (마눙굴 항아리)',
  },
  '1F:time': {
    kicker: '1F · 1막 전시관',
    title: '역사 연표 전시실',
    body: '1521년 막탄, 1898년 말롤로스, 1946년 공화국 독립 연표와 군도 항해 고지도가 분리되어 있습니다. 린의 해협 측량을 받아 이안이 3선을 결선하세요.',
    puzzlesHint: 'P04 (군도 고지도 × 3대 연표)',
  },
  '1F:craft': {
    kicker: '1F · 1막 전시관',
    title: '공예·기술 전시실',
    body: '이푸가오족 전통 수직 베틀의 날실과 3색 북이 멈춰 있습니다. 카이의 루페 관측 순서를 무전 받아 서하린이 페달과 북을 조작하세요.',
    puzzlesHint: 'P05 (이푸가오 전통 베틀)',
  },
  '1F:city': {
    kicker: '1F · 1막 전시관',
    title: '근현대 도시 전시실 (1910 마닐라)',
    body: '파시그강 도개교로 향하는 1910년 마닐라 전차 디오라마가 탈선 위험 상태입니다. 이안의 노선표 판독을 받아 린이 분기 레버와 뷰파인더를 맞추세요.',
    puzzlesHint: 'P06 (마닐라 전차 & 도개교)',
  },
  'B1:maintenance': {
    kicker: 'B1 · 2막 지하 설비구역',
    title: '지하 ㄱ자 관리 통로',
    body: '침수된 지하 복도 배수 펌프와 주 급수관 3구역 압력이 불균형 상태입니다. 린의 계통도 측량을 받아 서하린이 밸브 3개를 60 PSI로 맞추세요.',
    puzzlesHint: 'P07 (주 급수관 3구역 수압 평형)',
  },
  'B1:safety': {
    kicker: 'B1 · 2막 지하 설비구역',
    title: '방재·보일러실',
    body: '가압 보일러의 증기 압력이 계속 치솟고 복식 순환 펌프의 회전수가 어긋나 있습니다. 카이가 센서 경보를 읽고 서하린이 감압·동기 잠금을 수행하세요.',
    puzzlesHint: 'P08 (보일러 감압 & 복식 펌프 동기화)',
  },
  'B1:power': {
    kicker: 'B1 · 2막 핵심 구역',
    title: '고압 전기실',
    body: '박물관 전체 정전의 진원지입니다! 디젤 발전기를 2초간 예열·기동한 뒤 침수 단락된 모선을 피해서 주 차단기를 올리면 박물관 전체 조명이 켜집니다.',
    puzzlesHint: 'P09 (디젤 발전기 & 3연식 배전반 — 클리어 시 전역 점등!)',
  },
  'B1:rescue': {
    kicker: 'B1 · 2막 지하 설비구역',
    title: '응급 수장고',
    body: '물웅덩이 앞에 젖은 유물 크레이트가 놓여 있습니다. 카이가 이슬점(온습도)을 맞추고 서하린이 크레이트 걸쇠를 체결하면, 린이 2축 크레인으로 안전 선반에 옮깁니다.',
    puzzlesHint: 'P10 (제습 공조 & 2축 호이스트 크레인)',
  },
  '2F:atrium': {
    kicker: '2F · 중앙 홀',
    title: '반원 동상 홀 (Grand Atrium)',
    body: '박물관의 심장부인 2층 반원 홀입니다. 아카이브·보존처리·열람실(P11~P15)을 모두 복원한 뒤, 기획전시실에서 프리즘 광선을 쏘아 바닥 발판 4곳에 모여 대관식을 완성하세요!',
    puzzlesHint: 'P16 2부 (모달 없는 4/4 현장 집결 피날레)',
  },
  '2F:archive': {
    kicker: '2F · 3막 기록 복원 구역',
    title: '기록 아카이브',
    body: '카티푸난 비밀 헌장의 바이바이인 암호와 훼손된 기증 등록대장 천공 카드가 보관되어 있습니다. 카이·서하린·린의 단서를 모아 이안이 해독·복원하세요.',
    puzzlesHint: 'P11 (바이바이인 이중 원판) · P12 (마이크로필름 & 4×4 천공 카드)',
  },
  '2F:preserve': {
    kicker: '2F · 3막 유물 보존 구역',
    title: '보존처리실',
    body: '청동 유물의 부식층을 중화·세척하고 4점 도르래에 묶인 기증 상자의 밀랍 인장을 복원해야 합니다. 서하린·이안의 협조를 받아 카이가 정밀 작업하세요.',
    puzzlesHint: 'P13 (3색 시약 & 초음파 세척) · P14 (4점 도르래 & 밀랍 압착)',
  },
  '2F:reading': {
    kicker: '2F · 3막 사료 열람 구역',
    title: '자료 열람실',
    body: '인트라무로스 성곽 건축 도면의 반투명 트레이싱지가 어긋나 있습니다. 린의 축선 측량에 맞춰 이안이 도면을 이동·회전시켜 3개 앵커를 모두 점등하세요.',
    puzzlesHint: 'P15 (성곽 도면 트레이싱 오버레이)',
  },
  '2F:special': {
    kicker: '2F · 4막 최종 피날레',
    title: '기획전시실 (해양 교역 광학실)',
    body: '박물관의 모든 복원이 이곳에서 하나로 연결됩니다! 이안과 서하린의 단서를 맞춰 3면 프리즘 미러를 회전시켜 2층 반원 홀 여신상으로 태양 광선을 쏘세요.',
    puzzlesHint: 'P16 1부 (3면 프리즘 광학 연결 → 2부 4/4 집결)',
  },
};

export function getPortalLockReason(room: RoomState, portal: MapPortal): string | null {
  const solved = new Set(room.solvedPids);
  if (['life-door', 'time-door', 'craft-door', 'city-door'].includes(portal.id)) {
    if (!solved.has(1)) {
      return '🔒 먼저 1F 중앙 로비 나침반(P01)을 정렬해 4대 전시관을 개방하세요!';
    }
  }
  if (portal.id === 'b1') {
    const act1Done = [1, 2, 3, 4, 5, 6].every((id) => solved.has(id));
    if (!act1Done) {
      return '🔒 1막(1F 전시관 P01~P06)을 모두 복원해야 지하 B1 계단이 열립니다!';
    }
  }
  if (portal.id === 'up') {
    const act2Done = [7, 8, 9, 10].every((id) => solved.has(id));
    if (!act2Done) {
      return '🔒 2막(B1 설비·전력 P07~P10)을 모두 복구해야 2층 계단이 열립니다!';
    }
  }
  if (portal.id === 'special-door') {
    const act3Done = [11, 12, 13, 14, 15].every((id) => solved.has(id));
    if (!act3Done) {
      return '🔒 3막(2F 아카이브·보존·열람 P11~P15)을 모두 복원해야 기획전시실이 열립니다!';
    }
  }
  return null;
}

export const MAIN_OPERATOR_OBJECT_IDS = new Set([
  'hall-compass-dial',
  'life-table-center',
  'life-case-nw',
  'time-table-center',
  'craft-table-center',
  'city-table-center',
  'city-optics',
  'maint-pipe-header-1',
  'maint-pipe-header-2',
  'maint-pipe-header-3',
  'maint-pump-ne',
  'safety-side-pipe-w',
  'safety-pump',
  'safety-boiler',
  'power-switchgear',
  'power-generator',
  'rescue-table-c',
  'rescue-rack-ne',
  'archive-table',
  'archive-cabinet-ne',
  'preserve-lab-c',
  'preserve-jar-e',
  'preserve-bench-r',
  'reading-table',
  'reading-blueprint-e',
  'special-table',
  'special-boat-nw',
]);

export const PUZZLES: PuzzleDef[] = [
  {
    id: 1,
    code: 'P01',
    act: 1,
    floor: '1F',
    room: 'hall',
    roomLabel: '1F · 중앙 복도',
    title: '로비 나침반과 4대 전시관 방위 개방',
    arch: '동심원 4방위 베젤 링 회전 정렬',
    mainRole: 'lin',
    helperRoles: ['maria'],
    focusObj: 'hall-compass-dial',
    answerTokens: [
      ['DIR_N', 'SYM_SUN'],
      ['DIR_S', 'SYM_WAVE'],
    ],
    clueTitle: '이안 · 안내 데스크 개관 방명록 번역',
    clueSummary: '북↑=☀생활사 · 동→=★역사 · 남↓=🌊도시 · 서←=⛰공예',
    clueHtml: `
      <div class="clue-card">
        <p class="clue-lead">📜 <strong>안내 데스크 개관 방명록 (hall-reception)</strong> 스페인어/타갈로그어 기록을 번역했습니다:</p>
        <div class="clue-grid-4">
          <div class="clue-chip"><span>↑ 북 (0°)</span><strong style="color:#E6C886">☀ 태양 · 생활사</strong></div>
          <div class="clue-chip"><span>→ 동 (90°)</span><strong style="color:#91A8FF">★ 별 · 역사 연표</strong></div>
          <div class="clue-chip"><span>↓ 남 (180°)</span><strong style="color:#7CD8FF">🌊 파도 · 도시</strong></div>
          <div class="clue-chip"><span>← 서 (270°)</span><strong style="color:#D49B6A">⛰ 산맥 · 공예</strong></div>
        </div>
        <p class="clue-note">린에게 <code>[북 ↑]+[태양 ☀]</code>, <code>[남 ↓]+[파도 🌊]</code> 무전을 보내 나침반 내·외륜을 정렬하게 하세요.</p>
      </div>
    `,
    objectRoleClues: {
      'floor-guide': {
        roleId: 'lin',
        title: '린 · 박물관 층별 방위 배선표',
        bodyHtml: `<div class="clue-card"><p>🧭 북쪽 계단은 <strong>2F 반원 홀</strong>, 동북쪽 계단은 <strong>B1 지하 설비구역</strong>으로 이어집니다. 먼저 중앙 나침반(<code>hall-compass-dial</code>)의 황동 베젤을 <strong>0° 기준</strong>으로 정렬해 1F 4개 전시관을 개방하세요.</p></div>`,
      },
    },
  },
  {
    id: 2,
    code: 'P02',
    act: 1,
    floor: '1F',
    room: 'life',
    roomLabel: '1F · 생활사 전시실',
    title: '바하이 쿠보 3층위 생활 유물 배치',
    arch: '전통 가옥 3단 단면 층위 드래그 슬롯',
    mainRole: 'aisha',
    helperRoles: ['maria'],
    focusObj: 'life-table-center',
    answerTokens: [
      ['NUM_1', 'SYM_SUN'],
      ['NUM_3', 'SYM_MTN'],
    ],
    clueTitle: '이안 · 서가 타갈로그어 생활 주석 번역',
    clueSummary: '1층 다락(Bubong)=☀ 곡식 단지 · 2층 마루(Sala)=🌊 바구니 · 기둥 아래(Silong)=⛰ 돌절구',
    clueHtml: `
      <div class="clue-card">
        <p class="clue-lead">📜 <strong>서가 타갈로그어 주석 (life-side-shelf-w)</strong> 번역 결과:</p>
        <ul class="clue-list">
          <li><strong>① Bubong (지붕 다락 · ☀ 태양)</strong> → <em>"습기를 피해 말린 곡식 단지를 보관"</em></li>
          <li><strong>② Sala (대나무 마루 · 🌊 파도)</strong> → <em>"바람이 통하는 대나무 직조 바구니"</em></li>
          <li><strong>③ Silong (고상 기둥 아래 · ⛰ 산맥)</strong> → <em>"단단한 땅 위에 돌절구를 설치"</em></li>
        </ul>
        <p class="clue-note">카이에게 <code>[1번]+[태양 ☀]</code>, <code>[3번]+[산맥 ⛰]</code> 무전을 보내세요. (등유 램프는 미끼)</p>
      </div>
    `,
  },
  {
    id: 3,
    code: 'P03',
    act: 1,
    floor: '1F',
    room: 'life',
    roomLabel: '1F · 생활사 전시실',
    title: '마눙굴 항아리 뚜껑 영혼의 배 복원',
    arch: '360° 원통 턴테이블 회전 + 영혼의 배 뚜껑 수평 틸트',
    mainRole: 'aisha',
    helperRoles: ['doyun'],
    focusObj: 'life-case-nw',
    answerTokens: [['ACT_ROT', 'SYM_WAVE']],
    clueTitle: '서하린 · 진열장 하단 받침 기어 실측',
    clueSummary: '턴테이블 180° 정렬 + 영혼의 배 뚜껑 기울기 0°(수평)',
    clueHtml: `
      <div class="clue-card">
        <p class="clue-lead">⚙ <strong>수직 진열장 받침 기어 실측 (life-vitrine-ne)</strong>:</p>
        <p>몸체의 나선 파도 음각 홈은 정확히 <strong>180° 반대 방향</strong>에 파여 있습니다. 턴테이블을 <strong>180°</strong>까지 돌리고, 뚜껑 위 <strong>영혼의 배 기울기를 0°(수평)</strong>로 맞춘 뒤 결합 클램프를 누르세요.</p>
        <p class="clue-note">카이에게 <code>[회전 ↻]+[파도 🌊]</code> 무전을 보내세요.</p>
      </div>
    `,
  },
  {
    id: 4,
    code: 'P04',
    act: 1,
    floor: '1F',
    room: 'time',
    roomLabel: '1F · 역사 연표 전시실',
    title: '군도 항해 지도와 3대 독립 연표 크로스라인',
    arch: '2D 고지도 해협 핀 × 타임라인 SVG 크로스 결선',
    mainRole: 'maria',
    helperRoles: ['lin'],
    focusObj: 'time-table-center',
    answerTokens: [
      ['NUM_2', 'DIR_W'],
      ['NUM_3', 'DIR_N'],
    ],
    clueTitle: '린 · 북측 군도 고지도 해협 측량',
    clueSummary: '1521→비사야 해협 · 1898→말롤로스(서←) · 1946→마닐라 북부(북↑)',
    clueHtml: `
      <div class="clue-card">
        <p class="clue-lead">🧭 <strong>필리핀 군도 고지도 좌표 측량 (time-wall-art)</strong>:</p>
        <ul class="clue-list">
          <li><strong>① 1521 막탄 항해</strong> ↔ <code>비사야 해협 (동남 해역)</code></li>
          <li><strong>② 1898 말롤로스 헌법</strong> ↔ <code>말롤로스 성당 (서 ← 루손 만)</code></li>
          <li><strong>③ 1946 공화국 독립</strong> ↔ <code>마닐라 북부 광장 (북 ↑ 내륙)</code></li>
        </ul>
        <p class="clue-note">이안에게 <code>[2번]+[서 ←]</code>, <code>[3번]+[북 ↑]</code> 무전을 보내세요.</p>
      </div>
    `,
  },
  {
    id: 5,
    code: 'P05',
    act: 1,
    floor: '1F',
    room: 'craft',
    roomLabel: '1F · 공예·기술 전시실',
    title: '이푸가오 전통 베틀 3색 씨실·날실 교차',
    arch: '3단 종광 페달 개구 토글 + 3색 북 왕복 직조',
    mainRole: 'doyun',
    helperRoles: ['aisha'],
    focusObj: 'craft-table-center',
    answerTokens: [['SYM_SUN', 'SYM_VOLT'], ['SYM_WAVE']],
    clueTitle: '카이 · 직조 벽면 직물 루페 확대 관측',
    clueSummary: '1줄=☀황금 실 · 2줄=⚡진홍 실 · 3줄=🌊청록 실',
    clueHtml: `
      <div class="clue-card">
        <p class="clue-lead">🔍 <strong>직물 패턴 확대 루페 (craft-wall-art / craft-basket-nw)</strong>:</p>
        <p>위에서 아래로 전통 이푸가오 배색 순서: <strong>1줄 [☀ 황금 실] → 2줄 [⚡ 진홍 실] → 3줄 [🌊 청록 실]</strong>.</p>
        <p class="clue-note">서하린에게 <code>[태양 ☀]+[열기 ⚡]</code>, <code>[파도 🌊]</code> 무전을 보내세요. 각 페달(1~3)을 밟아 날실 틈을 연 뒤 맞는 색 북을 통과시키면 됩니다.</p>
      </div>
    `,
  },
  {
    id: 6,
    code: 'P06',
    act: 1,
    floor: '1F',
    room: 'city',
    roomLabel: '1F · 근현대 도시 전시실',
    title: '1910 마닐라 전차 분기선과 파시그강 도개교',
    arch: '선로 분기 레버 3종 + 광학 뷰파인더 조준',
    mainRole: 'lin',
    helperRoles: ['maria'],
    focusObj: 'city-table-center',
    answerTokens: [['NUM_2', 'DIR_E']],
    clueTitle: '이안 · 구 스페인어 전차 노선 푯말 판독',
    clueSummary: '2번 비논도 우회선(S1=B, S2=B, S3=A) → 동쪽(→) 도개교 방면',
    clueHtml: `
      <div class="clue-card">
        <p class="clue-lead">📜 <strong>1910 전차 노선표 번역 (city-wall-art / city-cabinet-nw)</strong>:</p>
        <p><em>"Puente de España 침수! 모든 트램은 <strong>2번 비논도 우회선 (S1=B, S2=B, S3=A)</strong>을 거쳐 <strong>동쪽(→) 파시그강 도개교</strong>로 진입하라."</em></p>
        <p class="clue-note">린에게 <code>[2번]+[동 →]</code> 무전을 보내세요.</p>
      </div>
    `,
  },
  {
    id: 7,
    code: 'P07',
    act: 2,
    floor: 'B1',
    room: 'maintenance',
    roomLabel: 'B1 · ㄱ자 관리 통로',
    title: '지하 주 급수관 3구역 바이패스 수압 평형',
    arch: '연동 유량 밸브 핸드휠 (3구역 60 PSI 평형)',
    mainRole: 'doyun',
    helperRoles: ['lin'],
    focusObj: 'maint-pipe-header-1',
    answerTokens: [
      ['NUM_1', 'SYM_VOLT'],
      ['NUM_3', 'SYM_SAFE'],
    ],
    clueTitle: '린 · 배관 계통도 허용 압력 측량',
    clueSummary: '1번=25% 감압 · 2번=50% 유지 · 3번=100% 개방 → 모두 60 PSI',
    clueHtml: `
      <div class="clue-card">
        <p class="clue-lead">🧭 <strong>B1 배관 계통도 설계 기준 (maint-conduit-1)</strong>:</p>
        <ul class="clue-list">
          <li><strong>1번 구역 (과압 ⚡)</strong>: 밸브를 <strong>25%</strong>로 감압</li>
          <li><strong>2번 구역 (중간)</strong>: 밸브를 <strong>50%</strong>로 유지</li>
          <li><strong>3번 구역 (유량 부족 → 안전 🛡)</strong>: 밸브를 <strong>100%</strong> 완전 개방</li>
        </ul>
        <p class="clue-note">세 압력계가 모두 녹색 대역(55~65 PSI, 정중앙 60 PSI)에 들어오면 배수가 시작됩니다. 서하린에게 <code>[1번]+[열기 ⚡]</code>, <code>[3번]+[안정 🛡]</code>을 발신하세요.</p>
      </div>
    `,
  },
  {
    id: 8,
    code: 'P08',
    act: 2,
    floor: 'B1',
    room: 'safety',
    roomLabel: 'B1 · 방재·보일러실',
    title: '가압 보일러 증기 감압 & 복식 순환 펌프 동기화',
    arch: '실시간 압력 안전대역 유지 + 듀얼 RPM 위상 동기화',
    mainRole: 'doyun',
    helperRoles: ['aisha'],
    focusObj: 'safety-pump',
    answerTokens: [
      ['SYM_VOLT', 'DIR_S'],
      ['NUM_2', 'SYM_SAFE'],
    ],
    clueTitle: '카이 · 방재 관제 콘솔 센서 경보 판독',
    clueSummary: '보일러 압력 70~90 PSI 감압 + 1·2호기 1150~1250 RPM(오차 ±30 이내)',
    clueHtml: `
      <div class="clue-card">
        <p class="clue-lead">🔍 <strong>방재 콘솔 센서 로그 (safety-console)</strong>:</p>
        <p>보일러 과압(<strong>⚡ 145 PSI → 남 ↓ 70~90 PSI</strong>로 증기 배출)을 먼저 해결한 뒤, <strong>1·2호기 순환 펌프를 모두 1200 RPM 부근(1150~1250, 차이 ±30 이내)</strong>으로 동기화해 잠그세요.</p>
        <p class="clue-note">서하린에게 <code>[열기 ⚡]+[남 ↓]</code>, <code>[2번]+[안정 🛡]</code> 무전을 보내세요.</p>
      </div>
    `,
  },
  {
    id: 9,
    code: 'P09',
    act: 2,
    floor: 'B1',
    room: 'power',
    roomLabel: 'B1 · 고압 전기실',
    title: '3연식 고압 배전반 모선 라우팅 & 비상 디젤 발전기 기동',
    arch: '디젤 예열/크랭크 + 3베이 버스바 인터록 매트릭스',
    mainRole: 'doyun',
    helperRoles: ['lin', 'aisha'],
    focusObj: 'power-switchgear',
    answerTokens: [['NUM_3', 'COOP_SWAP'], ['COOP_OK']],
    clueTitle: '린 & 카이 · UPS 침수 점검표 + 60Hz 예열 계측',
    clueSummary: '예열 100%→크랭크 기동 → Bus 1·2 OFF, Bus 3(예비) ON → 주 차단기 ON',
    clueHtml: `
      <div class="clue-card">
        <p class="clue-lead">🧭🔍 <strong>UPS 침수 점검표 (power-ups-e1) &amp; 주파수 계측 (power-conduit)</strong>:</p>
        <ul class="clue-list">
          <li><strong>린 측량</strong>: <strong>1·2번 배터리 모선은 침수 단락!</strong> 반드시 <strong>OFF</strong>하고 <strong>3번 예비 우회 모선(⇄)</strong>만 켜세요.</li>
          <li><strong>카이 센서</strong>: 발전기 코일을 <strong>100% 예열</strong>하고 크랭크를 기동하면 <code>60Hz ✔ 준비 완료</code>가 됩니다.</li>
        </ul>
        <p class="clue-note">클리어 시 <strong>1F·2F·B1 박물관 전체 비상 조명이 정식 조명으로 복구</strong>됩니다!</p>
      </div>
    `,
    objectRoleClues: {
      'power-conduit': {
        roleId: 'aisha',
        title: '카이 · 배선 계측 제어함 (60Hz 코일 센서)',
        bodyHtml: `<div class="clue-card"><p>🔍 예열 코일 온도 <strong>100% 도달 후 크랭크</strong>를 돌리면 <strong>60Hz 정격 출력</strong>이 안정됩니다. 서하린에게 <code>[준비 완료 ✔]</code> 신호를 보내세요.</p></div>`,
      },
    },
  },
  {
    id: 10,
    code: 'P10',
    act: 2,
    floor: 'B1',
    room: 'rescue',
    roomLabel: 'B1 · 응급 수장고',
    title: '수장고 이슬점 제습 공조 & 2축 천장 호이스트 이송',
    arch: '이슬점 온습도 캘리브레이션 + 침수 회피 2축 크레인',
    mainRole: 'lin',
    helperRoles: ['aisha', 'doyun'],
    focusObj: 'rescue-table-c',
    answerTokens: [
      ['SYM_WAVE', 'DIR_N'],
      ['NUM_1', 'SYM_SAFE'],
    ],
    clueTitle: '카이 & 서하린 · 이슬점 45%/18°C & 방수 크레이트 체결',
    clueSummary: '45% RH / 18°C 설정 → 크레인 (1,3) 상자 집어 침수 (2,2)(3,2)(2,3) 피해 (4,1) 선반 안착',
    clueHtml: `
      <div class="clue-card">
        <p class="clue-lead">🔍⚙ <strong>제습 공조(rescue-dehumid-nw) &amp; 방수 걸쇠(rescue-crate-sw1)</strong>:</p>
        <ul class="clue-list">
          <li><strong>카이</strong>: 공조 기준 <strong>45% RH / 18°C</strong> 설정 후 북측 안전 경로 확인 (<code>[파도 🌊]+[북 ↑]</code>).</li>
          <li><strong>서하린</strong>: <code>(1,3)</code> 1번 방수 상자 걸쇠 체결 완료 (<code>[1번]+[안정 🛡]</code>).</li>
        </ul>
        <p class="clue-note">린은 물웅덩이 <code>(2,2),(3,2),(2,3)</code>을 피해 북동측 스틸 선반 <strong>(4,1)</strong>에 상자를 내려놓으세요.</p>
      </div>
    `,
    objectRoleClues: {
      'rescue-crate-sw1': {
        roleId: 'doyun',
        title: '서하린 · 1번 방수 크레이트 걸쇠 점검',
        bodyHtml: `<div class="clue-card"><p>⚙ 크레이트 잠금 걸쇠와 중량 중심이 <strong>안전(🛡)</strong> 상태로 체결 준비되었습니다. 아래 버튼으로 걸쇠를 체결한 뒤 린에게 <code>[1번]+[안정 🛡]</code>을 발신하세요.</p></div>`,
      },
      'rescue-crate-sw2': {
        roleId: 'doyun',
        title: '서하린 · 2번 보조 크레이트 & 걸쇠 점검',
        bodyHtml: `<div class="clue-card"><p>⚙ 보조 방수 크레이트 중량 표식 확인 완료: 인양 대상은 <strong>1번 크레이트(1,3)</strong>입니다. 걸쇠를 체결하고 린에게 <code>[1번]+[안정 🛡]</code>을 발신하세요.</p></div>`,
      },
    },
  },
  {
    id: 11,
    code: 'P11',
    act: 3,
    floor: '2F',
    room: 'archive',
    roomLabel: '2F · 기록 아카이브',
    title: '카티푸난 비밀 헌장과 바이바이인 이중 암호판',
    arch: '고대 음절 문자(Kudlit) 2중 동심원 디코더 휠',
    mainRole: 'maria',
    helperRoles: ['aisha', 'doyun'],
    focusObj: 'archive-table',
    answerTokens: [
      ['SYM_STAR', 'ACT_ROT'],
      ['NUM_3', 'SYM_SUN'],
    ],
    clueTitle: '카이 & 서하린 · UV 모음점(Kudlit) & 목판 기준 각도',
    clueSummary: '3음절 모두 무점(기본 a) · 암호어: KA(ᜃ) - LA(ᜎ) - YA(ᜌ) [KALAYAAN]',
    clueHtml: `
      <div class="clue-card">
        <p class="clue-lead">🔍⚙ <strong>헌장 액자 UV 스캔(archive-paint) &amp; 목판 각도(archive-long-nw)</strong>:</p>
        <ul class="clue-list">
          <li><strong>카이(UV)</strong>: 3개 음절 모두 위/아래 점(Kudlit)이 지워진 <strong>무점(기본 모음 a)</strong> 형태입니다.</li>
          <li><strong>서하린(목판)</strong>: 키워드는 자유(<em>Kalayaan</em>)의 앞 세 음절 <strong>KA (ᜃ) - LA (ᜎ) - YA (ᜌ)</strong> 입니다.</li>
        </ul>
        <p class="clue-note">이안에게 <code>[별자리 ★]+[회전 ↻]</code>, <code>[3번]+[태양 ☀]</code>을 발신하세요.</p>
      </div>
    `,
    objectRoleClues: {
      'archive-long-nw': {
        roleId: 'doyun',
        title: '서하린 · 바이바이인 활자 대조 목판 (북서)',
        bodyHtml: `<div class="clue-card"><p>⚙ 목판 기준 각인: 3번째 인장은 <strong>태양(☀) = YA(ᜌ)</strong>, 전체 단어는 <strong>KA - LA - YA (자유)</strong>입니다. <code>[3번]+[태양 ☀]</code>을 발신하세요.</p></div>`,
      },
      'archive-long-ne': {
        roleId: 'doyun',
        title: '서하린 · 바이바이인 활자 대조 목판 (북동)',
        bodyHtml: `<div class="clue-card"><p>⚙ 북동 목판 대조표: 모음점이 없는 기본 자음은 <strong>-a</strong> 발음입니다. <code>KA - LA - YA</code> 모두 <strong>무점(기본 a)</strong>입니다.</p></div>`,
      },
    },
  },
  {
    id: 12,
    code: 'P12',
    act: 3,
    floor: '2F',
    room: 'archive',
    roomLabel: '2F · 기록 아카이브',
    title: '기증 등록대장 마이크로필름 & 천공 카드 복원',
    arch: 'XY 마이크로필름 초점 스캐너 + 4열 천공 카드 타공',
    mainRole: 'maria',
    helperRoles: ['lin'],
    focusObj: 'archive-cabinet-ne',
    answerTokens: [
      ['NUM_2', 'SYM_STAR'],
      ['NUM_4', 'SYM_WAVE'],
    ],
    clueTitle: '린 · 마이크로필름 리더기 XY 초점 측량',
    clueSummary: '초점(X=60, Y=40) → 2열 [★] · 4열 [🌊] 타공 후 ARCHIVED 스탬프',
    clueHtml: `
      <div class="clue-card">
        <p class="clue-lead">🧭 <strong>마이크로필름 리더기 (archive-side-desk-e) 측량</strong>:</p>
        <p>리더기의 초점을 <strong>X=60, Y=40</strong> 부근으로 맞추면 <strong>COL 2 [★ 별자리] · COL 4 [🌊 파도]</strong> 천공 좌표가 선명하게 드러납니다.</p>
        <p class="clue-note">이안에게 <code>[2번]+[별자리 ★]</code>, <code>[4번]+[파도 🌊]</code> 무전을 보내고 2열과 4열만 타공하세요.</p>
      </div>
    `,
  },
  {
    id: 13,
    code: 'P13',
    act: 3,
    floor: '2F',
    room: 'preserve',
    roomLabel: '2F · 보존처리실',
    title: '청동 유물 부식층 초음파 세척 & 3색 중화 시약 적정',
    arch: '스포이드 pH 7.0 적정 + 초음파 브러시 세척',
    mainRole: 'aisha',
    helperRoles: ['maria', 'doyun'],
    focusObj: 'preserve-lab-c',
    answerTokens: [
      ['SYM_WAVE', 'NUM_2'],
      ['SYM_SUN', 'NUM_1'],
    ],
    clueTitle: '이안 & 서하린 · 스페인어 화학 노트 & 시약 밸브 개방',
    clueSummary: '청록 시약(🌊) 2방울 + 호박 시약(☀) 1방울 = pH 7.0 + 부식층 90% 이상 세척',
    clueHtml: `
      <div class="clue-card">
        <p class="clue-lead">📜⚙ <strong>보존 공정 노트(preserve-wall-chart) &amp; 약품함(preserve-cabinet-1)</strong>:</p>
        <ul class="clue-list">
          <li><strong>이안 번역</strong>: <em>"청록 염화물(🌊) <strong>2방울</strong> + 중화 호박산(☀) <strong>1방울</strong> = 정확히 <strong>pH 7.0</strong>"</em></li>
          <li><strong>서하린 밸브</strong>: 북서측 약품 보관장 시약 공급 밸브를 열어 스포이드를 사용 가능하게 합니다.</li>
        </ul>
        <p class="clue-note">카이에게 <code>[파도 🌊]+[2번]</code>, <code>[태양 ☀]+[1번]</code>을 발신하세요.</p>
      </div>
    `,
    objectRoleClues: {
      'preserve-cabinet-1': {
        roleId: 'doyun',
        title: '서하린 · 약품 보관장 1 시약 공급 밸브',
        bodyHtml: `<div class="clue-card"><p>⚙ 청록·호박·투명 시약 공급 라인 안전 밸브를 개방하면 카이가 작업대에서 적정·세척할 수 있습니다. (배합: 🌊×2 + ☀×1 + 투명 0방울)</p></div>`,
      },
      'preserve-cabinet-2': {
        roleId: 'doyun',
        title: '서하린 · 약품 보관장 2 예비 시약 밸브',
        bodyHtml: `<div class="clue-card"><p>⚙ 2번 보관장 매니폴드도 동일 시약 라인에 연결되어 있습니다. 아래 버튼으로 시약 공급 안전 밸브를 여세요.</p></div>`,
      },
    },
  },
  {
    id: 14,
    code: 'P14',
    act: 3,
    floor: '2F',
    room: 'preserve',
    roomLabel: '2F · 보존처리실',
    title: '기증 상자 4점 도르래 이완 & 깨진 밀랍 봉인 몰드',
    arch: '4모서리 대각선 장력 평형 + 밀랍 인장 파편 2초 압착',
    mainRole: 'aisha',
    helperRoles: ['doyun'],
    focusObj: 'preserve-bench-r',
    answerTokens: [['NUM_1', 'COOP_SWAP'], ['SYM_SAFE']],
    clueTitle: '서하린 · 기증 상자 도르래 과부하 순서 점검',
    clueSummary: '대각선 ①→③ 먼저 0% 이완 후 ②→④ 이완 → 밀랍 3조각 0° 정렬 → 2초 압착',
    clueHtml: `
      <div class="clue-card">
        <p class="clue-lead">⚙ <strong>기증 상자 도르래 걸쇠 점검 (preserve-crate-sw)</strong>:</p>
        <p>장력이 걸린 4모서리 도르래는 반드시 <strong>#1(좌상)과 대각선 반대편 #3(우하)을 먼저 0%로 푼 다음</strong> #2·#4를 풀어야 유물이 뒤틀리지 않습니다! 상자 개봉 후 밀랍 3조각을 <strong>0°</strong>로 맞춰 2초간 누르세요.</p>
        <p class="clue-note">카이에게 <code>[1번]+[반전 ⇄]</code>, <code>[안정 🛡]</code> 무전을 보내세요.</p>
      </div>
    `,
  },
  {
    id: 15,
    code: 'P15',
    act: 3,
    floor: '2F',
    room: 'reading',
    roomLabel: '2F · 자료 열람실',
    title: '고서 지명 색인과 성곽 건축 도면 트레이싱 오버레이',
    arch: '반투명 트레이싱지 X·Y 이동 및 90° 회전 정밀 포개기',
    mainRole: 'maria',
    helperRoles: ['lin'],
    focusObj: 'reading-table',
    answerTokens: [['DIR_W', 'ACT_ROT']],
    clueTitle: '린 · 인트라무로스 성벽 종탑·광장 축선 측량',
    clueSummary: '트레이싱지를 서쪽(←) 0 부근으로 이동 + 0°로 회전 맞춰 3개 앵커 핀 일치',
    clueHtml: `
      <div class="clue-card">
        <p class="clue-lead">🧭 <strong>사료화 축선 측량 결과 (reading-wall-art-c)</strong>:</p>
        <p>반투명 도면이 동쪽으로 치우치고 270° 돌아가 있습니다. 도면을 <strong>서쪽(←) 중앙 원점</strong>으로 끌어다 놓고 <strong>시계 방향 90° 회전(↻ → 0°)</strong>시켜 <em>Puerta Real · Baluarte · 종탑</em> 3개 앵커를 모두 민트색으로 밝히세요.</p>
        <p class="clue-note">이안에게 <code>[서 ←]+[회전 ↻]</code> 무전을 보내세요.</p>
      </div>
    `,
    objectRoleClues: {
      'reading-side-desk-w': {
        roleId: 'maria',
        title: '이안 · 고서 지명 색인 대조표',
        bodyHtml: `<div class="clue-card"><p>📜 옛 스페인어 성곽 지명 3곳 식별 완료: <strong>성벽 종탑(좌상)</strong> · <strong>Puerta Real(우상)</strong> · <strong>Baluarte(하단)</strong>. 린의 방위/회전 신호(<code>[서 ←]+[회전 ↻]</code>)에 맞춰 열람대 트레이싱지를 겹치세요.</p></div>`,
      },
    },
  },
  {
    id: 16,
    code: 'P16',
    act: 4,
    floor: '2F',
    room: 'special',
    roomLabel: '2F · 기획전시실 → 반원 동상 홀',
    title: '해양 교역 프리즘 연결 & 반원 홀 4인 대관식 집결',
    arch: '1부: 3프리즘 광학 굴절 모달 + 2부: 모달 없는 인게임 필드 4/4 집결',
    mainRole: 'lin',
    helperRoles: ['maria', 'doyun'],
    focusObj: 'special-table',
    answerTokens: [['DIR_E', 'ACT_ROT'], ['COOP_HERE']],
    clueTitle: '이안 & 서하린 · 고대 항로 비문 + 2부 현장 4/4 집결 절차',
    clueSummary: '1부: M1=45°, M2=135°, M3=90° → 2부: 린 [집결 호출 HERE] + 2F 반원 홀 발판 4/4 동시 착지',
    clueHtml: `
      <div class="clue-card">
        <p class="clue-lead">📜⚙ <strong>피날레 2단계 절차 (special-wall-art → atrium)</strong>:</p>
        <ol class="clue-list">
          <li><strong>1부 (기획전시실 광학 모달)</strong>: 3면 프리즘을 <strong>M1=45°, M2=135°, M3=90°</strong>로 맞춰 태양 광선을 서쪽 <code>2F · 반원 홀</code> 동상으로 쏩니다.</li>
          <li><strong>2부 (모달 없는 인게임 필드 집결)</strong>: 린이 C-Menu 2.0으로 <code>[📍 집결 호출 HERE]</code>를 발신한 뒤, <strong>서하린·이안·린·카이 4명 전원</strong>이 <code>2F · 반원 홀</code> 바닥 발판(<code>gather-1~4</code>) 위에 동시에 올라서면 <strong>4/4 대관식 엔딩</strong>이 즉시 시작됩니다!</li>
        </ol>
      </div>
    `,
    objectRoleClues: {
      'special-boat-nw': {
        roleId: 'doyun',
        title: '서하린 · 1차 목선 진열장 프리즘 거치대',
        bodyHtml: `<div class="clue-card"><p>⚙ 거치대 회전 베어링 잠금을 해제했습니다. 중앙 전시대(<code>special-table</code>)에서 <strong>M1=45°, M2=135°, M3=90°</strong>로 광선을 굴절시키세요.</p></div>`,
      },
    },
  },
];

export const PUZZLES_BY_ID: Record<number, PuzzleDef> = Object.fromEntries(PUZZLES.map((p) => [p.id, p]));
