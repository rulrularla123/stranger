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
  const hint = h.difficulty.showTargetHints;
  const cur = slots[activeSlot] || slots[0];
  const sylIdx = Math.max(0, syls.findIndex((x) => x.k === cur.syl));
  const kudIdx = Math.max(0, kudlits.findIndex((x) => x.k === cur.kudlit));
  const innerDeg = -sylIdx * 60;
  const outerDeg = (1 - kudIdx) * 45;

  const word = slots
    .map((sl) => {
      const vowel = sl.kudlit === 'up' ? 'I' : sl.kudlit === 'down' ? 'U' : 'A';
      return sl.syl[0] + vowel;
    })
    .join(' - ');

  stage.innerHTML = `
    <div class="au-board p-grid-auto-1">
      <div class="p-center p-stack" style="align-items:center">
        <svg viewBox="0 0 210 210" width="204" height="204" class="p-svg-interactive">
          <circle cx="105" cy="105" r="98" fill="#141C26" stroke="#91A8FF" stroke-width="3"/>
          <g transform="rotate(${outerDeg} 105 105)">
            <circle cx="105" cy="105" r="88" fill="none" stroke="rgba(145,168,255,0.4)" stroke-dasharray="4 4"/>
            <text x="58" y="34" text-anchor="middle" fill="#91A8FF" font-size="10" font-weight="800" transform="rotate(-45 105 105)">● 위(i)</text>
            <text x="105" y="25" text-anchor="middle" fill="#52EFBF" font-size="10" font-weight="800">○ 무점(a)</text>
            <text x="152" y="34" text-anchor="middle" fill="#91A8FF" font-size="10" font-weight="800" transform="rotate(45 105 105)">● 아래(u)</text>
          </g>
          <g transform="rotate(${innerDeg} 105 105)">
            <circle cx="105" cy="105" r="64" fill="#1D2733" stroke="#E6C886" stroke-width="3"/>
            ${syls
              .map((x, idx) => {
                const rad = ((idx * 60 - 90) * Math.PI) / 180;
                const tx = Math.round(105 + Math.cos(rad) * 44);
                const ty = Math.round(105 + Math.sin(rad) * 44) + 5;
                return `<text x="${tx}" y="${ty}" text-anchor="middle" fill="${
                  cur.syl === x.k ? '#FFD86B' : '#B9C7D4'
                }" font-size="16" font-weight="900">${x.ch}</text>`;
              })
              .join('')}
          </g>
          <polygon points="105,6 99,16 111,16" fill="#FFD86B"/>
          <circle cx="105" cy="105" r="21" fill="#0F151D" stroke="#C89D54" stroke-width="2"/>
          <text x="105" y="109" text-anchor="middle" fill="#FFD86B" font-size="11" font-weight="900">${cur.syl}</text>
        </svg>
        <div class="p-row">
          <button class="s-btn" id="p11-in-rot">내륜 자음 ↻</button>
          <button class="s-btn" id="p11-out-rot">외륜 Kudlit ↻</button>
          <button class="s-btn" id="p11-speak">🔊 발음 낭독</button>
        </div>
      </div>

      <div class="p-stack">
        <div class="p-grid-3">
          ${slots
            .map((sl, i) => {
              const glyph = syls.find((x) => x.k === sl.syl)?.ch || '?';
              const dotTop = sl.kudlit === 'up' ? '●' : '';
              const dotBot = sl.kudlit === 'down' ? '●' : '';
              const pron = sl.kudlit === 'none' ? sl.syl : sl.syl[0] + (sl.kudlit === 'up' ? 'I' : 'U');
              return `<button class="s-btn ${activeSlot === i ? 'primary' : ''}" data-slot="${i}" style="padding:8px;flex-direction:column;gap:2px">
                <div style="font-size:10px;color:#91A8FF;height:11px">${dotTop}</div>
                <div style="font-size:22px;line-height:1">${glyph}</div>
                <div style="font-size:10px;color:#91A8FF;height:11px">${dotBot}</div>
                <div style="font-size:11px">${i + 1}번째 (${pron})</div>
              </button>`;
            })
            .join('')}
        </div>
        <div class="p-card" style="border-color:#C89D54">
          <div class="p-row-between" style="margin-bottom:8px;flex-wrap:wrap;gap:6px">
            <span style="font:800 12px sans-serif;color:#E6C886">${activeSlot + 1}번 칸 내륜 자음:</span>
            <div class="p-row">
              ${syls.map((x) => `<button class="s-btn ${cur.syl === x.k ? 'amber' : ''}" data-syl="${x.k}">${x.ch} ${x.k[0]}</button>`).join('')}
            </div>
          </div>
          <div class="p-row-between" style="flex-wrap:wrap;gap:6px">
            <span style="font:800 12px sans-serif;color:#91A8FF">${activeSlot + 1}번 칸 외륜 Kudlit:</span>
            <div class="p-row">
              ${kudlits.map((x) => `<button class="s-btn ${cur.kudlit === x.k ? 'primary' : ''}" data-kud="${x.k}">${x.lbl}</button>`).join('')}
            </div>
          </div>
        </div>
        <div class="p-row-between">
          <span style="font:800 14px monospace;color:#FFD86B">실시간 음독: ${word}${word === 'KA - LA - YA' && hint ? ' → KALAYAAN (자유!)' : ''}</span>
          <button class="s-btn primary" id="p11-check">🔱 비밀 헌장 해독 승인</button>
        </div>
      </div>
    </div>
  `;

  stage.querySelector<HTMLElement>('#p11-in-rot')!.onclick = () => {
    soundEngine.playClick();
    slots[activeSlot].syl = syls[(sylIdx + 1) % syls.length].k;
    h.patchState(11, { slots });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p11-out-rot')!.onclick = () => {
    soundEngine.playClick();
    slots[activeSlot].kudlit = kudlits[(kudIdx + 1) % kudlits.length].k;
    h.patchState(11, { slots });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p11-speak')!.onclick = () => {
    soundEngine.playRadio();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(word.replaceAll(' - ', ' '));
        utter.lang = 'en-US';
        utter.rate = 0.85;
        window.speechSynthesis.speak(utter);
      } catch {
        // ignore speech synthesis issues
      }
    }
  };
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
      h.setErr(
        hint
          ? `현재 조합(${word})이 카티푸난 암호 KA - LA - YA (모두 무점)와 다릅니다.`
          : `현재 음독(${word})이 헌장의 자유(Kalayaan) 암호와 다릅니다. 카이·서하린의 단서를 확인하세요.`
      );
    }
  };
}

function boardP12(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const fx = Number(s.fx ?? 15);
  const fy = Number(s.fy ?? 85);
  const punchGrid =
    Array.isArray(s.punchGrid) && s.punchGrid.length === 16
      ? [...(s.punchGrid as boolean[])]
      : Array(16).fill(false);
  const hint = h.difficulty.showTargetHints;

  const dist = Math.abs(fx - 60) + Math.abs(fy - 40);
  const sharp = dist <= 12;

  const rowSyms = [
    { key: 'SUN', label: '☀ 태양' },
    { key: 'STAR', label: '★ 별자리' },
    { key: 'MTN', label: '⛰ 산맥' },
    { key: 'WAVE', label: '🌊 파도' },
  ];

  stage.innerHTML = `
    <div class="au-board p-grid-2">
      <div class="p-card ${sharp ? 'ok' : 'warn'}">
        <div style="font:800 13px sans-serif;color:${sharp ? '#52EFBF' : '#FFB86B'};margin-bottom:6px">
          ① 🧭 린 · 마이크로필름 XY 스캐너 상태
        </div>
        <p style="margin:0;font-size:13px;color:#DCE6EE;line-height:1.55">
          ${
            sharp
              ? '✔ 린이 마이크로필름 초점 정렬을 완료했습니다!<br/>린이 무전으로 알려준 열·문양 좌표만 오른쪽 카드에 타공하세요.'
              : '🔒 <strong>린의 도움이 필요합니다</strong><br/>린이 동측 책상(archive-side-desk-e)에서 마이크로필름 XY 초점을 맞추고 타공 좌표를 무전으로 알려줄 때까지 기다리세요.'
          }
        </p>
      </div>
      <div style="background:#E6D6B8;border:3px solid #705638;border-radius:8px;padding:12px;color:#1F170F">
        <div class="p-row-between" style="margin-bottom:6px">
          <div style="font:900 13px sans-serif">② 📜 이안 · 4열 × 4행 천공 카드</div>
          <button class="s-btn" id="p12-tape" style="padding:3px 8px;font-size:11px">🩹 보수 테이프</button>
        </div>
        <div class="p-punch-grid-4x4">
          <div></div>
          ${[1, 2, 3, 4].map((c) => `<div class="p-punch-colhead">${c}열</div>`).join('')}
          ${rowSyms
            .map(
              (rs, rIdx) => `
              <div class="p-punch-rowhead">${rs.label}</div>
              ${[0, 1, 2, 3]
                .map((cIdx) => {
                  const idx = rIdx * 4 + cIdx;
                  const punched = punchGrid[idx];
                  return `<button data-phole="${idx}" class="p-punch-cell ${punched ? 'punched' : ''}" title="${cIdx + 1}열 ${rs.label}"></button>`;
                })
                .join('')}
            `
            )
            .join('')}
        </div>
        <button class="s-btn primary" style="width:100%;margin-top:8px" id="p12-stamp">🔖 천공 카드 ARCHIVED 스탬프</button>
      </div>
    </div>
  `;

  stage.querySelector<HTMLElement>('#p12-tape')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(12, { punchGrid: Array(16).fill(false) });
    h.rerender();
  };

  stage.querySelectorAll<HTMLElement>('[data-phole]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.phole);
      const next = [...punchGrid];
      next[idx] = !next[idx];
      soundEngine.playClick();
      h.patchState(12, { punchGrid: next });
      h.rerender();
    };
  });

  stage.querySelector<HTMLElement>('#p12-stamp')!.onclick = () => {
    if (!sharp) {
      h.setErr('먼저 린이 마이크로필름 XY 초점을 맞춰야 천공 카드 스탬프를 찍을 수 있습니다.');
      return;
    }
    const exactMatch = punchGrid.every((v, idx) => (idx === 5 || idx === 15 ? v : !v));
    if (exactMatch) {
      h.solve(12, { fx, fy, punchGrid, stamped: true }, '마이크로필름 좌표(2열 ★ · 4열 🌊) 4×4 천공 복원 & ARCHIVED 스탬프 완료!');
    } else {
      h.setErr(
        hint
          ? '잘못 타공된 구멍이 있습니다! 보수 테이프로 막고 [2열 ★]과 [4열 🌊] 칸만 타공하세요.'
          : '잘못 타공된 구멍이 있습니다! 보수 테이프로 메우고 린의 무전 좌표에 맞는 열과 문양만 뚫으세요.'
      );
    }
  };
}

function boardP13(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const valveOpen = Boolean(s.valveOpen);
  const cyan = Number(s.cyan ?? 0);
  const amber = Number(s.amber ?? 0);
  const clear = Number(s.clear ?? 0);
  const scrubGrid = ((s.scrubGrid as boolean[]) || Array(24).fill(false)).slice(0, 24);
  const ph = Number((7.0 - cyan * 1.1 + amber * 2.2 - clear * 0.6).toFixed(1));
  const phOk = cyan === 2 && amber === 1 && clear === 0;
  const doneCnt = scrubGrid.filter(Boolean).length;
  const pct = Math.round((doneCnt / 24) * 100);
  const hint = h.difficulty.showTargetHints;

  stage.innerHTML = `
    <div class="au-board p-stack">
      <div class="p-card ${valveOpen ? 'ok' : 'warn'}">
        <span style="font:800 12px sans-serif;color:${valveOpen ? '#52EFBF' : '#FFB86B'}">
          ⚙ 서하린 · 시약 공급 안전 밸브: ${valveOpen ? '개방됨 ✔ (스포이드 사용 가능)' : '잠김 🔒 — 서하린이 약품 보관장(preserve-cabinet-1/2)에서 열어야 합니다'}
        </span>
      </div>

      <div class="p-grid-2">
        <div class="p-card ${phOk ? 'ok' : ''}">
          <div style="font:800 13px sans-serif;color:${phOk ? '#52EFBF' : '#7CD8FF'}">① 3색 시약 스포이드 적정 (목표 pH 7.0)</div>
          <div style="margin:10px 0;padding:10px;background:#091015;border-radius:6px;text-align:center">
            <div style="font:900 24px monospace;color:${ph === 7.0 && phOk ? '#52EFBF' : '#FFB86B'}">pH ${ph.toFixed(1)}</div>
            <div style="font-size:11px;color:#9AA7B4;margin-top:4px">청록(🌊) ${cyan} · 호박(☀) ${amber} · 투명 ${clear}방울</div>
          </div>
          <div class="p-row" style="flex-wrap:wrap">
            <button class="s-btn" id="p13-cyan" style="border-color:#7CD8FF" ${!valveOpen ? 'disabled' : ''}>🧪 청록 +1</button>
            <button class="s-btn" id="p13-amber" style="border-color:#E6C886" ${!valveOpen ? 'disabled' : ''}>🧪 호박 +1</button>
            <button class="s-btn" id="p13-clear" style="border-color:#9AA7B4" ${!valveOpen ? 'disabled' : ''}>🧪 투명 +1</button>
            <button class="s-btn danger" id="p13-rinse">💧 증류수 헹굼</button>
          </div>
        </div>
        <div class="p-card ${pct >= 90 ? 'ok' : ''}" style="border-color:#C89D54">
          <div id="p13-sc-lbl" style="font:800 13px sans-serif;color:#E6C886;margin-bottom:8px">② 초음파 브러시 부식층 세척 (${pct}% · 타일을 문지르세요!)</div>
          <div id="p13-scrub" style="display:grid;grid-template-columns:repeat(6,1fr);gap:3px;background:#C89D54;padding:8px;border-radius:6px;user-select:none;touch-action:none">
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
  stage.querySelector<HTMLElement>('#p13-clear')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(13, { clear: Math.min(5, clear + 1) });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p13-rinse')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(13, { cyan: 0, amber: 0, clear: 0 });
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
  const onPointerUp = () => {
    scrubbing = false;
  };
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  h.registerCleanup(() => {
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  });

  scrubBox.addEventListener('pointerdown', (e) => {
    scrubbing = true;
    paintCell(e.target as HTMLElement);
  });
  scrubBox.addEventListener('pointermove', (e) => {
    if (scrubbing) paintCell(e.target as HTMLElement);
  });
  scrubBox.querySelectorAll<HTMLElement>('[data-sc]').forEach((d) => {
    d.onclick = () => paintCell(d);
  });

  stage.querySelector<HTMLElement>('#p13-done')!.onclick = () => {
    if (!valveOpen) {
      h.setErr('먼저 서하린이 약품 보관장 시약 공급 밸브를 개방해야 시약 중화를 진행할 수 있습니다.');
      return;
    }
    const donePct = Math.round((scrubGrid.filter(Boolean).length / 24) * 100);
    if (phOk && donePct >= 90) {
      h.solve(13, { valveOpen: true, cyan, amber, clear, scrubGrid }, 'pH 7.0 시약 중화 및 청동 유물 초음파 세척 복원 완료!');
    } else {
      h.setErr(
        hint
          ? `시약(${cyan} 청록 / ${amber} 호박 / ${clear} 투명 → 목표 2:1:0) 또는 세척률(${donePct}% → 90% 이상)이 부족합니다.`
          : `중화 pH(${ph.toFixed(1)} → 7.0) 또는 초음파 세척률(${donePct}% → 90% 이상)을 이안의 공정 노트 무전에 맞춰 완성하세요.`
      );
    }
  };
}

function boardP14(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const rope = ((s.rope as number[]) || [100, 100, 100, 100]).slice(0, 4);
  const waxRot = ((s.waxRot as number[]) || [90, 180, 270]).slice(0, 3);
  const ropeDone = rope.every((v) => v === 0);
  const sealOk = waxRot.every((r) => r % 360 === 0);
  const holdSec = (h.difficulty.p14HoldMs / 1000).toFixed(1);
  const hint = h.difficulty.showTargetHints;

  stage.innerHTML = `
    <div class="au-board p-grid-2">
      <div class="p-card ${ropeDone ? 'ok' : ''}">
        <div style="font:800 13px sans-serif;color:#E6C886;margin-bottom:8px">① 4점 도르래 장력 평형 슬라이더${hint ? ' (#1→#3 먼저, 그다음 #2→#4)' : ''}</div>
        <div class="p-grid-2" style="gap:8px">
          ${[0, 1, 3, 2]
            .map(
              (i) => `<div style="background:#1B242E;border:2px solid ${rope[i] === 0 ? '#52EFBF' : '#0B0E13'};border-radius:6px;padding:8px;text-align:center">
                <div class="p-mono" style="font-size:12px">모서리 #${i + 1}: <strong>${rope[i]}%</strong></div>
                <input type="range" min="0" max="100" step="25" value="${rope[i]}" data-rl="${i}" style="width:100%;margin-top:6px" ${rope[i] === 0 ? 'disabled' : ''}/>
              </div>`
            )
            .join('')}
        </div>
      </div>
      <div class="p-card ${ropeDone ? 'ok' : ''}">
        <div style="font:800 13px sans-serif;color:#FF8E8E;margin-bottom:8px">② 깨진 붉은 밀랍 봉인 3조각 회전(0°) &amp; ${holdSec}초 압착</div>
        <div class="p-row" style="justify-content:center;margin:10px 0">
          ${waxRot
            .map(
              (r, i) => `<button class="s-btn ${r % 360 === 0 ? 'primary' : ''}" data-wx="${i}" ${!ropeDone ? 'disabled' : ''}>
                조각 ${i + 1}<br><strong>${r}°</strong>
              </button>`
            )
            .join('')}
        </div>
        <div class="p-hold-bar" style="margin-bottom:8px"><div id="p14-hold-fill" class="p-hold-fill" style="width:0%"></div></div>
        <button class="s-btn primary" style="width:100%" id="p14-press">🔏 황동 인장 프레스 (${holdSec}초 꾹 누르기)</button>
      </div>
    </div>
  `;

  stage.querySelectorAll<HTMLInputElement>('[data-rl]').forEach((inp) => {
    inp.onchange = () => {
      const idx = Number(inp.dataset.rl);
      const val = Number(inp.value);
      if ((idx === 1 || idx === 3) && val < 100 && (rope[0] > 0 || rope[2] > 0)) {
        inp.value = String(rope[idx]);
        h.setErr('대각선 장력 불균형! 반대편 로프(#1 좌상 · #3 우하)를 먼저 0%로 푸세요.');
        return;
      }
      const next = [...rope];
      next[idx] = val;
      soundEngine.playClick();
      h.patchState(14, { rope: next });
      if (val === 0) {
        h.setInfo(`모서리 #${idx + 1} 도르래 장력 0% 안전 이완!`);
      } else {
        h.rerender();
      }
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

  const pressBtn = stage.querySelector<HTMLButtonElement>('#p14-press')!;
  let pressTimer: number | null = null;
  let pressPct = 0;
  const stopPress = (early: boolean) => {
    if (pressTimer === null) return;
    window.clearInterval(pressTimer);
    pressTimer = null;
    if (early && pressPct < 100) {
      pressPct = 0;
      const fill = stage.querySelector<HTMLElement>('#p14-hold-fill');
      if (fill) fill.style.width = '0%';
      h.setErr(`황동 인장 프레스를 끝까지(${holdSec}초) 꾹 눌러 밀랍을 고정하세요!`);
    }
  };
  h.registerCleanup(() => {
    if (pressTimer !== null) window.clearInterval(pressTimer);
  });

  pressBtn.addEventListener('pointerdown', () => {
    if (!ropeDone) {
      h.setErr('먼저 4모서리 도르래를 대각선 순서로 모두 0% 이완하세요.');
      return;
    }
    if (!sealOk) {
      h.setErr('밀랍 3조각의 각도를 모두 0° 정방향으로 회전해 맞춘 뒤 압착하세요.');
      return;
    }
    if (pressTimer !== null) return;
    pressPct = 0;
    const stepPer50Ms = (100 / h.difficulty.p14HoldMs) * 50;
    soundEngine.playClick();
    pressTimer = window.setInterval(() => {
      pressPct = Math.min(100, pressPct + stepPer50Ms);
      const fill = stage.querySelector<HTMLElement>('#p14-hold-fill');
      if (fill) fill.style.width = `${Math.round(pressPct)}%`;
      if (pressPct >= 100) {
        stopPress(false);
        h.solve(14, { rope, waxRot, pressed: true }, '4점 대각선 이완 및 밀랍 봉인 압착 복원 완료!');
      }
    }, 50);
  });
  pressBtn.addEventListener('pointerup', () => stopPress(true));
  pressBtn.addEventListener('pointerleave', () => stopPress(true));
  pressBtn.addEventListener('pointercancel', () => stopPress(true));
}

function transformAnchor(px: number, py: number, ox: number, oy: number, rotDeg: number): [number, number] {
  const rad = (rotDeg * Math.PI) / 180;
  const dx = px - 210;
  const dy = py - 100;
  return [
    210 + dx * Math.cos(rad) - dy * Math.sin(rad) + ox,
    100 + dx * Math.sin(rad) + dy * Math.cos(rad) + oy,
  ];
}

function boardP15(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  let ox = Number(s.ox ?? 96);
  let oy = Number(s.oy ?? -48);
  const rot = Number(s.rot ?? 270);
  const tol = h.difficulty.p15TolerancePx;
  const anchors: [number, number, string][] = [
    [110, 60, '성벽 종탑'],
    [310, 70, 'Puerta Real'],
    [210, 150, 'Baluarte'],
  ];

  const getPinMatches = (cx: number, cy: number, rDeg: number) =>
    anchors.map(([ax, ay]) => {
      const [tx, ty] = transformAnchor(ax, ay, cx, cy, rDeg);
      return Math.hypot(tx - ax, ty - ay) <= tol;
    });

  const pinMatches = getPinMatches(ox, oy, rot);
  const matchedCnt = pinMatches.filter(Boolean).length;

  stage.innerHTML = `
    <div class="au-board p-stack">
      <div class="p-row-between">
        <span id="p15-status" style="font:800 13px sans-serif;color:${matchedCnt === 3 ? '#52EFBF' : '#E6C886'}">
          반투명 성곽 도면 드래그 &amp; 90° 회전 (일치 앵커 ${matchedCnt}/3 · 허용 오차 ±${tol}px · ${rot}°)
        </span>
        <div class="p-row">
          <button class="s-btn" id="p15-rotl">↺ -90°</button>
          <button class="s-btn" id="p15-rotr">↻ +90°</button>
        </div>
      </div>
      <svg id="p15-svg" viewBox="0 0 420 200" style="width:100%;height:190px;background:#0D131A;border:2px solid #2B3947;border-radius:8px;touch-action:none;cursor:grab">
        ${anchors
          .map(
            ([ax, ay, lbl], idx) => `
          <circle id="p15-pin-${idx}" cx="${ax}" cy="${ay}" r="9" fill="${pinMatches[idx] ? '#52EFBF' : '#FFB86B'}" stroke="#0B0E13" stroke-width="2"/>
          <text x="${ax}" y="${idx === 2 ? ay + 22 : ay - 15}" text-anchor="middle" fill="#D5DFE8" font-size="10">${lbl}</text>
        `
          )
          .join('')}
        <g id="p15-paper" transform="translate(${ox} ${oy}) rotate(${rot} 210 100)" opacity="0.84">
          <rect x="65" y="25" width="290" height="150" rx="6" fill="rgba(230,214,184,0.18)" stroke="#E6D6B8" stroke-width="2" stroke-dasharray="6 4"/>
          <circle cx="110" cy="60" r="5" fill="#52EFBF"/>
          <circle cx="310" cy="70" r="5" fill="#52EFBF"/>
          <circle cx="210" cy="150" r="5" fill="#52EFBF"/>
          <polygon points="110,60 310,70 210,150" fill="rgba(82,239,191,0.12)" stroke="#52EFBF" stroke-width="2"/>
        </g>
      </svg>
      <div class="p-row-between">
        <div class="p-row">
          <button class="s-btn" data-nudge="-8,0">← 서</button>
          <button class="s-btn" data-nudge="0,-8">↑ 북</button>
          <button class="s-btn" data-nudge="0,8">↓ 남</button>
          <button class="s-btn" data-nudge="8,0">→ 동</button>
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

  const updatePinsDom = () => {
    const matches = getPinMatches(ox, oy, rot);
    const cnt = matches.filter(Boolean).length;
    matches.forEach((ok, idx) => {
      const el = svg.querySelector(`#p15-pin-${idx}`);
      if (el) el.setAttribute('fill', ok ? '#52EFBF' : '#FFB86B');
    });
    const st = stage.querySelector<HTMLElement>('#p15-status');
    if (st) {
      st.style.color = cnt === 3 ? '#52EFBF' : '#E6C886';
      st.textContent = `반투명 성곽 도면 드래그 & 90° 회전 (일치 앵커 ${cnt}/3 · 허용 오차 ±${tol}px · ${rot}°)`;
    }
  };

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
    const rect = svg.getBoundingClientRect();
    const scaleX = rect.width > 0 ? 420 / rect.width : 1;
    const scaleY = rect.height > 0 ? 200 / rect.height : 1;
    ox = Math.max(-140, Math.min(140, ox0 + (e.clientX - sx) * scaleX));
    oy = Math.max(-90, Math.min(90, oy0 + (e.clientY - sy) * scaleY));
    const g = svg.querySelector('#p15-paper');
    if (g) g.setAttribute('transform', `translate(${ox} ${oy}) rotate(${rot} 210 100)`);
    updatePinsDom();
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
      h.patchState(15, {
        ox: Math.max(-140, Math.min(140, ox + dx)),
        oy: Math.max(-90, Math.min(90, oy + dy)),
      });
      h.rerender();
    };
  });
  stage.querySelector<HTMLElement>('#p15-lock')!.onclick = () => {
    const finalMatches = getPinMatches(ox, oy, rot);
    if (rot % 360 === 0 && finalMatches.every(Boolean)) {
      h.solve(15, { ox: 0, oy: 0, rot: 0 }, '성곽 건축 도면 트레이싱 오버레이 3점 정밀 일치 완료!');
    } else {
      h.setErr(`회전(${rot}°)과 3개 앵커 핀(현재 ${finalMatches.filter(Boolean).length}/3 일치, 오차 ±${tol}px 이내)을 모두 민트색으로 맞춘 뒤 확정하세요.`);
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
  const mountUnlocked = Boolean(s.mountUnlocked);
  const beamOk = mountUnlocked && prisms[0] === 45 && prisms[1] === 135 && prisms[2] === 90;
  const hereSent = Boolean(s.hereSent);
  const pads = ((s.pads as boolean[]) || [false, false, false, false]).slice(0, 4);
  const padsCnt = pads.filter(Boolean).length;
  const hint = h.difficulty.showTargetHints;

  if (beamOk && !s.beamReachedAtrium) {
    h.patchState(16, { beamReachedAtrium: true });
  }

  stage.innerHTML = `
    <div class="au-board p-stack">
      <div class="p-card ${mountUnlocked ? 'ok' : 'warn'}">
        <span style="font:800 12px sans-serif;color:${mountUnlocked ? '#52EFBF' : '#FFB86B'}">
          ⚙ 서하린 · 목선 거치대 회전 베어링: ${mountUnlocked ? '잠금 해제됨 ✔ (프리즘 회전 가능)' : '잠김 🔒 — 서하린이 목선 진열장(special-boat-nw)에서 베어링을 풀어야 프리즘을 돌릴 수 있습니다'}
        </span>
      </div>
      <div class="p-card ${beamOk ? 'ok' : 'warn'}">
        <div style="font:800 13px sans-serif;color:${beamOk ? '#52EFBF' : '#FFD86B'};margin-bottom:8px">
          1부 · 기획전시실 3프리즘 광학 굴절 ${hint ? '(목표: M1=45°, M2=135°, M3=90° → 2F 반원 홀 동상)' : '(이안·서하린 단서에 맞춰 2F 반원 홀로 광선 연결)'}
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
                `<button class="s-btn ${hint && prisms[i] === [45, 135, 90][i] ? 'primary' : ''}" data-pr="${i}" ${!mountUnlocked ? 'disabled' : ''}>프리즘 M${i + 1} 회전 (${prisms[i]}°)</button>`
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
          1~3막(P01~P15)을 모두 복원하고 프리즘 광선을 맞춘 뒤, <strong>2층 반원 홀 바닥 발판(gather-1~4) 위에 4명 전원이 동시에 올라서면</strong> 대관식 엔딩이 자동 실행됩니다!
        </p>
      </div>
    </div>
  `;

  stage.querySelectorAll<HTMLElement>('[data-pr]').forEach((b) => {
    b.onclick = () => {
      if (!mountUnlocked) {
        h.setErr('먼저 서하린이 목선 진열장(special-boat-nw)에서 프리즘 거치대 잠금을 해제해야 합니다.');
        return;
      }
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
      h.setErr('먼저 1부 프리즘 3개를 맞춰 2F 반원 홀로 빛을 보내세요.');
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
