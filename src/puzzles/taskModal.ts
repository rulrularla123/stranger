import type { MapJson, MapObject, PuzzleDef, RoleId, RoomState } from '../types/stranger.ts';
import {
  ROLES,
  renderRadioContentHtml,
  renderRadioTargetHtml,
} from '../data/cMenuTokens.ts';
import {
  PUZZLES_BY_ID,
  getDifficultyConfig,
  getObjectOwnerRole,
} from '../data/puzzleCatalog.ts';
import { soundEngine } from '../audio/soundEngine.ts';
import type { SessionClient } from '../net/sessionClient.ts';
import { renderAct1Act2Board, type BoardHelpers } from './boardsAct1Act2.ts';
import { renderAct3Act4Board } from './boardsAct3Act4.ts';

export interface TaskModalHost {
  onOpenCMenu: (targetRoleId?: RoleId | null) => void;
  onRequestBotHelp: (pid: number, helperRole: RoleId) => void;
  onSwitchRole: (roleId: RoleId) => void;
  onJumpToAtrium: () => void;
}

export class TaskModal {
  private root: HTMLElement;
  private session: SessionClient;
  private mapData: MapJson;
  private host: TaskModalHost;
  private open = false;
  private pid = 1;
  private currentObj: MapObject | null = null;
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
    this.open = true;
    this.root.classList.add('open');
    this.render();
  }

  openPuzzleDirect(pid: number) {
    this.pid = pid;
    this.currentObj = null;
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
              `<span class="au-pin-item"><strong style="color:${ROLES[pkt.roleId].color}">${pkt.senderName}</strong> ${renderRadioTargetHtml(pkt)} ${renderRadioContentHtml(pkt, room.slots)}</span>`
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
    const myMeta = ROLES[myRole];
    const rMain = ROLES[p.mainRole];
    const soloMode = Boolean(room.soloSwitchEnabled);
    const isSolved = room.solvedPids.includes(p.id);
    const totalSolved = room.solvedPids.length;
    const pct = Math.round((totalSolved / 16) * 100);
    const pinHtml = this.buildPinHtml(room);
    const shakeNow = this.shouldShake;
    this.shouldShake = false;

    const ownerRole: RoleId | 'all' = this.currentObj ? getObjectOwnerRole(this.currentObj, p) : myRole;

    const helpersHtml = p.helperRoles
      .map((hr) => {
        const rm = ROLES[hr];
        const summary = p.helperSummaryByRole?.[hr] || '단서 지원';
        return `<span class="au-coop-chip" style="border-color:${rm.color};color:${rm.color}">${rm.badge} ${rm.name} <small>(${summary})</small></span>`;
      })
      .join(' ');

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
        <div class="au-modal-sub au-coop-bar">
          <div class="au-coop-left">
            <span class="au-coop-chip" style="border-color:${rMain.color};color:${rMain.color}">★ 주도: ${rMain.badge} ${rMain.name}</span>
            <span style="font-size:12px;color:#9BB0BE">🤝 도움 필요:</span>
            ${helpersHtml}
          </div>
          <div class="au-coop-me" style="color:${myMeta.color}">내 역할: <strong>${myMeta.badge} ${myMeta.name}</strong></div>
        </div>
        <div class="au-body">
          <div id="au-stage-area"></div>
          ${this.feedback.msg ? `<div class="au-feedback ${this.feedback.kind}">${this.feedback.msg}</div>` : ''}
          ${isSolved ? `<div class="au-stamp-clear">✔ TASK COMPLETED! · ${p.code} 복구 완료 (${totalSolved}/16)</div>` : ''}
        </div>
      </div>
    `;

    this.root.querySelector('#au-close-btn')?.addEventListener('click', () => this.close());
    this.root.querySelector('#au-open-cmenu')?.addEventListener('click', () => this.host.onOpenCMenu(null));

    const stage = this.root.querySelector<HTMLElement>('#au-stage-area')!;

    if (ownerRole === 'all') {
      this.renderAtriumGatherStatus(stage, room);
      return;
    }

    if (this.currentObj && ownerRole !== myRole) {
      this.renderOtherRoleLockedView(stage, room, p, this.currentObj, ownerRole, myRole, soloMode);
      return;
    }

    if (myRole === p.mainRole) {
      this.renderMainOperatorView(stage, room, p, isSolved);
      return;
    }

    if (p.helperRoles.includes(myRole)) {
      this.renderMyHelperView(stage, room, p, myRole);
      return;
    }

    this.renderUninvolvedRoleView(stage, p);
  }

  private renderOtherRoleLockedView(
    stage: HTMLElement,
    room: RoomState,
    p: PuzzleDef,
    obj: MapObject,
    ownerRole: RoleId,
    myRole: RoleId,
    soloMode: boolean
  ) {
    const ownerMeta = ROLES[ownerRole];
    const rMain = ROLES[p.mainRole];
    const ownerIsBot = Boolean(room.slots[ownerRole]?.isBot && !room.slots[ownerRole]?.ownerClientId);
    const canAskBot = ownerIsBot && p.helperRoles.includes(ownerRole);

    const myObjects = this.getPuzzleObjects(p.id).filter((o) => getObjectOwnerRole(o, p) === myRole);
    const myAssignHtml =
      myRole === p.mainRole || p.helperRoles.includes(myRole)
        ? myObjects.length
          ? `<div class="au-my-pointer">💡 내 역할(<strong>${ROLES[myRole].badge} ${ROLES[myRole].name}</strong>) 담당 위치: <strong>${myObjects.map((o) => o.name).join(', ')}</strong></div>`
          : `<div class="au-my-pointer">💡 <strong>${ROLES[myRole].name}</strong> 역할로 이 퍼즐에 참여합니다.</div>`
        : `<div class="au-my-pointer">ℹ 이 구역 퍼즐은 ${rMain.name} 주도 · ${p.helperRoles.map((hr) => ROLES[hr].name).join(' + ')} 협동 구역입니다.</div>`;

    stage.innerHTML = `
      <div class="au-board au-locked-role-card">
        <div class="au-locked-title" style="color:${ownerMeta.color}">
          🔒 ${ownerMeta.badge} ${ownerMeta.name} (${ownerMeta.shortRole}) 전용 장치
        </div>
        <p class="au-locked-desc">
          <strong>${obj.name}</strong>은(는) <strong>${ownerMeta.name}</strong>만 열람/조작할 수 있습니다.<br/>
          서로 다른 단서와 장치를 맡고 있으므로 무전으로 소통하며 진행하세요!
        </p>
        <div class="au-locked-need">
          <div>★ <strong>주도 조작</strong>: <span style="color:${rMain.color}">${rMain.badge} ${rMain.name}</span></div>
          <div>🤝 <strong>도움이 필요한 동료</strong>: ${p.helperRoles
            .map((hr) => {
              const rm = ROLES[hr];
              const summary = p.helperSummaryByRole?.[hr] || '단서 지원';
              return `<span style="color:${rm.color}">${rm.badge} ${rm.name} (${summary})</span>`;
            })
            .join(' · ')}</div>
        </div>
        ${myAssignHtml}
        <div class="p-row" style="margin-top:10px">
          <button class="s-btn primary" id="au-lock-radio">📡 ${ownerMeta.name}에게 무전 보내기</button>
          ${canAskBot ? `<button class="s-btn amber" id="au-lock-bot">🤖 AI ${ownerMeta.name}에게 협동 요청</button>` : ''}
          ${soloMode ? `<button class="s-btn" id="au-lock-switch">🔄 ${ownerMeta.name}(으)로 캐릭터 전환</button>` : ''}
        </div>
      </div>
    `;

    stage.querySelector('#au-lock-radio')?.addEventListener('click', () => {
      this.close();
      this.host.onOpenCMenu(ownerRole);
    });
    stage.querySelector('#au-lock-bot')?.addEventListener('click', () => {
      soundEngine.playRadio();
      this.host.onRequestBotHelp(p.id, ownerRole);
      this.feedback = { msg: `AI ${ownerMeta.name}에게 협동을 요청했습니다. 좌상단 무전 채팅을 확인하세요!`, kind: 'ok' };
      this.render();
    });
    stage.querySelector('#au-lock-switch')?.addEventListener('click', () => {
      this.host.onSwitchRole(ownerRole);
      this.render();
    });
  }

  private renderMainOperatorView(stage: HTMLElement, room: RoomState, p: PuzzleDef, isSolved: boolean) {
    const s = (room.puzzleStates[this.pid] || {}) as Record<string, unknown>;
    const helpers = this.createHelpers(room, this.session.getMyRole());

    const helperBannerWrap = document.createElement('div');
    helperBannerWrap.className = 'au-helper-banner';
    const helperChips = p.helperRoles
      .map((hr) => {
        const rm = ROLES[hr];
        const summary = p.helperSummaryByRole?.[hr] || '단서 지원';
        const isBot = Boolean(room.slots[hr]?.isBot && !room.slots[hr]?.ownerClientId);
        return `<div class="au-helper-pill" style="border-color:${rm.color}">
          <span style="color:${rm.color};font-weight:800">${rm.badge} ${rm.name}</span>
          <span style="color:#C8D6E2">${summary}</span>
          <button class="s-btn" data-req-radio="${hr}" style="padding:3px 8px;font-size:11px">📡 무전</button>
          ${isBot && !isSolved ? `<button class="s-btn amber" data-req-bot="${hr}" style="padding:3px 8px;font-size:11px">🤖 AI 요청</button>` : ''}
        </div>`;
      })
      .join('');

    helperBannerWrap.innerHTML = `
      <div style="font:800 12px sans-serif;color:#9BB0BE;margin-bottom:6px">🤝 도움이 필요한 동료 (누구에게 무엇을 요청해야 하는지 확인 후 무전으로 소통하세요)</div>
      <div class="au-helper-pill-list">${helperChips}</div>
    `;

    const boardHost = document.createElement('div');
    stage.innerHTML = '';
    stage.appendChild(helperBannerWrap);
    stage.appendChild(boardHost);

    helperBannerWrap.querySelectorAll<HTMLElement>('[data-req-radio]').forEach((btn) => {
      btn.onclick = () => {
        const hr = btn.dataset.reqRadio as RoleId;
        this.close();
        this.host.onOpenCMenu(hr);
      };
    });
    helperBannerWrap.querySelectorAll<HTMLElement>('[data-req-bot]').forEach((btn) => {
      btn.onclick = () => {
        const hr = btn.dataset.reqBot as RoleId;
        soundEngine.playRadio();
        this.host.onRequestBotHelp(p.id, hr);
        this.feedback = { msg: `AI ${ROLES[hr].name}에게 협동 및 무전 안내를 요청했습니다!`, kind: 'ok' };
        this.render();
      };
    });

    const handled =
      renderAct1Act2Board(this.pid, boardHost, p, s, helpers) ||
      renderAct3Act4Board(this.pid, boardHost, p, s, helpers, {
        sendHere: () => {
          this.session.sendRadio('lin', ['COOP_HERE']);
          soundEngine.playRadio();
        },
        gotoAtrium: () => this.host.onJumpToAtrium(),
        closeModal: () => this.close(),
      });

    if (!handled) {
      boardHost.innerHTML = `<div class="au-board">퍼즐 보드를 찾을 수 없습니다.</div>`;
    }
  }

  private renderMyHelperView(stage: HTMLElement, room: RoomState, p: PuzzleDef, myRole: RoleId) {
    const objId = this.currentObj?.id || '';
    const rawObjClue = objId ? p.objectRoleClues?.[objId] : undefined;
    const objClue = rawObjClue && rawObjClue.roleId === myRole ? rawObjClue : undefined;
    const roleClue = objClue || p.roleClues?.[myRole];
    const myMeta = ROLES[myRole];
    const mainR = ROLES[p.mainRole];
    const h = this.createHelpers(room, myRole);

    stage.innerHTML = `
      <div class="au-board p-stack">
        <div class="p-row-between">
          <div>
            <span style="font:800 13px sans-serif;color:${myMeta.color}">
              ${myMeta.badge} ${myMeta.name} (${myMeta.shortRole}) 전용 단서 · 보조 조작
            </span>
            <div style="font:800 16px sans-serif;margin-top:2px">${roleClue?.title || `${myMeta.name} 담당 단서`}</div>
          </div>
          <button class="s-btn primary" id="au-send-to-main">📡 ${mainR.name}에게 무전 보내기</button>
        </div>
        ${roleClue?.bodyHtml || `<div class="clue-card"><p>무전으로 ${mainR.name}에게 정보를 전달하세요.</p></div>`}
        <div id="au-helper-interactive"></div>
      </div>
    `;

    const helperMount = stage.querySelector<HTMLElement>('#au-helper-interactive')!;
    this.mountHelperControls(helperMount, room, p.id, myRole, h);

    stage.querySelector('#au-send-to-main')?.addEventListener('click', () => {
      this.close();
      this.host.onOpenCMenu(p.mainRole);
    });
  }

  private renderUninvolvedRoleView(stage: HTMLElement, p: PuzzleDef) {
    const rMain = ROLES[p.mainRole];
    stage.innerHTML = `
      <div class="au-board au-locked-role-card">
        <div class="au-locked-title" style="color:${rMain.color}">🤝 협동 구역 안내</div>
        <p class="au-locked-desc">
          이 구역 퍼즐(${p.code})은 <strong>${rMain.name}</strong> 주도 · <strong>${p.helperRoles.map((hr) => ROLES[hr].name).join(' + ')}</strong> 협동으로 진행됩니다.
        </p>
        <div class="p-row">
          <button class="s-btn primary" id="au-uninv-radio">📡 ${rMain.name}에게 무전 보내기</button>
        </div>
      </div>
    `;
    stage.querySelector('#au-uninv-radio')?.addEventListener('click', () => {
      this.close();
      this.host.onOpenCMenu(p.mainRole);
    });
  }

  private renderAtriumGatherStatus(stage: HTMLElement, room: RoomState) {
    const priorDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].filter((id) =>
      room.solvedPids.includes(id)
    ).length;
    const p16 = (room.puzzleStates[16] || {}) as {
      beamReachedAtrium?: boolean;
      hereSent?: boolean;
      pads?: boolean[];
    };
    const pads = p16.pads || [false, false, false, false];
    stage.innerHTML = `
      <div class="au-board p-stack">
        <div class="p-card ${priorDone === 15 ? 'ok' : 'warn'}">
          <strong>선행 1~3막 복원: ${priorDone} / 15</strong> ·
          <strong>기획전시실 광선: ${p16.beamReachedAtrium ? '도착 ✔' : '미도착 🔒'}</strong> ·
          <strong>린 [집결 호출 HERE]: ${p16.hereSent ? '발신됨 ✔' : '대기 🔒'}</strong>
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
        <p class="clue-note">P01~P15 완료 → 기획전시실(2F special) 프리즘 광선 연결 → 린이 <code>[집결 호출 HERE]</code> 발신 → 반원 홀 4개 발판(gather-1~4) 동시 착지 시 대관식 엔딩이 시작됩니다!</p>
      </div>
    `;
  }

  private mountHelperControls(
    mount: HTMLElement,
    room: RoomState,
    pid: number,
    myRole: RoleId,
    h: BoardHelpers
  ) {
    const s = (room.puzzleStates[pid] || {}) as Record<string, unknown>;

    if (pid === 10 && myRole === 'aisha') {
      const rh = Number(s.rh ?? 72);
      const temp = Number(s.temp ?? 24);
      mount.innerHTML = `
        <div class="p-card ${rh === 45 && temp === 18 ? 'ok' : ''}">
          <div style="font:800 13px sans-serif;color:#7CD8FF">🔍 카이 · 제습 공조 조절 ${rh === 45 && temp === 18 ? '✔ 안정화 (수장고 안개 제거됨!)' : '(목표 45% RH / 18°C)'}</div>
          <div class="p-row" style="margin-top:6px">
            <button class="s-btn" id="hc-p10-rhd">-9% RH</button><strong class="p-mono">${rh}% RH</strong><button class="s-btn" id="hc-p10-rhu">+9%</button>
            <button class="s-btn" id="hc-p10-td">-2°C</button><strong class="p-mono">${temp}°C</strong><button class="s-btn" id="hc-p10-tu">+2°C</button>
          </div>
        </div>
      `;
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
      return;
    }

    if (pid === 10 && myRole === 'doyun') {
      const latch = Boolean(s.crateLatch);
      mount.innerHTML = `
        <div class="p-card ${latch ? 'ok' : 'warn'}">
          <div class="p-row-between">
            <span style="font:800 13px sans-serif;color:#FFB86B">⚙ 서하린 · 1번 방수 크레이트 걸쇠 상태: ${latch ? '체결 완료 ✔' : '미체결'}</span>
            <button class="s-btn ${latch ? 'primary' : 'amber'}" id="hc-p10-latch" ${latch ? 'disabled' : ''}>${latch ? '✔ 체결됨' : '🔒 걸쇠 체결하기'}</button>
          </div>
        </div>
      `;
      mount.querySelector('#hc-p10-latch')?.addEventListener('click', () => {
        soundEngine.playClick();
        h.patchState(10, { crateLatch: true });
        h.setInfo('서하린: 1번 방수 크레이트 걸쇠 체결 완료! 린에게 무전으로 알려주세요.');
      });
      return;
    }

    if (pid === 12 && myRole === 'lin') {
      let fx = Number(s.fx ?? 15);
      let fy = Number(s.fy ?? 85);
      const dist = Math.abs(fx - 60) + Math.abs(fy - 40);
      const blur = Math.min(8, Math.round(dist / 7));
      const sharp = dist <= 12;

      mount.innerHTML = `
        <div class="p-card ${sharp ? 'ok' : ''}" id="hc-p12-card">
          <div id="hc-p12-lbl" style="font:800 13px sans-serif;color:#52EFBF;margin-bottom:6px">🧭 린 · 마이크로필름 XY 스캐너 (X:${fx}, Y:${fy}) ${sharp ? '✔ 초점 일치!' : ''}</div>
          <div id="hc-p12-film" style="background:#061210;border:2px solid #2A3F3A;padding:10px;border-radius:6px;text-align:center;filter:blur(${blur}px);transition:filter .1s">
            <div style="font:900 12px monospace;color:#52EFBF">TARGET PUNCH CODE</div>
            <div style="font:900 16px monospace;color:#FFD86B;margin-top:3px">2열 [★ 별자리] · 4열 [🌊 파도]</div>
          </div>
          <div class="p-grid-2" style="margin-top:8px">
            <label style="font-size:11px">X 초점 (목표 60): <input type="range" min="0" max="100" step="5" value="${fx}" id="hc-p12-fx" style="width:100%"/></label>
            <label style="font-size:11px">Y 초점 (목표 40): <input type="range" min="0" max="100" step="5" value="${fy}" id="hc-p12-fy" style="width:100%"/></label>
          </div>
        </div>
      `;
      const updateDom = () => {
        const d = Math.abs(fx - 60) + Math.abs(fy - 40);
        const b = Math.min(8, Math.round(d / 7));
        const film = mount.querySelector<HTMLElement>('#hc-p12-film');
        const lbl = mount.querySelector('#hc-p12-lbl');
        const card = mount.querySelector('#hc-p12-card');
        if (film) film.style.filter = `blur(${b}px)`;
        if (lbl) lbl.textContent = `🧭 린 · 마이크로필름 XY 스캐너 (X:${fx}, Y:${fy}) ${d <= 12 ? '✔ 초점 일치!' : ''}`;
        if (card) card.classList.toggle('ok', d <= 12);
      };
      mount.querySelector<HTMLInputElement>('#hc-p12-fx')?.addEventListener('input', (e) => {
        fx = Number((e.target as HTMLInputElement).value);
        updateDom();
      });
      mount.querySelector<HTMLInputElement>('#hc-p12-fx')?.addEventListener('change', () => {
        h.patchState(12, { fx, fy });
      });
      mount.querySelector<HTMLInputElement>('#hc-p12-fy')?.addEventListener('input', (e) => {
        fy = Number((e.target as HTMLInputElement).value);
        updateDom();
      });
      mount.querySelector<HTMLInputElement>('#hc-p12-fy')?.addEventListener('change', () => {
        h.patchState(12, { fx, fy });
      });
      return;
    }

    if (pid === 13 && myRole === 'doyun') {
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
        h.setInfo('서하린: 시약 공급 안전 밸브 개방 완료! 카이에게 무전으로 알려주세요.');
      });
      return;
    }

    if (pid === 16 && myRole === 'doyun') {
      const mountUnlocked = Boolean(s.mountUnlocked);
      mount.innerHTML = `
        <div class="p-card ${mountUnlocked ? 'ok' : 'warn'}">
          <div class="p-row-between">
            <span style="font:800 13px sans-serif;color:#FFB86B">⚙ 서하린 · 프리즘 거치대 베어링: ${mountUnlocked ? '잠금 해제됨 ✔ (프리즘 회전 가능)' : '잠김'}</span>
            <button class="s-btn ${mountUnlocked ? 'primary' : 'amber'}" id="hc-p16-mount" ${mountUnlocked ? 'disabled' : ''}>${mountUnlocked ? '✔ 잠금 해제됨' : '🔧 거치대 베어링 해제'}</button>
          </div>
        </div>
      `;
      mount.querySelector('#hc-p16-mount')?.addEventListener('click', () => {
        soundEngine.playClick();
        h.patchState(16, { mountUnlocked: true });
        h.setInfo('서하린: 프리즘 거치대 잠금 해제 완료! 린에게 3번 각도(M3=90°)와 함께 무전으로 알려주세요.');
      });
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
