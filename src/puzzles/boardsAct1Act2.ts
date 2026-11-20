import type { PuzzleDef, RoleId } from '../types/stranger.ts';
import type { DifficultyConfig } from '../data/puzzleCatalog.ts';
import { soundEngine } from '../audio/soundEngine.ts';
import {
  PART_URL,
  lampHtml,
  lcdHtml,
  pushBtnHtml,
  roundBtnHtml,
  tapHintHtml,
  tokenIconUrl,
  uiIconUrl,
} from './puzzleUiKit.ts';

export interface BoardHelpers {
  patchState: (pid: number, patch: Record<string, unknown>) => void;
  solve: (pid: number, statePatch: Record<string, unknown>, msg: string) => void;
  setErr: (msg: string) => void;
  setInfo: (msg: string) => void;
  rerender: () => void;
  registerCleanup: (fn: () => void) => void;
  difficulty: DifficultyConfig;
  myRole: RoleId;
  soloMode: boolean;
  isSolved: boolean;
}

export function renderAct1Act2Board(
  pid: number,
  stage: HTMLElement,
  _p: PuzzleDef,
  s: Record<string, unknown>,
  h: BoardHelpers
): boolean {
  switch (pid) {
    case 1:
      boardP01(stage, s, h);
      return true;
    case 2:
      boardP02(stage, s, h);
      return true;
    case 3:
      boardP03(stage, s, h);
      return true;
    case 4:
      boardP04(stage, s, h);
      return true;
    case 5:
      boardP05(stage, s, h);
      return true;
    case 6:
      boardP06(stage, s, h);
      return true;
    case 7:
      boardP07(stage, s, h);
      return true;
    case 8:
      boardP08(stage, s, h);
      return true;
    case 9:
      boardP09(stage, s, h);
      return true;
    case 10:
      boardP10(stage, s, h);
      return true;
    default:
      return false;
  }
}

/* -------------------------------------------------------------------------- *
 * P01 · 로비 나침반 정렬
 * -------------------------------------------------------------------------- */
function boardP01(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const outerDeg = Number(s.outerDeg ?? 90);
  const innerDeg = Number(s.innerDeg ?? 180);
  const locked = Boolean(s.locked);
  const outerOk = ((outerDeg % 360) + 360) % 360 === 0;
  const innerOk = ((innerDeg % 360) + 360) % 360 === 0;
  const aligned = outerOk && innerOk;
  const isUntouched = outerDeg === 90 && innerDeg === 180 && !locked;

  stage.innerHTML = `
    <div class="fg-board-2col">
      <div class="fg-panel fg-p01-stage">
        <div class="fg-p01-target-tag">▼ 여기에 맞춰요</div>
        <div class="fg-compass-box">
          <img class="fg-compass-pointer" src="/assets/puzzle-ui/boards/p01-pointer.svg" alt="" />
          <div class="fg-compass-layer fg-compass-base">
            <img src="/assets/puzzle-ui/boards/p01-base.svg" alt="" />
          </div>

          <div class="fg-compass-layer fg-compass-outer" style="transform:rotate(${outerDeg}deg)">
            <img src="/assets/puzzle-ui/boards/p01-ring.svg" alt="" />
            <div class="fg-ring-tok-chip" style="top:3%;left:50%;transform:translateX(-50%) rotate(${-outerDeg}deg)">
              <img src="${tokenIconUrl('DIR_N')}" alt="" /><span>북</span>
            </div>
            <div class="fg-ring-tok-chip" style="right:4%;top:50%;transform:translateY(-50%) rotate(${-outerDeg}deg)">
              <img src="${tokenIconUrl('DIR_E')}" alt="" /><span>동</span>
            </div>
            <div class="fg-ring-tok-chip" style="bottom:3%;left:50%;transform:translateX(-50%) rotate(${-outerDeg}deg)">
              <img src="${tokenIconUrl('DIR_S')}" alt="" /><span>남</span>
            </div>
            <div class="fg-ring-tok-chip" style="left:4%;top:50%;transform:translateY(-50%) rotate(${-outerDeg}deg)">
              <img src="${tokenIconUrl('DIR_W')}" alt="" /><span>서</span>
            </div>
          </div>

          <div class="fg-compass-layer fg-compass-inner" style="transform:rotate(${innerDeg}deg)">
            <img src="/assets/puzzle-ui/boards/p01-disk.svg" alt="" />
            <div class="fg-ring-tok-chip" style="top:6%;left:50%;transform:translateX(-50%) rotate(${-innerDeg}deg)">
              <img src="${tokenIconUrl('SYM_SUN')}" alt="" />
            </div>
            <div class="fg-ring-tok-chip" style="right:6%;top:50%;transform:translateY(-50%) rotate(${-innerDeg}deg)">
              <img src="${tokenIconUrl('SYM_STAR')}" alt="" />
            </div>
            <div class="fg-ring-tok-chip" style="bottom:6%;left:50%;transform:translateX(-50%) rotate(${-innerDeg}deg)">
              <img src="${tokenIconUrl('SYM_WAVE')}" alt="" />
            </div>
            <div class="fg-ring-tok-chip" style="left:6%;top:50%;transform:translateY(-50%) rotate(${-innerDeg}deg)">
              <img src="${tokenIconUrl('SYM_MTN')}" alt="" />
            </div>
          </div>

          <button type="button" class="fg-compass-pin" id="p1-center-pin" title="가운데 황동 핀 누르기">
            <img class="pin-bg" src="/assets/puzzle-ui/boards/p01-pin.svg" alt="" />
            <span class="fg-compass-pin-inner">
              <img src="${uiIconUrl(locked ? 'check' : 'lock')}" alt="" />
              <span>${locked ? 'OPEN' : '누르기'}</span>
            </span>
          </button>
        </div>
      </div>

      <div class="fg-stack">
        <div class="fg-panel fg-row-between">
          <div>
            <div class="fg-row" style="gap:8px">
              <img src="${tokenIconUrl('DIR_N')}" alt="" style="width:24px;height:24px;object-fit:contain" />
              <span class="fg-panel-title">바깥 링 · 방위</span>
            </div>
            <div class="fg-panel-sub">북·동·남·서 판을 돌려요</div>
            <div class="fg-row" style="margin-top:8px">
              ${lcdHtml(`${outerDeg}°`, '', '', 'p1-outer-lcd')}
              ${lampHtml(outerOk ? 'mint' : 'off', '맞으면 켜져요')}
            </div>
          </div>
          <div class="fg-row">
            ${roundBtnHtml({ id: 'p1-ol', icon: 'rot-ccw', tone: 'steel', subLabel: '왼쪽', tapHint: isUntouched })}
            ${roundBtnHtml({ id: 'p1-or', icon: 'rot-cw', tone: 'steel', subLabel: '오른쪽' })}
          </div>
        </div>

        <div class="fg-panel fg-row-between">
          <div>
            <div class="fg-row" style="gap:8px">
              <img src="${tokenIconUrl('SYM_SUN')}" alt="" style="width:24px;height:24px;object-fit:contain" />
              <span class="fg-panel-title">안쪽 링 · 문양</span>
            </div>
            <div class="fg-panel-sub">태양·별·파도·산 그림을 돌려요</div>
            <div class="fg-row" style="margin-top:8px">
              ${lcdHtml(`${innerDeg}°`, '', '', 'p1-inner-lcd')}
              ${lampHtml(innerOk ? 'mint' : 'off', '맞으면 켜져요')}
            </div>
          </div>
          <div class="fg-row">
            ${roundBtnHtml({ id: 'p1-il', icon: 'rot-ccw', tone: 'steel', subLabel: '왼쪽' })}
            ${roundBtnHtml({ id: 'p1-ir', icon: 'rot-cw', tone: 'steel', subLabel: '오른쪽' })}
          </div>
        </div>

        <div class="fg-panel fg-stack">
          <div>
            <div class="fg-panel-title">두 링이 ▼에 맞으면</div>
            <div class="fg-panel-sub">가운데 황동 핀을 눌러 잠금을 풀어요</div>
          </div>
          ${pushBtnHtml({ id: 'p1-lock', label: '핀 눌러 잠금 해제', tone: aligned ? 'mint' : 'amber' })}
        </div>

        <div class="fg-panel">
          <div class="fg-panel-title" style="font-size:16px;margin-bottom:6px">전시관 문 표시등</div>
          <div class="fg-row-between">
            <span class="fg-row" style="gap:4px"><img src="${tokenIconUrl('SYM_SUN')}" style="width:18px;height:18px" />${lampHtml(locked ? 'mint' : 'off', '생활사')}</span>
            <span class="fg-row" style="gap:4px"><img src="${tokenIconUrl('SYM_STAR')}" style="width:18px;height:18px" />${lampHtml(locked ? 'mint' : 'off', '역사')}</span>
            <span class="fg-row" style="gap:4px"><img src="${tokenIconUrl('SYM_WAVE')}" style="width:18px;height:18px" />${lampHtml(locked ? 'mint' : 'off', '도시')}</span>
            <span class="fg-row" style="gap:4px"><img src="${tokenIconUrl('SYM_MTN')}" style="width:18px;height:18px" />${lampHtml(locked ? 'mint' : 'off', '공예')}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  stage.querySelector<HTMLElement>('#p1-ol')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(1, { outerDeg: (outerDeg + 270) % 360 });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p1-or')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(1, { outerDeg: (outerDeg + 90) % 360 });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p1-il')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(1, { innerDeg: (innerDeg + 270) % 360 });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p1-ir')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(1, { innerDeg: (innerDeg + 90) % 360 });
    h.rerender();
  };

  const trySolve = () => {
    if (aligned) {
      h.solve(1, { outerDeg: 0, innerDeg: 0, locked: true }, '4대 전시관 문이 열렸어요!');
    } else {
      h.setErr(
        h.difficulty.showTargetHints
          ? `방위(${outerDeg}°) 또는 문양(${innerDeg}°)이 이안의 기준(0°)과 어긋납니다.`
          : '표시된 무전 신호와 달라요. 이안의 방명록 단서를 확인해 맞춰 보세요!'
      );
    }
  };

  stage.querySelector<HTMLElement>('#p1-lock')!.onclick = trySolve;
  stage.querySelector<HTMLElement>('#p1-center-pin')!.onclick = trySolve;
}

/* -------------------------------------------------------------------------- *
 * P02 · 바하이 쿠보 유물 배치
 * -------------------------------------------------------------------------- */
function boardP02(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const rawSlots = (s.slots as Partial<Record<'roof' | 'floor' | 'stilt', string | null>>) || {};
  const slots: Record<'roof' | 'floor' | 'stilt', string | null> = {
    roof: rawSlots.roof ?? null,
    floor: rawSlots.floor ?? null,
    stilt: rawSlots.stilt ?? null,
  };
  const picked = (s.picked as string | null) || null;
  const hint = h.difficulty.showTargetHints;

  const cards = [
    { id: 'grain_jar', label: '곡식 단지', img: '/assets/puzzle-ui/boards/p02-grain.svg', tok: 'SYM_SUN' },
    { id: 'basket', label: '대나무 바구니', img: '/assets/puzzle-ui/boards/p02-basket.svg', tok: 'SYM_WAVE' },
    { id: 'mortar', label: '돌절구', img: '/assets/puzzle-ui/boards/p02-mortar.svg', tok: 'SYM_MTN' },
    { id: 'lamp', label: '등유 램프', img: '/assets/puzzle-ui/boards/p02-lamp.svg', tok: 'SYM_VOLT' },
  ];
  const tiers: { id: 'roof' | 'floor' | 'stilt'; num: string; name: string; sub: string; cls: string }[] = [
    { id: 'roof', num: '1', name: '지붕 다락', sub: 'Bubong', cls: 'fg-p02-slot-roof' },
    { id: 'floor', num: '2', name: '대나무 마루', sub: 'Sala', cls: 'fg-p02-slot-floor' },
    { id: 'stilt', num: '3', name: '기둥 아래', sub: 'Silong', cls: 'fg-p02-slot-stilt' },
  ];
  const placed = Object.values(slots);

  stage.innerHTML = `
    <div class="fg-board-2col">
      <div class="fg-panel fg-stack">
        <div class="fg-panel-sub" style="margin:0">가운데 그림에 유물을 클릭하거나 끌어다 놓아요 (슬롯을 누르면 회수)</div>
        <div class="fg-p02-house-wrap">
          <img class="fg-p02-house-svg" src="/assets/puzzle-ui/boards/p02-house.svg" alt="바하이 쿠보 단면" />
          ${tiers
            .map((t) => {
              const cid = slots[t.id];
              const card = cards.find((c) => c.id === cid);
              return `<button type="button" class="fg-p02-slot ${t.cls} ${card ? 'filled' : ''}" data-tier="${t.id}">
                <span style="width:24px;height:24px;border-radius:50%;background:var(--fg-text);color:var(--fg-outline);display:grid;place-items:center;font-family:var(--fg-font-display);font-size:14px;flex:none">${t.num}</span>
                ${
                  card
                    ? `<img src="${card.img}" alt="" /><strong style="font-family:var(--fg-font-display);color:var(--fg-mint);font-size:16px">${card.label}</strong>`
                    : `<div style="text-align:left"><div style="font-family:var(--fg-font-display);font-size:15px;color:var(--fg-text)">${t.name}</div><div style="font-size:11px;color:var(--fg-mint);font-weight:800">${t.sub}</div></div>`
                }
              </button>`;
            })
            .join('')}
        </div>
      </div>

      <div class="fg-stack" style="justify-content:space-between">
        <div>
          <div class="fg-row-between" style="margin-bottom:8px">
            <span class="fg-panel-title">유물 트레이</span>
            <span class="fg-panel-sub">4개 중 3개만 집에 들어가요</span>
          </div>
          <div class="fg-tray-grid">
            ${cards
              .map((c) => {
                const used = placed.includes(c.id);
                const isPicked = picked === c.id;
                return `<button type="button" class="fg-tray-card ${isPicked ? 'picked' : ''}" draggable="true" data-card="${c.id}" ${used ? 'disabled' : ''}>
                  ${isPicked ? '<span class="fg-tray-picked-pill">들고 있음</span>' : ''}
                  <img class="fg-tray-sym" src="${tokenIconUrl(c.tok)}" alt="" />
                  <img class="tray-art" src="${c.img}" alt="" />
                  <span style="font-family:var(--fg-font-display);font-size:17px">${c.label}</span>
                </button>`;
              })
              .join('')}
          </div>
        </div>

        <div class="fg-panel fg-row-between">
          <span class="fg-panel-title" style="font-size:16px">슬롯</span>
          <div class="fg-row">
            ${lampHtml(slots.roof ? 'mint' : 'off', '1자리')}
            ${lampHtml(slots.floor ? 'mint' : 'off', '2자리')}
            ${lampHtml(slots.stilt ? 'mint' : 'off', '3자리')}
          </div>
        </div>

        ${pushBtnHtml({ id: 'p2-check', label: '검수하기', tone: 'mint' })}
      </div>
    </div>
  `;

  stage.querySelectorAll<HTMLElement>('[data-card]').forEach((btn) => {
    btn.onclick = () => {
      soundEngine.playClick();
      h.patchState(2, { picked: picked === btn.dataset.card ? null : btn.dataset.card });
      h.rerender();
    };
    btn.ondragstart = (e) => {
      h.patchState(2, { picked: btn.dataset.card });
      e.dataTransfer?.setData('text/plain', btn.dataset.card || '');
    };
  });

  stage.querySelectorAll<HTMLElement>('[data-tier]').forEach((box) => {
    const place = (cid: string | null) => {
      const tierKey = box.dataset.tier as keyof typeof slots;
      const nextSlots = { ...slots };
      if (!cid) {
        if (!nextSlots[tierKey]) {
          h.setErr('먼저 오른쪽 유물 트레이에서 유물을 선택하거나 끌어오세요!');
          return;
        }
        nextSlots[tierKey] = null;
      } else {
        for (const k of Object.keys(nextSlots) as (keyof typeof slots)[]) {
          if (nextSlots[k] === cid) nextSlots[k] = null;
        }
        nextSlots[tierKey] = cid;
      }
      soundEngine.playClick();
      h.patchState(2, { slots: nextSlots, picked: null });
      h.rerender();
    };
    box.onclick = () => place(picked);
    box.ondragover = (e) => e.preventDefault();
    box.ondrop = (e) => {
      e.preventDefault();
      place(e.dataTransfer?.getData('text/plain') || picked);
    };
  });

  stage.querySelector<HTMLElement>('#p2-check')!.onclick = () => {
    if (slots.roof === 'grain_jar' && slots.floor === 'basket' && slots.stilt === 'mortar') {
      h.solve(2, { slots }, '바하이 쿠보 3층위 유물 배치가 완료되었어요!');
    } else {
      const cleaned = {
        roof: slots.roof === 'grain_jar' ? 'grain_jar' : null,
        floor: slots.floor === 'basket' ? 'basket' : null,
        stilt: slots.stilt === 'mortar' ? 'mortar' : null,
      };
      h.patchState(2, { slots: cleaned });
      h.setErr(
        hint
          ? '어긋난 층의 유물만 트레이로 돌아갔어요. Bubong-Sala-Silong 순서를 확인하세요!'
          : '맞지 않는 층위의 유물만 트레이로 돌려보냈어요. 이안의 단서를 확인하세요!'
      );
    }
  };
}

/* -------------------------------------------------------------------------- *
 * P03 · 마눙굴 항아리 복원 (12프레임 턴테이블 + 7단계 뚜껑 기울기)
 * -------------------------------------------------------------------------- */
function boardP03(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const turntableDeg = ((Number(s.turntableDeg ?? 60) % 360) + 360) % 360;
  const lidTiltDeg = Math.max(-15, Math.min(15, Number(s.lidTiltDeg ?? -15)));
  const seated = Boolean(s.seated);
  const rotOk = turntableDeg === 180;
  const tiltOk = lidTiltDeg === 0;
  const aligned = rotOk && tiltOk;
  const hint = h.difficulty.showTargetHints;

  const snapDeg = Math.round(turntableDeg / 30) * 30 % 360;
  const rad = ((turntableDeg + 90) * Math.PI) / 180;
  const dotX = Math.round(32 + Math.cos(rad) * 18);
  const dotY = Math.round(32 - Math.sin(rad) * 18);
  const bubbleLeft = Math.round(50 + (lidTiltDeg / 15) * 38);

  stage.innerHTML = `
    <div class="fg-board-2col">
      <div class="fg-p03-vitrine">
        <img class="fg-p03-glass" src="/assets/puzzle-ui/boards/p03-glass.svg" alt="" />
        <div class="fg-p03-jar-stack">
          <img class="fg-p03-lid" src="/assets/puzzle-ui/boards/p03-lid.svg" alt="영혼의 배 뚜껑"
            style="transform:translateY(${seated ? 10 : 0}px) rotate(${lidTiltDeg}deg)" />
          <img class="fg-p03-body" src="/assets/puzzle-ui/boards/p03-body-${snapDeg}.svg" alt="마눙굴 항아리 ${snapDeg}°" />
          <img class="fg-p03-marker" src="/assets/puzzle-ui/boards/p03-marker.svg" alt="정면" />
        </div>
      </div>

      <div class="fg-stack">
        <div class="fg-panel fg-stack">
          <div class="fg-row-between">
            <div>
              <div class="fg-panel-title">회전판 돌리기</div>
              <div class="fg-panel-sub">한 번 누를 때마다 30°씩 돌아가요${hint ? ' (목표 180°)' : ''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;background:var(--fg-bg-base);padding:6px 10px;border-radius:12px;border:3px solid var(--fg-outline)">
              <svg viewBox="0 0 64 64" width="46" height="46">
                <circle cx="32" cy="32" r="24" fill="#8B5438" stroke="#0B0E13" stroke-width="3"/>
                <circle cx="32" cy="32" r="14" fill="#6F412A" stroke="#0B0E13" stroke-width="2"/>
                <circle cx="${dotX}" cy="${dotY}" r="5" fill="${rotOk ? '#52EFBF' : '#FFD86B'}" stroke="#0B0E13" stroke-width="2"/>
                <polygon points="32,58 27,63 37,63" fill="#FFD86B"/>
              </svg>
              <div style="font-size:11px;color:var(--fg-sub);line-height:1.3">
                <strong style="color:var(--fg-text)">위에서 본 모습</strong><br/>금색 점 = 파도 각인
              </div>
            </div>
          </div>
          <div class="fg-row-between">
            <div class="fg-row">
              ${roundBtnHtml({ id: 'p3-rot-l', icon: 'rot-ccw', tone: 'amber', subLabel: '왼쪽 -30°' })}
              ${roundBtnHtml({ id: 'p3-rot-p', icon: 'rot-cw', tone: 'amber', subLabel: '오른쪽 +30°', tapHint: turntableDeg === 60 && !seated })}
            </div>
            <div class="fg-row">
              ${lcdHtml(`${snapDeg}°`, '', '', 'p3-rot-lcd')}
              ${lampHtml(rotOk ? 'mint' : 'off', '정면 정렬')}
            </div>
          </div>
        </div>

        <div class="fg-panel fg-stack">
          <div class="fg-row-between">
            <div>
              <div class="fg-panel-title">뚜껑 수평 맞추기</div>
              <div class="fg-panel-sub">영혼의 배가 기울지 않게 해요${hint ? ' (목표 0°)' : ''}</div>
            </div>
            <div class="fg-row">
              ${lcdHtml(`${lidTiltDeg > 0 ? '+' : ''}${lidTiltDeg}°`, '', '', 'p3-tilt-lcd')}
              ${lampHtml(tiltOk ? 'mint' : 'off', '수평')}
            </div>
          </div>
          <div class="fg-row-between">
            <div class="fg-p03-bubble-track">
              <div class="fg-p03-bubble-target"></div>
              <div class="fg-p03-bubble-dot" style="left:${bubbleLeft}%;background:${tiltOk ? '#52EFBF' : '#FFFFFF'}"></div>
            </div>
            <div class="fg-row" style="flex:1;min-width:170px">
              <button type="button" class="s-btn" id="p3-tl">-5°</button>
              <input type="range" min="-15" max="15" step="5" value="${lidTiltDeg}" id="p3-tr" class="p-range" />
              <button type="button" class="s-btn" id="p3-tp">+5°</button>
            </div>
          </div>
        </div>

        <div class="fg-row">
          <div style="flex:1">${pushBtnHtml({ id: 'p3-seat', label: '결합하기', tone: aligned ? 'mint' : 'amber' })}</div>
          ${lampHtml(seated ? 'mint' : aligned ? 'amber' : 'off')}
        </div>
        <div class="fg-panel-sub" style="text-align:center">두 가지가 맞으면 뚜껑이 쏙 내려앉아요</div>
      </div>
    </div>
  `;

  stage.querySelector<HTMLElement>('#p3-rot-l')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(3, { turntableDeg: (snapDeg + 330) % 360 });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p3-rot-p')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(3, { turntableDeg: (snapDeg + 30) % 360 });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p3-tl')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(3, { lidTiltDeg: Math.max(-15, lidTiltDeg - 5) });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p3-tp')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(3, { lidTiltDeg: Math.min(15, lidTiltDeg + 5) });
    h.rerender();
  };
  stage.querySelector<HTMLInputElement>('#p3-tr')!.onchange = (e) => {
    soundEngine.playClick();
    h.patchState(3, { lidTiltDeg: Number((e.target as HTMLInputElement).value) });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p3-seat')!.onclick = () => {
    if (aligned) {
      h.solve(3, { turntableDeg: 180, lidTiltDeg: 0, seated: true }, '마눙굴 항아리 각인 정렬과 영혼의 배 뚜껑 결합 완료!');
    } else {
      h.setErr(
        hint
          ? `회전(${snapDeg}° → 180°) 또는 뚜껑 기울기(${lidTiltDeg}° → 0°)가 어긋납니다.`
          : '각인 위치나 뚜껑 수평이 맞지 않아요. 서하린의 무전 단서를 확인해 보세요!'
      );
    }
  };
}

/* -------------------------------------------------------------------------- *
 * P04 · 군도 지도 × 독립 연표
 * -------------------------------------------------------------------------- */
function boardP04(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const links = { '1521': null, '1898': null, '1946': null, ...((s.links as Record<string, string | null>) || {}) };
  const selectedLeft = (s.selectedLeft as string | null) || null;
  const checkedWrong = Array.isArray(s.checkedWrong) ? (s.checkedWrong as string[]) : [];
  const hint = h.difficulty.showTargetHints;

  const leftNodes = [
    { id: '1521', label: '마젤란 함대 도착', numTok: 'NUM_1', icon: '/assets/puzzle-ui/boards/p04-ev-1521.svg', y: 74, color: '#7CD8FF' },
    { id: '1898', label: '말롤로스 헌법', numTok: 'NUM_2', icon: '/assets/puzzle-ui/boards/p04-ev-1898.svg', y: 184, color: '#FFB86B' },
    { id: '1946', label: '공화국 독립', numTok: 'NUM_3', icon: '/assets/puzzle-ui/boards/p04-ev-1946.svg', y: 294, color: '#C792EA' },
  ];
  const mapPins = [
    { id: 'manila_north', label: '마닐라 북부', x: 262, y: 112 },
    { id: 'malolos', label: '말롤로스', x: 204, y: 156 },
    { id: 'visayas', label: '비사야 해협', x: 306, y: 244 },
    { id: 'samar', label: '사마르', x: 392, y: 218 },
    { id: 'mindanao', label: '민다나오', x: 360, y: 314 },
  ];

  const wires = leftNodes
    .map((ln) => {
      const rid = links[ln.id as keyof typeof links];
      const pin = mapPins.find((p) => p.id === rid);
      if (!pin) return '';
      const isBad = checkedWrong.includes(ln.id);
      const midX = Math.round((10 + pin.x) / 2);
      const midY = Math.round((ln.y + pin.y) / 2);
      return `<path d="M 10 ${ln.y} C ${140} ${ln.y}, ${pin.x - 110} ${pin.y}, ${pin.x} ${pin.y}"
          fill="none" stroke="#0B0E13" stroke-width="9" stroke-linecap="round"/>
        <path d="M 10 ${ln.y} C ${140} ${ln.y}, ${pin.x - 110} ${pin.y}, ${pin.x} ${pin.y}"
          fill="none" stroke="${isBad ? '#FF6E6E' : ln.color}" stroke-width="5" ${isBad ? 'stroke-dasharray="9 6"' : ''} stroke-linecap="round"/>
        ${
          checkedWrong.length > 0
            ? `<circle cx="${midX}" cy="${midY}" r="13" fill="${isBad ? '#FF6E6E' : '#52EFBF'}" stroke="#0B0E13" stroke-width="3"/>
               <text x="${midX}" y="${midY + 4}" text-anchor="middle" fill="#0B0E13" font-size="13" font-weight="900">${isBad ? '✕' : '✔'}</text>`
            : ''
        }`;
    })
    .join('');

  stage.innerHTML = `
    <div class="fg-board-2col" style="grid-template-columns:minmax(220px,0.72fr) minmax(0,1.28fr)">
      <div class="fg-stack" style="justify-content:space-between">
        ${leftNodes
          .map((n) => {
            const isSel = selectedLeft === n.id;
            const isBad = checkedWrong.includes(n.id);
            return `<button type="button" class="fg-p04-ev-card ${isSel ? 'selected' : ''} ${isBad ? 'wrong' : ''}" data-ln="${n.id}" draggable="true">
              <img src="${n.icon}" alt="" />
              <div style="flex:1">
                <div style="font-family:var(--fg-font-display);font-size:28px;line-height:1">${n.id}</div>
                <div style="font-size:13px;font-weight:800;color:${n.color}">${n.label}</div>
              </div>
              <span style="width:16px;height:16px;border-radius:4px;background:${n.color};border:2.5px solid #0B0E13;flex:none"></span>
            </button>`;
          })
          .join('')}
      </div>

      <div class="fg-stack">
        <div class="fg-p04-map-card">
          <svg viewBox="0 0 500 360" style="width:100%;height:auto;display:block">
            <image href="/assets/puzzle-ui/boards/p04-islands.svg" x="0" y="0" width="500" height="360" preserveAspectRatio="xMidYMid meet" />
            <text x="16" y="24" fill="#2A3E4A" font-size="12" font-weight="800" font-family="JetBrains Mono, monospace">PILIPINAS · 1734</text>
            ${wires}
            ${mapPins
              .map((pin) => {
                const linkedNode = leftNodes.find((n) => links[n.id as keyof typeof links] === pin.id);
                const isBad = linkedNode && checkedWrong.includes(linkedNode.id);
                const col = isBad ? '#FF6E6E' : linkedNode ? linkedNode.color : '#2E3846';
                return `<g data-rn="${pin.id}" style="cursor:pointer">
                  <circle cx="${pin.x}" cy="${pin.y}" r="14" fill="#1A2029" stroke="#0B0E13" stroke-width="3.5"/>
                  <circle cx="${pin.x}" cy="${pin.y}" r="7" fill="${col}"/>
                  <rect x="${pin.x + 18}" y="${pin.y - 12}" width="78" height="24" rx="7" fill="#F4F7FA" stroke="#0B0E13" stroke-width="2.5"/>
                  <text x="${pin.x + 57}" y="${pin.y + 4}" text-anchor="middle" fill="#0B0E13" font-size="11" font-weight="800">${pin.label}</text>
                </g>`;
              })
              .join('')}
          </svg>
        </div>
        <div class="fg-row-between">
          <div class="fg-panel fg-row" style="padding:8px 14px">
            ${leftNodes
              .map((n) => {
                const st = checkedWrong.includes(n.id) ? 'red' : links[n.id as keyof typeof links] ? 'mint' : 'off';
                return lampHtml(st, n.id);
              })
              .join('')}
          </div>
          <div style="min-width:210px">${pushBtnHtml({ id: 'p4-verify', label: '연결 확인', tone: 'mint' })}</div>
        </div>
      </div>
    </div>
  `;

  stage.querySelectorAll<HTMLElement>('[data-ln]').forEach((b) => {
    b.onclick = () => {
      soundEngine.playClick();
      h.patchState(4, { selectedLeft: b.dataset.ln });
      h.rerender();
    };
    b.ondragstart = (e) => {
      h.patchState(4, { selectedLeft: b.dataset.ln });
      e.dataTransfer?.setData('text/plain', b.dataset.ln || '');
    };
  });
  stage.querySelectorAll<HTMLElement>('[data-rn]').forEach((b) => {
    const connect = (ln: string | null) => {
      if (!ln) {
        h.setErr('먼저 왼쪽 연표 카드(1521·1898·1946)를 선택하세요!');
        return;
      }
      soundEngine.playClick();
      const nextWrong = checkedWrong.filter((id) => id !== ln);
      h.patchState(4, { links: { ...links, [ln]: b.dataset.rn }, selectedLeft: null, checkedWrong: nextWrong });
      h.rerender();
    };
    b.onclick = () => connect(selectedLeft);
    b.ondragover = (e) => e.preventDefault();
    b.ondrop = (e) => {
      e.preventDefault();
      connect(e.dataTransfer?.getData('text/plain') || selectedLeft);
    };
  });
  stage.querySelector<HTMLElement>('#p4-verify')!.onclick = () => {
    const expected: Record<string, string> = {
      '1521': 'visayas',
      '1898': 'malolos',
      '1946': 'manila_north',
    };
    const wrong = Object.keys(expected).filter((k) => links[k as keyof typeof links] !== expected[k]);
    if (wrong.length === 0) {
      h.solve(4, { links, checkedWrong: [] }, '군도 해협과 3대 독립 연표가 완벽히 연결되었어요!');
    } else {
      h.patchState(4, { checkedWrong: wrong });
      h.setErr(
        hint
          ? '빨간 ✕ 노선을 확인하세요. (1521=비사야, 1898=말롤로스, 1946=마닐라 북부)'
          : '표시된 무전 신호와 다른 거점이에요. 린의 측량 좌표를 다시 확인하세요!'
      );
    }
  };
}

/* -------------------------------------------------------------------------- *
 * P05 · 이푸가오 베틀 직조
 * -------------------------------------------------------------------------- */
function boardP05(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const rows = ((s.rows as (string | null)[]) || [null, null, null]).slice(0, 3);
  const heddleOpen = ((s.heddleOpen as boolean[]) || [false, false, false]).slice(0, 3);
  const pickedShuttle = (s.pickedShuttle as string | null) || null;
  const hint = h.difficulty.showTargetHints;

  const shuttles = [
    { id: 'gold', label: '황금 실', tok: 'SYM_SUN', img: '/assets/puzzle-ui/boards/p05-shuttle-gold.svg', hex: '#E6C886' },
    { id: 'crimson', label: '진홍 실', tok: 'SYM_VOLT', img: '/assets/puzzle-ui/boards/p05-shuttle-crimson.svg', hex: '#FF6E6E' },
    { id: 'cyan', label: '청록 실', tok: 'SYM_WAVE', img: '/assets/puzzle-ui/boards/p05-shuttle-cyan.svg', hex: '#7CD8FF' },
  ];

  stage.innerHTML = `
    <div class="fg-board-2col">
      <div class="fg-p05-loom-box">
        <div class="fg-p05-canvas">
          <img class="fg-p05-loom-img" src="/assets/puzzle-ui/boards/p05-loom.svg" alt="베틀" />
          <div class="fg-p05-rows">
            ${[0, 1, 2]
              .map((i) => {
                const sh = shuttles.find((x) => x.id === rows[i]);
                const isOpen = heddleOpen[i];
                return `<div class="fg-p05-row ${isOpen ? 'open' : ''}" data-rowdrop="${i}"
                  style="${sh ? `background:${sh.hex};border-style:solid;border-color:#0B0E13;color:#0B0E13` : ''}">
                  <div class="fg-row" style="gap:8px">
                    <span style="width:24px;height:24px;border-radius:50%;background:${sh ? '#0B0E13' : '#F4F7FA'};color:${sh ? '#F4F7FA' : '#0B0E13'};display:grid;place-items:center;font-family:var(--fg-font-display);font-size:14px">${i + 1}</span>
                    <strong style="font-family:var(--fg-font-display);font-size:16px">
                      ${sh ? `${sh.label} 직조됨` : isOpen ? `${i + 1}줄 열림 · 북을 넣어요!` : `${i + 1}줄 · 닫힘`}
                    </strong>
                  </div>
                  <button type="button" class="s-btn" data-rew="${i}" title="되감기" style="padding:3px 9px;font-size:12px">↺ 되감기</button>
                </div>`;
              })
              .join('')}
          </div>
        </div>
        <div class="fg-p05-pedals">
          ${[0, 1, 2]
            .map(
              (i) => `<button type="button" class="fg-p05-pedal-btn ${heddleOpen[i] ? 'active' : ''}" data-ped="${i}">
                ${i + 1}번 발판 ${heddleOpen[i] ? '●' : ''}
              </button>`
            )
            .join('')}
        </div>
      </div>

      <div class="fg-stack" style="justify-content:space-between">
        <div>
          <div class="fg-row-between" style="margin-bottom:8px">
            <span class="fg-panel-title">북 3개 (실 꾸러미)</span>
            <span class="fg-panel-sub">발판으로 줄을 연 뒤 북을 눌러 통과시켜요</span>
          </div>
          <div class="fg-stack">
            ${shuttles
              .map(
                (sh) => `<button type="button" class="fg-shuttle-card" draggable="true" data-sh="${sh.id}"
                  style="${pickedShuttle === sh.id ? 'border-color:var(--fg-mint);background:rgba(82,239,191,0.14)' : ''}">
                  <img class="shuttle-art" src="${sh.img}" alt="" />
                  <div class="fg-row" style="gap:8px">
                    <img src="${tokenIconUrl(sh.tok)}" alt="" style="width:24px;height:24px;object-fit:contain" />
                    <span style="font-family:var(--fg-font-display);font-size:20px;color:${sh.hex}">${sh.label}</span>
                  </div>
                </button>`
              )
              .join('')}
          </div>
        </div>

        <div class="fg-panel fg-row-between">
          <span class="fg-panel-title" style="font-size:16px">줄 상태</span>
          <div class="fg-row">
            ${lampHtml(rows[0] ? 'mint' : heddleOpen[0] ? 'amber' : 'off', '1줄')}
            ${lampHtml(rows[1] ? 'mint' : heddleOpen[1] ? 'amber' : 'off', '2줄')}
            ${lampHtml(rows[2] ? 'mint' : heddleOpen[2] ? 'amber' : 'off', '3줄')}
          </div>
        </div>

        ${pushBtnHtml({ id: 'p5-done', label: '직물 완성 검수', tone: 'mint' })}
      </div>
    </div>
  `;

  stage.querySelectorAll<HTMLElement>('[data-ped]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.ped);
      soundEngine.playClick();
      h.patchState(5, { heddleOpen: heddleOpen.map((v, i) => (i === idx ? !v : false)) });
      h.rerender();
    };
  });

  stage.querySelectorAll<HTMLElement>('[data-rew]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const idx = Number(b.dataset.rew);
      const next = [...rows];
      next[idx] = null;
      soundEngine.playClick();
      h.patchState(5, { rows: next });
      h.rerender();
    };
  });

  const applyShuttleToRow = (rowIdx: number, shId: string) => {
    const next = [...rows];
    next[rowIdx] = shId;
    soundEngine.playClick();
    h.patchState(5, { rows: next, pickedShuttle: null });
    h.rerender();
  };

  stage.querySelectorAll<HTMLElement>('[data-sh]').forEach((b) => {
    b.onclick = () => {
      const shId = b.dataset.sh!;
      const openIdx = heddleOpen.findIndex(Boolean);
      if (openIdx === -1) {
        soundEngine.playClick();
        h.patchState(5, { pickedShuttle: shId });
        h.setErr('먼저 왼쪽 1~3번 발판을 밟아 줄을 열어 주세요!');
        return;
      }
      applyShuttleToRow(openIdx, shId);
    };
    b.ondragstart = (e) => {
      e.dataTransfer?.setData('text/plain', b.dataset.sh || '');
    };
  });

  stage.querySelectorAll<HTMLElement>('[data-rowdrop]').forEach((row) => {
    const idx = Number(row.dataset.rowdrop);
    row.onclick = () => {
      if (pickedShuttle && heddleOpen[idx]) {
        applyShuttleToRow(idx, pickedShuttle);
      } else {
        soundEngine.playClick();
        h.patchState(5, { heddleOpen: heddleOpen.map((v, i) => (i === idx ? !v : false)) });
        h.rerender();
      }
    };
    row.ondragover = (e) => e.preventDefault();
    row.ondrop = (e) => {
      e.preventDefault();
      const shId = e.dataTransfer?.getData('text/plain') || pickedShuttle;
      if (!shId) return;
      if (!heddleOpen[idx]) {
        h.setErr(`먼저 ${idx + 1}번 발판으로 ${idx + 1}줄을 열어 주세요!`);
        return;
      }
      applyShuttleToRow(idx, shId);
    };
  });

  stage.querySelector<HTMLElement>('#p5-done')!.onclick = () => {
    if (rows[0] === 'gold' && rows[1] === 'crimson' && rows[2] === 'cyan') {
      h.solve(5, { rows }, '이푸가오 3색 전통 직물 직조가 완료되었어요!');
    } else {
      h.setErr(
        hint
          ? '1줄(황금) → 2줄(진홍) → 3줄(청록) 순서로 직조한 뒤 다시 확인하세요!'
          : '카이의 루페 무전 순서와 달라요. 어긋난 줄만 ↺ 되감기 후 다시 엮어 보세요!'
      );
    }
  };
}

/* -------------------------------------------------------------------------- *
 * P06 · 마닐라 전차 & 도개교
 * -------------------------------------------------------------------------- */
function boardP06(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const switches = ((s.switches as string[]) || ['A', 'A', 'B']).slice(0, 3);
  const dir = String(s.dir || 'N');
  const dispatched = Boolean(s.dispatched);
  const routeOk = switches[0] === 'B' && switches[1] === 'B' && switches[2] === 'A';
  const dirOk = dir === 'E';
  const hint = h.difficulty.showTargetHints;

  const dirs = ['N', 'E', 'S', 'W'] as const;
  const dirLabels: Record<string, { kor: string; view: string; rot: number }> = {
    N: { kor: '북', view: '북쪽 산타크루즈 성당', rot: 0 },
    E: { kor: '동', view: '동쪽 파시그강 도개교 →', rot: 90 },
    S: { kor: '남', view: '남쪽 에스콜타 거리', rot: 180 },
    W: { kor: '서', view: '서쪽 인트라무로스 성벽', rot: 270 },
  };

  let routeStatus = '산타크루즈 차고(막다른 길)';
  let previewPath = 'M 120 290 H 230 C 270 290 290 270 290 230 V 70';
  let tramX = 24;
  const tramY = 230;
  if (switches[0] === 'B') {
    if (switches[1] === 'A') {
      routeStatus = '에스콜타 종점(막다른 길)';
      previewPath = 'M 120 290 H 440 C 480 290 500 310 500 350 V 500';
    } else if (switches[2] === 'B') {
      routeStatus = '퀴아포 종점(우회 막다른 길)';
      previewPath = 'M 120 290 H 650 C 690 290 710 270 710 230 V 70';
    } else {
      routeStatus = '파시그강 도개교 개통 ✔';
      previewPath = 'M 120 290 H 880';
      if (dispatched && dirOk) {
        tramX = 752;
      }
    }
  }

  const junctions = [
    { idx: 0, cx: 230, cy: 290, name: 'S1' },
    { idx: 1, cx: 440, cy: 290, name: 'S2' },
    { idx: 2, cx: 650, cy: 290, name: 'S3' },
  ];
  const strokeCol = routeOk ? '#52EFBF' : '#FFB86B';

  stage.innerHTML = `
    <div class="fg-board-2col" style="grid-template-columns:minmax(0,1.25fr) minmax(270px,0.75fr)">
      <div class="fg-stack">
        <div class="fg-p06-diorama">
          <svg viewBox="0 0 890 550" style="width:100%;height:100%;display:block">
            <image href="/assets/puzzle-ui/boards/p06-tracks.svg" x="0" y="0" width="890" height="550" />
            <path d="${previewPath}" fill="none" stroke="${strokeCol}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.35"/>
            <path d="${previewPath}" fill="none" stroke="${strokeCol}" stroke-width="8" stroke-dasharray="12 8" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>

            <!-- 지명 라벨 (Figma 디오라마) -->
            <rect x="26" y="340" width="96" height="26" rx="8" fill="#0B0E13" fill-opacity="0.82"/>
            <text x="74" y="357" text-anchor="middle" fill="#F4F7FA" font-size="13" font-weight="800">인트라무로스</text>

            <rect x="498" y="218" width="94" height="26" rx="8" fill="#8E2F23" stroke="#0B0E13" stroke-width="2.5"/>
            <text x="545" y="235" text-anchor="middle" fill="#FFF4E6" font-size="12" font-weight="800">비논도 우회</text>

            <rect x="322" y="50" width="136" height="28" rx="10" fill="#F4F7FA" stroke="#0B0E13" stroke-width="2.5"/>
            <text x="390" y="68" text-anchor="middle" fill="#0B0E13" font-size="12" font-weight="800">① 산타크루즈 차고</text>

            <rect x="642" y="22" width="118" height="28" rx="10" fill="#F4F7FA" stroke="#0B0E13" stroke-width="2.5"/>
            <text x="701" y="40" text-anchor="middle" fill="#0B0E13" font-size="12" font-weight="800">④ 퀴아포 종점</text>

            <rect x="434" y="514" width="132" height="28" rx="10" fill="#F4F7FA" stroke="#0B0E13" stroke-width="2.5"/>
            <text x="500" y="532" text-anchor="middle" fill="#0B0E13" font-size="12" font-weight="800">③ 에스콜타 종점</text>

            <rect x="704" y="220" width="154" height="30" rx="10" fill="${routeOk ? '#52EFBF' : '#F4F7FA'}" stroke="#0B0E13" stroke-width="2.5"/>
            <text x="781" y="239" text-anchor="middle" fill="#0B0E13" font-size="12" font-weight="800">② 파시그강 도개교 →</text>

            <!-- 클릭 가능한 분기기 원형 표시 S1~S3 -->
            ${junctions
              .map((j) => {
                const val = switches[j.idx];
                const isMint = (j.idx < 2 && val === 'B') || (j.idx === 2 && val === 'A');
                return `<g data-sw="${j.idx}" style="cursor:pointer">
                  <circle cx="${j.cx}" cy="${j.cy}" r="24" fill="${isMint ? '#52EFBF' : '#F4F7FA'}" stroke="#0B0E13" stroke-width="4.5"/>
                  <text x="${j.cx}" y="${j.cy + 7}" text-anchor="middle" fill="#0B0E13" font-family="var(--fg-font-display)" font-size="22" font-weight="900">${val}</text>
                  <rect x="${j.cx - 18}" y="${j.cy + 29}" width="36" height="20" rx="7" fill="#0B0E13"/>
                  <text x="${j.cx}" y="${j.cy + 43}" text-anchor="middle" fill="#F4F7FA" font-size="11" font-weight="800">${j.name}</text>
                </g>`;
              })
              .join('')}

            <image href="/assets/puzzle-ui/boards/p06-tram.svg" x="${tramX}" y="${tramY}" width="112" height="66" />
          </svg>
          <div style="position:absolute;top:10px;left:12px;background:rgba(11,14,19,0.85);border:2.5px solid #0B0E13;border-radius:10px;padding:4px 12px;font-family:var(--fg-font-display);font-size:14px;color:${routeOk ? 'var(--fg-mint)' : 'var(--fg-amber)'}">
            지금 길: ${routeStatus}
          </div>
        </div>

        <div class="fg-p06-lever-grid">
          ${[0, 1, 2]
            .map((i) => {
              const val = switches[i];
              return `<button type="button" class="fg-p06-lever-card" data-sw="${i}">
                <div class="fg-row-between" style="width:100%">
                  <span style="padding:2px 9px;border-radius:8px;border:2px solid #0B0E13;background:${val === 'A' ? 'var(--fg-mint)' : 'var(--fg-bg-raised)'};color:${val === 'A' ? '#0B0E13' : 'var(--fg-sub)'};font-family:var(--fg-font-display)">A</span>
                  <span style="font-family:var(--fg-font-display);font-size:18px">분기 S${i + 1}</span>
                  <span style="padding:2px 9px;border-radius:8px;border:2px solid #0B0E13;background:${val === 'B' ? 'var(--fg-mint)' : 'var(--fg-bg-raised)'};color:${val === 'B' ? '#0B0E13' : 'var(--fg-sub)'};font-family:var(--fg-font-display)">B</span>
                </div>
                <img src="/assets/puzzle-ui/boards/p06-lever-${val === 'B' ? 'b' : 'a'}.svg" alt="레버 ${val}" />
              </button>`;
            })
            .join('')}
        </div>
      </div>

      <div class="fg-stack" style="justify-content:space-between">
        <div class="fg-panel fg-stack">
          <div>
            <div class="fg-panel-title">전차 뷰파인더</div>
            <div class="fg-panel-sub">전차가 갈 방향을 망원경으로 겨눠요${hint ? ' (목표: 동 →)' : ''}</div>
          </div>
          <div class="fg-row" style="justify-content:center;gap:14px">
            <div style="position:relative;width:190px;height:190px;display:grid;place-items:center">
              <img src="/assets/puzzle-ui/boards/p06-scope.svg" alt="" style="width:180px;height:180px;object-fit:contain;transition:transform .2s;transform:rotate(${dirLabels[dir].rot}deg)" />
              <span style="position:absolute;top:0;padding:2px 8px;border-radius:999px;border:2px solid #0B0E13;background:${dir === 'N' ? 'var(--fg-mint)' : 'var(--fg-bg-base)'};color:${dir === 'N' ? '#0B0E13' : 'var(--fg-text)'};font-family:var(--fg-font-display);font-size:13px">북</span>
              <span style="position:absolute;right:-4px;padding:2px 8px;border-radius:999px;border:2px solid #0B0E13;background:${dir === 'E' ? 'var(--fg-mint)' : 'var(--fg-bg-base)'};color:${dir === 'E' ? '#0B0E13' : 'var(--fg-text)'};font-family:var(--fg-font-display);font-size:13px">동</span>
              <span style="position:absolute;bottom:0;padding:2px 8px;border-radius:999px;border:2px solid #0B0E13;background:${dir === 'S' ? 'var(--fg-mint)' : 'var(--fg-bg-base)'};color:${dir === 'S' ? '#0B0E13' : 'var(--fg-text)'};font-family:var(--fg-font-display);font-size:13px">남</span>
              <span style="position:absolute;left:-4px;padding:2px 8px;border-radius:999px;border:2px solid #0B0E13;background:${dir === 'W' ? 'var(--fg-mint)' : 'var(--fg-bg-base)'};color:${dir === 'W' ? '#0B0E13' : 'var(--fg-text)'};font-family:var(--fg-font-display);font-size:13px">서</span>
            </div>
            <div class="fg-stack">
              ${roundBtnHtml({ id: 'p6-dir-l', icon: 'rot-ccw', tone: 'steel', subLabel: '왼쪽으로' })}
              ${roundBtnHtml({ id: 'p6-dir-r', icon: 'rot-cw', tone: 'steel', subLabel: '오른쪽으로' })}
            </div>
          </div>
          <div style="text-align:center;font-size:13px;font-weight:800;color:var(--fg-cyan)">
            지금 보이는 곳: ${dirLabels[dir].view}
          </div>
        </div>

        ${pushBtnHtml({ id: 'p6-go', label: '🚋 출발!', tone: 'mint' })}

        <div class="fg-panel fg-row-between">
          ${lampHtml(routeOk ? 'mint' : 'off', '노선')}
          ${lampHtml(dirOk ? 'mint' : 'off', '뷰파인더')}
          ${lampHtml(dispatched && routeOk && dirOk ? 'mint' : 'off', '도착')}
        </div>
      </div>
    </div>
  `;

  stage.querySelectorAll<HTMLElement>('[data-sw]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.sw);
      const next = [...switches];
      next[idx] = next[idx] === 'A' ? 'B' : 'A';
      soundEngine.playClick();
      h.patchState(6, { switches: next });
      h.rerender();
    };
  });

  const cycleDir = (delta: number) => {
    const curIdx = Math.max(0, dirs.indexOf(dir as (typeof dirs)[number]));
    const nextDir = dirs[(curIdx + delta + 4) % 4];
    soundEngine.playClick();
    h.patchState(6, { dir: nextDir });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p6-dir-l')!.onclick = () => cycleDir(-1);
  stage.querySelector<HTMLElement>('#p6-dir-r')!.onclick = () => cycleDir(1);

  stage.querySelector<HTMLElement>('#p6-go')!.onclick = () => {
    if (!dirOk) {
      h.setErr('앞이 안 보여요! 뷰파인더를 동쪽(→ 파시그강 도개교) 방향으로 돌리세요.');
      return;
    }
    if (!routeOk) {
      h.setErr(
        hint
          ? '완충기에 부딪혀 멈췄어요! 2번 비논도 우회선(S1=B, S2=B, S3=A)으로 바꾸세요.'
          : '틀린 길로 출발해 완충기에 멈췄어요! 이안의 노선표 무전을 다시 확인하세요.'
      );
      return;
    }
    h.solve(6, { switches, dir: 'E', dispatched: true }, '전차가 비논도 우회선로를 따라 도개교를 무사히 건넜어요!');
  };
}

/* -------------------------------------------------------------------------- *
 * P07 · 급수관 3구역 수압 평형
 * -------------------------------------------------------------------------- */
function boardP07(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const valves = ((s.valves as number[]) || [100, 50, 25]).slice(0, 3);
  const p1 = Math.round(50 + 0.4 * (100 - valves[0]) - 0.2 * valves[2]);
  const p2 = Math.round(40 + 0.4 * valves[1]);
  const p3 = Math.round(20 + 0.4 * valves[2]);
  const psis = [p1, p2, p3];
  const zoneStates = psis.map((psi) => (psi >= 55 && psi <= 65 ? 'mint' : psi > 65 ? 'red' : 'off') as 'mint' | 'red' | 'off');
  const allGreen = psis.every((v) => v >= 55 && v <= 65);
  const hint = h.difficulty.showTargetHints;

  stage.innerHTML = `
    <div class="fg-board-2col" style="grid-template-columns:minmax(0,1.45fr) minmax(220px,0.55fr)">
      <div class="fg-stack">
        <div class="fg-p07-zones">
          ${[0, 1, 2]
            .map((i) => {
              const psi = psis[i];
              const ok = psi >= 55 && psi <= 65;
              const ang = -125 + Math.min(120, Math.max(0, psi)) * (250 / 120);
              const wheelRot = (valves[i] / 100) * 270;
              return `<div class="fg-p07-zone" style="border-color:${ok ? 'var(--fg-mint)' : 'var(--fg-outline)'}">
                <svg viewBox="0 0 120 110" width="112" height="102">
                  <circle cx="60" cy="56" r="48" fill="#F4F7FA" stroke="#0B0E13" stroke-width="4"/>
                  <path d="M 22 86 A 44 44 0 1 1 98 86" fill="none" stroke="#CBD5E1" stroke-width="9"/>
                  <path d="M 48 15 A 44 44 0 0 1 72 15" fill="none" stroke="#52EFBF" stroke-width="9"/>
                  <path d="M 96 34 A 44 44 0 0 1 98 84" fill="none" stroke="#FF6E6E" stroke-width="9"/>
                  <text x="60" y="34" text-anchor="middle" fill="#0B0E13" font-size="11" font-weight="900">60</text>
                  <line x1="60" y1="56" x2="60" y2="18" stroke="#FF4A4A" stroke-width="4" stroke-linecap="round" transform="rotate(${ang} 60 56)"/>
                  <circle cx="60" cy="56" r="7" fill="#1A2029" stroke="#0B0E13" stroke-width="2.5"/>
                </svg>
                <div class="fg-row">
                  ${lcdHtml(psi, 'PSI')}
                  ${lampHtml(zoneStates[i])}
                </div>
                <img class="fg-p07-wheel" src="/assets/puzzle-ui/boards/p07-wheel.svg" alt="밸브 ${i + 1}" style="transform:rotate(${wheelRot}deg)" />
                <div style="font-family:var(--fg-font-display);font-size:17px">${i + 1}구역 · 밸브 ${valves[i]}%</div>
                <div class="fg-row">
                  ${roundBtnHtml({ id: `p7-d-${i}`, dataAttr: `data-vd="${i}"`, icon: 'rot-ccw', tone: 'steel', subLabel: '-25%', tapHint: i === 0 && valves[0] === 100 })}
                  ${roundBtnHtml({ id: `p7-u-${i}`, dataAttr: `data-vu="${i}"`, icon: 'rot-cw', tone: 'steel', subLabel: '+25%' })}
                </div>
              </div>`;
            })
            .join('')}
        </div>
      </div>

      <div class="fg-stack" style="justify-content:space-between">
        <div class="fg-panel fg-stack" style="align-items:center;text-align:center">
          <div class="fg-panel-title">가압 펌프</div>
          ${lampHtml('mint', '가동 중')}
          <div class="fg-panel-sub">1구역에서 들어온 물을 세 갈래로 나눠요</div>
        </div>

        <div class="fg-panel fg-stack">
          <div class="fg-panel-title">3구역 평형</div>
          ${lampHtml(zoneStates[0], '1구역')}
          ${lampHtml(zoneStates[1], '2구역')}
          ${lampHtml(zoneStates[2], '3구역')}
          <div class="fg-panel-sub">바늘 3개가 모두 초록 띠(55~65 PSI)에 들어가면 배수가 시작돼요</div>
        </div>

        ${pushBtnHtml({ id: 'p7-lock', label: allGreen ? '배수 밸브 개방 완료!' : '수압 평형 검증', tone: 'mint' })}
      </div>
    </div>
  `;

  stage.querySelectorAll<HTMLElement>('[data-vd]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.vd);
      const next = [...valves];
      next[idx] = Math.max(0, next[idx] - 25);
      soundEngine.playClick();
      h.patchState(7, { valves: next });
      h.rerender();
    };
  });
  stage.querySelectorAll<HTMLElement>('[data-vu]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.vu);
      const next = [...valves];
      next[idx] = Math.min(100, next[idx] + 25);
      soundEngine.playClick();
      h.patchState(7, { valves: next });
      h.rerender();
    };
  });
  stage.querySelector<HTMLElement>('#p7-lock')!.onclick = () => {
    if (allGreen) {
      h.solve(7, { valves }, 'B1 급수관 3구역 모두 60 PSI 평형으로 물이 빠졌어요!');
    } else {
      h.setErr(
        hint
          ? `현재 수압 [${psis.join(', ')}] PSI예요. 1:25%, 2:50%, 3:100%로 맞춰 보세요.`
          : `현재 수압 [${psis.join(', ')}] PSI예요. 3구역 바늘을 모두 초록 띠(55~65)에 맞추세요.`
      );
    }
  };
}

/* -------------------------------------------------------------------------- *
 * P08 · 보일러 감압 & 복식 순환 펌프 동기화 (Figma: 증기 빼기 -10 PSI + 잠금 레버)
 * -------------------------------------------------------------------------- */
function boardP08(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  let livePsi = Number(s.boilerPsi ?? 145);
  let pump1Rpm = Number(s.pump1Rpm ?? 800);
  let pump2Rpm = Number(s.pump2Rpm ?? 1560);
  const synced = Boolean(s.synced);
  const tol = h.difficulty.p08RpmTolerance;
  const hint = h.difficulty.showTargetHints;

  const isPsiOk = (v: number) => v >= 70 && v <= 90;
  const isDiffOk = (a: number, b: number) => Math.abs(a - b) <= tol;
  const isBandOk = (a: number, b: number) => a >= 1150 && a <= 1250 && b >= 1150 && b <= 1250;

  const psiRot = (v: number) => -125 + Math.min(200, Math.max(0, v)) * (250 / 200);
  const rpmPct = (v: number) => Math.round(((v - 700) / 900) * 100);

  stage.innerHTML = `
    <div class="fg-p08-grid">
      <div class="fg-p08-boiler-card">
        <div class="fg-p08-boiler-visual">
          <img class="boiler-body" src="/assets/puzzle-ui/boards/p08-boiler.svg" alt="보일러" />
          <img id="p8-steam-img" class="fg-p08-steam" src="/assets/puzzle-ui/boards/p08-steam.svg" alt="" style="opacity:${livePsi > 90 ? 1 : 0}" />
          <svg viewBox="0 0 120 110" width="110" height="100" style="position:relative;z-index:2;margin-top:-20px">
            <circle cx="60" cy="56" r="46" fill="#F4F7FA" stroke="#0B0E13" stroke-width="4"/>
            <path d="M 38 20 A 42 42 0 0 1 56 15" fill="none" stroke="#52EFBF" stroke-width="9"/>
            <path d="M 88 26 A 42 42 0 0 1 96 82" fill="none" stroke="#FF6E6E" stroke-width="9"/>
            <text x="60" y="34" text-anchor="middle" fill="#0B0E13" font-size="10" font-weight="900">100</text>
            <line id="p8-psi-needle" x1="60" y1="56" x2="60" y2="20" stroke="#FF4A4A" stroke-width="4" stroke-linecap="round" transform="rotate(${psiRot(livePsi)} 60 56)"/>
            <circle cx="60" cy="56" r="6" fill="#1A2029"/>
          </svg>
        </div>
        ${lcdHtml(Math.round(livePsi), 'PSI', '', 'p8-psi-lcd')}
        <div style="padding:3px 10px;border-radius:8px;border:2px solid #0B0E13;background:var(--fg-amber);color:#0B0E13;font-weight:800;font-size:11px">
          ${h.difficulty.p08DriftPerSec > 0 ? `▲ 계속 올라가요 +${h.difficulty.p08DriftPerSec}/초` : '안전 압력 70~90 PSI'}
        </div>
        <div class="fg-row" style="align-items:center">
          ${roundBtnHtml({ id: 'p8-bleed', icon: 'warning', tone: 'red', subLabel: '증기 빼기 (-10 PSI)', tapHint: livePsi > 90 })}
          ${h.difficulty.p08DriftPerSec === 0 ? '<button type="button" class="s-btn" id="p8-add" style="padding:5px 8px;font-size:11px">+10</button>' : ''}
        </div>
      </div>

      <div class="fg-stack">
        <div class="fg-board-2col" style="grid-template-columns:1fr 1fr">
          <div class="fg-panel fg-stack" style="align-items:center">
            <div class="fg-row-between" style="width:100%">
              <span class="fg-panel-title" style="font-size:16px">순환 펌프 1호기</span>
              <img src="/assets/puzzle-ui/boards/p08-motor.svg" alt="" style="width:36px;height:30px;object-fit:contain" />
            </div>
            <input type="range" min="700" max="1600" step="20" value="${pump1Rpm}" id="p8-r1" class="p-range" style="width:100%" />
            ${lcdHtml(pump1Rpm, 'RPM', '', 'p8-r1-lcd')}
            ${hint ? '<span class="fg-panel-sub">목표 ~1200 RPM</span>' : ''}
          </div>
          <div class="fg-panel fg-stack" style="align-items:center">
            <div class="fg-row-between" style="width:100%">
              <span class="fg-panel-title" style="font-size:16px">순환 펌프 2호기</span>
              <img src="/assets/puzzle-ui/boards/p08-motor.svg" alt="" style="width:36px;height:30px;object-fit:contain" />
            </div>
            <input type="range" min="700" max="1600" step="20" value="${pump2Rpm}" id="p8-r2" class="p-range" style="width:100%" />
            ${lcdHtml(pump2Rpm, 'RPM', '', 'p8-r2-lcd')}
            <span class="fg-panel-sub">허용 차이 ±${tol}</span>
          </div>
        </div>

        <div class="fg-panel fg-stack" style="flex:1;justify-content:center">
          <div class="fg-row-between">
            <span class="fg-panel-title" style="font-size:17px">두 펌프 화살표를 만나게 해요</span>
            <span id="p8-diff-pill" style="padding:3px 10px;border-radius:999px;border:2px solid #0B0E13;font-weight:800;font-size:12px;background:${isDiffOk(pump1Rpm, pump2Rpm) ? 'var(--fg-mint)' : 'var(--fg-red)'};color:#0B0E13">
              차이 ${Math.abs(pump1Rpm - pump2Rpm)} RPM
            </span>
          </div>
          <div style="position:relative;height:38px;background:var(--fg-bg-base);border:3px solid #0B0E13;border-radius:10px;padding:0 10px">
            <div style="position:absolute;left:50%;top:4px;bottom:4px;width:4px;background:rgba(82,239,191,0.35);transform:translateX(-50%)"></div>
            <span id="p8-arrow-1" style="position:absolute;top:2px;left:${rpmPct(pump1Rpm)}%;transform:translateX(-50%);font-size:14px;color:var(--fg-amber);font-weight:900">▼ 1</span>
            <span id="p8-arrow-2" style="position:absolute;bottom:2px;left:${rpmPct(pump2Rpm)}%;transform:translateX(-50%);font-size:14px;color:var(--fg-cyan);font-weight:900">▲ 2</span>
          </div>
        </div>
      </div>

      <div class="fg-panel fg-stack" style="justify-content:space-between;align-items:center">
        <div style="width:100%">
          <div class="fg-panel-title">동기 잠금</div>
          <div class="fg-panel-sub">세 램프가 모두 켜질 때 올려요</div>
        </div>
        <div class="fg-stack" style="width:100%;gap:8px">
          <span id="p8-lamp-psi">${lampHtml(isPsiOk(livePsi) ? 'red' : 'red', '압력 70~90')}</span>
          <span id="p8-lamp-diff">${lampHtml(isDiffOk(pump1Rpm, pump2Rpm) ? 'mint' : 'off', '펌프 화살표 겹침')}</span>
          <span id="p8-lamp-band">${lampHtml(isBandOk(pump1Rpm, pump2Rpm) ? 'mint' : 'off', '1200 근처')}</span>
        </div>
        <button type="button" class="fg-lever-btn" id="p8-sync" style="width:100%">
          <img src="${synced ? PART_URL.leverOn : PART_URL.leverOff}" alt="잠금 레버" />
          <span class="fg-lever-lbl" style="color:var(--fg-amber)">잠금 레버를 위로!</span>
        </button>
      </div>
    </div>
  `;

  const refreshP8Dom = () => {
    const rPsi = Math.round(livePsi);
    const psiOk = isPsiOk(rPsi);
    const diffOk = isDiffOk(pump1Rpm, pump2Rpm);
    const bandOk = isBandOk(pump1Rpm, pump2Rpm);
    const lcd = stage.querySelector('#p8-psi-lcd');
    const needle = stage.querySelector('#p8-psi-needle');
    const steam = stage.querySelector<HTMLElement>('#p8-steam-img');
    const diffPill = stage.querySelector<HTMLElement>('#p8-diff-pill');
    const a1 = stage.querySelector<HTMLElement>('#p8-arrow-1');
    const a2 = stage.querySelector<HTMLElement>('#p8-arrow-2');
    const lp = stage.querySelector('#p8-lamp-psi');
    const ld = stage.querySelector('#p8-lamp-diff');
    const lb = stage.querySelector('#p8-lamp-band');
    if (lcd) lcd.textContent = String(rPsi);
    if (needle) needle.setAttribute('transform', `rotate(${psiRot(rPsi)} 60 56)`);
    if (steam) steam.style.opacity = rPsi > 90 ? '1' : '0';
    if (diffPill) {
      diffPill.textContent = `차이 ${Math.abs(pump1Rpm - pump2Rpm)} RPM`;
      diffPill.style.background = diffOk ? 'var(--fg-mint)' : 'var(--fg-red)';
    }
    if (a1) a1.style.left = `${rpmPct(pump1Rpm)}%`;
    if (a2) a2.style.left = `${rpmPct(pump2Rpm)}%`;
    if (lp) lp.innerHTML = lampHtml(psiOk ? 'mint' : 'red', '압력 70~90');
    if (ld) ld.innerHTML = lampHtml(diffOk ? 'mint' : 'off', '펌프 화살표 겹침');
    if (lb) lb.innerHTML = lampHtml(bandOk ? 'mint' : 'off', '1200 근처');
  };
  refreshP8Dom();

  if (h.difficulty.p08DriftPerSec > 0 && !h.isSolved) {
    let tickCount = 0;
    const timer = window.setInterval(() => {
      if (livePsi < 160) {
        livePsi = Math.min(160, livePsi + h.difficulty.p08DriftPerSec * 0.25);
        refreshP8Dom();
        tickCount++;
        if (tickCount % 4 === 0) {
          h.patchState(8, { boilerPsi: Math.round(livePsi) });
        }
      }
    }, 250);
    h.registerCleanup(() => window.clearInterval(timer));
  }

  stage.querySelector<HTMLElement>('#p8-bleed')!.onclick = () => {
    soundEngine.playClick();
    livePsi = Math.max(50, Math.round(livePsi) - 10);
    h.patchState(8, { boilerPsi: livePsi });
    refreshP8Dom();
  };
  stage.querySelector<HTMLElement>('#p8-add')!.onclick = () => {
    soundEngine.playClick();
    livePsi = Math.min(160, Math.round(livePsi) + 10);
    h.patchState(8, { boilerPsi: livePsi });
    refreshP8Dom();
  };

  stage.querySelector<HTMLInputElement>('#p8-r1')!.oninput = (e) => {
    pump1Rpm = Number((e.target as HTMLInputElement).value);
    const l1 = stage.querySelector('#p8-r1-lcd');
    if (l1) l1.textContent = String(pump1Rpm);
    refreshP8Dom();
  };
  stage.querySelector<HTMLInputElement>('#p8-r1')!.onchange = (e) => {
    pump1Rpm = Number((e.target as HTMLInputElement).value);
    h.patchState(8, { pump1Rpm });
  };
  stage.querySelector<HTMLInputElement>('#p8-r2')!.oninput = (e) => {
    pump2Rpm = Number((e.target as HTMLInputElement).value);
    const l2 = stage.querySelector('#p8-r2-lcd');
    if (l2) l2.textContent = String(pump2Rpm);
    refreshP8Dom();
  };
  stage.querySelector<HTMLInputElement>('#p8-r2')!.onchange = (e) => {
    pump2Rpm = Number((e.target as HTMLInputElement).value);
    h.patchState(8, { pump2Rpm });
  };
  stage.querySelector<HTMLElement>('#p8-sync')!.onclick = () => {
    const curPsi = Math.round(livePsi);
    if (isPsiOk(curPsi) && isDiffOk(pump1Rpm, pump2Rpm) && isBandOk(pump1Rpm, pump2Rpm)) {
      h.solve(8, { boilerPsi: curPsi, pump1Rpm, pump2Rpm, synced: true }, '보일러 압력과 복식 순환 펌프 동기 잠금이 완료되었어요!');
    } else {
      h.setErr(
        hint
          ? `압력(${curPsi} → 70~90 PSI) 또는 두 펌프(1150~1250 RPM, 차이 ±${tol})를 맞추세요!`
          : '아직 세 램프가 모두 초록불이 아니에요. 카이의 무전을 참고해 맞추세요!'
      );
    }
  };
}

/* -------------------------------------------------------------------------- *
 * P09 · 배전반 & 비상 발전기
 * -------------------------------------------------------------------------- */
function boardP09(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  let heat = Number(s.heat ?? 0);
  const genRunning = Boolean(s.genRunning);
  const bus = ((s.bus as boolean[]) || [true, true, false]).slice(0, 3);
  const busOk = !bus[0] && !bus[1] && bus[2];
  const breaker = Boolean(s.breaker);
  const hint = h.difficulty.showTargetHints;
  const holdSec = (h.difficulty.p09HoldMs / 1000).toFixed(1);
  const circum = 2 * Math.PI * 58;

  stage.innerHTML = `
    <div class="fg-p09-grid">
      <div class="fg-panel fg-stack" style="justify-content:space-between">
        <div class="fg-row-between">
          <span class="fg-panel-title">비상 디젤 발전기</span>
          ${lampHtml(genRunning ? 'mint' : heat >= 100 ? 'amber' : 'off', genRunning ? '가동 60Hz' : '정지')}
        </div>
        <img src="/assets/puzzle-ui/boards/p09-engine.svg" alt="디젤 엔진" style="width:100%;max-height:130px;object-fit:contain" />
        <div class="fg-row-between" style="align-items:center">
          <div class="fg-stack" style="align-items:center">
            <span style="font-family:var(--fg-font-display);font-size:15px;color:var(--fg-amber)">① 예열 코일</span>
            <button type="button" class="fg-hold-wrap" id="p9-heat" ${heat >= 100 || genRunning ? 'disabled' : ''}>
              <svg viewBox="0 0 140 148" class="fg-hold-ring-svg">
                <circle cx="70" cy="70" r="64" fill="#1A2029" stroke="#0B0E13" stroke-width="4"/>
                <circle cx="70" cy="70" r="58" fill="none" stroke="#2E3846" stroke-width="10"/>
                <circle id="p9-hold-arc" cx="70" cy="70" r="58" fill="none" stroke="${heat >= 100 ? '#52EFBF' : '#FFB86B'}" stroke-width="10"
                  stroke-dasharray="${circum}" stroke-dashoffset="${circum * (1 - Math.min(100, heat) / 100)}"
                  transform="rotate(-90 70 70)" stroke-linecap="round"/>
                <circle cx="70" cy="70" r="46" fill="${heat >= 100 ? '#52EFBF' : '#FFB86B'}" stroke="#0B0E13" stroke-width="4"/>
              </svg>
              <span class="fg-hold-copy">
                <strong id="p9-heat-txt">${heat >= 100 ? '완료 ✔' : '꾹 예열'}</strong>
                <small id="p9-heat-sub">${heat >= 100 ? '100%' : `${Math.round(heat)}% · ${holdSec}s`}</small>
              </span>
              ${heat < 100 && !genRunning ? tapHintHtml() : ''}
            </button>
          </div>
          <div class="fg-stack" style="flex:1;min-width:170px">
            <span style="font-family:var(--fg-font-display);font-size:15px">② 시동 (예열 100% 후)</span>
            ${pushBtnHtml({ id: 'p9-crank', label: genRunning ? '60Hz 가동 중 ✔' : '크랭크 기동', tone: genRunning || heat >= 100 ? 'mint' : 'steel', disabled: heat < 100 || genRunning })}
            <div class="fg-row" style="justify-content:space-between">
              ${lcdHtml(genRunning ? 60 : 0, 'Hz')}
              <span style="font-size:11px;color:var(--fg-sub);font-weight:700">손을 떼면 링이 천천히 줄어요</span>
            </div>
          </div>
        </div>
      </div>

      <div class="fg-panel fg-stack" style="justify-content:space-between">
        <div class="fg-row-between">
          <span class="fg-panel-title">주 고압 배전반</span>
          <img src="${uiIconUrl('warning')}" alt="" style="width:24px;height:24px;object-fit:contain" />
        </div>
        <div class="fg-p07-zones" style="gap:8px">
          ${[0, 1, 2]
            .map(
              (i) => `<div style="background:var(--fg-bg-raised);border:3px solid #0B0E13;border-radius:14px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:4px">
                <img src="/assets/puzzle-ui/boards/p09-volt-${bus[i] ? 'on' : 'off'}.svg" alt="" style="width:100%;max-height:54px;object-fit:contain" />
                <button type="button" class="fg-lever-btn" data-bus="${i}">
                  <img src="${bus[i] ? PART_URL.leverOn : PART_URL.leverOff}" alt="${bus[i] ? 'ON' : 'OFF'}" />
                  <span class="fg-lever-lbl">Bus ${i + 1}</span>
                </button>
                <span style="font-family:var(--fg-font-display);font-size:13px;color:${bus[i] ? (hint && i < 2 ? 'var(--fg-red)' : 'var(--fg-mint)') : 'var(--fg-sub)'}">
                  ${bus[i] ? '켜짐' : '꺼짐'}
                </span>
              </div>`
            )
            .join('')}
        </div>

        <div class="fg-row-between" style="background:var(--fg-bg-base);border:3px solid #0B0E13;border-radius:16px;padding:10px 14px">
          <div>
            <div class="fg-panel-title" style="font-size:17px">③ 주 차단기</div>
            <div class="fg-panel-sub">모선을 맞춘 뒤 돌려서 켜요</div>
          </div>
          <button type="button" id="p9-main" style="border:0;background:transparent;cursor:pointer;padding:0;display:flex;align-items:center;gap:8px">
            <img src="/assets/puzzle-ui/boards/p09-knob.svg" alt="주 차단기" style="width:82px;height:82px;object-fit:contain;transition:transform .2s;transform:rotate(${breaker ? 45 : -45}deg)" />
          </button>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px">
            ${lampHtml(heat >= 100 ? 'mint' : 'off', '예열')}
            ${lampHtml(genRunning ? 'mint' : 'off', '시동')}
            ${lampHtml(busOk ? 'mint' : 'off', '모선')}
            ${lampHtml(breaker ? 'mint' : 'off', '차단기')}
          </div>
        </div>
      </div>
    </div>
  `;

  const heatBtn = stage.querySelector<HTMLButtonElement>('#p9-heat')!;
  let holdTimer: number | null = null;
  let decayTimer: number | null = null;

  const updateHoldVisual = () => {
    const arc = stage.querySelector('#p9-hold-arc');
    const sub = stage.querySelector('#p9-heat-sub');
    if (arc) arc.setAttribute('stroke-dashoffset', String(circum * (1 - Math.min(100, heat) / 100)));
    if (sub) sub.textContent = heat >= 100 ? '100%' : `${Math.round(heat)}% · ${holdSec}s`;
  };

  const stopTimers = () => {
    if (holdTimer !== null) {
      window.clearInterval(holdTimer);
      holdTimer = null;
    }
    if (decayTimer !== null) {
      window.clearInterval(decayTimer);
      decayTimer = null;
    }
  };
  h.registerCleanup(stopTimers);

  heatBtn.onpointerdown = () => {
    if (heat >= 100 || genRunning) return;
    stopTimers();
    const stepPer50Ms = (100 / h.difficulty.p09HoldMs) * 50;
    soundEngine.playClick();
    holdTimer = window.setInterval(() => {
      heat = Math.min(100, heat + stepPer50Ms);
      updateHoldVisual();
      if (heat >= 100) {
        stopTimers();
        soundEngine.playClick();
        h.patchState(9, { heat: 100 });
        h.rerender();
      }
    }, 50);
  };

  const releaseHold = () => {
    if (holdTimer === null) return;
    window.clearInterval(holdTimer);
    holdTimer = null;
    if (heat < 100 && decayTimer === null) {
      h.patchState(9, { heat: Math.round(heat) });
      decayTimer = window.setInterval(() => {
        if (heat <= 0) {
          stopTimers();
          h.patchState(9, { heat: 0 });
          return;
        }
        heat = Math.max(0, heat - 1.5);
        updateHoldVisual();
      }, 60);
    }
  };
  heatBtn.onpointerup = releaseHold;
  heatBtn.onpointerleave = releaseHold;
  heatBtn.onpointercancel = releaseHold;

  stage.querySelector<HTMLElement>('#p9-crank')!.onclick = () => {
    soundEngine.playPowerOn();
    h.patchState(9, { genRunning: true });
    h.setInfo('디젤 발전기 60Hz 기동 성공! 이제 배전반 모선을 맞추고 주 차단기를 돌리세요.');
  };
  stage.querySelectorAll<HTMLElement>('[data-bus]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.bus);
      const next = [...bus];
      next[idx] = !next[idx];
      soundEngine.playClick();
      h.patchState(9, { bus: next });
      h.rerender();
    };
  });
  stage.querySelector<HTMLElement>('#p9-main')!.onclick = () => {
    if (!genRunning) {
      h.setErr('먼저 발전기를 100% 예열한 뒤 크랭크 기동하세요!');
      return;
    }
    if (busOk) {
      soundEngine.playPowerOn();
      h.solve(9, { heat: 100, genRunning: true, bus, breaker: true }, '비상 전력 복구! 박물관 전체 정식 조명이 점등되었어요!');
    } else {
      h.setErr(
        hint
          ? '과전류 트립! Bus 1·2는 OFF로 끄고, Bus 3만 ON으로 두세요!'
          : '과전류 트립! 린의 무전([3번]+[반전/교체])대로 우회 모선만 켜세요.'
      );
    }
  };
}

/* -------------------------------------------------------------------------- *
 * P10 · 제습 공조 & 호이스트 이송
 * -------------------------------------------------------------------------- */
function boardP10(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const rh = Number(s.rh ?? 72);
  const temp = Number(s.temp ?? 24);
  const crateLatch = Boolean(s.crateLatch);
  const crane = ((s.crane as number[]) || [0, 1]).slice(0, 2);
  const cratePos = ((s.cratePos as number[]) || [1, 3]).slice(0, 2);
  const holding = Boolean(s.holding);
  const dewOk = rh === 45 && temp === 18;
  const puddles = new Set(['2,2', '3,2', '2,3']);

  // Exact p10-grid.svg (880x788) 5x4 0-indexed coordinates (cols 0..4, rows 0..3)
  const cellX = (c: number) => 39 + c * 158;
  const cellY = (r: number) => 73 + r * 158;
  const clampedCraneCol = Math.max(0, Math.min(4, crane[0]));
  const clampedCraneRow = Math.max(0, Math.min(3, crane[1]));
  const clampedCrateCol = Math.max(0, Math.min(4, cratePos[0]));
  const clampedCrateRow = Math.max(0, Math.min(3, cratePos[1]));
  const cx = cellX(clampedCrateCol);
  const cy = cellY(clampedCrateRow);

  stage.innerHTML = `
    <div class="fg-board-2col">
      <div class="fg-panel">
        <div class="fg-p10-grid-wrap">
          <svg viewBox="0 0 880 788" style="width:100%;height:auto;display:block">
            <image href="/assets/puzzle-ui/boards/p10-grid.svg" x="0" y="0" width="880" height="788" />

            <!-- 목표 2단 선반 배지 (col=4, row=1) -->
            <rect x="676" y="198" width="142" height="32" rx="10" fill="#52EFBF" stroke="#0B0E13" stroke-width="3"/>
            <text x="747" y="219" text-anchor="middle" fill="#0B0E13" font-family="var(--fg-font-display)" font-size="16" font-weight="800">목표 · 2단 선반</text>

            <!-- 크레인 브리지(세로 거더 · 상자 아래 레이어) -->
            <image href="/assets/puzzle-ui/boards/p10-bridge.svg" x="${cellX(clampedCraneCol) + 41}" y="30" width="70" height="712" />

            <!-- 1번 상자 (동적 위치) -->
            <g>
              <rect x="${cx + 23}" y="${cy + 23}" width="106" height="106" rx="10" fill="#B07A4F" stroke="#0B0E13" stroke-width="5"/>
              <line x1="${cx + 23}" y1="${cy + 57}" x2="${cx + 129}" y2="${cy + 57}" stroke="#7A5232" stroke-width="5"/>
              <line x1="${cx + 23}" y1="${cy + 95}" x2="${cx + 129}" y2="${cy + 95}" stroke="#7A5232" stroke-width="5"/>
              <line x1="${cx + 27}" y1="${cy + 27}" x2="${cx + 125}" y2="${cy + 125}" stroke="#7A5232" stroke-width="5"/>
              <rect x="${cx + 30}" y="${cy + 106}" width="92" height="24" rx="8" fill="#0B0E13"/>
              <text x="${cx + 76}" y="${cy + 123}" text-anchor="middle" fill="${crateLatch ? '#52EFBF' : '#FFB86B'}" font-family="var(--fg-font-display)" font-size="14" font-weight="800">
                ${crateLatch ? '✔ 1번 상자' : '🔒 1번 상자'}
              </text>
              ${
                !crateLatch
                  ? `<circle cx="${cx + 76}" cy="${cy + 72}" r="22" fill="#FF6E6E" stroke="#0B0E13" stroke-width="4"/>
                     <image href="${uiIconUrl('lock')}" x="${cx + 62}" y="${cy + 58}" width="28" height="28" />`
                  : ''
              }
            </g>

            <!-- 크레인 갈고리 (상위 레이어) -->
            <image href="/assets/puzzle-ui/boards/p10-hook.svg" x="${cellX(clampedCraneCol) + 21}" y="${cellY(clampedCraneRow) + 21}" width="110" height="110" />

            <!-- 축 눈금 0..4 / 0..3 -->
            ${[0, 1, 2, 3, 4].map((c) => `<text x="${cellX(c) + 76}" y="764" text-anchor="middle" fill="#9AA7B4" font-family="var(--fg-font-mono)" font-size="18" font-weight="800">${c}</text>`).join('')}
            ${[0, 1, 2, 3].map((r) => `<text x="858" y="${cellY(r) + 82}" text-anchor="middle" fill="#9AA7B4" font-family="var(--fg-font-mono)" font-size="18" font-weight="800">${r}</text>`).join('')}

            <!-- 안개 오버레이 -->
            <image href="/assets/puzzle-ui/boards/p10-fog.svg" x="45" y="78" width="790" height="632" opacity="${dewOk ? 0 : 0.92}" />
          </svg>
          ${
            !dewOk
              ? `<div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:6;display:flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;background:rgba(11,14,19,0.9);border:2px solid var(--fg-cyan);font-size:12px;font-weight:800">
                  <img src="${uiIconUrl('drop')}" style="width:16px;height:16px" /> 안개 · 습도 ${rh}%
                </div>`
              : ''
          }
        </div>
      </div>

      <div class="fg-stack" style="justify-content:space-between">
        <div class="fg-panel fg-stack" style="gap:8px">
          <div class="fg-panel-title" style="font-size:18px">인양 전에 필요한 것</div>
          <div class="fg-row-between">
            <span class="fg-row" style="gap:6px"><img src="${uiIconUrl('drop')}" style="width:20px;height:20px" /><strong>습도 맞추기 (카이)</strong></span>
            <span style="font-family:var(--fg-font-mono);font-weight:800;color:${rh === 45 ? 'var(--fg-mint)' : 'var(--fg-amber)'}">${rh}% ${rh === 45 ? '✔' : '→ 45%'}</span>
          </div>
          <div class="fg-row-between">
            <span class="fg-row" style="gap:6px"><img src="${uiIconUrl('thermo')}" style="width:20px;height:20px" /><strong>온도 맞추기 (카이)</strong></span>
            <span style="font-family:var(--fg-font-mono);font-weight:800;color:${temp === 18 ? 'var(--fg-mint)' : 'var(--fg-amber)'}">${temp}°C ${temp === 18 ? '✔' : '→ 18°C'}</span>
          </div>
          <div class="fg-row-between">
            <span class="fg-row" style="gap:6px"><img src="${uiIconUrl(crateLatch ? 'check' : 'lock')}" style="width:20px;height:20px" /><strong>1번 상자 걸쇠 (서하린)</strong></span>
            ${lampHtml(crateLatch ? 'mint' : 'red', crateLatch ? '체결 ✔' : '풀려 있음')}
          </div>
        </div>

        <div class="fg-panel fg-stack">
          <div>
            <div class="fg-panel-title" style="font-size:18px">크레인 조종기</div>
            <div class="fg-panel-sub">칸 단위로 움직여요 · 물웅덩이 위로는 내리면 안 돼요</div>
          </div>
          <div class="fg-row-between">
            <div style="display:grid;grid-template-columns:repeat(3,auto);gap:4px;align-items:center;justify-items:center">
              <span></span>${roundBtnHtml({ dataAttr: 'data-mv="0,-1"', icon: 'arrow-up', tone: 'steel' })}<span></span>
              ${roundBtnHtml({ dataAttr: 'data-mv="-1,0"', icon: 'arrow-left', tone: 'steel' })}
              <span></span>
              ${roundBtnHtml({ dataAttr: 'data-mv="1,0"', icon: 'arrow-right', tone: 'steel' })}
              <span></span>${roundBtnHtml({ dataAttr: 'data-mv="0,1"', icon: 'arrow-down', tone: 'steel' })}<span></span>
            </div>
            <div class="fg-stack" style="flex:1;min-width:140px">
              ${pushBtnHtml({ id: 'p10-hook', label: holding ? '하강 ↓ 내려놓기' : '인양 ↑ 상자 집기', tone: crateLatch && dewOk ? 'mint' : 'steel' })}
              <div class="fg-row" style="justify-content:space-between">
                ${lcdHtml(`${crane[0]},${crane[1]}`, '칸')}
              </div>
              <div class="fg-row" style="justify-content:space-between">
                ${lampHtml(dewOk ? 'mint' : 'off', '제습')}
                ${lampHtml(crateLatch ? 'mint' : 'off', '걸쇠')}
                ${lampHtml(!holding && cratePos[0] === 4 && cratePos[1] === 1 && dewOk ? 'mint' : 'off', '안착')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  stage.querySelectorAll<HTMLElement>('[data-mv]').forEach((b) => {
    b.onclick = () => {
      const [dx, dy] = (b.dataset.mv || '0,0').split(',').map(Number);
      const nx = Math.max(0, Math.min(4, crane[0] + dx));
      const ny = Math.max(0, Math.min(3, crane[1] + dy));
      if (holding && puddles.has(`${nx},${ny}`)) {
        h.setErr(
          dewOk
            ? '침수 물웅덩이 구역 위로는 상자를 지날 수 없어요!'
            : '짙은 안개 속 물웅덩이에 막혔어요! 카이가 안개를 걷어내야 해요.'
        );
        return;
      }
      soundEngine.playClick();
      h.patchState(10, { crane: [nx, ny], cratePos: holding ? [nx, ny] : cratePos });
      h.rerender();
    };
  });

  stage.querySelector<HTMLElement>('#p10-hook')!.onclick = () => {
    if (!holding) {
      if (!crateLatch) {
        h.setErr('먼저 서하린이 1번 방수 크레이트 걸쇠를 체결해야 인양할 수 있어요!');
        return;
      }
      if (crane[0] === cratePos[0] && crane[1] === cratePos[1]) {
        soundEngine.playClick();
        h.patchState(10, { holding: true });
        h.rerender();
      } else {
        h.setErr('크레인을 먼저 1번 상자 위치(1,3) 위로 옮긴 뒤 인양하세요!');
      }
    } else {
      h.patchState(10, { holding: false });
      if (dewOk && cratePos[0] === 4 && cratePos[1] === 1) {
        h.solve(10, { rh, temp, crateLatch, crane, cratePos: [4, 1], holding: false }, '제습 안정화 및 2단 선반 상자 안착 완료!');
      } else {
        h.rerender();
        if (!dewOk) h.setErr('카이가 제습 공조(45% / 18°C)로 안개를 걷어내야 선반에 안착할 수 있어요!');
      }
    }
  };
}
