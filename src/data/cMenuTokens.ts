import type { RadioPacket, RoleId, RoleMeta, TokenCategory, TokenDef } from '../types/stranger.ts';

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
    label: '숫자',
    color: '#F4F7FA',
    tokens: [
      { id: 'NUM_1', category: 'num', glyph: '1', label: '1', sub: '1', color: '#F4F7FA' },
      { id: 'NUM_2', category: 'num', glyph: '2', label: '2', sub: '2', color: '#F4F7FA' },
      { id: 'NUM_3', category: 'num', glyph: '3', label: '3', sub: '3', color: '#F4F7FA' },
      { id: 'NUM_4', category: 'num', glyph: '4', label: '4', sub: '4', color: '#F4F7FA' },
      { id: 'NUM_0', category: 'num', glyph: '0', label: '0', sub: '0', color: '#9AA7B4' },
    ],
  },
  {
    id: 'dir',
    label: '방향',
    color: '#52EFBF',
    tokens: [
      { id: 'DIR_N', category: 'dir', glyph: 'N', label: 'N', sub: 'N', color: '#52EFBF' },
      { id: 'DIR_E', category: 'dir', glyph: 'E', label: 'E', sub: 'E', color: '#52EFBF' },
      { id: 'DIR_S', category: 'dir', glyph: 'S', label: 'S', sub: 'S', color: '#52EFBF' },
      { id: 'DIR_W', category: 'dir', glyph: 'W', label: 'W', sub: 'W', color: '#52EFBF' },
      { id: 'ACT_ROT', category: 'dir', glyph: 'ROT', label: 'ROT', sub: 'ROT', color: '#FFB86B' },
    ],
  },
  {
    id: 'sym',
    label: '기호',
    color: '#E6C886',
    tokens: [
      { id: 'SYM_SUN', category: 'sym', glyph: 'SUN', label: 'SUN', sub: 'SUN', color: '#E6C886' },
      { id: 'SYM_WAVE', category: 'sym', glyph: 'WAVE', label: 'WAVE', sub: 'WAVE', color: '#7CD8FF' },
      { id: 'SYM_MTN', category: 'sym', glyph: 'MTN', label: 'MTN', sub: 'MTN', color: '#D49B6A' },
      { id: 'SYM_STAR', category: 'sym', glyph: 'STAR', label: 'STAR', sub: 'STAR', color: '#91A8FF' },
      { id: 'SYM_VOLT', category: 'sym', glyph: 'VOLT', label: 'VOLT', sub: 'VOLT', color: '#FF6E6E' },
      { id: 'SYM_SAFE', category: 'sym', glyph: 'SAFE', label: 'SAFE', sub: 'SAFE', color: '#52EFBF' },
    ],
  },
  {
    id: 'coop',
    label: '신호',
    color: '#C792EA',
    tokens: [
      { id: 'COOP_OK', category: 'coop', glyph: 'OK', label: 'OK', sub: 'OK', color: '#52EFBF' },
      { id: 'COOP_WAIT', category: 'coop', glyph: 'WAIT', label: 'WAIT', sub: 'WAIT', color: '#FFB86B' },
      { id: 'COOP_SWAP', category: 'coop', glyph: 'SWAP', label: 'SWAP', sub: 'SWAP', color: '#C792EA' },
      { id: 'COOP_HERE', category: 'coop', glyph: 'HERE', label: 'HERE', sub: 'HERE', color: '#52EFBF' },
    ],
  },
];

export const TOKENS_BY_ID: Record<string, TokenDef> = Object.fromEntries(
  C_CATEGORIES.flatMap((c) => c.tokens).map((t) => [t.id, t])
);

export function roleIconImgHtml(roleId: RoleId, extraClass = ''): string {
  const cls = ['s-role-ico', extraClass].filter(Boolean).join(' ');
  return `<img class="${cls}" src="/assets/puzzle-ui/icons/role-${roleId}.svg" alt="" />`;
}

export function escapeTokenText(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function sanitizeRadioNumber(raw: string): string {
  return raw.replace(/[^0-9.\-/]/g, '').slice(0, 10);
}

export function renderTokenPillHtml(
  tokenId: string,
  _slots?: Partial<Record<RoleId, { nickname?: string }>>
): string {
  if (tokenId.startsWith('VAL:')) {
    const clean = sanitizeRadioNumber(tokenId.slice(4));
    if (!clean) return '';
    return `<span class="s-tok s-tok-num"><span class="s-tok-num-val">${escapeTokenText(clean)}</span></span>`;
  }
  if (tokenId.startsWith('ROLE:')) {
    const target = tokenId.slice(5);
    const rm = ROLES[target as RoleId];
    if (rm) {
      return `<span class="s-tok s-tok-role" style="--tok-color:${rm.color}">
        <img class="s-tok-icon" src="/assets/puzzle-ui/icons/role-${rm.id}.svg" alt="" />
      </span>`;
    }
    return '';
  }
  const tok = TOKENS_BY_ID[tokenId];
  if (!tok) return '';
  return `<span class="s-tok s-tok-icon-only" style="--tok-color:${tok.color}">
    <img class="s-tok-icon" src="/assets/puzzle-ui/icons/tok-${tok.id}.svg" alt="" />
  </span>`;
}

export function renderRadioTargetHtml(_pkt: Pick<RadioPacket, 'targetRoleId' | 'targetName'>): string {
  return '';
}

export function renderRadioContentHtml(
  pkt: Pick<RadioPacket, 'tokenIds' | 'note'>,
  slots?: Partial<Record<RoleId, { nickname?: string }>>
): string {
  const pills = pkt.tokenIds
    .slice(0, 3)
    .map((id) => renderTokenPillHtml(id, slots))
    .filter(Boolean)
    .join('');
  return pills ? `<div class="signal-pills">${pills}</div>` : '';
}

export function renderRadioBannerContentHtml(
  pkt: Pick<RadioPacket, 'tokenIds' | 'note'>,
  slots?: Partial<Record<RoleId, { nickname?: string }>>
): string {
  const pills = pkt.tokenIds
    .slice(0, 3)
    .map((id) => renderTokenPillHtml(id, slots))
    .filter(Boolean)
    .join('');
  return pills ? `<span class="signal-pills">${pills}</span>` : '';
}

export function renderRadioPinContentHtml(
  pkt: Pick<RadioPacket, 'tokenIds' | 'note'>,
  slots?: Partial<Record<RoleId, { nickname?: string }>>
): string {
  const pills = pkt.tokenIds
    .slice(0, 3)
    .map((id) => renderTokenPillHtml(id, slots))
    .filter(Boolean)
    .join('');
  return `<span class="signal-pills compact">${pills}</span>`;
}

export function formatRadioPlainText(pkt: RadioPacket): string {
  return pkt.tokenIds
    .slice(0, 3)
    .map((id) => {
      if (id.startsWith('VAL:')) return sanitizeRadioNumber(id.slice(4));
      const t = TOKENS_BY_ID[id];
      return t ? t.glyph : '';
    })
    .filter(Boolean)
    .join(' ');
}
