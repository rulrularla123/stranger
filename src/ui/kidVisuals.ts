// 초등학생 설명용 "그림 위주" UI 헬퍼.
// 긴 문장 대신 캐릭터 스프라이트 · 유물 그림 · 방 그림 · 큰 이모지로 보여 줍니다.
import type { FloorKey, PuzzleDef, RoleId } from '../types/stranger.ts';
import { ROLE_ORDER, ROLES, TOKENS_BY_ID } from '../data/cMenuTokens.ts';

/** 역할마다 한 단어 + 짧은 한 줄 설명 */
export const ROLE_KID: Record<RoleId, { emoji: string; job: string; does: string }> = {
  doyun: { emoji: '⚙', job: '고치기', does: '기계를 고쳐요' },
  maria: { emoji: '📜', job: '읽기', does: '옛날 글을 읽어요' },
  lin: { emoji: '🧭', job: '길찾기', does: '방향을 찾아요' },
  aisha: { emoji: '🔍', job: '살펴보기', does: '자세히 들여다봐요' },
};

/** 퍼즐마다 그림(유물 스프라이트) + 이모지 + 아주 짧은 이름 */
export const PUZZLE_KID: Record<number, { emoji: string; title: string; sprite: string }> = {
  1: { emoji: '🧭', title: '나침반 돌리기', sprite: 'compass-socket' },
  2: { emoji: '🏠', title: '옛날 집 꾸미기', sprite: 'bahay-painting' },
  3: { emoji: '🏺', title: '항아리 뚜껑 맞추기', sprite: 'compact-pottery' },
  4: { emoji: '🗺', title: '지도와 연도 잇기', sprite: 'document-display' },
  5: { emoji: '🧵', title: '베틀로 옷감 짜기', sprite: 'textile-loom' },
  6: { emoji: '🚋', title: '전차 길 바꾸기', sprite: 'street-model' },
  7: { emoji: '🚰', title: '물 파이프 맞추기', sprite: 'b1-pipe-valve-wall' },
  8: { emoji: '♨️', title: '보일러 식히기', sprite: 'b1-pump-manifold' },
  9: { emoji: '⚡', title: '전기 켜기', sprite: 'b1-hv-switchgear' },
  10: { emoji: '📦', title: '젖은 상자 옮기기', sprite: 'b1-steel-worktable' },
  11: { emoji: '🔐', title: '비밀 글자 풀기', sprite: 'archive-counter' },
  12: { emoji: '🎞', title: '구멍 카드 고치기', sprite: 'archive-cabinet' },
  13: { emoji: '🧪', title: '유물 깨끗이 닦기', sprite: 'lab-equipment-table' },
  14: { emoji: '📮', title: '상자 도장 붙이기', sprite: 'conservation-desk' },
  15: { emoji: '📐', title: '성 지도 겹치기', sprite: 'scholar-study-desk' },
  16: { emoji: '🌈', title: '빛 쏘고 다 모이기', sprite: 'prism-pedestal' },
};

/** 방(장면)마다 큰 이모지 + 한 줄 목표 */
export const ROOM_KID: Record<string, { emoji: string; line: string }> = {
  '1F:hall': { emoji: '🧭', line: '바닥 나침반을 돌려서 문을 열어요!' },
  '1F:life': { emoji: '🏠', line: '옛날 집 물건과 항아리를 제자리에!' },
  '1F:time': { emoji: '🗺', line: '지도와 연도를 선으로 이어요' },
  '1F:craft': { emoji: '🧵', line: '베틀로 알록달록 옷감을 짜요' },
  '1F:city': { emoji: '🚋', line: '전차가 다리로 가도록 길을 바꿔요' },
  'B1:maintenance': { emoji: '🚰', line: '물 파이프 3개를 똑같이 맞춰요' },
  'B1:safety': { emoji: '♨️', line: '너무 뜨거운 보일러를 식혀요' },
  'B1:power': { emoji: '⚡', line: '전기를 켜면 박물관이 환해져요!' },
  'B1:rescue': { emoji: '📦', line: '젖은 상자를 안전한 선반으로!' },
  '2F:atrium': { emoji: '👑', line: '마지막엔 4명 모두 여기 발판에 모여요' },
  '2F:archive': { emoji: '🔐', line: '비밀 글자와 구멍 카드를 풀어요' },
  '2F:preserve': { emoji: '🧪', line: '유물을 닦고 상자에 도장을 붙여요' },
  '2F:reading': { emoji: '📐', line: '투명 종이를 성 지도에 겹쳐요' },
  '2F:special': { emoji: '🌈', line: '거울을 돌려서 빛을 쏘아요!' },
};

export const FLOOR_KID: Record<FloorKey, { emoji: string; name: string; count: number }> = {
  '1F': { emoji: '🏛', name: '1층 전시실', count: 6 },
  B1: { emoji: '⚡', name: '지하 기계실', count: 4 },
  '2F': { emoji: '📜', name: '2층 기록실', count: 6 },
};

const FLOOR_IMG_W = 2048;
const FLOOR_IMG_H = 1664;

/** 층 전체가 보이는 그림 범위 (x, y, w, h) */
export const FLOOR_OVERVIEW_VIEW: Record<FloorKey, [number, number, number, number]> = {
  '1F': [291, 733, 1320, 910],
  B1: [587, 755, 1426, 706],
  '2F': [85, 21, 1731, 830],
};

/** 세로로 너무 긴 방은 가운데만 잘라서 보여 줍니다. */
const ROOM_VIEW_OVERRIDE: Record<string, [number, number, number, number]> = {
  '1F:hall': [731, 1000, 440, 360],
};

/** 캐릭터 정면 스프라이트 (walk=true 면 제자리 걷기 애니메이션) */
export function charSpriteHtml(roleId: RoleId, scale = 2, walk = false, extraClass = ''): string {
  const row = Math.max(0, ROLE_ORDER.indexOf(roleId));
  return `<span class="kid-char ${walk ? 'walk' : ''} ${extraClass}" role="img" aria-label="${ROLES[roleId].name}"
    style="--s:${scale};--row:${row};background-image:url('/assets/characters/spritesheet.png')"></span>`;
}

/** 퍼즐 유물 그림 */
export function puzzlePicHtml(pid: number, extraClass = ''): string {
  const k = PUZZLE_KID[pid];
  if (!k) return '';
  return `<img class="kid-obj ${extraClass}" src="/assets/sprites/${k.sprite}.png" alt="${k.title}" draggable="false" />`;
}

export function puzzleKidTitle(p: PuzzleDef): string {
  const k = PUZZLE_KID[p.id];
  return k ? `${k.emoji} ${k.title}` : p.title;
}

/** 방 그림: 가구까지 그려진 층 안내도(guides)에서 해당 방만 잘라 보여 줍니다. */
export function roomPicHtml(
  floor: FloorKey,
  view: [number, number, number, number],
  key = '',
  extraClass = '',
  inner = ''
): string {
  const [x, y, w, h] = ROOM_VIEW_OVERRIDE[key] || view;
  const sizeX = (FLOOR_IMG_W / w) * 100;
  const sizeY = (FLOOR_IMG_H / h) * 100;
  const posX = FLOOR_IMG_W === w ? 0 : (x / (FLOOR_IMG_W - w)) * 100;
  const posY = FLOOR_IMG_H === h ? 0 : (y / (FLOOR_IMG_H - h)) * 100;
  return `<div class="kid-room-pic ${extraClass}" style="aspect-ratio:${w}/${h};background-image:url('/assets/guides/STRANGER-${floor}.png');background-size:${sizeX.toFixed(2)}% ${sizeY.toFixed(2)}%;background-position:${posX.toFixed(2)}% ${posY.toFixed(2)}%">${inner}</div>`;
}

/** 크게 보이는 무전 토큰 (아이콘 위, 이름 아래) */
export function bigTokenHtml(tokenId: string): string {
  const tok = TOKENS_BY_ID[tokenId];
  if (!tok) return `<span class="kid-tok">${tokenId}</span>`;
  const word = tok.label.replace(tok.glyph, '').trim() || tok.label;
  return `<span class="kid-tok" style="--tok-color:${tok.color}"><span class="kid-tok-glyph">${tok.glyph}</span><span class="kid-tok-word">${word}</span></span>`;
}

export function bigPacketHtml(tokenIds: string[]): string {
  return `<span class="kid-packet">${tokenIds.map((id) => bigTokenHtml(id)).join('<span class="kid-plus">+</span>')}</span>`;
}

/** "도와주는 친구 → 📡 → 푸는 친구" 그림 흐름 */
export function teamFlowHtml(p: PuzzleDef, scale = 1): string {
  const helpers = p.helperRoles.map((r) => charSpriteHtml(r, scale)).join('');
  return `<div class="kid-flow" title="${p.helperRoles.map((r) => ROLES[r].name).join('·')} → ${ROLES[p.mainRole].name}">
    <span class="kid-flow-group">${helpers}</span>
    <span class="kid-flow-arrow">📡➜</span>
    <span class="kid-flow-group main">${charSpriteHtml(p.mainRole, scale)}<span class="kid-flow-star">★</span></span>
  </div>`;
}
