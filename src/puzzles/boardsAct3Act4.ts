import type { PuzzleDef } from '../types/stranger.ts';
import { ROLES } from '../data/cMenuTokens.ts';
import { soundEngine } from '../audio/soundEngine.ts';
import type { BoardHelpers } from './boardsAct1Act2.ts';

export function renderAct3Act4Board(
  pid: number,
  stage: HTMLElement,
  _p: PuzzleDef,
  s: Record<string, unknown>,
  h: BoardHelpers,
  extraActions?: {
    sendHere?: () => void;
    gotoAtrium?: () => void;
    closeModal?: () => void;
  }
): boolean {
  switch (pid) {
    case 11:
      boardP11(stage, s, h);
      return true;
    case 12:
      boardP12(stage, s, h);
      return true;
    case 13:
      boardP13(stage, s, h);
      return true;
    case 14:
      boardP14(stage, s, h);
      return true;
    case 15:
      boardP15(stage, s, h);
      return true;
    case 16:
      boardP16(stage, s, h, extraActions);
      return true;
    default:
      return false;
  }
}

function boardP11(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const activeSlot = Number(s.activeSlot ?? 0);
  const slots = (
    (s.slots as { syl: string; kudlit: string }[]) || [
      { syl: 'BA', kudlit: 'down' },
      { syl: 'MA', kudlit: 'up' },
      { syl: 'PA', kudlit: 'down' },
    ]
  ).map((sl) => ({ ...sl }));

  const syls = [
    { k: 'BA', ch: 'ᜊ' },
    { k: 'KA', ch: 'ᜃ' },
    { k: 'LA', ch: 'ᜎ' },
    { k: 'MA', ch: 'ᜋ' },
    { k: 'PA', ch: 'ᜉ' },
    { k: 'YA', ch: 'ᜌ' },
  ];
  const kudlits = [
    { k: 'up', lbl: '위 점 (i/e)' },
    { k: 'none', lbl: '무점 (기본 a)' },
    { k: 'down', lbl: '아래 점 (u/o)' },
  ];
  const cur = slots[activeSlot] || slots[0];
  const word = slots
    .map((sl) => {
      const vowel = sl.kudlit === 'up' ? 'I' : sl.kudlit === 'down' ? 'U' : 'A';
      return sl.syl[0] + vowel;
    })
    .join(' - ');

  stage.innerHTML = `
    <div class="au-board p-stack">
      <div class="p-grid-3">
        ${slots
          .map((sl, i) => {
            const glyph = syls.find((x) => x.k === sl.syl)?.ch || '?';
            const dotTop = sl.kudlit === 'up' ? '●' : '';
            const dotBot = sl.kudlit === 'down' ? '●' : '';
            const pron = sl.kudlit === 'none' ? sl.syl : sl.syl[0] + (sl.kudlit === 'up' ? 'I' : 'U');
            return `<button class="s-btn ${activeSlot === i ? 'primary' : ''}" data-slot="${i}" style="padding:10px">
              <div style="font-size:10px;color:#91A8FF;height:12px">${dotTop}</div>
              <div style="font-size:24px;line-height:1">${glyph}</div>
              <div style="font-size:10px;color:#91A8FF;height:12px">${dotBot}</div>
              <div style="font-size:12px;margin-top:2px">${i + 1}번째 음절 (${pron})</div>
            </button>`;
          })
          .join('')}
      </div>
      <div class="p-card" style="border-color:#C89D54">
        <div class="p-row-between" style="margin-bottom:8px">
          <span style="font:800 13px sans-serif;color:#E6C886">${activeSlot + 1}번 칸 내륜 자음 휠:</span>
          <div class="p-row">
            ${syls.map((x) => `<button class="s-btn ${cur.syl === x.k ? 'amber' : ''}" data-syl="${x.k}">${x.ch} ${x.k[0]}</button>`).join('')}
          </div>
        </div>
        <div class="p-row-between">
          <span style="font:800 13px sans-serif;color:#91A8FF">${activeSlot + 1}번 칸 외륜 Kudlit 모음점:</span>
          <div class="p-row">
            ${kudlits.map((x) => `<button class="s-btn ${cur.kudlit === x.k ? 'primary' : ''}" data-kud="${x.k}">${x.lbl}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="p-row-between">
        <span style="font:800 14px monospace;color:#FFD86B">실시간 음독: ${word} ${word === 'KA - LA - YA' ? '→ KALAYAAN (자유!)' : ''}</span>
        <button class="s-btn primary" id="p11-check">🔱 비밀 헌장 해독 승인</button>
      </div>
    </div>
  `;

  stage.querySelectorAll<HTMLElement>('[data-slot]').forEach((b) => {
    b.onclick = () => {
      soundEngine.playClick();
      h.patchState(11, { activeSlot: Number(b.dataset.slot) });
      h.rerender();
    };
  });
  stage.querySelectorAll<HTMLElement>('[data-syl]').forEach((b) => {
    b.onclick = () => {
      soundEngine.playClick();
      slots[activeSlot].syl = b.dataset.syl!;
      h.patchState(11, { slots });
      h.rerender();
    };
  });
  stage.querySelectorAll<HTMLElement>('[data-kud]').forEach((b) => {
    b.onclick = () => {
      soundEngine.playClick();
      slots[activeSlot].kudlit = b.dataset.kud!;
      h.patchState(11, { slots });
      h.rerender();
    };
  });
  stage.querySelector<HTMLElement>('#p11-check')!.onclick = () => {
    if (word === 'KA - LA - YA') {
      h.solve(11, { slots }, '바이바이인 암호(KA-LA-YA · 자유) 해독 성공! 헌장의 숨은 서명이 금빛으로 복원되었습니다.');
    } else {
      h.setErr(`현재 조합(${word})이 카티푸난 암호 KA - LA - YA (모두 무점)와 다릅니다.`);
    }
  };
}

function boardP12(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const fx = Number(s.fx ?? 15);
  const fy = Number(s.fy ?? 85);
  const holes = ((s.holes as boolean[]) || [false, false, false, false]).slice(0, 4);
  const dist = Math.abs(fx - 60) + Math.abs(fy - 40);
  const blur = Math.min(8, Math.round(dist / 7));
  const sharp = dist <= 12;

  stage.innerHTML = `
    <div class="au-board p-grid-2">
      <div class="p-card ${sharp ? 'ok' : ''}">
        <div style="font:800 12px sans-serif;color:#52EFBF;margin-bottom:6px">① 마이크로필름 XY 스캐너 (X:${fx}, Y:${fy})</div>
        <div style="background:#061210;border:2px solid #2A3F3A;padding:12px;border-radius:6px;text-align:center;filter:blur(${blur}px);transition:filter .1s">
          <div style="font:900 13px monospace;color:#52EFBF">TARGET PUNCH CODE</div>
          <div style="font:900 18px monospace;color:#FFD86B;margin-top:4px">COL 2 [★] · COL 4 [🌊]</div>
        </div>
        <div class="p-stack" style="margin-top:8px">
          <label style="font-size:11px">X 초점 (목표 60): <input type="range" min="0" max="100" step="5" value="${fx}" id="p12-fx" style="width:100%"/></label>
          <label style="font-size:11px">Y 초점 (목표 40): <input type="range" min="0" max="100" step="5" value="${fy}" id="p12-fy" style="width:100%"/></label>
        </div>
      </div>
      <div style="background:#E6D6B8;border:3px solid #705638;border-radius:8px;padding:12px;color:#1F170F">
        <div style="font:900 13px sans-serif;margin-bottom:8px">② 4열 아카이브 천공 카드 복원기</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0">
          ${[0, 1, 2, 3]
            .map(
              (i) => `<button data-hole="${i}" class="p-punch-col">
                <span style="font:900 12px monospace">${i + 1}열</span>
                <span class="p-punch-dot ${holes[i] ? 'punched' : ''}"></span>
                <span style="font-size:12px">${i === 1 ? '★' : i === 3 ? '🌊' : i === 0 ? '☀' : '⛰'}</span>
              </button>`
            )
            .join('')}
        </div>
        <button class="s-btn primary" style="width:100%" id="p12-stamp">🔖 천공 카드 ARCHIVED 스탬프</button>
      </div>
    </div>
  `;

  stage.querySelector<HTMLInputElement>('#p12-fx')!.oninput = (e) => {
    h.patchState(12, { fx: Number((e.target as HTMLInputElement).value) });
    h.rerender();
  };
  stage.querySelector<HTMLInputElement>('#p12-fy')!.oninput = (e) => {
    h.patchState(12, { fy: Number((e.target as HTMLInputElement).value) });
    h.rerender();
  };
  stage.querySelectorAll<HTMLElement>('[data-hole]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.hole);
      const next = [...holes];
      next[idx] = !next[idx];
      soundEngine.playClick();
      h.patchState(12, { holes: next });
      h.rerender();
    };
  });
  stage.querySelector<HTMLElement>('#p12-stamp')!.onclick = () => {
    if (!sharp) {
      h.setErr('먼저 마이크로필름 XY 초점(X≈60, Y≈40)을 선명하게 맞춘 뒤 스탬프를 찍으세요.');
      return;
    }
    if (!holes[0] && holes[1] && !holes[2] && holes[3]) {
      h.solve(12, { fx, fy, holes, stamped: true }, '마이크로필름 좌표(2열 ★ · 4열 🌊) 천공 복원 & ARCHIVED 스탬프 완료!');
    } else {
      h.setErr('잘못 타공된 열이 있습니다! 다시 클릭해 보수 테이프로 막고 2열과 4열만 뚫으세요.');
    }
  };
}

function boardP13(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const cyan = Number(s.cyan ?? 0);
  const amber = Number(s.amber ?? 0);
  const scrubGrid = ((s.scrubGrid as boolean[]) || Array(24).fill(false)).slice(0, 24);
  const ph = Number((7.0 - cyan * 1.1 + amber * 2.2).toFixed(1));
  const phOk = cyan === 2 && amber === 1;
  const doneCnt = scrubGrid.filter(Boolean).length;
  const pct = Math.round((doneCnt / 24) * 100);

  stage.innerHTML = `
    <div class="au-board p-grid-2">
      <div class="p-card ${phOk ? 'ok' : ''}">
        <div style="font:800 13px sans-serif;color:${phOk ? '#52EFBF' : '#7CD8FF'}">① 3색 시약 스포이드 적정 (목표 pH 7.0)</div>
        <div style="margin:10px 0;padding:12px;background:#091015;border-radius:6px;text-align:center">
          <div style="font:900 24px monospace;color:${ph === 7.0 && phOk ? '#52EFBF' : '#FFB86B'}">pH ${ph.toFixed(1)}</div>
          <div style="font-size:12px;color:#9AA7B4;margin-top:4px">청록(🌊) ${cyan}방울 · 호박(☀) ${amber}방울</div>
        </div>
        <div class="p-row">
          <button class="s-btn" id="p13-cyan" style="border-color:#7CD8FF">🧪 청록 +1</button>
          <button class="s-btn" id="p13-amber" style="border-color:#E6C886">🧪 호박 +1</button>
          <button class="s-btn danger" id="p13-rinse">💧 증류수 헹굼</button>
        </div>
      </div>
      <div class="p-card ${pct >= 90 ? 'ok' : ''}" style="border-color:#C89D54">
        <div id="p13-sc-lbl" style="font:800 13px sans-serif;color:#E6C886;margin-bottom:8px">② 초음파 브러시 부식층 세척 (${pct}% · 타일을 문지르세요!)</div>
        <div id="p13-scrub" style="display:grid;grid-template-columns:repeat(6,1fr);gap:3px;background:#C89D54;padding:8px;border-radius:6px;user-select:none">
          ${scrubGrid
            .map(
              (c, i) =>
                `<div data-sc="${i}" style="height:28px;border-radius:3px;cursor:crosshair;background:${c ? 'rgba(255,228,150,0.22)' : '#2F7D63'};border:1px solid #0B0E13"></div>`
            )
            .join('')}
        </div>
        <button class="s-btn primary" style="width:100%;margin-top:10px" id="p13-done">✨ 청동 광택 검수 완료</button>
      </div>
    </div>
  `;

  stage.querySelector<HTMLElement>('#p13-cyan')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(13, { cyan: Math.min(5, cyan + 1) });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p13-amber')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(13, { amber: Math.min(5, amber + 1) });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p13-rinse')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(13, { cyan: 0, amber: 0 });
    h.rerender();
  };

  const scrubBox = stage.querySelector<HTMLElement>('#p13-scrub')!;
  let scrubbing = false;
  const paintCell = (el: HTMLElement | null) => {
    if (!el || !el.dataset.sc) return;
    const idx = Number(el.dataset.sc);
    if (!scrubGrid[idx]) {
      scrubGrid[idx] = true;
      el.style.background = 'rgba(255,228,150,0.22)';
      const done = scrubGrid.filter(Boolean).length;
      const lbl = stage.querySelector<HTMLElement>('#p13-sc-lbl');
      if (lbl) lbl.textContent = `② 초음파 브러시 부식층 세척 (${Math.round((done / 24) * 100)}% · 타일을 문지르세요!)`;
      h.patchState(13, { scrubGrid: [...scrubGrid] });
    }
  };
  scrubBox.addEventListener('pointerdown', (e) => {
    scrubbing = true;
    paintCell(e.target as HTMLElement);
  });
  window.addEventListener(
    'pointerup',
    () => {
      scrubbing = false;
    },
    { once: true }
  );
  scrubBox.addEventListener('pointermove', (e) => {
    if (scrubbing) paintCell(e.target as HTMLElement);
  });
  scrubBox.querySelectorAll<HTMLElement>('[data-sc]').forEach((d) => {
    d.onclick = () => paintCell(d);
  });

  stage.querySelector<HTMLElement>('#p13-done')!.onclick = () => {
    const donePct = Math.round((scrubGrid.filter(Boolean).length / 24) * 100);
    if (phOk && donePct >= 90) {
      h.solve(13, { cyan, amber, scrubGrid }, 'pH 7.0 시약 중화 및 청동 유물 초음파 세척 복원 완료!');
    } else {
      h.setErr(`시약(${cyan} 청록 / ${amber} 호박 → 목표 2:1) 또는 세척률(${donePct}% → 90% 이상)이 부족합니다.`);
    }
  };
}

function boardP14(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const rope = ((s.rope as number[]) || [100, 100, 100, 100]).slice(0, 4);
  const waxRot = ((s.waxRot as number[]) || [90, 180, 270]).slice(0, 3);
  const ropeDone = rope.every((v) => v === 0);
  const sealOk = waxRot.every((r) => r % 360 === 0);

  stage.innerHTML = `
    <div class="au-board p-grid-2">
      <div class="p-card ${ropeDone ? 'ok' : ''}">
        <div style="font:800 13px sans-serif;color:#E6C886;margin-bottom:8px">① 4점 도르래 대각선 이완 (#1→#3 먼저, 그다음 #2→#4)</div>
        <div class="p-grid-2" style="gap:8px">
          ${[0, 1, 3, 2]
            .map(
              (i) => `<div style="background:#1B242E;border:2px solid ${rope[i] === 0 ? '#52EFBF' : '#0B0E13'};border-radius:6px;padding:8px;text-align:center">
                <div class="p-mono" style="font-size:12px">모서리 #${i + 1}: ${rope[i]}%</div>
                <button class="s-btn" style="margin-top:6px;padding:4px 10px" data-rl="${i}" ${rope[i] === 0 ? 'disabled' : ''}>장력 0% 풀기</button>
              </div>`
            )
            .join('')}
        </div>
      </div>
      <div class="p-card ${ropeDone ? 'ok' : ''}">
        <div style="font:800 13px sans-serif;color:#FF8E8E;margin-bottom:8px">② 깨진 붉은 밀랍 봉인 3조각 회전(0°) &amp; 2초 압착</div>
        <div class="p-row" style="justify-content:center;margin:10px 0">
          ${waxRot
            .map(
              (r, i) => `<button class="s-btn ${r % 360 === 0 ? 'primary' : ''}" data-wx="${i}" ${!ropeDone ? 'disabled' : ''}>
                조각 ${i + 1}<br><strong>${r}°</strong>
              </button>`
            )
            .join('')}
        </div>
        <button class="s-btn primary" style="width:100%" id="p14-press">🔏 황동 인장 프레스 압착</button>
      </div>
    </div>
  `;

  stage.querySelectorAll<HTMLElement>('[data-rl]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.rl);
      if ((idx === 1 || idx === 3) && (rope[0] > 0 || rope[2] > 0)) {
        h.setErr('대각선 장력 불균형! 먼저 #1(좌상)과 #3(우하) 대각선 로프를 0%로 풀어야 상자가 뒤틀리지 않습니다.');
        return;
      }
      const next = [...rope];
      next[idx] = 0;
      soundEngine.playClick();
      h.patchState(14, { rope: next });
      h.setInfo(`모서리 #${idx + 1} 도르래 장력 안전 이완!`);
    };
  });
  stage.querySelectorAll<HTMLElement>('[data-wx]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.wx);
      const next = [...waxRot];
      next[idx] = (next[idx] + 90) % 360;
      soundEngine.playClick();
      h.patchState(14, { waxRot: next });
      h.rerender();
    };
  });
  stage.querySelector<HTMLElement>('#p14-press')!.onclick = () => {
    if (!ropeDone) {
      h.setErr('먼저 4모서리 도르래를 대각선 순서(#1·#3 → #2·#4)로 모두 0% 이완하세요.');
      return;
    }
    if (sealOk) {
      h.solve(14, { rope, waxRot, pressed: true }, '4점 대각선 이완 및 밀랍 봉인 압착 복원 완료!');
    } else {
      h.setErr('밀랍 3조각의 각도를 모두 0° 정방향으로 회전해 맞춘 뒤 압착하세요.');
    }
  };
}

function boardP15(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  let ox = Number(s.ox ?? 96);
  let oy = Number(s.oy ?? -48);
  const rot = Number(s.rot ?? 270);
  const dist = Math.hypot(ox, oy);
  const rotOk = rot % 360 === 0;
  const closeEnough = dist <= 12 && rotOk;

  stage.innerHTML = `
    <div class="au-board p-stack">
      <div class="p-row-between">
        <span style="font:800 13px sans-serif;color:#52EFBF">반투명 성곽 도면 드래그 &amp; 90° 회전 (현재 위치 ${Math.round(ox)}, ${Math.round(oy)} · ${rot}°)</span>
        <div class="p-row">
          <button class="s-btn" id="p15-rotl">↺ -90°</button>
          <button class="s-btn" id="p15-rotr">↻ +90°</button>
        </div>
      </div>
      <svg id="p15-svg" viewBox="0 0 420 200" style="width:100%;height:190px;background:#0D131A;border:2px solid #2B3947;border-radius:8px;touch-action:none;cursor:grab">
        <circle cx="110" cy="60" r="8" fill="${closeEnough ? '#52EFBF' : '#FFB86B'}"/><text x="110" y="45" text-anchor="middle" fill="#D5DFE8" font-size="10">성벽 종탑</text>
        <circle cx="310" cy="70" r="8" fill="${closeEnough ? '#52EFBF' : '#FFB86B'}"/><text x="310" y="55" text-anchor="middle" fill="#D5DFE8" font-size="10">Puerta Real</text>
        <circle cx="210" cy="150" r="8" fill="${closeEnough ? '#52EFBF' : '#FFB86B'}"/><text x="210" y="172" text-anchor="middle" fill="#D5DFE8" font-size="10">Baluarte</text>
        <g transform="translate(${ox} ${oy}) rotate(${rot} 210 100)" opacity="0.84">
          <rect x="65" y="25" width="290" height="150" rx="6" fill="rgba(230,214,184,0.18)" stroke="#E6D6B8" stroke-width="2" stroke-dasharray="6 4"/>
          <circle cx="110" cy="60" r="5" fill="#52EFBF"/>
          <circle cx="310" cy="70" r="5" fill="#52EFBF"/>
          <circle cx="210" cy="150" r="5" fill="#52EFBF"/>
          <polygon points="110,60 310,70 210,150" fill="rgba(82,239,191,0.12)" stroke="#52EFBF" stroke-width="2"/>
        </g>
      </svg>
      <div class="p-row-between">
        <div class="p-row">
          <button class="s-btn" data-nudge="-16,0">← 서</button>
          <button class="s-btn" data-nudge="0,-16">↑ 북</button>
          <button class="s-btn" data-nudge="0,16">↓ 남</button>
          <button class="s-btn" data-nudge="16,0">→ 동</button>
        </div>
        <button class="s-btn primary" id="p15-lock">📐 3개 성곽 앵커 포개기 확정</button>
      </div>
    </div>
  `;

  const svg = stage.querySelector<SVGSVGElement>('#p15-svg')!;
  let dragging = false;
  let sx = 0;
  let sy = 0;
  let ox0 = ox;
  let oy0 = oy;

  svg.onpointerdown = (e) => {
    dragging = true;
    svg.setPointerCapture(e.pointerId);
    sx = e.clientX;
    sy = e.clientY;
    ox0 = ox;
    oy0 = oy;
  };
  svg.onpointermove = (e) => {
    if (!dragging) return;
    ox = Math.max(-140, Math.min(140, ox0 + (e.clientX - sx)));
    oy = Math.max(-90, Math.min(90, oy0 + (e.clientY - sy)));
    const g = svg.querySelector('g');
    if (g) g.setAttribute('transform', `translate(${ox} ${oy}) rotate(${rot} 210 100)`);
  };
  svg.onpointerup = () => {
    if (dragging) {
      dragging = false;
      h.patchState(15, { ox, oy });
      h.rerender();
    }
  };
  stage.querySelector<HTMLElement>('#p15-rotl')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(15, { rot: (rot + 270) % 360 });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p15-rotr')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(15, { rot: (rot + 90) % 360 });
    h.rerender();
  };
  stage.querySelectorAll<HTMLElement>('[data-nudge]').forEach((b) => {
    b.onclick = () => {
      const [dx, dy] = (b.dataset.nudge || '0,0').split(',').map(Number);
      soundEngine.playClick();
      h.patchState(15, { ox: ox + dx, oy: oy + dy });
      h.rerender();
    };
  });
  stage.querySelector<HTMLElement>('#p15-lock')!.onclick = () => {
    if (closeEnough) {
      h.solve(15, { ox: 0, oy: 0, rot: 0 }, '성곽 건축 도면 트레이싱 오버레이 3점 정밀 일치 완료!');
    } else {
      h.setErr(`회전(${rot}°→0°)과 좌표(${Math.round(ox)}, ${Math.round(oy)} → ±12px 이내)를 3개 앵커 핀 위로 더 가까이 맞추세요.`);
    }
  };
}

function boardP16(
  stage: HTMLElement,
  s: Record<string, unknown>,
  h: BoardHelpers,
  extraActions?: {
    sendHere?: () => void;
    gotoAtrium?: () => void;
    closeModal?: () => void;
  }
) {
  const prisms = ((s.prisms as number[]) || [0, 45, 45]).slice(0, 3);
  const beamOk = prisms[0] === 45 && prisms[1] === 135 && prisms[2] === 90;
  const hereSent = Boolean(s.hereSent);
  const pads = ((s.pads as boolean[]) || [false, false, false, false]).slice(0, 4);
  const padsCnt = pads.filter(Boolean).length;

  if (beamOk && !s.beamReachedAtrium) {
    h.patchState(16, { beamReachedAtrium: true });
  }

  stage.innerHTML = `
    <div class="au-board p-stack">
      <div class="p-card ${beamOk ? 'ok' : 'warn'}">
        <div style="font:800 13px sans-serif;color:${beamOk ? '#52EFBF' : '#FFD86B'};margin-bottom:8px">
          1부 · 기획전시실 3프리즘 광학 굴절 (목표: M1=45°, M2=135°, M3=90° → 2F 반원 홀 동상)
        </div>
        <svg viewBox="0 0 420 115" style="width:100%;height:112px;background:#090E12;border:2px solid #23303B;border-radius:6px">
          <line x1="15" y1="30" x2="110" y2="30" stroke="#FFD86B" stroke-width="4"/>
          <line x1="110" y1="30" x2="${prisms[0] === 45 ? 110 : 195}" y2="${prisms[0] === 45 ? 85 : 30}" stroke="#FFD86B" stroke-width="4" opacity="${prisms[0] === 45 ? 1 : 0.35}"/>
          ${prisms[0] === 45 ? `<line x1="110" y1="85" x2="${prisms[1] === 135 ? 310 : 210}" y2="85" stroke="#52EFBF" stroke-width="4"/>` : ''}
          ${beamOk ? `<line x1="310" y1="85" x2="310" y2="14" stroke="#7CD8FF" stroke-width="5"/><circle cx="310" cy="14" r="6" fill="#52EFBF"/>` : ''}
          <rect x="92" y="18" width="36" height="24" rx="4" fill="#1C2936" stroke="#7CD8FF" stroke-width="2"/><text x="110" y="34" text-anchor="middle" fill="#fff" font-size="9">M1:${prisms[0]}°</text>
          <rect x="92" y="72" width="36" height="24" rx="4" fill="#1C2936" stroke="#7CD8FF" stroke-width="2"/><text x="110" y="88" text-anchor="middle" fill="#fff" font-size="9">M2:${prisms[1]}°</text>
          <rect x="292" y="72" width="36" height="24" rx="4" fill="#1C2936" stroke="#7CD8FF" stroke-width="2"/><text x="310" y="88" text-anchor="middle" fill="#fff" font-size="9">M3:${prisms[2]}°</text>
          <text x="372" y="20" text-anchor="middle" fill="${beamOk ? '#52EFBF' : '#889'}" font-size="10">→ 2F 반원 홀 동상</text>
        </svg>
        <div class="p-row" style="margin-top:8px">
          ${[0, 1, 2]
            .map(
              (i) =>
                `<button class="s-btn ${prisms[i] === [45, 135, 90][i] ? 'primary' : ''}" data-pr="${i}">프리즘 M${i + 1} 회전 (${prisms[i]}°)</button>`
            )
            .join('')}
        </div>
      </div>

      <div class="p-card ${padsCnt === 4 && hereSent && beamOk ? 'ok' : ''}">
        <div class="p-row-between" style="margin-bottom:8px">
          <strong style="color:#E6C886">2부 · 모달 없는 인게임 필드 집결 안내 (${padsCnt}/4 · 2F 반원 홀)</strong>
          <div class="p-row">
            <button class="s-btn amber" id="p16-here">${hereSent ? '✔ [집결 호출 HERE] 발신됨' : '📍 린 [집결 호출 HERE] 발신'}</button>
            <button class="s-btn primary" id="p16-goto">🏃 모달 닫고 2F 반원 홀로 이동</button>
          </div>
        </div>
        <div class="p-grid-4">
          ${(['doyun', 'maria', 'lin', 'aisha'] as const)
            .map((rid, i) => {
              const rr = ROLES[rid];
              return `<div class="p-pad-chip ${pads[i] ? 'active' : ''}" style="border-color:${rr.color}">
                <span>${rr.badge} ${rr.name}</span>
                <small>${pads[i] ? '✔ 발판 착지' : `gather-${i + 1}`}</small>
              </div>`;
            })
            .join('')}
        </div>
        <p class="clue-note" style="margin-top:8px">
          1부 프리즘 광선을 맞춘 뒤 모달을 닫고 <strong>2층 반원 홀 바닥 발판(gather-1~4) 위에 4명 전원이 동시에 올라서면</strong> 대관식 엔딩이 자동 실행됩니다!
        </p>
      </div>
    </div>
  `;

  stage.querySelectorAll<HTMLElement>('[data-pr]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.pr);
      const next = [...prisms];
      next[idx] = (next[idx] + 45) % 180;
      const nextBeam = next[0] === 45 && next[1] === 135 && next[2] === 90;
      soundEngine.playClick();
      h.patchState(16, { prisms: next, beamReachedAtrium: nextBeam });
      if (nextBeam) {
        h.setInfo('1부 광학 프리즘 연결 완료! 태양 광선이 2F 반원 홀 여신상으로 쏘아졌습니다!');
      } else {
        h.rerender();
      }
    };
  });

  stage.querySelector<HTMLElement>('#p16-here')!.onclick = () => {
    if (!beamOk) {
      h.setErr('먼저 1부 프리즘 3개(M1=45°, M2=135°, M3=90°)를 맞춰 반원 홀로 빛을 보내세요.');
      return;
    }
    extraActions?.sendHere?.();
    h.setInfo('린이 [집결 호출 HERE] 무전을 발신했습니다! 이제 2F 반원 홀 발판 4곳에 모여 주세요.');
  };

  stage.querySelector<HTMLElement>('#p16-goto')!.onclick = () => {
    extraActions?.gotoAtrium?.();
    extraActions?.closeModal?.();
  };
}
