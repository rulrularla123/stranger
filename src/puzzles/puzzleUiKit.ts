import type { RoleId } from '../types/stranger.ts';
import { ROLES, TOKENS_BY_ID, escapeTokenText } from '../data/cMenuTokens.ts';

export type LampState = 'off' | 'red' | 'amber' | 'mint';
export type PushTone = 'mint' | 'amber' | 'red' | 'steel';
export type UiIconName =
  | 'check'
  | 'cross'
  | 'drop'
  | 'lock'
  | 'move'
  | 'rot-cw'
  | 'rot-ccw'
  | 'speaker'
  | 'tap'
  | 'thermo'
  | 'warning'
  | 'arrow-left'
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-right';

export const PART_URL = {
  screw: '/assets/puzzle-ui/parts/screw.svg',
  closeBtn: '/assets/puzzle-ui/parts/close-btn.svg',
  lampOff: '/assets/puzzle-ui/parts/lamp-off.svg',
  lampRed: '/assets/puzzle-ui/parts/lamp-red.svg',
  lampAmber: '/assets/puzzle-ui/parts/lamp-amber.svg',
  lampMint: '/assets/puzzle-ui/parts/lamp-mint.svg',
  roundSteel: '/assets/puzzle-ui/parts/btn-round-steel.svg',
  roundMint: '/assets/puzzle-ui/parts/btn-round-mint.svg',
  roundAmber: '/assets/puzzle-ui/parts/btn-round-amber.svg',
  roundRed: '/assets/puzzle-ui/parts/btn-round-red.svg',
  leverOn: '/assets/puzzle-ui/parts/lever-on.svg',
  leverOff: '/assets/puzzle-ui/parts/lever-off.svg',
  hold0: '/assets/puzzle-ui/parts/hold-0.svg',
  hold50: '/assets/puzzle-ui/parts/hold-50.svg',
  hold100: '/assets/puzzle-ui/parts/hold-100.svg',
  shakeL: '/assets/puzzle-ui/parts/toast-shake-l.svg',
  shakeR: '/assets/puzzle-ui/parts/toast-shake-r.svg',
  completeBand: '/assets/puzzle-ui/parts/complete-band.svg',
  tapRipple: '/assets/puzzle-ui/parts/tap-ripple.svg',
} as const;

export const ROLE_ICON_URL: Record<RoleId, string> = {
  doyun: '/assets/puzzle-ui/icons/role-doyun.svg',
  maria: '/assets/puzzle-ui/icons/role-maria.svg',
  lin: '/assets/puzzle-ui/icons/role-lin.svg',
  aisha: '/assets/puzzle-ui/icons/role-aisha.svg',
};

export function tokenIconUrl(tokenId: string): string {
  return `/assets/puzzle-ui/icons/tok-${tokenId}.svg`;
}

export function uiIconUrl(name: UiIconName): string {
  return `/assets/puzzle-ui/icons/ui-${name}.svg`;
}

export function roleBadgeHtml(roleId: RoleId, prefix: string, extra = ''): string {
  const meta = ROLES[roleId];
  const label = prefix ? `${prefix} · ${meta.name}` : meta.name;
  return `<span class="fg-role-badge" style="--rb-bg:${meta.color}" title="${escapeTokenText(meta.title)}${extra ? ` · ${escapeTokenText(extra)}` : ''}">
    <span class="fg-role-emblem"><img src="${ROLE_ICON_URL[roleId]}" alt="" /></span>
    <span class="fg-role-text">${escapeTokenText(label)}</span>
  </span>`;
}

export function tokenChipHtml(tokenId: string, size: 'sm' | 'md' = 'md'): string {
  const tok = TOKENS_BY_ID[tokenId];
  if (!tok) {
    return `<span class="fg-tok-chip ${size}">${escapeTokenText(tokenId)}</span>`;
  }
  return `<span class="fg-tok-chip ${size}" style="--tc:${tok.color}" title="${escapeTokenText(tok.sub)}">
    <img class="fg-tok-img" src="${tokenIconUrl(tok.id)}" alt="" />
    <span class="fg-tok-lbl">${escapeTokenText(tok.label.replace(/\s*[↑→↓←↻☀🌊⛰★⚡🛡]\s*$/u, ''))}</span>
  </span>`;
}

export function lampHtml(state: LampState, label = '', idAttr = ''): string {
  const src =
    state === 'mint'
      ? PART_URL.lampMint
      : state === 'amber'
        ? PART_URL.lampAmber
        : state === 'red'
          ? PART_URL.lampRed
          : PART_URL.lampOff;
  const glowCls = state !== 'off' ? `glow-${state}` : '';
  return `<span class="fg-lamp-wrap ${glowCls}" ${idAttr ? `id="${idAttr}"` : ''}>
    <img class="fg-lamp-img" src="${src}" alt="${state}" />
    ${label ? `<span class="fg-lamp-lbl">${label}</span>` : ''}
  </span>`;
}

export function lcdHtml(value: string | number, unit = '', idAttr = '', valIdAttr = ''): string {
  return `<div class="fg-lcd" ${idAttr ? `id="${idAttr}"` : ''}>
    <span class="fg-lcd-val" ${valIdAttr ? `id="${valIdAttr}"` : ''}>${escapeTokenText(String(value))}</span>
    ${unit ? `<span class="fg-lcd-unit">${escapeTokenText(unit)}</span>` : ''}
  </div>`;
}

export function pushBtnHtml(opts: {
  id?: string;
  dataAttr?: string;
  label: string;
  tone?: PushTone;
  disabled?: boolean;
  extraClass?: string;
}): string {
  const tone = opts.tone || 'mint';
  return `<button type="button" ${opts.id ? `id="${opts.id}"` : ''} ${opts.dataAttr || ''}
    class="fg-push fg-push-${tone} ${opts.extraClass || ''}" ${opts.disabled ? 'disabled' : ''}>
    <span class="fg-push-face"><span class="fg-push-shine"></span>${opts.label}</span>
  </button>`;
}

export function roundBtnHtml(opts: {
  id?: string;
  dataAttr?: string;
  icon: UiIconName;
  tone?: PushTone;
  subLabel?: string;
  title?: string;
  disabled?: boolean;
  tapHint?: boolean;
  extraClass?: string;
}): string {
  const tone = opts.tone || 'steel';
  const bodySrc =
    tone === 'mint'
      ? PART_URL.roundMint
      : tone === 'amber'
        ? PART_URL.roundAmber
        : tone === 'red'
          ? PART_URL.roundRed
          : PART_URL.roundSteel;
  return `<div class="fg-round-col ${opts.extraClass || ''}">
    <button type="button" ${opts.id ? `id="${opts.id}"` : ''} ${opts.dataAttr || ''}
      class="fg-round-btn" ${opts.title ? `title="${escapeTokenText(opts.title)}"` : ''} ${opts.disabled ? 'disabled' : ''}>
      <img class="fg-round-body" src="${bodySrc}" alt="" />
      <img class="fg-round-ico" src="${uiIconUrl(opts.icon)}" alt="" />
      ${opts.tapHint ? tapHintHtml() : ''}
    </button>
    ${opts.subLabel ? `<span class="fg-round-sub">${escapeTokenText(opts.subLabel)}</span>` : ''}
  </div>`;
}

export function tapHintHtml(): string {
  return `<span class="fg-tap-hint" aria-hidden="true">
    <img class="fg-tap-ripple" src="${PART_URL.tapRipple}" alt="" />
    <img class="fg-tap-hand" src="${uiIconUrl('tap')}" alt="" />
  </span>`;
}

export function wrongToastHtml(message: string): string {
  return `<div class="fg-wrong-toast" role="alert">
    <img class="fg-toast-shake" src="${PART_URL.shakeL}" alt="" />
    <img class="fg-toast-cross" src="${uiIconUrl('cross')}" alt="" />
    <span class="fg-toast-msg">${message}</span>
    <img class="fg-toast-shake" src="${PART_URL.shakeR}" alt="" />
  </div>`;
}

export function completeBannerHtml(title: string, sub: string): string {
  return `<div class="fg-complete-overlay" id="fg-complete-overlay" role="status">
    <div class="fg-complete-ribbon">
      <img class="fg-complete-band" src="${PART_URL.completeBand}" alt="" />
      <div class="fg-complete-content">
        <img class="fg-complete-check" src="${uiIconUrl('check')}" alt="" />
        <div class="fg-complete-copy">
          <div class="fg-complete-title">${escapeTokenText(title)}</div>
          <div class="fg-complete-sub">${escapeTokenText(sub)}</div>
        </div>
      </div>
    </div>
  </div>`;
}
