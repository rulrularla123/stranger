import type { AnimationsMeta, ClearRecord, GamePhase, RoleId, RoomState } from '../types/stranger.ts';
import { ROLE_ORDER, ROLES } from '../data/cMenuTokens.ts';
import { PUZZLES } from '../data/puzzleCatalog.ts';
import { soundEngine } from '../audio/soundEngine.ts';

export function renderSplashHtml(): string {
  return `
    <div class="screen-center splash-screen">
      <div class="splash-brand">P A R A L L A X</div>
      <div class="splash-sub">2026 유네스코학교 교육의 미래 프로젝트 · 필리핀 역사박물관 복원 미스터리</div>
      <div class="splash-ver">STRANGER 2.0 · 4인 비언어 협동 픽셀 어드벤처</div>
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
          <button class="title-item primary" id="btn-title-start">▶ 시작하기 (팀 모으기 / 로비)</button>
          ${
            lastRoomCode
              ? `<button class="title-item" id="btn-title-continue">↺ 직전 방 이어하기 (${escapeHtml(lastRoomCode)})</button>`
              : ''
          }
          <button class="title-item" id="btn-title-solo">⚡ 솔로 · 4인 역할 전환 즉시 시연</button>
          <button class="title-item" id="btn-title-settings">⚙ 설정 (효과음 / 배경음악)</button>
          <button class="title-item" id="btn-title-controls">❔ 조작 방법</button>
        </nav>
        <div class="title-footer">v2.0 · 16 무반복 퍼즐 · C-Menu 2.0 20토큰 · .pixil 4방향 애니메이션</div>
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
    return '<div class="gather-records-empty">Supabase에서 기록을 불러오는 중...</div>';
  }
  if (recentClears.length === 0) {
    return '<div class="gather-records-empty">아직 기록된 완주 팀이 없습니다. 첫 번째 복원 팀이 되어 보세요!</div>';
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
        <div class="panel-kicker">STAGE 1 · 침수된 필리핀 역사박물관</div>
        <h2>팀 모으기</h2>
        <div class="gather-top-row">
          <label class="field-label" style="margin-bottom:0">내 닉네임
            <input class="s-input" id="inp-gather-nick" maxlength="12" value="${escapeHtml(nickname)}" placeholder="예: 서하린" />
          </label>
          ${
            lastRoomCode
              ? `<button class="s-btn primary" id="btn-rejoin-last">↺ 직전 방 이어하기 (${escapeHtml(lastRoomCode)})</button>`
              : ''
          }
        </div>
        <div class="gather-grid">
          <div class="gather-card">
            <h3>새 협동 방 만들기</h3>
            <p>6자리 방 코드를 발급받아 친구를 초대하거나 AI 봇 동료와 함께 시작합니다.</p>
            <button class="s-btn primary big" id="btn-create-room">✦ 방 만들기</button>
          </div>
          <div class="gather-card">
            <h3>방 코드로 참가하기</h3>
            <p>친구가 공유한 6자리 대문자 방 코드를 입력하세요.</p>
            <div class="code-boxes" id="code-boxes">
              ${[0, 1, 2, 3, 4, 5].map((i) => `<input class="code-box" data-cbox="${i}" maxlength="1" autocomplete="off" />`).join('')}
            </div>
            <button class="s-btn amber big" id="btn-join-room">→ 방 참가하기</button>
          </div>
        </div>
        ${errorMsg ? `<div class="au-feedback err" style="margin-top:12px">${escapeHtml(errorMsg)}</div>` : ''}
        <div class="gather-records-card">
          <div class="gather-records-head">🏆 최근 박물관 복원 기록</div>
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
        <div class="lobby-stage-pill">Stage 1 · 침수된 필리핀 역사박물관 (16개 퍼즐)</div>
        <div class="lobby-title-wrap">
          <h2>캐릭터 선택</h2>
          <div class="room-code-pill" id="btn-copy-code" title="클릭해 방 코드 복사">
            방 코드 <strong>${room.code}</strong>
            <span class="ws-dot ${wsOnline ? 'on' : ''}">${escapeHtml(connText)}</span>
          </div>
        </div>
        <div class="lobby-top-actions">
          <button class="s-btn" id="btn-lobby-diff">난이도: ${room.difficulty}</button>
          <button class="s-btn" id="btn-lobby-settings">⚙ 설정</button>
        </div>
      </div>

      <div class="lobby-cards">
        ${ROLE_ORDER.map((rId) => {
          const meta = ROLES[rId];
          const slot = room.slots[rId];
          const isMine = rId === myRole;
          const occupiedOther = Boolean(slot.ownerClientId && slot.ownerClientId !== myClientId);
          const statusLabel = isMine
            ? `★ ${slot.nickname} (나)`
            : occupiedOther
              ? `👤 ${slot.nickname}`
              : slot.isBot
                ? '🤖 AI 봇 · 눌러서 전환'
                : '빈 자리 · 눌러서 선택';
          return `<button class="role-card ${isMine ? 'selected' : ''}" data-pick-role="${rId}" style="--rc:${meta.color}">
            <div class="role-card-badge">${meta.badge} ${meta.country}</div>
            <canvas class="role-preview-canvas" data-char-canvas="${rId}" width="96" height="192"></canvas>
            <div class="role-card-name" style="color:${meta.color}">${meta.name}</div>
            <div class="role-card-title">${meta.shortRole}</div>
            <div class="role-card-passive">${meta.passiveName}</div>
            <div class="role-card-status">${statusLabel}</div>
          </button>`;
        }).join('')}
      </div>

      <div class="lobby-bottom">
        <button class="s-btn" id="btn-lobby-leave">← 나가기</button>
        <label class="lobby-nick-wrap">닉네임
          <input class="s-input" id="inp-lobby-nick" maxlength="12" value="${escapeHtml(room.slots[myRole]?.nickname || ROLES[myRole].name)}" />
        </label>
        <button class="s-btn ${room.fillBots ? 'amber' : ''}" id="btn-lobby-bots">🤖 +봇 (${room.fillBots ? 'ON' : 'OFF'})</button>
        <button class="s-btn ${room.soloSwitchEnabled ? 'primary' : ''}" id="btn-lobby-solo">🎛 1~4키 역할 전환 (${room.soloSwitchEnabled ? '허용' : '고정'})</button>
        <button class="s-btn primary big" id="btn-lobby-start">
          ▶ 게임 시작 ${botCount > 0 ? `(사람 ${humanCount} + 봇 ${botCount})` : `(참여 ${humanCount}명)`}
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

const INTRO_SLIDES = [
  {
    kicker: 'PROLOGUE 1 / 3 · 필리핀 역사박물관 긴급 복원 임무',
    title: '태풍이 지나간 밤, 정전과 침수에 잠긴 박물관',
    body: '유네스코 동아리 PARALLAX 현장 조사단 서하린·이안·린·카이가 마닐라 역사박물관에 도착했습니다. 1층 전시실의 잠금 장치, 지하 B1의 침수된 배전반과 보일러, 2층 아카이브의 훼손된 사료까지 모두 복원해야 합니다.',
  },
  {
    kicker: 'PROLOGUE 2 / 3 · 4인 고정 역할과 C-Menu 2.0 무전',
    title: '서로 다른 단서, 하나의 무전 채널',
    body: '각자의 직업(조작자·통역·네비게이터·관측자) 시야는 탐색부터 퍼즐 끝까지 유지됩니다. [C] 키를 눌러 20토큰 무전 휠로 1~2개 신호를 조합해 팀원과 소통하세요.',
  },
  {
    kicker: 'PROLOGUE 3 / 3 · 최종 목표',
    title: '16개 유물을 복원하고 반원 동상 홀에 모여라',
    body: '지하 B1 고압 전기실(P09)을 복구하면 박물관 전체 조명이 돌아옵니다. 모든 전시를 복원한 뒤 2층 반원 홀 발판 4곳에 함께 서면 정식 개관 대관식이 시작됩니다!',
  },
];

export function renderIntroHtml(slideIdx: number): string {
  const slide = INTRO_SLIDES[Math.min(INTRO_SLIDES.length - 1, Math.max(0, slideIdx))];
  const isLast = slideIdx >= INTRO_SLIDES.length - 1;
  return `
    <div class="screen-center intro-screen">
      <div class="panel-box intro-box">
        <div class="panel-kicker">${slide.kicker}</div>
        <h2>${slide.title}</h2>
        <p class="intro-body">${slide.body}</p>
        <div class="intro-actions">
          <button class="s-btn" id="btn-intro-skip">[X] 건너뛰기</button>
          <button class="s-btn primary" id="btn-intro-next">${isLast ? '▶ 박물관 입장하기' : '다음 →'}</button>
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
          <div class="p-row-between"><span>🔊 효과음 (SFX)</span><strong id="lbl-sfx">${st.sfxVolume}%</strong></div>
          <input type="range" min="0" max="100" value="${st.sfxVolume}" id="rng-sfx" style="width:100%;margin-top:8px" />
        </label>
        <label class="p-card">
          <div class="p-row-between"><span>🎵 배경음악 (BGM)</span><strong id="lbl-bgm">${st.bgmVolume}%</strong></div>
          <input type="range" min="0" max="100" value="${st.bgmVolume}" id="rng-bgm" style="width:100%;margin-top:8px" />
        </label>
        <button class="s-btn primary" id="btn-settings-ok">확인 (X / ESC)</button>
      </div>
    </div>
  `;
}

export function renderControlsModalHtml(soloSwitchEnabled: boolean): string {
  return `
    <div class="au-modal small-modal" role="dialog" aria-modal="true" aria-label="조작 방법">
      <div class="au-modal-head">
        <strong>❔ 조작 방법 · 역할 안내</strong>
        <button class="au-close-x" id="btn-close-overlay">✕</button>
      </div>
      <div class="au-body p-stack">
        <div class="controls-grid">
          <div><kbd>W A S D</kbd> / <kbd>방향키</kbd></div><span>캐릭터 이동</span>
          <div><kbd>E</kbd></div><span>문·계단 이동 및 퍼즐 오브젝트 조사</span>
          <div><kbd>C</kbd></div><span>C-Menu 2.0 (20토큰 무전 휠 열기/닫기)</span>
          <div><kbd>M</kbd></div><span>박물관 3층 구조 · 포탈 가이드</span>
          <div><kbd>H</kbd></div><span>조작 방법 다시 보기</span>
          <div><kbd>P</kbd></div><span>로비로 나가기 확인</span>
          ${soloSwitchEnabled ? '<div><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd></div><span>솔로/시연 모드 4역할 즉시 전환</span>' : ''}
        </div>
        <div class="p-grid-2" style="gap:8px">
          ${ROLE_ORDER.map((r) => {
            const m = ROLES[r];
            return `<div class="p-card" style="border-color:${m.color}">
              <strong style="color:${m.color}">${m.badge} ${m.name} · ${m.shortRole}</strong>
              <div style="font-size:12px;color:#C2CFD8;margin-top:4px">${m.passiveDesc}</div>
            </div>`;
          }).join('')}
        </div>
        <button class="s-btn primary" id="btn-controls-ok">탐색 시작 (X / E / ESC)</button>
      </div>
    </div>
  `;
}

export function renderRoomIntroModalHtml(info: {
  kicker: string;
  title: string;
  body: string;
  puzzlesHint: string;
}): string {
  return `
    <div class="au-modal small-modal room-intro-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(info.title)}">
      <div class="au-modal-head">
        <span style="color:#E6C886;font-weight:900">🗺 ${escapeHtml(info.kicker)}</span>
        <button class="au-close-x" id="btn-close-overlay">✕</button>
      </div>
      <div class="au-body p-stack">
        <h2 style="margin:0;font-size:20px;color:#52EFBF">${escapeHtml(info.title)}</h2>
        <p style="margin:0;color:#DCE6EE;line-height:1.6;font-size:14px">${escapeHtml(info.body)}</p>
        <div class="p-card" style="border-color:#C89D54;font-size:12px">
          <strong style="color:#E6C886">연동 복원 목표:</strong> ${escapeHtml(info.puzzlesHint)}
        </div>
        <button class="s-btn primary" id="btn-room-intro-ok">조사 시작 (E / X / ESC)</button>
      </div>
    </div>
  `;
}

export function renderExitConfirmModalHtml(): string {
  return `
    <div class="au-modal small-modal" role="dialog" aria-modal="true" aria-label="나가기 확인">
      <div class="au-modal-head">
        <strong>🚪 로비로 나갈까요?</strong>
        <button class="au-close-x" id="btn-close-overlay">✕</button>
      </div>
      <div class="au-body p-stack">
        <p style="margin:0;color:#D5DFE8">타이틀 또는 캐릭터 선택 로비로 돌아갑니다.</p>
        <div class="p-row-between">
          <button class="s-btn" id="btn-exit-cancel">[X] 계속 플레이</button>
          <button class="s-btn danger" id="btn-exit-confirm">[Enter] 로비로 나가기</button>
        </div>
      </div>
    </div>
  `;
}

export function renderCoronationEndingHtml(room: RoomState, savedToCloud = false): string {
  const solvedCount = room.solvedPids.length;
  const elapsedSec = room.startedAt ? Math.max(0, Math.round((Date.now() - room.startedAt) / 1000)) : null;
  const elapsedText = elapsedSec !== null ? ` · 소요: <strong>${formatDuration(elapsedSec)}</strong>` : '';
  return `
    <div class="coronation-overlay" role="dialog" aria-modal="true" aria-label="박물관 정식 개관 대관식 엔딩">
      <div class="coronation-card">
        <div class="coronation-crest">👑 GRAND CORONATION · 16 / 16 RESTORED</div>
        ${savedToCloud ? '<div class="coro-cloud-badge">☁ Supabase 기록 저장 완료</div>' : ''}
        <h1>필리핀 역사박물관 정식 개관 대관식</h1>
        <p class="coronation-lead">
          1층의 생활사와 도시 기억, 지하 B1의 전력·수압·수장고, 2층의 카티푸난 비밀 헌장과 성곽 도면,
          그리고 해양 교역 프리즘의 빛이 마침내 <strong>반원 동상 홀 여신상</strong> 위에서 하나로 모였습니다!
        </p>

        <div class="coronation-heroes">
          ${ROLE_ORDER.map((r) => {
            const m = ROLES[r];
            return `<div class="hero-badge" style="border-color:${m.color}">
              <div style="color:${m.color};font-weight:900">${m.badge} ${m.name}</div>
              <small>${m.country} · ${m.title}</small>
            </div>`;
          }).join('')}
        </div>

        <div class="coronation-grid">
          ${PUZZLES.map(
            (p) => `<div class="coro-item ${room.solvedPids.includes(p.id) ? 'done' : ''}">
              <span>${p.code}</span> ${p.title}
            </div>`
          ).join('')}
        </div>

        <div class="coronation-footer">
          <div class="coro-stats">복원 완료율: <strong>${solvedCount} / 16</strong> · 무전 교환: <strong>${room.radioLog.length}회</strong>${elapsedText} · PARALLAX UNESCO 프로젝트</div>
          <div class="p-row">
            <button class="s-btn" id="btn-coro-explore">박물관 자유 둘러보기</button>
            <button class="s-btn primary" id="btn-coro-replay">↺ 처음부터 다시 플레이</button>
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
