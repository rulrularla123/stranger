import type { RoleId, RoleMeta, TokenCategory, TokenDef } from '../types/stranger.ts';

export const ROLE_ORDER: RoleId[] = ['doyun', 'maria', 'lin', 'aisha'];

export const ROLES: Record<RoleId, RoleMeta> = {
  doyun: {
    id: 'doyun',
    name: '서하린',
    shortRole: '조작자',
    title: '엔지니어 · 조작자',
    color: '#FFB86B',
    badge: '⚙',
    country: '한국',
    passiveName: '황동 기어 하이라이트',
    passiveDesc: '조작 가능한 기계·밸브·배전반·로프 주변에 황동 기어 표식을 상시 투영합니다.',
  },
  maria: {
    id: 'maria',
    name: '이안',
    shortRole: '통역',
    title: '고문서학자 · 통역',
    color: '#E6C886',
    badge: '📜',
    country: '필리핀',
    passiveName: '사료 번역 오버레이',
    passiveDesc: '방명록·연표·바이바이인·스페인어 사료 접근 시 양피지 번역 요약을 띄웁니다.',
  },
  lin: {
    id: 'lin',
    name: '린',
    shortRole: '네비게이터',
    title: '공간측량사 · 네비게이터',
    color: '#52EFBF',
    badge: '🧭',
    country: '베트남',
    passiveName: '방위·배관·축선 측량',
    passiveDesc: '미니맵 방위선, 배관 계통, 선로/광학 축선 및 정밀 좌표 벡터를 실시간 표시합니다.',
  },
  aisha: {
    id: 'aisha',
    name: '카이',
    shortRole: '관측자',
    title: '유물감식가 · 관측자',
    color: '#7CD8FF',
    badge: '🔍',
    country: '남아공',
    passiveName: '정밀 루페 · 센서 뷰',
    passiveDesc: '회화·직물·청동 수조 및 기계 센서(UV·수압·습도·pH) 확대 수치를 판독합니다.',
  },
};

export const C_CATEGORIES: TokenCategory[] = [
  {
    id: 'num',
    label: '🔢 숫자',
    color: '#F4F7FA',
    tokens: [
      { id: 'NUM_1', category: 'num', glyph: '①', label: '1번', sub: '첫번째 / 1방울', color: '#F4F7FA' },
      { id: 'NUM_2', category: 'num', glyph: '②', label: '2번', sub: '두번째 / 2방울', color: '#F4F7FA' },
      { id: 'NUM_3', category: 'num', glyph: '③', label: '3번', sub: '세번째 / 3구역', color: '#F4F7FA' },
      { id: 'NUM_4', category: 'num', glyph: '④', label: '4번', sub: '네번째 / 4열', color: '#F4F7FA' },
      { id: 'NUM_0', category: 'num', glyph: '◎0', label: '기준(0)', sub: '영점 / 초기화', color: '#9AA7B4' },
    ],
  },
  {
    id: 'dir',
    label: '🧭 방향',
    color: '#52EFBF',
    tokens: [
      { id: 'DIR_N', category: 'dir', glyph: '↑', label: '북 ↑', sub: '위 / 북쪽', color: '#52EFBF' },
      { id: 'DIR_E', category: 'dir', glyph: '→', label: '동 →', sub: '오른쪽 / 동쪽', color: '#52EFBF' },
      { id: 'DIR_S', category: 'dir', glyph: '↓', label: '남 ↓', sub: '아래 / 남쪽', color: '#52EFBF' },
      { id: 'DIR_W', category: 'dir', glyph: '←', label: '서 ←', sub: '왼쪽 / 서쪽', color: '#52EFBF' },
      { id: 'ACT_ROT', category: 'dir', glyph: '↻', label: '회전 ↻', sub: '돌리기 / 정렬', color: '#FFB86B' },
    ],
  },
  {
    id: 'sym',
    label: '🎨 그림',
    color: '#E6C886',
    tokens: [
      { id: 'SYM_SUN', category: 'sym', glyph: '☀', label: '태양 ☀', sub: '황금 / 지붕 / 호박', color: '#E6C886' },
      { id: 'SYM_WAVE', category: 'sym', glyph: '🌊', label: '파도 🌊', sub: '청록 / 해협 / 습도', color: '#7CD8FF' },
      { id: 'SYM_MTN', category: 'sym', glyph: '⛰', label: '산맥 ⛰', sub: '황토 / 기둥 / 지형', color: '#D49B6A' },
      { id: 'SYM_STAR', category: 'sym', glyph: '★', label: '별자리 ★', sub: '감청 / 바이바이인', color: '#91A8FF' },
      { id: 'SYM_VOLT', category: 'sym', glyph: '⚡', label: '열기 ⚡', sub: '적색 / 과압 / 고압', color: '#FF6E6E' },
      { id: 'SYM_SAFE', category: 'sym', glyph: '🛡', label: '안정 🛡', sub: '녹색 / 건조 / 안전', color: '#52EFBF' },
    ],
  },
  {
    id: 'coop',
    label: '🤝 신호',
    color: '#C792EA',
    tokens: [
      { id: 'COOP_OK', category: 'coop', glyph: '✔', label: '준비 완료', sub: 'OK / 작동 가능', color: '#52EFBF' },
      { id: 'COOP_WAIT', category: 'coop', glyph: '✋', label: '잠깐 대기', sub: 'HOLD / 정지', color: '#FFB86B' },
      { id: 'COOP_SWAP', category: 'coop', glyph: '⇄', label: '반전/교체', sub: '대각선 / 모선 우회', color: '#C792EA' },
      { id: 'COOP_HERE', category: 'coop', glyph: '📍', label: '집결 호출', sub: 'HERE / 반원 홀', color: '#52EFBF' },
    ],
  },
];

export const TOKENS_BY_ID: Record<string, TokenDef> = Object.fromEntries(
  C_CATEGORIES.flatMap((c) => c.tokens).map((t) => [t.id, t])
);

export function renderTokenPillHtml(tokenId: string): string {
  const tok = TOKENS_BY_ID[tokenId];
  if (!tok) return `<span class="s-tok">${tokenId}</span>`;
  return `<span class="s-tok" style="--tok-color:${tok.color}">
    <span class="s-tok-glyph">${tok.glyph}</span>
    <span class="s-tok-label">${tok.label}</span>
  </span>`;
}
