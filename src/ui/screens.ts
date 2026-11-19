import type { AnimationsMeta, ClearRecord, FloorKey, GamePhase, PuzzleDef, RoleId, RoomState } from '../types/stranger.ts';
import { ROLE_ORDER, ROLES } from '../data/cMenuTokens.ts';
import { PUZZLES } from '../data/puzzleCatalog.ts';
import { soundEngine } from '../audio/soundEngine.ts';
import {
  FLOOR_KID,
  FLOOR_OVERVIEW_VIEW,
  PUZZLE_KID,
  ROLE_KID,
  ROOM_KID,
  bigPacketHtml,
  charSpriteHtml,
  puzzlePicHtml,
  roomPicHtml,
  teamFlowHtml,
} from './kidVisuals.ts';

function teamRowHtml(scale = 1.6, walk = true): string {
  return `<div class="kid-team-row">${ROLE_ORDER.map((r) => charSpriteHtml(r, scale, walk)).join('')}</div>`;
}

export function renderSplashHtml(): string {
  return `
    <div class="screen-center splash-screen">
      <div class="splash-brand">P A R A L L A X</div>
      ${teamRowHtml(1.6, true)}
      <div class="splash-sub">🏛 필리핀 역사박물관을 구해라!</div>
      <div class="splash-ver">STRANGER 2.0 · 👫 4명이 함께하는 모험</div>
    </div>
  `;
}

export function renderTitleHtml(lastRoomCode: string | null = null): string {
  return `
    <div class="title-screen">
      <canvas id="title-bg-canvas" class="title-bg-canvas"></canvas>
      <div class="title-vignette"></div>
      <div class="title-overlay">
        <div class="title-header">
          <div class="title-pill">UNESCO PARALLAX · STRANGER 2.0</div>
          <h1 class="stranger-logo">STRANGER</h1>
          <p class="stranger-subtitle">낯선 말, 하나가 되는 길</p>
        </div>
        <nav class="title-menu" aria-label="메인 메뉴">
          <button class="title-item primary" id="btn-title-start">▶ 친구들과 시작하기</button>
          ${
            lastRoomCode
              ? `<button class="title-item" id="btn-title-continue">↺ 이어하기 (${escapeHtml(lastRoomCode)})</button>`
              : ''
          }
          <button class="title-item" id="btn-title-solo">⚡ 혼자 해 보기</button>
          <button class="title-item" id="btn-title-settings">🔊 소리 설정</button>
          <button class="title-item" id="btn-title-controls">❔ 하는 방법</button>
        </nav>
        <div class="title-footer">${teamRowHtml(1.4, true)}</div>
      </div>
    </div>
  `;
}

export function startTitleCanvasAnimation(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  canvas.width = 960;
  canvas.height = 540;
  const bg = new Image();
  bg.src = '/assets/1F-structure.png';

  let rafId = 0;
  const start = performance.now();
  const draw = (now: number) => {
    const t = (now - start) / 1000;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#07090D';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (bg.complete && bg.naturalWidth > 0) {
      // Crop around 1F central hall compass rose (x=731..1171, y=1080..1460)
      ctx.drawImage(bg, 731, 1080, 440, 260, 0, 0, canvas.width, canvas.height);
    }

    // Dark atmospheric tint + pulsing 4-role floor medallions
    ctx.fillStyle = 'rgba(7, 10, 15, 0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const activeIdx = Math.floor(t * 1.1) % 4;
    const medCoords: [number, number][] = [
      [480, 206],
      [602, 290],
      [480, 374],
      [358, 290],
    ];
    ROLE_ORDER.forEach((rId, i) => {
      const [mx, my] = medCoords[i];
      const pulse = i === activeIdx ? 0.95 : 0.25 + 0.15 * Math.sin(t * 2 + i);
      ctx.save();
      ctx.strokeStyle = ROLES[rId].color;
      ctx.globalAlpha = pulse;
      ctx.lineWidth = i === activeIdx ? 4 : 2;
      ctx.beginPath();
      ctx.ellipse(mx, my, 24, 15, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    rafId = window.requestAnimationFrame(draw);
  };
  rafId = window.requestAnimationFrame(draw);
  return () => window.cancelAnimationFrame(rafId);
}

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}분 ${String(rem).padStart(2, '0')}초` : `${rem}초`;
}

export function renderClearRecordsHtml(recentClears: ClearRecord[] = [], recordsLoading = false): string {
  if (recordsLoading) {
    return '<div class="gather-records-empty">⏳ 불러오는 중...</div>';
  }
  if (recentClears.length === 0) {
    return '<div class="gather-records-empty">🥇 아직 기록이 없어요. 첫 번째 팀이 되어 봐요!</div>';
  }
  return recentClears
    .map((rec) => {
      const members = rec.teamMembers
        .filter((m) => !m.isBot)
        .map((m) => escapeHtml(m.nickname))
        .join(', ');
      const dateStr = new Date(rec.clearedAt).toLocaleDateString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
      });
      return `<div class="gather-record-row">
        <span class="rec-code">${escapeHtml(rec.roomCode)}</span>
        <span class="rec-diff">${escapeHtml(rec.difficulty)}</span>
        <span class="rec-team">${members || '협동 팀'}</span>
        <span class="rec-meta">⏱ ${formatDuration(rec.durationSeconds)} · 📡 ${rec.radioCount}회 · ${dateStr}</span>
      </div>`;
    })
    .join('');
}

export function renderGatherHtml(
  nickname: string,
  errorMsg: string,
  lastRoomCode: string | null = null,
  recentClears: ClearRecord[] = [],
  recordsLoading = false
): string {
  const recordsHtml = renderClearRecordsHtml(recentClears, recordsLoading);

  return `
    <div class="screen-center gather-screen">
      <div class="top-nav-row">
        <button class="s-btn" id="btn-gather-back">← 뒤로</button>
        <button class="s-btn" id="btn-gather-settings">⚙ 설정</button>
      </div>
      <div class="panel-box gather-box">
        <div class="panel-kicker">STAGE 1 · 🏛 필리핀 역사박물관</div>
        <h2>👫 팀 모으기</h2>
        <div class="gather-top-row">
          <label class="field-label" style="margin-bottom:0">🙂 내 이름
            <input class="s-input" id="inp-gather-nick" maxlength="12" value="${escapeHtml(nickname)}" placeholder="예: 서하린" />
          </label>
          ${
            lastRoomCode
              ? `<button class="s-btn primary" id="btn-rejoin-last">↺ 이어하기 (${escapeHtml(lastRoomCode)})</button>`
              : ''
          }
        </div>
        <div class="gather-grid">
          <div class="gather-card">
            <div class="kid-card-emoji">🏠</div>
            <h3>새 방 만들기</h3>
            <p>🔑 코드가 생겨요 ➜ 친구에게 알려 줘요</p>
            <button class="s-btn primary big" id="btn-create-room">✦ 방 만들기</button>
          </div>
          <div class="gather-card">
            <div class="kid-card-emoji">🚪</div>
            <h3>코드로 들어가기</h3>
            <p>친구 코드 6글자를 넣어요</p>
            <div class="code-boxes" id="code-boxes">
              ${[0, 1, 2, 3, 4, 5].map((i) => `<input class="code-box" data-cbox="${i}" maxlength="1" autocomplete="off" />`).join('')}
            </div>
            <button class="s-btn amber big" id="btn-join-room">→ 들어가기</button>
          </div>
        </div>
        ${errorMsg ? `<div class="au-feedback err" style="margin-top:12px">${escapeHtml(errorMsg)}</div>` : ''}
        <div class="gather-records-card">
          <div class="gather-records-head">🏆 최근 기록</div>
          <div class="gather-records-list" id="gather-records-list">${recordsHtml}</div>
        </div>
      </div>
    </div>
  `;
}

export function renderLobbyHtml(
  room: RoomState,
  myRole: RoleId,
  myClientId: string,
  wsOnline: boolean,
  connectionLabel?: string
): string {
  const humanCount = ROLE_ORDER.filter((r) => room.slots[r].ownerClientId).length;
  const botCount = ROLE_ORDER.filter((r) => !room.slots[r].ownerClientId && room.slots[r].isBot).length;
  const connText = connectionLabel || (wsOnline ? '실시간 WebSocket' : '로컬/탭 동기화');

  return `
    <div class="screen-center lobby-screen">
      <div class="lobby-header">
        <div class="lobby-stage-pill">🏛 필리핀 역사박물관 · 🧩 퍼즐 16개</div>
        <div class="lobby-title-wrap">
          <h2>👆 누구로 할까요?</h2>
          <div class="room-code-pill" id="btn-copy-code" title="클릭해 방 코드 복사">
            방 코드 <strong>${room.code}</strong>
            <span class="ws-dot ${wsOnline ? 'on' : ''}">${escapeHtml(connText)}</span>
          </div>
        </div>
        <div class="lobby-top-actions">
          <button class="s-btn" id="btn-lobby-diff">🎚 난이도: ${room.difficulty}</button>
          <button class="s-btn" id="btn-lobby-settings">🔊 소리</button>
        </div>
      </div>

      <div class="lobby-cards">
        ${ROLE_ORDER.map((rId) => {
          const meta = ROLES[rId];
          const slot = room.slots[rId];
          const isMine = rId === myRole;
          const occupiedOther = Boolean(slot.ownerClientId && slot.ownerClientId !== myClientId);
          const kid = ROLE_KID[rId];
          const statusLabel = isMine
            ? `★ 나 (${escapeHtml(slot.nickname)})`
            : occupiedOther
              ? `👤 ${escapeHtml(slot.nickname)}`
              : slot.isBot
                ? '🤖 로봇 친구'
                : '👆 비어 있어요';
          return `<button class="role-card ${isMine ? 'selected' : ''}" data-pick-role="${rId}" style="--rc:${meta.color}" title="${meta.passiveName}: ${meta.passiveDesc}">
            <div class="role-card-badge">${meta.country}</div>
            <canvas class="role-preview-canvas" data-char-canvas="${rId}" width="96" height="192"></canvas>
            <div class="role-card-name" style="color:${meta.color}">${meta.name}</div>
            <div class="role-card-job"><span class="role-card-job-emoji">${kid.emoji}</span>${kid.job}</div>
            <div class="role-card-passive">${kid.does}</div>
            <div class="role-card-status">${statusLabel}</div>
          </button>`;
        }).join('')}
      </div>

      <div class="lobby-bottom">
        <button class="s-btn" id="btn-lobby-leave">← 나가기</button>
        <label class="lobby-nick-wrap">🙂 이름
          <input class="s-input" id="inp-lobby-nick" maxlength="12" value="${escapeHtml(room.slots[myRole]?.nickname || ROLES[myRole].name)}" />
        </label>
        <button class="s-btn ${room.fillBots ? 'amber' : ''}" id="btn-lobby-bots">🤖 로봇 친구 ${room.fillBots ? 'ON' : 'OFF'}</button>
        <button class="s-btn ${room.soloSwitchEnabled ? 'primary' : ''}" id="btn-lobby-solo">🔄 1~4 바꾸기 ${room.soloSwitchEnabled ? 'ON' : 'OFF'}</button>
        <button class="s-btn primary big" id="btn-lobby-start">
          ▶ 시작! ${botCount > 0 ? `(👤${humanCount} + 🤖${botCount})` : `(👤${humanCount})`}
        </button>
      </div>
    </div>
  `;
}

export function startLobbyCharacterPreviewLoop(container: HTMLElement, anims: AnimationsMeta): () => void {
  const sheet = new Image();
  sheet.src = '/' + anims.sheet;
  let rafId = 0;
  const start = performance.now();

  const draw = (now: number) => {
    const t = (now - start) / 1000;
    const canvases = container.querySelectorAll<HTMLCanvasElement>('[data-char-canvas]');
    if (sheet.complete && sheet.naturalWidth > 0) {
      canvases.forEach((cv, idx) => {
        const rId = cv.dataset.charCanvas as RoleId;
        const meta = anims.characters[rId];
        const ctx = cv.getContext('2d');
        if (!meta || !ctx) return;
        const seq = anims.walkSequence;
        const fIdx = seq[Math.floor(t * 5 + idx) % seq.length];
        const f = meta.frames.down[fIdx] || meta.frames.down[4];
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(sheet, f.sx, f.sy, f.w, f.h, 0, 0, cv.width, cv.height);
      });
    }
    rafId = window.requestAnimationFrame(draw);
  };
  rafId = window.requestAnimationFrame(draw);
  return () => window.cancelAnimationFrame(rafId);
}

/** 인트로: 긴 글 대신 "그림 한 장 + 한 문장" 슬라이드 */
const INTRO_SLIDES: { title: string; caption: string; visual: () => string }[] = [
  {
    title: '🌀 박물관에 큰일이 났어요!',
    caption: '태풍 때문에 불이 꺼지고 물이 찼어요.',
    visual: () =>
      roomPicHtml(
        '1F',
        [731, 1080, 440, 260],
        '',
        'kid-storm',
        `<span class="kid-fx kid-fx-rain">⛈</span>
         <span class="kid-fx kid-fx-bulb">💡<b>✕</b></span>
         <span class="kid-fx kid-fx-wave">🌊🌊🌊</span>
         <div class="kid-storm-team">${ROLE_ORDER.map((r) => charSpriteHtml(r, 1.5, true)).join('')}</div>`
      ),
  },
  {
    title: '👫 우리는 탐험대 4명!',
    caption: '모두 잘하는 게 달라요. 서로 도와야 해요!',
    visual: () => `
      <div class="kid-intro-team">
        ${ROLE_ORDER.map((r) => {
          const m = ROLES[r];
          const k = ROLE_KID[r];
          return `<div class="kid-intro-hero" style="--rc:${m.color}">
            ${charSpriteHtml(r, 2.2, true)}
            <strong style="color:${m.color}">${m.name}</strong>
            <span class="kid-intro-job"><span>${k.emoji}</span>${k.job}</span>
          </div>`;
        }).join('')}
      </div>`,
  },
  {
    title: '📡 말 대신 그림으로 말해요',
    caption: '[C] 키를 누르면 그림 무전을 보낼 수 있어요.',
    visual: () => `
      <div class="kid-radio-demo">
        <div class="kid-radio-person">${charSpriteHtml('maria', 2.2, true)}<strong style="color:${ROLES.maria.color}">${ROLES.maria.name}</strong></div>
        <div class="kid-bubble">${bigPacketHtml(['DIR_N', 'SYM_SUN'])}</div>
        <div class="kid-flow-arrow big">➜</div>
        <div class="kid-radio-person">${charSpriteHtml('lin', 2.2, true)}<strong style="color:${ROLES.lin.color}">${ROLES.lin.name}</strong><span class="kid-ok">👍 알았어!</span></div>
      </div>
      <div class="kid-radio-key"><kbd class="kid-kbd">C</kbd> = 📡 무전</div>`,
  },
  {
    title: '🧩 퍼즐 16개를 풀어요!',
    caption: '마지막엔 2층 홀에 4명이 모두 모이면 성공!',
    visual: () => `
      <div class="kid-floor-path">
        ${(['1F', 'B1', '2F'] as FloorKey[])
          .map((f) => {
            const fk = FLOOR_KID[f];
            return `<div class="kid-floor-step">
              ${roomPicHtml(f, FLOOR_OVERVIEW_VIEW[f], '', 'kid-floor-pic')}
              <strong>${fk.emoji} ${fk.name}</strong>
              <span class="kid-count">🧩 × ${fk.count}</span>
            </div>`;
          })
          .join('<div class="kid-flow-arrow big">➜</div>')}
        <div class="kid-flow-arrow big">➜</div>
        <div class="kid-floor-step kid-goal">
          <div class="kid-crown">👑</div>
          <div class="kid-team-mini">${ROLE_ORDER.map((r) => charSpriteHtml(r, 1)).join('')}</div>
          <strong>다 함께 모이기</strong>
        </div>
      </div>`,
  },
];

export const INTRO_SLIDE_COUNT = INTRO_SLIDES.length;

export function renderIntroHtml(slideIdx: number): string {
  const idx = Math.min(INTRO_SLIDES.length - 1, Math.max(0, slideIdx));
  const slide = INTRO_SLIDES[idx];
  const isLast = idx >= INTRO_SLIDES.length - 1;
  return `
    <div class="screen-center intro-screen">
      <div class="panel-box intro-box kid-intro">
        <div class="kid-dots" aria-label="${idx + 1} / ${INTRO_SLIDES.length}">
          ${INTRO_SLIDES.map((_, i) => `<span class="${i === idx ? 'on' : ''}"></span>`).join('')}
        </div>
        <div class="kid-stage">${slide.visual()}</div>
        <h2 class="kid-headline">${slide.title}</h2>
        <p class="kid-caption">${slide.caption}</p>
        <div class="intro-actions">
          <button class="s-btn" id="btn-intro-skip">[X] 건너뛰기</button>
          <button class="s-btn primary big" id="btn-intro-next">${isLast ? '▶ 박물관 들어가기!' : '다음 →'}</button>
        </div>
      </div>
    </div>
  `;
}

export function renderSettingsModalHtml(): string {
  const st = soundEngine.getSettings();
  return `
    <div class="au-modal small-modal" role="dialog" aria-modal="true" aria-label="사운드 설정">
      <div class="au-modal-head">
        <strong>⚙ 환경 설정</strong>
        <button class="au-close-x" id="btn-close-overlay">✕</button>
      </div>
      <div class="au-body p-stack">
        <label class="p-card">
          <div class="p-row-between"><span>🔊 효과음</span><strong id="lbl-sfx">${st.sfxVolume}%</strong></div>
          <input type="range" min="0" max="100" value="${st.sfxVolume}" id="rng-sfx" style="width:100%;margin-top:8px" />
        </label>
        <label class="p-card">
          <div class="p-row-between"><span>🎵 배경음악</span><strong id="lbl-bgm">${st.bgmVolume}%</strong></div>
          <input type="range" min="0" max="100" value="${st.bgmVolume}" id="rng-bgm" style="width:100%;margin-top:8px" />
        </label>
        <button class="s-btn primary" id="btn-settings-ok">확인 (X / ESC)</button>
      </div>
    </div>
  `;
}

export function renderControlsModalHtml(soloSwitchEnabled: boolean): string {
  return `
    <div class="au-modal small-modal kid-controls" role="dialog" aria-modal="true" aria-label="하는 방법">
      <div class="au-modal-head">
        <strong>❔ 이렇게 해요</strong>
        <button class="au-close-x" id="btn-close-overlay">✕</button>
      </div>
      <div class="au-body p-stack">
        <div class="kid-keys">
          <div class="kid-key kid-key-move">
            <div class="kid-arrows"><kbd class="kid-kbd">↑</kbd><kbd class="kid-kbd">←</kbd><kbd class="kid-kbd">↓</kbd><kbd class="kid-kbd">→</kbd></div>
            <div class="kid-key-emoji">🚶</div><div class="kid-key-word">걷기</div>
          </div>
          <div class="kid-key"><kbd class="kid-kbd">E</kbd><div class="kid-key-emoji">✋</div><div class="kid-key-word">살펴보기</div></div>
          <div class="kid-key"><kbd class="kid-kbd">C</kbd><div class="kid-key-emoji">📡</div><div class="kid-key-word">무전</div></div>
          <div class="kid-key"><kbd class="kid-kbd">M</kbd><div class="kid-key-emoji">🗺</div><div class="kid-key-word">지도</div></div>
          <div class="kid-key"><kbd class="kid-kbd">H</kbd><div class="kid-key-emoji">❔</div><div class="kid-key-word">도움말</div></div>
          <div class="kid-key"><kbd class="kid-kbd">P</kbd><div class="kid-key-emoji">🚪</div><div class="kid-key-word">나가기</div></div>
          ${
            soloSwitchEnabled
              ? '<div class="kid-key"><kbd class="kid-kbd">1~4</kbd><div class="kid-key-emoji">🔄</div><div class="kid-key-word">친구 바꾸기</div></div>'
              : ''
          }
        </div>
        <div class="kid-role-strip">
          ${ROLE_ORDER.map((r) => {
            const m = ROLES[r];
            const k = ROLE_KID[r];
            return `<div class="kid-role-mini" style="--rc:${m.color}" title="${m.passiveName}: ${m.passiveDesc}">
              ${charSpriteHtml(r, 1.4)}
              <strong style="color:${m.color}">${m.name}</strong>
              <span>${k.emoji} ${k.job}</span>
            </div>`;
          }).join('')}
        </div>
        <button class="s-btn primary big" id="btn-controls-ok">▶ 출발! (E)</button>
      </div>
    </div>
  `;
}

export function renderRoomIntroModalHtml(
  info: {
    kicker: string;
    title: string;
    body: string;
    puzzlesHint: string;
  },
  pic: {
    key: string;
    floor: FloorKey;
    sceneLabel: string;
    view: [number, number, number, number] | null;
    puzzles: PuzzleDef[];
    solvedPids: number[];
  }
): string {
  const kid = ROOM_KID[pic.key];
  const title = pic.sceneLabel || info.title;
  const picHtml = pic.view
    ? roomPicHtml(pic.floor, pic.view, pic.key, 'kid-room-hero', kid ? `<span class="kid-room-badge">${kid.emoji}</span>` : '')
    : '';
  const missions = pic.puzzles.length
    ? pic.puzzles
        .map((p) => {
          const k = PUZZLE_KID[p.id];
          const done = pic.solvedPids.includes(p.id);
          return `<div class="kid-mission ${done ? 'done' : ''}">
            <div class="kid-mission-pic">${puzzlePicHtml(p.id)}</div>
            <div class="kid-mission-main">
              <strong>${done ? '✅' : k?.emoji || '🧩'} ${k?.title || escapeHtml(p.title)} <small>${p.code}</small></strong>
              ${teamFlowHtml(p, 0.8)}
            </div>
          </div>`;
        })
        .join('')
    : `<div class="kid-mission kid-mission-gather">
        <div class="kid-team-mini">${ROLE_ORDER.map((r) => charSpriteHtml(r, 1.2, true)).join('')}</div>
        <strong>👣 발판 4개에 4명 모두 올라서기!</strong>
      </div>`;
  return `
    <div class="au-modal small-modal room-intro-modal kid-room" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="au-modal-head">
        <span style="color:#E6C886;font-weight:900">🗺 ${escapeHtml(info.kicker)}</span>
        <button class="au-close-x" id="btn-close-overlay">✕</button>
      </div>
      <div class="au-body p-stack">
        ${picHtml}
        <h2 class="kid-room-title">${escapeHtml(title)}</h2>
        ${kid ? `<p class="kid-caption">${kid.line}</p>` : ''}
        <div class="kid-missions">${missions}</div>
        <details class="kid-more">
          <summary>📖 이야기 자세히 보기</summary>
          <p>${escapeHtml(info.body)}</p>
        </details>
        <button class="s-btn primary big" id="btn-room-intro-ok">🔍 조사 시작! (E)</button>
      </div>
    </div>
  `;
}

export function renderExitConfirmModalHtml(): string {
  return `
    <div class="au-modal small-modal" role="dialog" aria-modal="true" aria-label="나가기 확인">
      <div class="au-modal-head">
        <strong>🚪 그만할까요?</strong>
        <button class="au-close-x" id="btn-close-overlay">✕</button>
      </div>
      <div class="au-body p-stack">
        <div class="kid-exit-pic">🏛 ➜ 🏠</div>
        <div class="p-row-between">
          <button class="s-btn" id="btn-exit-cancel">[X] ▶ 계속하기</button>
          <button class="s-btn danger" id="btn-exit-confirm">[Enter] 🚪 나가기</button>
        </div>
      </div>
    </div>
  `;
}

export function renderCoronationEndingHtml(room: RoomState, savedToCloud = false): string {
  const solvedCount = room.solvedPids.length;
  const elapsedSec = room.startedAt ? Math.max(0, Math.round((Date.now() - room.startedAt) / 1000)) : null;
  const elapsedText = elapsedSec !== null ? ` · ⏱ <strong>${formatDuration(elapsedSec)}</strong>` : '';
  return `
    <div class="coronation-overlay" role="dialog" aria-modal="true" aria-label="박물관 다시 문 열기 성공 엔딩">
      <div class="coronation-card">
        <div class="coronation-crest">👑 16 / 16 성공!</div>
        ${savedToCloud ? '<div class="coro-cloud-badge">☁ 기록 저장 완료</div>' : ''}
        <h1>🎉 박물관이 다시 문을 열었어요!</h1>
        <p class="coronation-lead">모두 힘을 합쳐 박물관을 구했어요!</p>

        <div class="coronation-heroes">
          ${ROLE_ORDER.map((r) => {
            const m = ROLES[r];
            const k = ROLE_KID[r];
            return `<div class="hero-badge kid-hero" style="border-color:${m.color}">
              ${charSpriteHtml(r, 1.6, true)}
              <div style="color:${m.color};font-weight:900">${m.name}</div>
              <small>${k.emoji} ${k.job}</small>
            </div>`;
          }).join('')}
        </div>

        <div class="coronation-grid">
          ${PUZZLES.map((p) => {
            const k = PUZZLE_KID[p.id];
            return `<div class="coro-item kid-coro-item ${room.solvedPids.includes(p.id) ? 'done' : ''}" title="${p.code} ${p.title}">
              ${puzzlePicHtml(p.id, 'kid-obj-sm')}
              <span>${k ? `${k.emoji} ${k.title}` : p.title}</span>
            </div>`;
          }).join('')}
        </div>

        <div class="coronation-footer">
          <div class="coro-stats">🧩 <strong>${solvedCount} / 16</strong> · 📡 <strong>${room.radioLog.length}번</strong>${elapsedText}</div>
          <div class="p-row">
            <button class="s-btn" id="btn-coro-explore">🏛 박물관 구경하기</button>
            <button class="s-btn primary" id="btn-coro-replay">↺ 다시 하기</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function isNonBlockingPhase(phase: GamePhase): boolean {
  return phase === 'playing';
}

function escapeHtml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
