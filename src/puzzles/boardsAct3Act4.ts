import type { PuzzleDef } from '../types/stranger.ts';
import { ROLES } from '../data/cMenuTokens.ts';
import { soundEngine } from '../audio/soundEngine.ts';
import type { BoardHelpers } from './boardsAct1Act2.ts';
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
    priorDone?: number;
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

/* -------------------------------------------------------------------------- *
 * P11 · 바이바이인 이중 암호판
 * -------------------------------------------------------------------------- */
function boardP11(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const activeSlot = Math.max(0, Math.min(2, Number(s.activeSlot ?? 0)));
  const slots = (
    (s.slots as { syl: string; kudlit: string }[]) || [
      { syl: 'BA', kudlit: 'down' },
      { syl: 'MA', kudlit: 'up' },
      { syl: 'PA', kudlit: 'down' },
    ]
  ).map((sl) => ({ ...sl }));

  const syls = [
    { k: 'BA', kor: '바' },
    { k: 'MA', kor: '마' },
    { k: 'PA', kor: '파' },
    { k: 'SA', kor: '사' },
    { k: 'TA', kor: '타' },
    { k: 'KA', kor: '카' },
    { k: 'LA', kor: '라' },
    { k: 'YA', kor: '야' },
  ];
  const korVowelMap: Record<string, Record<string, string>> = {
    B: { none: '바', up: '비', down: '부' },
    M: { none: '마', up: '미', down: '무' },
    P: { none: '파', up: '피', down: '푸' },
    S: { none: '사', up: '시', down: '수' },
    T: { none: '타', up: '티', down: '투' },
    K: { none: '카', up: '키', down: '쿠' },
    L: { none: '라', up: '리', down: '루' },
    Y: { none: '야', up: '이', down: '유' },
  };
  const kudlits = [
    { k: 'none', lbl: 'a 점 없음', short: '점 없음', img: '/assets/puzzle-ui/boards/p11-kudlit-none.svg' },
    { k: 'up', lbl: 'i·e 위 점', short: '위 점', img: '/assets/puzzle-ui/boards/p11-kudlit-up.svg' },
    { k: 'down', lbl: 'u·o 아래 점', short: '아래 점', img: '/assets/puzzle-ui/boards/p11-kudlit-down.svg' },
  ];

  const hint = h.difficulty.showTargetHints;
  const cur = slots[activeSlot] || slots[0];
  const sylIdx = Math.max(0, syls.findIndex((x) => x.k === cur.syl));
  const kudIdx = Math.max(0, kudlits.findIndex((x) => x.k === cur.kudlit));
  const outerDeg = -sylIdx * 45;
  const innerDeg = -kudIdx * 120;

  const formatSyll = (sl: { syl: string; kudlit: string }) => {
    const v = sl.kudlit === 'up' ? 'I' : sl.kudlit === 'down' ? 'U' : 'A';
    const rom = sl.syl[0] + v;
    const kor = korVowelMap[sl.syl[0]]?.[sl.kudlit] || sl.syl;
    return { rom, kor };
  };

  const curFmt = formatSyll(cur);
  const curBaseKor = korVowelMap[cur.syl[0]]?.none || cur.syl;
  const curKudObj = kudlits.find((x) => x.k === cur.kudlit) || kudlits[0];
  const word = slots.map((sl) => formatSyll(sl).rom).join(' - ');
  const targets = ['KA', 'LA', 'YA'];

  stage.innerHTML = `
    <div class="fg-stack">
      <div class="fg-p11-top-strip">
        <div class="fg-row" style="gap:10px">
          <img src="${tokenIconUrl('SYM_SUN')}" alt="" style="width:32px;height:32px;object-fit:contain" />
          <div>
            <div style="font-family:var(--fg-font-mono);font-size:12px;font-weight:800;color:#6E5332">Katipunan · 1892</div>
            <div style="font-family:var(--fg-font-display);font-size:20px;line-height:1.1">태양 아래 세 글자 + AN</div>
            <div style="font-size:11px;font-weight:800;color:#6E5332">칸을 눌러서 고른 뒤 링을 돌려요</div>
          </div>
        </div>
        <div class="fg-p11-slot-row">
          ${slots
            .map((sl, i) => {
              const fm = formatSyll(sl);
              return `<button type="button" class="fg-p11-slot ${activeSlot === i ? 'active' : ''}" data-slot="${i}">
                <small style="color:${activeSlot === i ? 'var(--fg-mint)' : 'var(--fg-sub)'}">${i + 1}칸</small>
                <strong>${fm.rom}</strong>
                <small>${fm.kor}</small>
              </button>`;
            })
            .join('')}
          <div class="fg-p11-slot fixed">
            <small>고정</small>
            <strong>AN</strong>
            <small>안</small>
          </div>
        </div>
        <div class="fg-panel fg-row" style="padding:8px 12px">
          ${slots.map((sl, i) => lampHtml(formatSyll(sl).rom === targets[i] ? 'mint' : 'off', `${i + 1}`)).join('')}
        </div>
      </div>

      <div class="fg-board-2col">
        <div class="fg-panel fg-row" style="justify-content:center">
          <svg viewBox="0 0 320 320" width="300" height="300" style="max-width:100%;height:auto">
            <circle cx="160" cy="160" r="152" fill="#1A222E" stroke="#0B0E13" stroke-width="5"/>
            <g transform="rotate(${outerDeg} 160 160)">
              ${syls
                .map((x, i) => {
                  const a0 = ((i * 45 - 112.5) * Math.PI) / 180;
                  const a1 = ((i * 45 - 67.5) * Math.PI) / 180;
                  const x1 = 160 + 150 * Math.cos(a0);
                  const y1 = 160 + 150 * Math.sin(a0);
                  const x2 = 160 + 150 * Math.cos(a1);
                  const y2 = 160 + 150 * Math.sin(a1);
                  const x3 = 160 + 96 * Math.cos(a1);
                  const y3 = 160 + 96 * Math.sin(a1);
                  const x4 = 160 + 96 * Math.cos(a0);
                  const y4 = 160 + 96 * Math.sin(a0);
                  const midA = ((i * 45 - 90) * Math.PI) / 180;
                  const tx = Math.round(160 + 123 * Math.cos(midA));
                  const ty = Math.round(160 + 123 * Math.sin(midA));
                  const active = cur.syl === x.k;
                  return `<path d="M ${x1} ${y1} A 150 150 0 0 1 ${x2} ${y2} L ${x3} ${y3} A 96 96 0 0 0 ${x4} ${y4} Z"
                    fill="${active ? '#91A8FF' : '#2E3846'}" stroke="#0B0E13" stroke-width="3"/>
                  <g transform="translate(${tx} ${ty}) rotate(${-outerDeg})">
                    <text y="-2" text-anchor="middle" fill="${active ? '#0B0E13' : '#F4F7FA'}" font-size="14" font-weight="900" font-family="Jua,sans-serif">${x.k}</text>
                    <text y="12" text-anchor="middle" fill="${active ? '#0B0E13' : '#9AA7B4'}" font-size="10" font-weight="800">${x.kor}</text>
                  </g>`;
                })
                .join('')}
            </g>
            <g transform="rotate(${innerDeg} 160 160)">
              ${kudlits
                .map((kd, i) => {
                  const a0 = ((i * 120 - 150) * Math.PI) / 180;
                  const a1 = ((i * 120 - 30) * Math.PI) / 180;
                  const x1 = 160 + 92 * Math.cos(a0);
                  const y1 = 160 + 92 * Math.sin(a0);
                  const x2 = 160 + 92 * Math.cos(a1);
                  const y2 = 160 + 92 * Math.sin(a1);
                  const midA = ((i * 120 - 90) * Math.PI) / 180;
                  const tx = Math.round(160 + 66 * Math.cos(midA));
                  const ty = Math.round(160 + 66 * Math.sin(midA));
                  const active = cur.kudlit === kd.k;
                  return `<path d="M 160 160 L ${x1} ${y1} A 92 92 0 0 1 ${x2} ${y2} Z"
                    fill="${active ? '#E6C886' : '#6A512D'}" stroke="#0B0E13" stroke-width="3"/>
                  <text x="${tx}" y="${ty + 4}" text-anchor="middle" fill="${active ? '#0B0E13' : '#F4F7FA'}" font-size="12" font-weight="900" transform="rotate(${-innerDeg} ${tx} ${ty})">
                    ${kd.k === 'none' ? 'a' : kd.k === 'up' ? 'i·e' : 'u·o'}
                  </text>`;
                })
                .join('')}
            </g>
            <circle cx="160" cy="160" r="46" fill="#12161E" stroke="#0B0E13" stroke-width="4"/>
            <text x="160" y="156" text-anchor="middle" fill="#52EFBF" font-size="26" font-family="Jua,sans-serif">${curFmt.rom}</text>
            <text x="160" y="176" text-anchor="middle" fill="#E6C886" font-size="11" font-weight="800">${curBaseKor}+${curKudObj.short}=${curFmt.kor}</text>
            <polygon points="160,18 151,4 169,4" fill="#52EFBF" stroke="#0B0E13" stroke-width="2"/>
          </svg>
        </div>

        <div class="fg-stack" style="justify-content:space-between">
          <div class="fg-panel fg-row-between">
            <div>
              <div class="fg-panel-title">바깥 링 · 자음</div>
              <div style="font-family:var(--fg-font-mono);font-size:12px;color:var(--fg-star);font-weight:800">KA·LA·YA·BA·MA·PA·SA·TA</div>
              <div class="fg-panel-sub">한 칸씩 45° 돌아가요</div>
            </div>
            <div class="fg-row">
              ${roundBtnHtml({ id: 'p11-in-l', icon: 'rot-ccw', tone: 'steel' })}
              ${roundBtnHtml({ id: 'p11-in-r', icon: 'rot-cw', tone: 'steel', tapHint: cur.syl === 'BA' })}
            </div>
          </div>

          <div class="fg-panel fg-row-between">
            <div>
              <div class="fg-panel-title">안쪽 링 · 모음점</div>
              <div class="fg-row" style="gap:10px;margin-top:6px">
                ${kudlits
                  .map(
                    (kd) => `<button type="button" data-kud="${kd.k}" class="s-btn ${cur.kudlit === kd.k ? 'primary' : ''}" style="padding:4px 8px;display:inline-flex;align-items:center;gap:4px">
                      <img src="${kd.img}" alt="" style="width:16px;height:18px;object-fit:contain" />
                      <span style="font-size:11px">${kd.lbl}</span>
                    </button>`
                  )
                  .join('')}
              </div>
            </div>
            <div class="fg-row">
              ${roundBtnHtml({ id: 'p11-out-l', icon: 'rot-ccw', tone: 'steel' })}
              ${roundBtnHtml({ id: 'p11-out-r', icon: 'rot-cw', tone: 'steel' })}
            </div>
          </div>

          <div class="fg-row" style="align-items:center">
            ${roundBtnHtml({ id: 'p11-speak', icon: 'speaker', tone: 'mint', subLabel: '소리 듣기' })}
            <div style="flex:1">
              ${pushBtnHtml({ id: 'p11-check', label: '해독 확정', tone: 'mint' })}
              <div class="fg-panel-sub" style="margin-top:4px">음독: <strong>${word}</strong> · 3칸이 맞으면 헌장 서명이 살아나요</div>
            </div>
          </div>
        </div>
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
  stage.querySelectorAll<HTMLElement>('[data-kud]').forEach((b) => {
    b.onclick = () => {
      soundEngine.playClick();
      slots[activeSlot].kudlit = b.dataset.kud!;
      h.patchState(11, { slots });
      h.rerender();
    };
  });
  stage.querySelector<HTMLElement>('#p11-in-l')!.onclick = () => {
    soundEngine.playClick();
    slots[activeSlot].syl = syls[(sylIdx + syls.length - 1) % syls.length].k;
    h.patchState(11, { slots });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p11-in-r')!.onclick = () => {
    soundEngine.playClick();
    slots[activeSlot].syl = syls[(sylIdx + 1) % syls.length].k;
    h.patchState(11, { slots });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p11-out-l')!.onclick = () => {
    soundEngine.playClick();
    slots[activeSlot].kudlit = kudlits[(kudIdx + kudlits.length - 1) % kudlits.length].k;
    h.patchState(11, { slots });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p11-out-r')!.onclick = () => {
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
        const utter = new SpeechSynthesisUtterance(curFmt.rom);
        utter.lang = 'en-US';
        utter.rate = 0.85;
        window.speechSynthesis.speak(utter);
      } catch {
        // ignore speech synthesis errors
      }
    }
  };
  stage.querySelector<HTMLElement>('#p11-check')!.onclick = () => {
    if (word === 'KA - LA - YA') {
      h.solve(11, { slots }, '카티푸난 자유 암호(KA-LA-YAAN) 해독이 완료되었어요!');
    } else {
      h.setErr(
        hint
          ? `현재 음독(${word})이 카티푸난 암호 KA - LA - YA (모두 무점 a)와 달라요.`
          : `현재 음독(${word})이 헌장의 자유(Kalayaan) 암호와 달라요. 서하린·카이 단서를 확인하세요!`
      );
    }
  };
}

/* -------------------------------------------------------------------------- *
 * P12 · 마이크로필름 & 천공 카드
 * -------------------------------------------------------------------------- */
function boardP12(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const fx = Number(s.fx ?? 15);
  const fy = Number(s.fy ?? 85);
  const toolMode = String(s.toolMode || 'punch');
  const punchGrid =
    Array.isArray(s.punchGrid) && s.punchGrid.length === 16
      ? [...(s.punchGrid as boolean[])]
      : Array(16).fill(false);
  const hint = h.difficulty.showTargetHints;

  const dist = Math.abs(fx - 60) + Math.abs(fy - 40);
  const sharp = dist <= 12;
  const sharpness = Math.max(12, Math.min(100, Math.round(100 - dist * 0.7)));
  const col2Star = Boolean(punchGrid[5]);
  const col4Wave = Boolean(punchGrid[15]);
  const extraCount = punchGrid.filter((v, idx) => v && idx !== 5 && idx !== 15).length;

  const rowSyms = [
    { key: 'SUN', tok: 'SYM_SUN', label: '태양' },
    { key: 'STAR', tok: 'SYM_STAR', label: '별자리' },
    { key: 'MTN', tok: 'SYM_MTN', label: '산맥' },
    { key: 'WAVE', tok: 'SYM_WAVE', label: '파도' },
  ];

  stage.innerHTML = `
    <div class="fg-p12-grid">
      <div class="fg-panel fg-stack" style="justify-content:space-between">
        <div>
          <div class="fg-panel-title" style="font-size:18px">린의 스캐너</div>
          <div class="fg-panel-sub">마이크로필름 진행 상태</div>
        </div>
        <div class="fg-film-viewport" style="max-height:130px">
          <img class="fg-film-img" src="/assets/puzzle-ui/boards/p12-film-clue.svg" alt="" style="filter:blur(${sharp ? 0 : 7}px)" />
          <div style="position:relative;z-index:2;height:100%;display:grid;place-items:center">
            <span style="padding:4px 12px;border-radius:10px;border:2.5px solid #0B0E13;background:rgba(18,22,30,0.88);font-family:var(--fg-font-display);color:${sharp ? 'var(--fg-mint)' : 'var(--fg-amber)'}">
              ${sharp ? '초점 일치 ✔' : '초점 맞추는 중...'}
            </span>
          </div>
        </div>
        <div>
          <div class="fg-row-between" style="font-size:12px;font-weight:800;margin-bottom:4px">
            <span>선명도</span><span style="color:${sharp ? 'var(--fg-mint)' : 'var(--fg-amber)'}">${sharpness}%</span>
          </div>
          <div style="height:10px;border-radius:999px;background:#0B0E13;overflow:hidden;border:2px solid #0B0E13">
            <div style="width:${sharpness}%;height:100%;background:${sharp ? 'var(--fg-mint)' : 'var(--fg-amber)'}"></div>
          </div>
          <div class="fg-panel-sub" style="margin-top:6px">린이 동측 책상에서 필름 초점을 맞춘 뒤 열·문양 무전을 보내요.</div>
        </div>
      </div>

      <div class="fg-stack" style="justify-content:space-between">
        <div class="fg-punch-card">
          <div style="font-family:var(--fg-font-mono);font-size:12px;font-weight:800;color:#6E5332;margin-bottom:8px">ACCESSION · 기증 등록 카드</div>
          <div class="p-punch-grid-4x4">
            <div></div>
            ${[1, 2, 3, 4].map((c) => `<div class="p-punch-colhead" style="font-family:var(--fg-font-display);font-size:14px">${c}열</div>`).join('')}
            ${rowSyms
              .map(
                (rs, rIdx) => `
                  <div class="p-punch-rowhead" style="display:flex;align-items:center;gap:4px">
                    <img src="${tokenIconUrl(rs.tok)}" alt="" style="width:20px;height:20px;object-fit:contain" />
                    <span>${rs.label}</span>
                  </div>
                  ${[0, 1, 2, 3]
                    .map((cIdx) => {
                      const idx = rIdx * 4 + cIdx;
                      const punched = punchGrid[idx];
                      const isWrong = punched && idx !== 5 && idx !== 15;
                      return `<button type="button" data-phole="${idx}" class="fg-punch-hole ${punched ? 'punched' : ''}"
                        style="${isWrong ? 'border-color:var(--fg-red)' : ''}" title="${cIdx + 1}열 ${rs.label}"></button>`;
                    })
                    .join('')}
                `
              )
              .join('')}
          </div>
        </div>

        <div class="fg-row-between">
          <div class="fg-tabs">
            <button type="button" class="fg-tab-btn ${toolMode === 'punch' ? 'active' : ''}" id="p12-mode-punch">펀치로 뚫기</button>
            <button type="button" class="fg-tab-btn ${toolMode === 'tape' ? 'active-gold' : ''}" id="p12-mode-tape">🩹 보수 테이프</button>
          </div>
          <div style="min-width:190px">${pushBtnHtml({ id: 'p12-stamp', label: 'ARCHIVED 도장', tone: sharp && col2Star && col4Wave && extraCount === 0 ? 'mint' : 'red' })}</div>
        </div>
      </div>

      <div class="fg-panel fg-stack" style="justify-content:space-between">
        <div class="fg-panel-title" style="font-size:17px">진행</div>
        ${lampHtml(sharp ? 'mint' : 'off', '초점')}
        ${lampHtml(col2Star ? 'mint' : 'off', '2열 ★')}
        ${lampHtml(col4Wave ? 'mint' : 'off', '4열 🌊')}
        ${lampHtml(extraCount === 0 ? 'mint' : 'red', '그 외 0')}
        ${lampHtml(Boolean(s.stamped) ? 'mint' : 'off', '도장')}
      </div>
    </div>
  `;

  stage.querySelector<HTMLElement>('#p12-mode-punch')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(12, { toolMode: 'punch' });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p12-mode-tape')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(12, { toolMode: 'tape' });
    h.rerender();
  };

  stage.querySelectorAll<HTMLElement>('[data-phole]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.phole);
      const next = [...punchGrid];
      if (toolMode === 'tape') {
        if (!next[idx]) return;
        next[idx] = false;
      } else {
        next[idx] = true;
      }
      soundEngine.playClick();
      h.patchState(12, { punchGrid: next });
      h.rerender();
    };
  });

  stage.querySelector<HTMLElement>('#p12-stamp')!.onclick = () => {
    if (!sharp) {
      h.setErr('먼저 린이 마이크로필름 초점을 맞춰야 ARCHIVED 도장을 찍을 수 있어요!');
      return;
    }
    const exactMatch = punchGrid.every((v, idx) => (idx === 5 || idx === 15 ? v : !v));
    if (exactMatch) {
      h.solve(12, { fx, fy, punchGrid, stamped: true }, '기증 등록 카드 천공 복원 및 ARCHIVED 도장 완료!');
    } else {
      h.setErr(
        hint
          ? '구멍이 달라요! 보수 테이프로 잘못된 구멍을 막고 [2열 ★]과 [4열 🌊]만 뚫으세요.'
          : '잘못 타공된 구멍이 있어요! 🩹 보수 테이프로 잘못 뚫은 칸만 메워 보세요.'
      );
    }
  };
}

/* -------------------------------------------------------------------------- *
 * P13 · 청동 유물 세척 & 중화 적정
 * -------------------------------------------------------------------------- */
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
  const needleRot = Math.max(-75, Math.min(75, (ph - 7.0) * 14));
  const liquidCol = ph < 6.4 ? '#52EFBF' : ph > 7.4 ? '#FFB86B' : '#7CD8FF';

  stage.innerHTML = `
    <div class="fg-stack">
      <div class="fg-p13-top">
        <div class="fg-panel fg-stack">
          <div class="fg-row-between">
            <span class="fg-panel-title" style="font-size:18px">시약 스포이드</span>
            ${lampHtml(valveOpen ? 'mint' : 'amber', valveOpen ? '밸브 열림 · 서하린' : '밸브 잠김 🔒')}
          </div>
          <div class="fg-dropper-grid">
            <div class="fg-dropper-card">
              <img src="${tokenIconUrl('SYM_WAVE')}" style="width:20px;height:20px" />
              <img class="dropper-img" src="/assets/puzzle-ui/boards/p13-dropper-cyan.svg" alt="청록" />
              <span style="font-family:var(--fg-font-display);font-size:15px">청록</span>
              <div class="fg-row" style="gap:6px">
                <button type="button" class="s-btn primary" id="p13-cyan" ${!valveOpen ? 'disabled' : ''}>💧+1</button>
                <strong style="font-family:var(--fg-font-mono);font-size:16px">${cyan}</strong>
              </div>
            </div>
            <div class="fg-dropper-card">
              <img src="${tokenIconUrl('SYM_SUN')}" style="width:20px;height:20px" />
              <img class="dropper-img" src="/assets/puzzle-ui/boards/p13-dropper-amber.svg" alt="호박" />
              <span style="font-family:var(--fg-font-display);font-size:15px">호박</span>
              <div class="fg-row" style="gap:6px">
                <button type="button" class="s-btn amber" id="p13-amber" ${!valveOpen ? 'disabled' : ''}>💧+1</button>
                <strong style="font-family:var(--fg-font-mono);font-size:16px">${amber}</strong>
              </div>
            </div>
            <div class="fg-dropper-card">
              <img src="${tokenIconUrl('NUM_0')}" style="width:20px;height:20px" />
              <img class="dropper-img" src="/assets/puzzle-ui/boards/p13-dropper-clear.svg" alt="투명" />
              <span style="font-family:var(--fg-font-display);font-size:15px">투명</span>
              <div class="fg-row" style="gap:6px">
                <button type="button" class="s-btn" id="p13-clear" ${!valveOpen ? 'disabled' : ''}>💧+1</button>
                <strong style="font-family:var(--fg-font-mono);font-size:16px">${clear}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="fg-panel fg-row-between">
          <div style="position:relative;width:116px;height:146px;display:grid;place-items:center">
            <div style="position:absolute;bottom:14px;width:72px;height:${Math.min(90, 32 + (cyan + amber + clear) * 14)}px;background:${liquidCol};opacity:0.78;border-radius:0 0 12px 12px;transition:all .2s"></div>
            <img src="/assets/puzzle-ui/boards/p13-beaker.svg" alt="비커" style="position:relative;z-index:2;width:110px;height:140px;object-fit:contain" />
          </div>
          <div style="position:relative;width:220px;height:130px;display:grid;place-items:center">
            <img src="/assets/puzzle-ui/boards/p13-ph-arc.svg" alt="pH 미터" style="width:220px;height:120px;object-fit:contain" />
            <div style="position:absolute;bottom:20px;width:4px;height:66px;background:#F4F7FA;border:1px solid #0B0E13;border-radius:2px;transform-origin:bottom center;transform:rotate(${needleRot}deg);transition:transform .2s"></div>
          </div>
          <div class="fg-stack" style="align-items:stretch;min-width:140px">
            ${lcdHtml(ph.toFixed(1), 'pH')}
            ${pushBtnHtml({ id: 'p13-rinse', label: '증류수 헹굼', tone: 'steel' })}
            <div class="fg-panel-sub" style="text-align:center">방울 수를 0으로 되돌려요</div>
          </div>
        </div>
      </div>

      <div class="fg-panel fg-row-between" style="align-items:stretch">
        <div style="flex:1.5;min-width:280px">
          <div class="fg-panel-title" style="font-size:18px;margin-bottom:6px">초음파 세척 · 청동 유물 <small style="font-size:12px;color:var(--fg-sub)">(초록 녹을 문질러 왕실 각인을 드러내요)</small></div>
          <div class="fg-bronze-plaque">
            <img class="fg-bronze-emblem" src="/assets/puzzle-ui/boards/p13-emblem.svg" alt="" />
            <div class="fg-rust-grid" id="p13-scrub">
              ${scrubGrid.map((c, i) => `<div data-sc="${i}" class="fg-rust-tile ${c ? 'clean' : ''}"></div>`).join('')}
            </div>
            ${
              !phOk || !valveOpen
                ? `<div style="position:absolute;inset:0;z-index:5;background:rgba(11,14,19,0.75);display:grid;place-items:center">
                    <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:14px;background:var(--fg-bg-panel);border:3px solid #0B0E13;font-family:var(--fg-font-display)">
                      <img src="${uiIconUrl('lock')}" style="width:24px;height:24px" />
                      <span>${!valveOpen ? '서하린의 밸브 개방을 기다려요' : 'pH 7.0을 먼저 맞춰요'}</span>
                    </div>
                  </div>`
                : ''
            }
          </div>
        </div>

        <div class="fg-stack" style="flex:0.8;min-width:210px;justify-content:space-between;align-items:center">
          <div class="fg-row" style="width:100%;justify-content:space-between">
            <img src="/assets/puzzle-ui/boards/p13-pen.svg" alt="초음파 펜" style="width:92px;height:56px;object-fit:contain" />
            <div>
              <div style="font-size:12px;font-weight:800;color:var(--fg-sub)">세척</div>
              <div id="p13-sc-lbl" style="font-family:var(--fg-font-mono);font-weight:800;font-size:20px;color:${pct >= 90 ? 'var(--fg-mint)' : 'var(--fg-text)'}">${doneCnt} / 24 칸</div>
              <div style="font-size:11px;color:var(--fg-sub)">22칸(90%) 이상이면 성공</div>
            </div>
          </div>
          <div class="fg-row" style="width:100%;justify-content:space-between">
            ${lampHtml(valveOpen ? 'mint' : 'off', '밸브')}
            ${lampHtml(phOk ? 'mint' : 'off', 'pH 7.0')}
            ${lampHtml(pct >= 90 ? 'mint' : 'off', '세척')}
          </div>
          ${pushBtnHtml({ id: 'p13-done', label: '세척 검수 완료', tone: phOk && pct >= 90 ? 'mint' : 'steel' })}
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
    if (!valveOpen || !phOk || !el || !el.dataset.sc) return;
    const idx = Number(el.dataset.sc);
    if (!scrubGrid[idx]) {
      scrubGrid[idx] = true;
      el.classList.add('clean');
      const done = scrubGrid.filter(Boolean).length;
      const lbl = stage.querySelector<HTMLElement>('#p13-sc-lbl');
      if (lbl) lbl.textContent = `${done} / 24 칸`;
      h.patchState(13, { scrubGrid: [...scrubGrid] });
      if (done === 22) {
        h.rerender();
      }
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

  scrubBox.onpointerdown = (e) => {
    scrubbing = true;
    paintCell(e.target as HTMLElement);
  };
  scrubBox.onpointermove = (e) => {
    if (scrubbing) paintCell(e.target as HTMLElement);
  };
  scrubBox.querySelectorAll<HTMLElement>('[data-sc]').forEach((d) => {
    d.onclick = () => paintCell(d);
  });

  stage.querySelector<HTMLElement>('#p13-done')!.onclick = () => {
    if (!valveOpen) {
      h.setErr('먼저 서하린이 약품 보관장 안전 밸브를 개방해야 해요!');
      return;
    }
    const donePct = Math.round((scrubGrid.filter(Boolean).length / 24) * 100);
    if (phOk && donePct >= 90) {
      h.solve(13, { valveOpen: true, cyan, amber, clear, scrubGrid }, 'pH 7.0 중화 적정 및 청동 유물 세척이 완료되었어요!');
    } else {
      h.setErr(
        hint
          ? `시약(${cyan} 청록/${amber} 호박/${clear} 투명 → 2:1:0) 또는 세척률(${donePct}% → 90%+)을 확인하세요.`
          : `중화 pH(${ph.toFixed(1)} → 7.0) 또는 초음파 세척률(${donePct}% → 90%+)을 이안의 노트에 맞춰 완성하세요!`
      );
    }
  };
}

/* -------------------------------------------------------------------------- *
 * P14 · 도르래 이완 & 깨진 밀랍 봉인
 * -------------------------------------------------------------------------- */
function boardP14(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const rope = ((s.rope as number[]) || [100, 100, 100, 100]).slice(0, 4);
  const waxRot = ((s.waxRot as number[]) || [90, 180, 270]).slice(0, 3);
  const ropeDone = rope.every((v) => v === 0);
  const sealOk = waxRot.every((r) => r % 360 === 0);
  const holdSec = (h.difficulty.p14HoldMs / 1000).toFixed(1);
  const hint = h.difficulty.showTargetHints;
  const circum = 2 * Math.PI * 58;

  stage.innerHTML = `
    <div class="fg-board-2col">
      <div class="fg-p14-crate-area fg-stack" style="justify-content:space-between">
        <div class="fg-row-between">
          <span class="fg-panel-title" style="font-size:18px">기증 상자 · 도르래 4개</span>
          <span style="padding:3px 10px;border-radius:10px;background:var(--fg-mint);border:2.5px solid #0B0E13;font-family:var(--fg-font-display);font-size:12px;color:#0B0E13">
            #1 ⇄ #3 대각선 먼저!
          </span>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          ${[0, 1, 3, 2]
            .map((i) => {
              const col = rope[i] === 0 ? '#52EFBF' : rope[i] < 100 ? '#FFB86B' : '#FF6E6E';
              return `<div style="background:var(--fg-bg-base);border:3px solid ${rope[i] === 0 ? 'var(--fg-mint)' : '#0B0E13'};border-radius:14px;padding:10px">
                <div class="fg-row-between" style="margin-bottom:6px">
                  <span style="font-family:var(--fg-font-display);font-size:16px">#${i + 1} 모서리</span>
                  <strong style="font-family:var(--fg-font-mono);color:${col}">${rope[i]}%</strong>
                </div>
                <input type="range" min="0" max="100" step="25" value="${rope[i]}" data-rl="${i}" class="p-range" style="width:100%" ${rope[i] === 0 ? 'disabled' : ''} />
              </div>`;
            })
            .join('')}
        </div>

        <div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:6px 12px;border-radius:12px;background:#2a1519;border:2.5px solid var(--fg-red);font-size:12px;font-weight:800;color:var(--fg-text)">
          <img src="${uiIconUrl('warning')}" style="width:18px;height:18px" />
          <span>#2·#4를 먼저 풀면 장력 불균형으로 원위치! ${hint ? '(#1·#3 먼저 0%로)' : ''}</span>
        </div>
      </div>

      <div class="fg-panel fg-stack" style="justify-content:space-between">
        <div>
          <div class="fg-panel-title" style="font-size:18px">깨진 밀랍 봉인</div>
          <div class="fg-panel-sub">조각을 누를 때마다 90°씩 돌아가요 (3조각 모두 0°로 맞추고 꾹 압착)</div>
        </div>

        <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;padding:12px;background:var(--fg-bg-base);border:3px solid #0B0E13;border-radius:16px">
          <svg viewBox="0 0 320 320" style="width:196px;height:196px;display:block;margin:0 auto">
            <defs>
              <clipPath id="p14-w0"><path d="M160,160 L160,0 L320,0 L320,252.4 Z" /></clipPath>
              <clipPath id="p14-w1"><path d="M160,160 L320,252.4 L320,320 L0,320 L0,252.4 Z" /></clipPath>
              <clipPath id="p14-w2"><path d="M160,160 L0,252.4 L0,0 L160,0 Z" /></clipPath>
            </defs>
            ${waxRot
              .map((r, i) => {
                return `<g clip-path="url(#p14-w${i})" data-wx="${i}" style="cursor:${ropeDone ? 'pointer' : 'not-allowed'}">
                  <g transform="rotate(${r} 160 160)">
                    <image href="/assets/puzzle-ui/boards/p14-seal-${i + 1}.svg" x="0" y="0" width="320" height="320" />
                  </g>
                </g>`;
              })
              .join('')}
            <!-- 3분할 경계선 -->
            <path d="M160,10 V160 L290,235 M160,160 L30,235" fill="none" stroke="#0B0E13" stroke-width="5" stroke-linecap="round" pointer-events="none"/>
            <circle cx="160" cy="160" r="150" fill="none" stroke="${sealOk ? '#52EFBF' : '#0B0E13'}" stroke-width="6" pointer-events="none"/>
          </svg>
          <div style="display:flex;justify-content:center;gap:8px;width:100%">
            ${waxRot
              .map((r, i) => {
                const ok = r % 360 === 0;
                return `<button type="button" data-wx="${i}" ${!ropeDone ? 'disabled' : ''}
                  style="flex:1;padding:6px 8px;border-radius:12px;border:2.5px solid ${ok ? 'var(--fg-mint)' : '#0B0E13'};background:var(--fg-bg-panel);color:${ok ? 'var(--fg-mint)' : 'var(--fg-amber)'};font-family:var(--fg-font-mono);font-size:12px;font-weight:800;cursor:${ropeDone ? 'pointer' : 'not-allowed'}">
                  ${i + 1}: ${r}°
                </button>`;
              })
              .join('')}
          </div>
          ${
            !ropeDone
              ? `<div style="position:absolute;inset:0;background:rgba(11,14,19,0.78);border-radius:13px;display:grid;place-items:center">
                  <div style="display:flex;align-items:center;gap:8px;padding:7px 14px;border-radius:12px;background:var(--fg-bg-panel);border:2.5px solid #0B0E13;font-family:var(--fg-font-display)">
                    <img src="${uiIconUrl('lock')}" style="width:20px;height:20px" />
                    <span>로프 4개를 다 풀면 열려요</span>
                  </div>
                </div>`
              : ''
          }
        </div>

        <div class="fg-row-between">
          <button type="button" class="fg-hold-wrap" id="p14-press" style="width:128px;height:134px">
            <svg viewBox="0 0 140 148" class="fg-hold-ring-svg" style="width:128px;height:134px">
              <circle cx="70" cy="70" r="64" fill="#1A2029" stroke="#0B0E13" stroke-width="4"/>
              <circle cx="70" cy="70" r="58" fill="none" stroke="#2E3846" stroke-width="10"/>
              <circle id="p14-hold-arc" cx="70" cy="70" r="58" fill="none" stroke="#52EFBF" stroke-width="10"
                stroke-dasharray="${circum}" stroke-dashoffset="${circum}" transform="rotate(-90 70 70)" stroke-linecap="round"/>
              <circle cx="70" cy="70" r="46" fill="#E6C886" stroke="#0B0E13" stroke-width="4"/>
            </svg>
            <span class="fg-hold-copy">
              <strong style="font-size:18px">꾹 압착</strong>
              <small id="p14-hold-sub">${holdSec}초 유지</small>
            </span>
          </button>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;flex:1;background:var(--fg-bg-base);border:3px solid #0B0E13;border-radius:14px;padding:10px">
            ${lampHtml(rope[0] === 0 ? 'mint' : 'off', '로프 #1')}
            ${lampHtml(rope[2] === 0 ? 'mint' : 'off', '로프 #3')}
            ${lampHtml(rope[1] === 0 && rope[3] === 0 ? 'mint' : 'off', '로프 #2·#4')}
            ${lampHtml(sealOk ? 'mint' : 'off', '밀랍 정렬')}
            ${lampHtml(Boolean(s.pressed) ? 'mint' : 'off', '압착')}
          </div>
        </div>
      </div>
    </div>
  `;

  stage.querySelectorAll<HTMLInputElement>('[data-rl]').forEach((inp) => {
    inp.onchange = () => {
      const idx = Number(inp.dataset.rl);
      const val = Number(inp.value);
      if ((idx === 1 || idx === 3) && val < 100 && (rope[0] > 0 || rope[2] > 0)) {
        inp.value = String(rope[idx]);
        h.setErr('대각선 장력 불균형! 반대편 로프(#1·#3)를 먼저 0%로 푸세요.');
        return;
      }
      const next = [...rope];
      next[idx] = val;
      soundEngine.playClick();
      h.patchState(14, { rope: next });
      h.rerender();
    };
  });

  stage.querySelectorAll<HTMLElement>('[data-wx]').forEach((b) => {
    b.onclick = () => {
      if (!ropeDone) return;
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
  let decayTimer: number | null = null;
  let pressPct = 0;

  const updateHoldVisual = () => {
    const arc = stage.querySelector('#p14-hold-arc');
    const sub = stage.querySelector('#p14-hold-sub');
    if (arc) arc.setAttribute('stroke-dashoffset', String(circum * (1 - Math.min(100, pressPct) / 100)));
    if (sub) sub.textContent = pressPct > 0 ? `${Math.round(pressPct)}%` : `${holdSec}초 유지`;
  };

  const stopTimers = () => {
    if (pressTimer !== null) {
      window.clearInterval(pressTimer);
      pressTimer = null;
    }
    if (decayTimer !== null) {
      window.clearInterval(decayTimer);
      decayTimer = null;
    }
  };
  h.registerCleanup(stopTimers);

  pressBtn.onpointerdown = () => {
    if (!ropeDone) {
      h.setErr('먼저 4모서리 도르래를 대각선 순서로 모두 0% 이완하세요!');
      return;
    }
    if (!sealOk) {
      h.setErr('밀랍 3조각의 각도를 모두 0°로 맞춘 뒤 압착하세요!');
      return;
    }
    stopTimers();
    const stepPer50Ms = (100 / h.difficulty.p14HoldMs) * 50;
    soundEngine.playClick();
    pressTimer = window.setInterval(() => {
      pressPct = Math.min(100, pressPct + stepPer50Ms);
      updateHoldVisual();
      if (pressPct >= 100) {
        stopTimers();
        h.solve(14, { rope, waxRot, pressed: true }, '4점 대각선 이완 및 밀랍 봉인 압착 복원이 완료되었어요!');
      }
    }, 50);
  };

  const releaseHold = () => {
    if (pressTimer === null) return;
    window.clearInterval(pressTimer);
    pressTimer = null;
    if (pressPct < 100 && decayTimer === null) {
      decayTimer = window.setInterval(() => {
        if (pressPct <= 0) {
          stopTimers();
          pressPct = 0;
          updateHoldVisual();
          return;
        }
        pressPct = Math.max(0, pressPct - 2);
        updateHoldVisual();
      }, 60);
    }
  };
  pressBtn.onpointerup = releaseHold;
  pressBtn.onpointerleave = releaseHold;
  pressBtn.onpointercancel = releaseHold;
}

/* -------------------------------------------------------------------------- *
 * P15 · 성곽 도면 트레이싱
 * -------------------------------------------------------------------------- */
function transformAnchor(px: number, py: number, ox: number, oy: number, rotDeg: number): [number, number] {
  const rad = (rotDeg * Math.PI) / 180;
  const dx = px - 210;
  const dy = py - 130;
  return [
    210 + dx * Math.cos(rad) - dy * Math.sin(rad) + ox,
    130 + dx * Math.sin(rad) + dy * Math.cos(rad) + oy,
  ];
}

function boardP15(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  let ox = Number(s.ox ?? 96);
  let oy = Number(s.oy ?? -48);
  const rot = Number(s.rot ?? 270);
  const tol = h.difficulty.p15TolerancePx;
  const anchors: [number, number, string][] = [
    [219, 103, '종탑 · Campanario'],
    [210, 223, 'Puerta Real'],
    [126, 198, 'Baluarte'],
  ];

  const getPinMatches = (cx: number, cy: number, rDeg: number) =>
    anchors.map(([ax, ay]) => {
      const [tx, ty] = transformAnchor(ax, ay, cx, cy, rDeg);
      return Math.hypot(tx - ax, ty - ay) <= tol;
    });

  const pinMatches = getPinMatches(ox, oy, rot);

  stage.innerHTML = `
    <div class="fg-board-2col" style="grid-template-columns:minmax(0,1.28fr) minmax(260px,0.72fr)">
      <div class="fg-p15-tablet">
        <svg id="p15-svg" viewBox="0 0 420 260" style="width:100%;height:100%;display:block">
          <image href="/assets/puzzle-ui/boards/p15-stone.svg" x="0" y="0" width="420" height="260" preserveAspectRatio="xMidYMid slice" />
          <image href="/assets/puzzle-ui/boards/p15-carved.svg" x="75" y="10" width="270" height="240" preserveAspectRatio="xMidYMid meet" />
          ${anchors
            .map(([ax, ay, lbl], idx) => {
              const ly = ay > 210 ? ay - 13 : ay - 9;
              const lw = Math.round(lbl.length * 7.2 + 20);
              const lx = Math.min(ax + 12, 412 - lw);
              return `
                <circle id="p15-pin-${idx}" cx="${ax}" cy="${ay}" r="10" fill="${pinMatches[idx] ? '#52EFBF' : '#FFB86B'}" stroke="#0B0E13" stroke-width="3"/>
                <rect x="${lx}" y="${ly}" width="${lw}" height="18" rx="5" fill="#F4F7FA" stroke="#0B0E13" stroke-width="2"/>
                <text x="${lx + 7}" y="${ly + 12}" fill="#0B0E13" font-size="9.5" font-weight="800">${lbl}</text>
              `;
            })
            .join('')}
          <g id="p15-paper" transform="translate(${ox} ${oy}) rotate(${rot} 210 130)" opacity="0.88">
            <rect x="85" y="18" width="250" height="224" rx="8" fill="rgba(164, 210, 240, 0.25)" stroke="#7CD8FF" stroke-width="2.5" stroke-dasharray="6 4"/>
            <image href="/assets/puzzle-ui/boards/p15-ink.svg" x="75" y="10" width="270" height="240" preserveAspectRatio="xMidYMid meet" />
          </g>
        </svg>
        <div style="position:absolute;top:10px;left:10px;background:rgba(11,14,19,0.88);border:2.5px solid #0B0E13;border-radius:12px;padding:4px 12px;font-size:11px;font-weight:800;pointer-events:none">
          ● 돌판 핀 · ○ 트레이싱지 — 두 개를 포개요 (±${tol}px)
        </div>
      </div>

      <div class="fg-stack" style="justify-content:space-between">
        <div class="fg-panel fg-row-between">
          <div>
            <div class="fg-panel-title">도면 돌리기</div>
            <div class="fg-panel-sub">90°씩 딸깍 (목표 0°)</div>
            <div style="margin-top:8px">${lcdHtml(`${rot}°`)}</div>
          </div>
          <div class="fg-row">
            ${roundBtnHtml({ id: 'p15-rotl', icon: 'rot-ccw', tone: 'steel' })}
            ${roundBtnHtml({ id: 'p15-rotr', icon: 'rot-cw', tone: 'steel', tapHint: rot !== 0 })}
          </div>
        </div>

        <div class="fg-panel fg-stack">
          <div class="fg-row-between">
            <div>
              <div class="fg-panel-title">살짝 옮기기</div>
              <div class="fg-panel-sub">끌어도 되고, 버튼으로 4px씩</div>
            </div>
            ${lcdHtml(`${Math.round(ox)}, ${Math.round(oy)}`, 'XY', '', 'p15-xy-lcd')}
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,auto);gap:4px;justify-content:center;align-items:center">
            <span></span>${roundBtnHtml({ dataAttr: 'data-nudge="0,-4"', icon: 'arrow-up', tone: 'steel' })}<span></span>
            ${roundBtnHtml({ dataAttr: 'data-nudge="-4,0"', icon: 'arrow-left', tone: 'steel' })}
            <span></span>
            ${roundBtnHtml({ dataAttr: 'data-nudge="4,0"', icon: 'arrow-right', tone: 'steel' })}
            <span></span>${roundBtnHtml({ dataAttr: 'data-nudge="0,4"', icon: 'arrow-down', tone: 'steel' })}<span></span>
          </div>
        </div>

        <div class="fg-panel fg-stack">
          <div class="fg-row-between">
            <span class="fg-panel-title" style="font-size:16px">핀 3개</span>
            <div class="fg-row" id="p15-lamps">
              ${lampHtml(pinMatches[0] ? 'mint' : 'off', '종탑')}
              ${lampHtml(pinMatches[1] ? 'mint' : 'off', 'Puerta')}
              ${lampHtml(pinMatches[2] ? 'mint' : 'off', 'Baluarte')}
            </div>
          </div>
          ${pushBtnHtml({ id: 'p15-lock', label: '포개기 확정', tone: rot % 360 === 0 && pinMatches.every(Boolean) ? 'mint' : 'amber' })}
        </div>
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
    matches.forEach((ok, idx) => {
      const el = svg.querySelector(`#p15-pin-${idx}`);
      if (el) el.setAttribute('fill', ok ? '#52EFBF' : '#FFB86B');
    });
    const xyEl = stage.querySelector('#p15-xy-lcd');
    if (xyEl) xyEl.textContent = `${Math.round(ox)}, ${Math.round(oy)}`;
    const lamps = stage.querySelector('#p15-lamps');
    if (lamps) {
      lamps.innerHTML = `${lampHtml(matches[0] ? 'mint' : 'off', '종탑')}${lampHtml(matches[1] ? 'mint' : 'off', 'Puerta')}${lampHtml(matches[2] ? 'mint' : 'off', 'Baluarte')}`;
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
    const scaleY = rect.height > 0 ? 260 / rect.height : 1;
    ox = Math.max(-140, Math.min(140, ox0 + (e.clientX - sx) * scaleX));
    oy = Math.max(-95, Math.min(95, oy0 + (e.clientY - sy) * scaleY));
    const g = svg.querySelector('#p15-paper');
    if (g) g.setAttribute('transform', `translate(${ox} ${oy}) rotate(${rot} 210 130)`);
    updatePinsDom();
  };
  svg.onpointerup = () => {
    if (dragging) {
      dragging = false;
      h.patchState(15, { ox: Math.round(ox), oy: Math.round(oy) });
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
        ox: Math.max(-140, Math.min(140, Math.round(ox + dx))),
        oy: Math.max(-95, Math.min(95, Math.round(oy + dy))),
      });
      h.rerender();
    };
  });
  stage.querySelector<HTMLElement>('#p15-lock')!.onclick = () => {
    const finalMatches = getPinMatches(ox, oy, rot);
    if (rot % 360 === 0 && finalMatches.every(Boolean)) {
      h.solve(15, { ox: 0, oy: 0, rot: 0 }, '성곽 건축 도면 트레이싱 3점 정밀 일치 완료!');
    } else {
      h.setErr(`회전(${rot}° → 0°)과 핀 3개(${finalMatches.filter(Boolean).length}/3 일치)를 모두 초록색으로 맞춘 뒤 확정하세요!`);
    }
  };
}

/* -------------------------------------------------------------------------- *
 * P16 · 1부 해양 교역 화살표 프리즘 + 2부 반원 홀 집결
 * -------------------------------------------------------------------------- */
type PrismDir = 'N' | 'E' | 'S' | 'W';
const DIR_CW: PrismDir[] = ['N', 'E', 'S', 'W'];
const DIR_DELTAS: Record<PrismDir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const DIR_NAMES: Record<PrismDir, string> = { N: '북쪽', E: '동쪽', S: '남쪽', W: '서쪽' };
const DIR_ARROW: Record<PrismDir, string> = { N: '↑', E: '→', S: '↓', W: '←' };
const DIR_ROT: Record<PrismDir, number> = { N: 0, E: 90, S: 180, W: 270 };

function tracePrismBeam(prisms: PrismDir[]) {
  const obstacles = new Set(['2,0', '3,0', '2,2', '3,2']);
  const prismPos: { key: string; idx: number }[] = [
    { key: '1,1', idx: 0 },
    { key: '5,1', idx: 1 },
    { key: '5,3', idx: 2 },
  ];
  const cellCenter = (c: number, r: number): [number, number] => [60 + c * 90 + 45, 36 + r * 90 + 45];
  const points: [number, number][] = [[60 + 1 * 90 + 45, 16]];
  let col = 1;
  let row = 0;
  let dir: PrismDir = 'S';
  let blockedMsg = '';
  let blockPoint: [number, number] | null = null;
  let reachedAtrium = false;

  for (let step = 0; step < 30; step++) {
    const pHit = prismPos.find((x) => x.key === `${col},${row}`);
    if (pHit) {
      points.push(cellCenter(col, row));
      dir = prisms[pHit.idx];
      const [dx, dy] = DIR_DELTAS[dir];
      const nc = col + dx;
      const nr = row + dy;
      if (nc === -1 && nr === 3) {
        points.push([46, 36 + 3 * 90 + 45]);
        reachedAtrium = true;
        break;
      }
      if (nc < 0 || nc > 5 || nr < 0 || nr > 3 || obstacles.has(`${nc},${nr}`)) {
        const [cx, cy] = cellCenter(col, row);
        blockPoint = [cx + dx * 45, cy + dy * 45];
        points.push(blockPoint);
        blockedMsg = `M${pHit.idx + 1}에서 ${DIR_NAMES[dir]} 벽에 막혔어요`;
        break;
      }
      col = nc;
      row = nr;
      continue;
    }

    const [dx, dy] = DIR_DELTAS[dir];
    const nc = col + dx;
    const nr = row + dy;
    if (nc === -1 && nr === 3) {
      points.push([46, 36 + 3 * 90 + 45]);
      reachedAtrium = true;
      break;
    }
    if (nc < 0 || nc > 5 || nr < 0 || nr > 3 || obstacles.has(`${nc},${nr}`)) {
      const [cx, cy] = cellCenter(col, row);
      blockPoint = [cx + dx * 45, cy + dy * 45];
      points.push(blockPoint);
      blockedMsg = `${DIR_NAMES[dir]} 벽/전시장에 막혔어요`;
      break;
    }
    col = nc;
    row = nr;
  }

  return { points, blockedMsg, blockPoint, reachedAtrium };
}

function boardP16(
  stage: HTMLElement,
  s: Record<string, unknown>,
  h: BoardHelpers,
  extraActions?: {
    sendHere?: () => void;
    gotoAtrium?: () => void;
    closeModal?: () => void;
    priorDone?: number;
  }
) {
  const rawPrisms = Array.isArray(s.prisms) ? s.prisms : ['S', 'W', 'N'];
  const prisms: PrismDir[] = [0, 1, 2].map((i) => {
    const v = rawPrisms[i];
    return typeof v === 'string' && DIR_CW.includes(v as PrismDir) ? (v as PrismDir) : (['S', 'W', 'N'][i] as PrismDir);
  });
  const mountUnlocked = Boolean(s.mountUnlocked);
  const trace = tracePrismBeam(prisms);
  const beamOk = mountUnlocked && trace.reachedAtrium;
  const hereSent = Boolean(s.hereSent);
  const pads = ((s.pads as boolean[]) || [false, false, false, false]).slice(0, 4);
  const padsCnt = pads.filter(Boolean).length;
  const hint = h.difficulty.showTargetHints;

  if (beamOk && !s.beamReachedAtrium) {
    h.patchState(16, { beamReachedAtrium: true });
  }

  const prismCoords: [number, number][] = [
    [1, 1],
    [5, 1],
    [5, 3],
  ];

  let gridRects = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      gridRects += `<rect x="${60 + c * 90}" y="${36 + r * 90}" width="84" height="84" rx="10" fill="#DECAA2" stroke="#0B0E13" stroke-width="3.5"/>`;
    }
  }

  const polyStr = trace.points.map(([x, y]) => `${x},${y}`).join(' ');

  stage.innerHTML = `
    <div class="fg-board-2col" style="grid-template-columns:minmax(0,1.22fr) minmax(260px,0.78fr)">
      <div class="fg-p16-grid-wrap">
        <div class="fg-row-between" style="width:100%">
          <span style="font-size:12px;font-weight:800;color:${mountUnlocked ? 'var(--fg-mint)' : 'var(--fg-amber)'}">
            ${mountUnlocked ? '✔ 서하린 · 프리즘 거치대 잠금 해제됨' : '🔒 서하린 · 목선 진열장(special-boat-nw)에서 베어링 잠금을 풀어야 회전 가능'}
          </span>
        </div>

        <svg viewBox="0 0 612 416" style="width:100%;max-width:560px;height:auto;display:block">
          <rect x="48" y="24" width="554" height="378" rx="16" fill="#2A241E" stroke="#0B0E13" stroke-width="5"/>
          ${gridRects}
          <!-- 햇빛 창 (1, -1) -->
          <rect x="${60 + 90 + 14}" y="12" width="56" height="16" rx="6" fill="#CFEFFF" stroke="#0B0E13" stroke-width="3"/>
          <image href="${tokenIconUrl('SYM_SUN')}" x="${60 + 90 - 12}" y="0" width="24" height="24" />
          <text x="206" y="18" fill="#F4F7FA" font-size="11" font-weight="800">햇빛 창</text>

          <!-- 전시장 장애물 -->
          <rect x="${60 + 2 * 90 + 8}" y="${36 + 14}" width="160" height="56" rx="10" fill="#8D613B" stroke="#0B0E13" stroke-width="3.5"/>
          <rect x="${60 + 2 * 90 + 8}" y="${36 + 2 * 90 + 14}" width="160" height="56" rx="10" fill="#5D7084" stroke="#0B0E13" stroke-width="3.5"/>

          <!-- 서쪽 아치문 (-1, 3) -->
          <rect x="4" y="${36 + 3 * 90 - 4}" width="54" height="92" rx="12" fill="#182729" stroke="${beamOk ? '#52EFBF' : '#5B6B80'}" stroke-width="3.5"/>
          <text x="31" y="${36 + 3 * 90 + 34}" text-anchor="middle" fill="#52EFBF" font-size="10" font-weight="800">서쪽</text>
          <text x="31" y="${36 + 3 * 90 + 48}" text-anchor="middle" fill="#52EFBF" font-size="10" font-weight="800">아치문</text>
          <text x="31" y="${36 + 3 * 90 + 62}" text-anchor="middle" fill="#9AA7B4" font-size="8.5" font-weight="700">← 여신상</text>

          <!-- 광선 -->
          <polyline points="${polyStr}" fill="none" stroke="rgba(255, 224, 120, 0.35)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="${polyStr}" fill="none" stroke="#FFF4B8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>

          ${
            trace.blockPoint
              ? `<circle cx="${trace.blockPoint[0]}" cy="${trace.blockPoint[1]}" r="14" fill="#FF6E6E" stroke="#0B0E13" stroke-width="3"/>
                 <text x="${trace.blockPoint[0]}" y="${trace.blockPoint[1] + 5}" text-anchor="middle" fill="#0B0E13" font-size="14" font-weight="900">✕</text>`
              : ''
          }

          <!-- 화살표 프리즘 M1~M3 -->
          ${prismCoords
            .map(([pc, pr], i) => {
              const cx = 60 + pc * 90 + 42;
              const cy = 36 + pr * 90 + 42;
              const dir = prisms[i];
              const [dx, dy] = DIR_DELTAS[dir];
              return `<g data-pr="${i}" style="cursor:${mountUnlocked ? 'pointer' : 'not-allowed'}">
                <image href="/assets/puzzle-ui/boards/p16-crystal.svg" x="${cx - 34}" y="${cy - 34}" width="68" height="68" />
                <g transform="translate(${cx} ${cy}) rotate(${DIR_ROT[dir]})">
                  <path d="M 0 -22 L 15 -4 L 6 -4 L 6 18 L -6 18 L -6 -4 L -15 -4 Z" fill="#52EFBF" stroke="#0B0E13" stroke-width="3"/>
                </g>
                <rect x="${cx - 16}" y="${cy - 44}" width="32" height="16" rx="6" fill="#0B0E13"/>
                <text x="${cx}" y="${cy - 33}" text-anchor="middle" fill="#F4F7FA" font-size="10" font-weight="900">M${i + 1}</text>
                ${
                  hint
                    ? `<line x1="${cx + dx * 26}" y1="${cy + dy * 26}" x2="${cx + dx * 66}" y2="${cy + dy * 66}" stroke="#52EFBF" stroke-width="3" stroke-dasharray="5 5"/>`
                    : ''
                }
              </g>`;
            })
            .join('')}
        </svg>
      </div>

      <div class="fg-stack" style="justify-content:space-between">
        <div class="fg-panel fg-stack" style="gap:8px">
          <div>
            <div class="fg-panel-title" style="font-size:18px">프리즘 3개</div>
            <div class="fg-panel-sub">누르면 화살표가 → 한 칸 돌아가요</div>
          </div>
          ${[0, 1, 2]
            .map(
              (i) => `<div class="fg-p16-prism-btn">
                <div>
                  <div style="font-family:var(--fg-font-display);font-size:17px">M${i + 1}</div>
                  <div style="font-size:13px;font-weight:800;color:var(--fg-mint)">${DIR_ARROW[prisms[i]]} 지금 ${DIR_NAMES[prisms[i]]}</div>
                </div>
                <div class="fg-row">
                  ${roundBtnHtml({ id: `p16-rot-${i}`, dataAttr: `data-pr="${i}"`, icon: 'rot-cw', tone: 'steel', disabled: !mountUnlocked, tapHint: i === 0 && mountUnlocked && !beamOk })}
                  ${lampHtml(prisms[i] === ['E', 'S', 'W'][i] && mountUnlocked ? 'mint' : 'off')}
                </div>
              </div>`
            )
            .join('')}
        </div>

        <div class="fg-panel" style="border-color:${beamOk ? 'var(--fg-mint)' : 'var(--fg-red)'};background:${beamOk ? 'rgba(82,239,191,0.12)' : '#2a1519'}">
          <div style="font-family:var(--fg-font-display);font-size:17px;color:${beamOk ? 'var(--fg-mint)' : 'var(--fg-red)'}">
            ${beamOk ? '✨ 반원 홀 여신상 도착!' : '빛이 막혔어요'}
          </div>
          <div style="font-size:12px;font-weight:700;color:var(--fg-text);margin-top:2px">
            ${beamOk ? '2부: 린 [집결 호출] 후 2층 반원 홀 발판 4곳에 모이세요!' : !mountUnlocked ? '서하린의 거치대 잠금 해제가 필요합니다.' : trace.blockedMsg || '아치문으로 빛을 연결하세요.'}
          </div>
        </div>

        <div class="fg-stack" style="gap:6px">
          ${
            extraActions?.priorDone !== undefined && extraActions.priorDone < 15
              ? `<div style="font-size:11.5px;font-weight:800;color:var(--fg-amber);background:rgba(255,184,107,0.12);border:1px solid rgba(255,184,107,0.45);border-radius:8px;padding:6px 10px">⚠ P01~P15 완료 필요 (${extraActions.priorDone}/15) — 모든 퍼즐을 풀어야 동상 홀 4인 발판이 작동합니다</div>`
              : ''
          }
          <div class="fg-row" style="gap:8px">
            <button type="button" class="s-btn amber" id="p16-here" style="flex:1">${hereSent ? '✔ 집결 호출 발신됨' : '📍 린 [집결 호출]'}</button>
            <button type="button" class="s-btn primary" id="p16-goto" style="flex:1">🏃 반원 홀 이동 (${padsCnt}/4)</button>
          </div>
        </div>
      </div>
    </div>
  `;

  stage.querySelectorAll<HTMLElement>('[data-pr]').forEach((b) => {
    b.onclick = () => {
      if (!mountUnlocked) {
        h.setErr('먼저 서하린이 목선 진열장(special-boat-nw)에서 프리즘 거치대 잠금을 해제해야 해요!');
        return;
      }
      const idx = Number(b.dataset.pr);
      const next = [...prisms];
      const curIdx = DIR_CW.indexOf(next[idx]);
      next[idx] = DIR_CW[(curIdx + 1) % 4];
      const nextTrace = tracePrismBeam(next);
      soundEngine.playClick();
      h.patchState(16, { prisms: next, beamReachedAtrium: nextTrace.reachedAtrium });
      if (nextTrace.reachedAtrium) {
        h.setInfo('✨ 태양 광선이 서쪽 아치문을 지나 2F 반원 홀 여신상에 도착했어요!');
      } else {
        h.rerender();
      }
    };
  });

  stage.querySelector<HTMLElement>('#p16-here')!.onclick = () => {
    if (!beamOk) {
      h.setErr('먼저 프리즘 3개를 맞춰 태양 광선을 2F 반원 홀로 보내세요!');
      return;
    }
    extraActions?.sendHere?.();
    h.patchState(16, { hereSent: true });
    h.setInfo('린 [집결 호출 HERE] 발신 완료! 2F 반원 홀(atrium)로 이동해 4개 발판에 올라서세요!');
  };

  stage.querySelector<HTMLElement>('#p16-goto')!.onclick = () => {
    extraActions?.closeModal?.();
    extraActions?.gotoAtrium?.();
  };
}
