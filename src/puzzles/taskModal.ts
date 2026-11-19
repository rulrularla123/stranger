import type { MapJson, MapObject, PuzzleDef, RoleId, RoomState } from '../types/stranger.ts';
import { ROLES, renderTokenPillHtml } from '../data/cMenuTokens.ts';
import { MAIN_OPERATOR_OBJECT_IDS, PUZZLES_BY_ID, getDifficultyConfig } from '../data/puzzleCatalog.ts';
import { soundEngine } from '../audio/soundEngine.ts';
import type { SessionClient } from '../net/sessionClient.ts';
import { renderAct1Act2Board, type BoardHelpers } from './boardsAct1Act2.ts';
import { renderAct3Act4Board } from './boardsAct3Act4.ts';

export interface TaskModalHost {
  onOpenCMenu: () => void;
  onRequestBotClue: (pid: number) => void;
  onJumpToAtrium: () => void;
}

function canAccessMain(p: PuzzleDef, myRole: RoleId, soloMode: boolean): boolean {
  if (soloMode) return true;
  if (myRole === p.mainRole) return true;
  if (p.id === 16 && myRole === 'doyun') return true;
  return false;
}

function canAccessClue(p: PuzzleDef, myRole: RoleId, soloMode: boolean): boolean {
  if (soloMode) return true;
  return myRole !== p.mainRole;
}

export class TaskModal {
  private root: HTMLElement;
  private session: SessionClient;
  private mapData: MapJson;
  private host: TaskModalHost;
  private open = false;
  private pid = 1;
  private currentObj: MapObject | null = null;
  private viewMode: 'main' | 'clue' | 'coords' = 'main';
  private feedback: { msg: string; kind: '' | 'err' | 'ok' } = { msg: '', kind: '' };
  private cleanups: (() => void)[] = [];
  private shouldShake = false;
  private selfPatching = false;

  constructor(container: HTMLElement, session: SessionClient, mapData: MapJson, host: TaskModalHost) {
    this.session = session;
    this.mapData = mapData;
    this.host = host;

    this.root = document.createElement('div');
    this.root.className = 'au-backdrop';
    this.root.id = 'au-task-backdrop';
    container.appendChild(this.root);

    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.close();
    });
  }

  private runCleanups() {
    while (this.cleanups.length > 0) {
      const fn = this.cleanups.pop();
      try {
        fn?.();
      } catch {
        // ignore cleanup errors
      }
    }
  }

  isOpen(): boolean {
    return this.open;
  }

  openForObject(obj: MapObject) {
    const pid = obj.puzzles?.[0];
    if (!pid) return;
    this.pid = pid;
    this.currentObj = obj;
    this.feedback = { msg: '', kind: '' };

    const pDef = PUZZLES_BY_ID[pid];
    const room = this.session.getRoom();
    const myRole = this.session.getMyRole();
    const soloMode = Boolean(room?.soloSwitchEnabled ?? true);
    const allowMain = pDef ? canAccessMain(pDef, myRole, soloMode) : true;
    const allowClue = pDef ? canAccessClue(pDef, myRole, soloMode) : true;
    const isMainObj = MAIN_OPERATOR_OBJECT_IDS.has(obj.id);

    if (!allowMain && allowClue) {
      this.viewMode = 'clue';
    } else if (!allowClue && allowMain) {
      this.viewMode = 'main';
    } else if (isMainObj || myRole === pDef?.mainRole) {
      this.viewMode = 'main';
    } else {
      this.viewMode = 'clue';
    }

    this.open = true;
    this.root.classList.add('open');
    this.render();
  }

  openPuzzleDirect(pid: number, tab: 'main' | 'clue' = 'main') {
    const pDef = PUZZLES_BY_ID[pid];
    const room = this.session.getRoom();
    const myRole = this.session.getMyRole();
    const soloMode = Boolean(room?.soloSwitchEnabled ?? true);

    this.pid = pid;
    this.currentObj = null;
    if (pDef && !canAccessMain(pDef, myRole, soloMode) && tab === 'main') {
      this.viewMode = 'clue';
    } else if (pDef && !canAccessClue(pDef, myRole, soloMode) && tab === 'clue') {
      this.viewMode = 'main';
    } else {
      this.viewMode = tab;
    }
    this.feedback = { msg: '', kind: '' };
    this.open = true;
    this.root.classList.add('open');
    this.render();
  }

  close() {
    if (!this.open) return;
    this.runCleanups();
    this.open = false;
    this.root.classList.remove('open');
  }

  onPuzzleUpdated(pid?: number) {
    if (!this.open || this.selfPatching) return;
    if (pid !== undefined && pid !== this.pid) return;
    this.render();
  }

  refreshPinnedRadios() {
    if (!this.open) return;
    const room = this.session.getRoom();
    const pinEl = this.root.querySelector('.au-pin-radio');
    if (!room || !pinEl) return;
    pinEl.innerHTML = `<span class="au-pin-lbl">📡</span>${this.buildPinHtml(room)}`;
  }

  private buildPinHtml(room: RoomState): string {
    const pinnedRadios = room.radioLog.slice(0, 2);
    return pinnedRadios.length
      ? pinnedRadios
          .map(
            (pkt) =>
              `<span class="au-pin-item"><strong style="color:${ROLES[pkt.roleId].color}">${pkt.senderName}:</strong>${pkt.tokenIds.map((id) => renderTokenPillHtml(id)).join('+')}</span>`
          )
          .join('<span class="au-pin-sep">|</span>')
      : '<span class="au-pin-empty">수신 무전 없음 · [C] 무전 휠로 단서 교환</span>';
  }

  private createHelpers(room: RoomState, myRole: RoleId): BoardHelpers {
    const soloMode = Boolean(room.soloSwitchEnabled);
    const diff = getDifficultyConfig(room.difficulty);
    const isSolved = room.solvedPids.includes(this.pid);
    return {
      patchState: (pid, patch) => {
        this.selfPatching = true;
        try {
          this.session.patchPuzzle(pid, patch);
        } finally {
          this.selfPatching = false;
        }
      },
      solve: (pid, statePatch, msg) => {
        if (pid !== 9) soundEngine.playSolve();
        this.selfPatching = true;
        try {
          this.session.solvePuzzle(pid, statePatch, msg);
        } finally {
          this.selfPatching = false;
        }
        this.feedback = { msg, kind: 'ok' };
        this.render();
      },
      setErr: (msg) => {
        soundEngine.playError();
        this.feedback = { msg, kind: 'err' };
        this.shouldShake = true;
        this.render();
      },
      setInfo: (msg) => {
        this.feedback = { msg, kind: '' };
        this.render();
      },
      rerender: () => this.render(),
      registerCleanup: (fn) => {
        this.cleanups.push(fn);
      },
      difficulty: diff,
      myRole,
      soloMode,
      isSolved,
    };
  }

  render() {
    if (!this.open) return;
    this.runCleanups();

    const room = this.session.getRoom();
    const p = PUZZLES_BY_ID[this.pid];
    if (!room || !p) return;

    const myRole = this.session.getMyRole();
    const soloMode = Boolean(room.soloSwitchEnabled);
    const allowMain = canAccessMain(p, myRole, soloMode);
    const allowClue = canAccessClue(p, myRole, soloMode);

    if (this.viewMode === 'main' && !allowMain) this.viewMode = 'clue';
    if (this.viewMode === 'clue' && !allowClue) this.viewMode = 'main';

    const rMain = ROLES[p.mainRole];
    const isSolved = room.solvedPids.includes(p.id);
    const totalSolved = room.solvedPids.length;
    const pct = Math.round((totalSolved / 16) * 100);
    const pinHtml = this.buildPinHtml(room);
    const objs = this.getPuzzleObjects(p.id);
    const shakeNow = this.shouldShake;
    this.shouldShake = false;

    this.root.innerHTML = `
      <div class="au-modal ${shakeNow ? 'au-shake' : ''}" role="dialog" aria-modal="true" aria-label="${p.code} ${p.title}">
        <div class="au-task-stripe-bar">
          <span>TASK ${totalSolved} / 16 · 난이도 ${room.difficulty}</span>
          <div class="au-progress-track"><div class="au-progress-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="au-modal-head">
          <div class="au-head-title">
            <span class="au-rivet"></span>
            <span class="au-code-pill" style="border-color:${rMain.color};color:${rMain.color}">${p.code}</span>
            <strong>${p.title}</strong>
            <span class="au-room-pill">[${p.roomLabel}]</span>
          </div>
          <div class="au-head-right">
            <div class="au-pin-radio" title="최근 수신 무전 2건 고정">
              <span class="au-pin-lbl">📡</span>
              ${pinHtml}
            </div>
            <button class="s-btn" id="au-open-cmenu" title="C-Menu 2.0 무전 휠">📡 [C]</button>
            <button class="au-close-x" id="au-close-btn" title="닫기 (ESC)">✕</button>
          </div>
        </div>
        <div class="au-modal-sub">
          <div class="au-view-tabs">
            <button class="au-vtab ${this.viewMode === 'main' ? 'active' : ''}" data-vmode="main" ${
              allowMain ? '' : `disabled title="주도 조작은 ${rMain.name} 전용"`
            }>${allowMain ? '★' : '🔒'} 주도 조작 (${rMain.name})</button>
            <button class="au-vtab ${this.viewMode === 'clue' ? 'active' : ''}" data-vmode="clue" ${
              allowClue ? '' : 'disabled title="단서 역할 전용 — [C] 무전으로 받으세요"'
            }>${allowClue ? '👁' : '🔒'} 단서·보조 (${p.helperRoles.map((hr) => ROLES[hr].name).join('+')})</button>
            <button class="au-vtab ${this.viewMode === 'coords' ? 'active' : ''}" data-vmode="coords">📐 연동 오브젝트 (${objs.length})</button>
          </div>
          <div class="au-arch-note">아키타입: <strong>${p.arch}</strong></div>
        </div>
        <div class="au-body">
          <div id="au-stage-area"></div>
          ${this.feedback.msg ? `<div class="au-feedback ${this.feedback.kind}">${this.feedback.msg}</div>` : ''}
          ${isSolved ? `<div class="au-stamp-clear">✔ TASK COMPLETED! · ${p.code} 복구 완료 (${totalSolved}/16)</div>` : ''}
        </div>
      </div>
    `;

    this.root.querySelector('#au-close-btn')?.addEventListener('click', () => this.close());
    this.root.querySelector('#au-open-cmenu')?.addEventListener('click', () => this.host.onOpenCMenu());
    this.root.querySelectorAll<HTMLButtonElement>('[data-vmode]').forEach((btn) => {
      btn.onclick = () => {
        if (btn.disabled) return;
        const mode = btn.dataset.vmode as 'main' | 'clue' | 'coords';
        if (mode === 'main' && !allowMain) return;
        if (mode === 'clue' && !allowClue) return;
        soundEngine.playClick();
        this.viewMode = mode;
        this.render();
      };
    });

    const stage = this.root.querySelector<HTMLElement>('#au-stage-area')!;
    if (this.viewMode === 'clue') {
      this.renderClueView(stage, room, p.id);
    } else if (this.viewMode === 'coords') {
      this.renderCoordsView(stage, objs);
    } else {
      this.renderMainBoard(stage, room);
    }
  }

  private renderClueView(stage: HTMLElement, room: RoomState, pid: number) {
    const p = PUZZLES_BY_ID[pid];
    const objId = this.currentObj?.id || '';
    const objClue = objId ? p.objectRoleClues?.[objId] : undefined;
    const helpers = p.helperRoles.map((r) => ROLES[r]);
    const mainR = ROLES[p.mainRole];
    const myRole = this.session.getMyRole();
    const soloMode = Boolean(room.soloSwitchEnabled);
    const h = this.createHelpers(room, myRole);

    stage.innerHTML = `
      <div class="au-board p-stack">
        <div class="p-row-between">
          <div>
            <span style="font:800 13px sans-serif;color:${objClue ? ROLES[objClue.roleId].color : helpers[0].color}">
              ${objClue ? ROLES[objClue.roleId].badge + ' ' + ROLES[objClue.roleId].name : helpers.map((hr) => hr.badge + ' ' + hr.name).join(' · ')} 전용 단서 뷰
            </span>
            <div style="font:800 16px sans-serif;margin-top:2px">${objClue ? objClue.title : p.clueTitle}</div>
          </div>
          <div class="p-row">
            <button class="s-btn primary" id="au-send-clue">📡 권장 무전 패킷 발신</button>
            <button class="s-btn" id="au-open-wheel">🎛 C-Menu 휠로 직접 조합</button>
          </div>
        </div>
        ${objClue ? objClue.bodyHtml : p.clueHtml}
        <div id="au-helper-interactive"></div>
        <div class="p-row" style="margin-top:4px">
          <span style="font-size:12px;color:#9BB0BE">권장 전달 패킷 (${mainR.name}에게):</span>
          ${p.answerTokens.map((pkt) => pkt.map((tid) => renderTokenPillHtml(tid)).join(' + ')).join(' <span style="color:#667">/</span> ')}
        </div>
      </div>
    `;

    const helperMount = stage.querySelector<HTMLElement>('#au-helper-interactive')!;
    this.mountHelperControls(helperMount, room, pid, objId, myRole, soloMode, h);

    stage.querySelector<HTMLElement>('#au-send-clue')!.onclick = () => {
      const senderRole: RoleId = objClue?.roleId || p.helperRoles[0] || this.session.getMyRole();
      for (const pkt of p.answerTokens) {
        this.session.sendRadio(senderRole, pkt);
      }
      soundEngine.playRadio();
      this.feedback = { msg: '단서 무전 패킷을 상단 공유 배너(12초)와 모달 우측 상단에 고정 발신했습니다!', kind: 'ok' };
      this.render();
    };
    stage.querySelector<HTMLElement>('#au-open-wheel')!.onclick = () => {
      this.host.onOpenCMenu();
    };
  }

  private mountHelperControls(
    mount: HTMLElement,
    room: RoomState,
    pid: number,
    objId: string,
    myRole: RoleId,
    soloMode: boolean,
    h: BoardHelpers
  ) {
    const s = (room.puzzleStates[pid] || {}) as Record<string, unknown>;

    if (pid === 10) {
      const rh = Number(s.rh ?? 72);
      const temp = Number(s.temp ?? 24);
      const latch = Boolean(s.crateLatch);
      const showDew = soloMode || myRole === 'aisha' || objId === 'rescue-dehumid-nw';
      const showLatch = soloMode || myRole === 'doyun' || objId === 'rescue-crate-sw1' || objId === 'rescue-crate-sw2';
      const blocks: string[] = [];

      if (showDew) {
        blocks.push(`
          <div class="p-card ${rh === 45 && temp === 18 ? 'ok' : ''}">
            <div style="font:800 13px sans-serif;color:#7CD8FF">🔍 카이 · 제습 공조 조절 ${rh === 45 && temp === 18 ? '✔ 안정화' : '(목표 45% RH / 18°C)'}</div>
            <div class="p-row" style="margin-top:6px">
              <button class="s-btn" id="hc-p10-rhd">-9% RH</button><strong class="p-mono">${rh}% RH</strong><button class="s-btn" id="hc-p10-rhu">+9%</button>
              <button class="s-btn" id="hc-p10-td">-2°C</button><strong class="p-mono">${temp}°C</strong><button class="s-btn" id="hc-p10-tu">+2°C</button>
            </div>
          </div>
        `);
      }
      if (showLatch) {
        blocks.push(`
          <div class="p-card ${latch ? 'ok' : 'warn'}">
            <div class="p-row-between">
              <span style="font:800 13px sans-serif;color:#FFB86B">⚙ 서하린 · 1번 방수 크레이트 걸쇠 상태: ${latch ? '체결 완료 ✔' : '미체결'}</span>
              <button class="s-btn ${latch ? 'primary' : 'amber'}" id="hc-p10-latch" ${latch ? 'disabled' : ''}>${latch ? '✔ 체결됨' : '🔒 걸쇠 체결하기'}</button>
            </div>
          </div>
        `);
      }

      if (blocks.length > 0) {
        mount.innerHTML = `<div class="p-stack">${blocks.join('')}</div>`;
        mount.querySelector('#hc-p10-rhd')?.addEventListener('click', () => {
          soundEngine.playClick();
          h.patchState(10, { rh: Math.max(36, rh - 9) });
          h.rerender();
        });
        mount.querySelector('#hc-p10-rhu')?.addEventListener('click', () => {
          soundEngine.playClick();
          h.patchState(10, { rh: Math.min(81, rh + 9) });
          h.rerender();
        });
        mount.querySelector('#hc-p10-td')?.addEventListener('click', () => {
          soundEngine.playClick();
          h.patchState(10, { temp: Math.max(14, temp - 2) });
          h.rerender();
        });
        mount.querySelector('#hc-p10-tu')?.addEventListener('click', () => {
          soundEngine.playClick();
          h.patchState(10, { temp: Math.min(28, temp + 2) });
          h.rerender();
        });
        mount.querySelector('#hc-p10-latch')?.addEventListener('click', () => {
          soundEngine.playClick();
          h.patchState(10, { crateLatch: true });
          h.setInfo('서하린: 1번 방수 크레이트 걸쇠 체결 완료! 이제 린이 크레인으로 상자를 인양할 수 있습니다.');
        });
      }
      return;
    }

    if (pid === 12 && (soloMode || myRole === 'lin' || objId === 'archive-side-desk-e')) {
      const fx = Number(s.fx ?? 15);
      const fy = Number(s.fy ?? 85);
      const dist = Math.abs(fx - 60) + Math.abs(fy - 40);
      const blur = Math.min(8, Math.round(dist / 7));
      const sharp = dist <= 12;

      mount.innerHTML = `
        <div class="p-card ${sharp ? 'ok' : ''}">
          <div style="font:800 13px sans-serif;color:#52EFBF;margin-bottom:6px">🧭 린 · 마이크로필름 XY 스캐너 (X:${fx}, Y:${fy}) ${sharp ? '✔ 초점 일치!' : ''}</div>
          <div style="background:#061210;border:2px solid #2A3F3A;padding:10px;border-radius:6px;text-align:center;filter:blur(${blur}px);transition:filter .1s">
            <div style="font:900 12px monospace;color:#52EFBF">TARGET PUNCH CODE</div>
            <div style="font:900 16px monospace;color:#FFD86B;margin-top:3px">2열 [★ 별자리] · 4열 [🌊 파도]</div>
          </div>
          <div class="p-grid-2" style="margin-top:8px">
            <label style="font-size:11px">X 초점: <input type="range" min="0" max="100" step="5" value="${fx}" id="hc-p12-fx" style="width:100%"/></label>
            <label style="font-size:11px">Y 초점: <input type="range" min="0" max="100" step="5" value="${fy}" id="hc-p12-fy" style="width:100%"/></label>
          </div>
        </div>
      `;
      const updateBlur = (nextX: number, nextY: number) => {
        h.patchState(12, { fx: nextX, fy: nextY });
        h.rerender();
      };
      mount.querySelector<HTMLInputElement>('#hc-p12-fx')?.addEventListener('change', (e) => {
        updateBlur(Number((e.target as HTMLInputElement).value), fy);
      });
      mount.querySelector<HTMLInputElement>('#hc-p12-fy')?.addEventListener('change', (e) => {
        updateBlur(fx, Number((e.target as HTMLInputElement).value));
      });
      return;
    }

    if (pid === 13 && (soloMode || myRole === 'doyun' || objId === 'preserve-cabinet-1' || objId === 'preserve-cabinet-2')) {
      const valveOpen = Boolean(s.valveOpen);
      mount.innerHTML = `
        <div class="p-card ${valveOpen ? 'ok' : 'warn'}">
          <div class="p-row-between">
            <span style="font:800 13px sans-serif;color:#FFB86B">⚙ 서하린 · 시약 공급 안전 밸브: ${valveOpen ? '개방됨 ✔ (스포이드 사용 가능)' : '잠김'}</span>
            <button class="s-btn ${valveOpen ? 'primary' : 'amber'}" id="hc-p13-valve" ${valveOpen ? 'disabled' : ''}>${valveOpen ? '✔ 밸브 개방됨' : '🔧 시약 밸브 열기'}</button>
          </div>
        </div>
      `;
      mount.querySelector('#hc-p13-valve')?.addEventListener('click', () => {
        soundEngine.playClick();
        h.patchState(13, { valveOpen: true });
        h.setInfo('서하린: 시약 공급 안전 밸브를 열었습니다! 카이가 작업대에서 적정·세척을 시작할 수 있습니다.');
      });
    }
  }

  private renderCoordsView(stage: HTMLElement, objs: (MapObject & { floor: string })[]) {
    stage.innerHTML = `
      <div class="au-board">
        <table class="au-obj-table">
          <thead>
            <tr><th>오브젝트 ID / 이름</th><th>층 · 방</th><th>역할 배분</th><th>좌표 / 크기</th><th>상호작용</th></tr>
          </thead>
          <tbody>
            ${objs
              .map(
                (o) => `<tr>
                <td><strong style="color:#89EFD0">${o.id}</strong><br><span style="color:#C2CFD8">${o.name}</span></td>
                <td><code>${o.floor} · ${o.room}</code></td>
                <td>${o.role || '-'}</td>
                <td><code>(${o.x}, ${o.y}) ${o.width}×${o.height}</code></td>
                <td><code>${o.interact ? `(${o.interact[0]}, ${o.interact[1]})` : '-'}</code></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderMainBoard(stage: HTMLElement, room: RoomState) {
    const p = PUZZLES_BY_ID[this.pid];
    const s = (room.puzzleStates[this.pid] || {}) as Record<string, unknown>;
    const helpers = this.createHelpers(room, this.session.getMyRole());

    const handled =
      renderAct1Act2Board(this.pid, stage, p, s, helpers) ||
      renderAct3Act4Board(this.pid, stage, p, s, helpers, {
        sendHere: () => {
          this.session.sendRadio('lin', ['COOP_HERE']);
          soundEngine.playRadio();
        },
        gotoAtrium: () => this.host.onJumpToAtrium(),
        closeModal: () => this.close(),
      });

    if (!handled) {
      stage.innerHTML = `<div class="au-board">퍼즐 보드를 찾을 수 없습니다.</div>`;
    }

    if (!room.solvedPids.includes(p.id) && p.id !== 16) {
      const helperWrap = document.createElement('div');
      helperWrap.className = 'p-bot-help-bar';
      helperWrap.innerHTML = `<button class="s-btn" id="au-ask-bot-clue" style="font-size:12px">🤖 동료 무전 단서 다시 받기</button>`;
      stage.appendChild(helperWrap);
      helperWrap.querySelector<HTMLElement>('#au-ask-bot-clue')!.onclick = () => {
        this.host.onRequestBotClue(p.id);
        soundEngine.playRadio();
        this.render();
      };
    }
  }

  private getPuzzleObjects(pid: number): (MapObject & { floor: string })[] {
    const out: (MapObject & { floor: string })[] = [];
    for (const [fk, fl] of Object.entries(this.mapData.floors)) {
      for (const obj of fl.objects) {
        if (obj.puzzles?.includes(pid)) out.push({ ...obj, floor: fk });
      }
    }
    return out;
  }
}
