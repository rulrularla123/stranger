import type { MapJson, MapObject, PuzzleDef, RoleId, RoomState } from '../types/stranger.ts';
import {
  ROLES,
  escapeTokenText,
  renderRadioTargetHtml,
  renderTokenPillHtml,
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
import { PUZZLE_KID } from '../ui/kidVisuals.ts';
import {
  PART_URL,
  ROLE_ICON_URL,
  completeBannerHtml,
  lcdHtml,
  pushBtnHtml,
  roleBadgeHtml,
  roundBtnHtml,
  tokenChipHtml,
  uiIconUrl,
  wrongToastHtml,
} from './puzzleUiKit.ts';

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
  private activeTab: 'main' | 'clue' = 'main';
  private feedback: { msg: string; kind: '' | 'err' | 'ok' } = { msg: '', kind: '' };
  private justSolved: { pid: number; sub: string } | null = null;
  private cleanups: (() => void)[] = [];
  private errTimer: number | null = null;
  private completeTimer: number | null = null;
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

  private clearTimers() {
    if (this.errTimer !== null) {
      window.clearTimeout(this.errTimer);
      this.errTimer = null;
    }
    if (this.completeTimer !== null) {
      window.clearTimeout(this.completeTimer);
      this.completeTimer = null;
    }
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

  private resetForOpen(pid: number, obj: MapObject | null) {
    this.clearTimers();
    this.pid = pid;
    this.currentObj = obj;
    this.feedback = { msg: '', kind: '' };
    this.justSolved = null;
    const p = PUZZLES_BY_ID[pid];
    const myRole = this.session.getMyRole();
    this.activeTab = p && p.helperRoles.includes(myRole) && myRole !== p.mainRole ? 'clue' : 'main';
    this.open = true;
    this.root.classList.add('open');
    this.render();
  }

  openForObject(obj: MapObject) {
    const pid = obj.puzzles?.[0];
    if (!pid) return;
    this.resetForOpen(pid, obj);
  }

  openPuzzleDirect(pid: number) {
    this.resetForOpen(pid, null);
  }

  close() {
    if (!this.open) return;
    this.clearTimers();
    this.runCleanups();
    this.justSolved = null;
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
    const pinEl = this.root.querySelector('#fg-pin-stack');
    if (!room || !pinEl) return;
    pinEl.innerHTML = this.buildPinHtml(room);
  }

  private buildPinHtml(room: RoomState): string {
    const pinnedRadios = room.radioLog.slice(0, 2);
    if (!pinnedRadios.length) {
      return '<div class="fg-pin-empty">📭 수신 무전 없음</div>';
    }
    return pinnedRadios
      .map((pkt) => {
        const meta = ROLES[pkt.roleId];
        const pills = pkt.tokenIds
          .slice(0, 3)
          .map((id) => renderTokenPillHtml(id, room.slots))
          .filter(Boolean)
          .join('<span class="fg-pin-plus">+</span>');
        const noteHtml =
          !pills && pkt.note
            ? `<span class="pin-note">${escapeTokenText(pkt.note.slice(0, 22))}${pkt.note.length > 22 ? '…' : ''}</span>`
            : '';
        return `<div class="fg-pin-packet" title="${escapeTokenText(pkt.note || '')}">
          <span class="fg-pin-bar" style="background:${meta.color}"></span>
          <span class="fg-pin-sender" style="color:${meta.color}">${escapeTokenText(pkt.senderName)}</span>
          ${renderRadioTargetHtml(pkt)}
          <div class="fg-pin-toks">${pills || noteHtml}</div>
        </div>`;
      })
      .join('');
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
        this.justSolved = { pid, sub: msg };
        this.feedback = { msg: '', kind: '' };
        this.render();
        if (this.completeTimer !== null) window.clearTimeout(this.completeTimer);
        this.completeTimer = window.setTimeout(() => {
          this.justSolved = null;
          this.close();
        }, 1550);
      },
      setErr: (msg) => {
        soundEngine.playError();
        this.feedback = { msg, kind: 'err' };
        this.shouldShake = true;
        this.render();
        if (this.errTimer !== null) window.clearTimeout(this.errTimer);
        this.errTimer = window.setTimeout(() => {
          this.feedback = { msg: '', kind: '' };
          const toast = this.root.querySelector('.fg-wrong-toast');
          if (toast) toast.remove();
        }, 2300);
      },
      setInfo: (msg) => {
        this.feedback = { msg, kind: 'ok' };
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
    const isSolved = room.solvedPids.includes(p.id);
    const totalSolved = room.solvedPids.length;
    const kid = PUZZLE_KID[p.id];
    const pinHtml = this.buildPinHtml(room);
    const shakeNow = this.shouldShake;
    this.shouldShake = false;

    const ownerRole: RoleId | 'all' = this.currentObj ? getObjectOwnerRole(this.currentObj, p) : myRole;
    const isMainRole = myRole === p.mainRole;
    const isHelperRole = p.helperRoles.includes(myRole);

    const helperBadgesHtml = p.helperRoles
      .map((hr) => roleBadgeHtml(hr, '단서', p.helperSummaryByRole?.[hr]))
      .join('');

    const showCompleteBanner = Boolean(this.justSolved && this.justSolved.pid === p.id);

    this.root.innerHTML = `
      <div class="fg-modal-shell ${shakeNow ? 'au-shake' : ''}" role="dialog" aria-modal="true" aria-label="${p.code} ${p.title}">
        <div class="fg-bezel-shine"></div>
        <img class="fg-screw tl" src="${PART_URL.screw}" alt="" />
        <img class="fg-screw tr" src="${PART_URL.screw}" alt="" />
        <img class="fg-screw bl" src="${PART_URL.screw}" alt="" />
        <img class="fg-screw br" src="${PART_URL.screw}" alt="" />
        <button class="fg-close-btn" id="au-close-btn" title="닫기 (ESC)">
          <img src="${PART_URL.closeBtn}" alt="✕" />
        </button>

        <div class="fg-modal-head">
          <div class="fg-head-left">
            <div class="fg-id-chip">${p.code}</div>
            <div class="fg-title-group">
              <div class="fg-title-main">${kid ? kid.title : p.title}</div>
              <div class="fg-title-sub">
                <span>${p.roomLabel}</span>
                <span class="fg-progress-mini">${totalSolved}/16 · ${room.difficulty}</span>
                ${roleBadgeHtml(p.mainRole, '주도')}
                ${helperBadgesHtml}
              </div>
            </div>
          </div>

          <div class="fg-tabs" role="tablist" aria-label="조작 및 단서 탭">
            <button type="button" class="fg-tab-btn ${this.activeTab === 'main' ? 'active' : ''} ${!isMainRole ? 'locked-tab' : ''}" id="fg-tab-main" role="tab">
              <img src="${ROLE_ICON_URL[p.mainRole]}" alt="" />
              <span>조작</span>
              ${!isMainRole ? `<img class="fg-tab-lock" src="${uiIconUrl('lock')}" alt="🔒" />` : ''}
            </button>
            <button type="button" class="fg-tab-btn ${this.activeTab === 'clue' ? 'active-gold' : ''}" id="fg-tab-clue" role="tab">
              <img src="${ROLE_ICON_URL[p.helperRoles[0] || myRole]}" alt="" />
              <span>단서</span>
            </button>
          </div>

          <div class="fg-head-right">
            <div class="fg-pin-stack" id="fg-pin-stack">${pinHtml}</div>
            <button class="fg-radio-trigger" id="au-open-cmenu" title="무전 보내기 (C)">📡 [C]</button>
          </div>
        </div>

        <div class="fg-board-well">
          <div id="au-stage-area"></div>
          ${this.feedback.kind === 'err' && this.feedback.msg ? wrongToastHtml(this.feedback.msg) : ''}
          ${this.feedback.kind !== 'err' && this.feedback.msg ? `<div class="fg-solved-bar">${this.feedback.msg}</div>` : ''}
          ${isSolved && !showCompleteBanner ? `<div class="fg-solved-bar">✔ 임무 완료 (${totalSolved}/16) — 다시 확인하거나 수정할 수 있습니다</div>` : ''}
        </div>

        ${showCompleteBanner && this.justSolved ? completeBannerHtml('임무 완료!', this.justSolved.sub) : ''}
      </div>
    `;

    this.root.querySelector('#au-close-btn')?.addEventListener('click', () => this.close());
    this.root.querySelector('#au-open-cmenu')?.addEventListener('click', () => this.host.onOpenCMenu(null));
    this.root.querySelector('#fg-complete-overlay')?.addEventListener('click', () => {
      this.justSolved = null;
      this.close();
    });
    this.root.querySelector('#fg-tab-main')?.addEventListener('click', () => {
      soundEngine.playClick();
      this.activeTab = 'main';
      this.render();
    });
    this.root.querySelector('#fg-tab-clue')?.addEventListener('click', () => {
      soundEngine.playClick();
      this.activeTab = 'clue';
      this.render();
    });

    const stage = this.root.querySelector<HTMLElement>('#au-stage-area')!;

    if (ownerRole === 'all') {
      this.renderAtriumGatherStatus(stage, room);
      return;
    }

    if (this.currentObj && ownerRole !== myRole) {
      this.renderLockedBoardOverlay(stage, room, p, ownerRole, myRole, soloMode);
      return;
    }

    if (this.activeTab === 'main') {
      if (isMainRole) {
        this.renderMainOperatorView(stage, room, p, isSolved);
      } else {
        this.renderLockedBoardOverlay(stage, room, p, p.mainRole, myRole, soloMode);
      }
      return;
    }

    // activeTab === 'clue'
    if (isHelperRole) {
      this.renderMyHelperView(stage, room, p, myRole);
    } else if (isMainRole) {
      this.renderMainClueSummaryView(stage, room, p, isSolved);
    } else {
      this.renderUninvolvedRoleView(stage, p);
    }
  }

  private renderLockedBoardOverlay(
    stage: HTMLElement,
    room: RoomState,
    p: PuzzleDef,
    targetOwner: RoleId,
    myRole: RoleId,
    soloMode: boolean
  ) {
    const ownerMeta = ROLES[targetOwner];
    const mainMeta = ROLES[p.mainRole];
    const ownerIsBot = Boolean(room.slots[targetOwner]?.isBot && !room.slots[targetOwner]?.ownerClientId);
    const canAskBot = ownerIsBot && p.helperRoles.includes(targetOwner);
    const isSelfHelper = p.helperRoles.includes(myRole);

    const myObjects = this.getPuzzleObjects(p.id).filter((o) => getObjectOwnerRole(o, p) === myRole);
    const pointerText = isSelfHelper && myObjects.length
      ? `내 단서 위치 (${ROLES[myRole].name}): ${myObjects.map((o) => o.name).join(', ')}`
      : `${p.code} 구역: ${mainMeta.name} 주도 · ${p.helperRoles.map((hr) => ROLES[hr].name).join(' + ')} 단서 지원`;

    stage.innerHTML = `
      <div class="fg-locked-well">
        <div class="fg-locked-card">
          <img class="fg-locked-icon" src="${uiIconUrl('lock')}" alt="잠금" />
          <div class="fg-locked-title">조작 잠금</div>
          <p class="fg-locked-desc">
            이 장치는 <strong style="color:${ownerMeta.color}">${ownerMeta.name}</strong>만 조작할 수 있어요.<br/>
            단서를 찾아 무전(C)으로 알려 주세요!
          </p>
          <div style="font-size:12px;font-weight:800;color:var(--fg-gold)">💡 ${escapeTokenText(pointerText)}</div>
          <div class="fg-locked-actions">
            ${isSelfHelper ? '<button class="s-btn primary" id="au-lock-to-clue">📜 내 단서 탭 보기</button>' : ''}
            <button class="s-btn" id="au-lock-radio">📡 ${ownerMeta.name}에게 무전 보내기</button>
            ${canAskBot ? `<button class="s-btn amber" id="au-lock-bot">🤖 AI ${ownerMeta.name}에게 협동 요청</button>` : ''}
            ${soloMode ? `<button class="s-btn" id="au-lock-switch">🔄 ${ownerMeta.name}(으)로 전환</button>` : ''}
          </div>
        </div>
      </div>
    `;

    stage.querySelector('#au-lock-to-clue')?.addEventListener('click', () => {
      soundEngine.playClick();
      this.activeTab = 'clue';
      this.render();
    });
    stage.querySelector('#au-lock-radio')?.addEventListener('click', () => {
      this.close();
      this.host.onOpenCMenu(targetOwner);
    });
    stage.querySelector('#au-lock-bot')?.addEventListener('click', () => {
      soundEngine.playRadio();
      this.host.onRequestBotHelp(p.id, targetOwner);
      this.feedback = { msg: `AI ${ownerMeta.name}에게 협동을 요청했습니다. 팀 무전을 확인하세요!`, kind: 'ok' };
      this.render();
    });
    stage.querySelector('#au-lock-switch')?.addEventListener('click', () => {
      this.host.onSwitchRole(targetOwner);
      const nextP = PUZZLES_BY_ID[this.pid];
      this.activeTab = nextP && targetOwner === nextP.mainRole ? 'main' : 'clue';
      this.render();
    });
  }

  private renderMainClueSummaryView(stage: HTMLElement, room: RoomState, p: PuzzleDef, isSolved: boolean) {
    const cards = p.helperRoles
      .map((hr) => {
        const rm = ROLES[hr];
        const summary = p.helperSummaryByRole?.[hr] || '단서 지원';
        const isBot = Boolean(room.slots[hr]?.isBot && !room.slots[hr]?.ownerClientId);
        return `<div class="fg-panel" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:10px">
            ${roleBadgeHtml(hr, '단서')}
            <div>
              <div style="font-weight:800;font-size:15px;color:${rm.color}">${escapeTokenText(summary)}</div>
              <div style="font-size:12px;color:var(--fg-sub)">상대 화면의 단서 내용을 무전(C)으로 전달받아 입력하세요.</div>
            </div>
          </div>
          <div class="fg-row">
            <button class="s-btn" data-req-radio="${hr}">📡 ${rm.name}에게 무전</button>
            ${isBot && !isSolved ? `<button class="s-btn amber" data-req-bot="${hr}">🤖 AI 도움 요청</button>` : ''}
          </div>
        </div>`;
      })
      .join('');

    stage.innerHTML = `
      <div class="fg-stack">
        <div class="fg-panel">
          <div class="fg-panel-title">🤝 도움이 필요한 동료</div>
          <div class="fg-panel-sub">단서 내용은 각 동료만 볼 수 있습니다. 무전 핑이나 AI 협동 요청으로 신호를 받아 조립하세요!</div>
        </div>
        ${cards}
        <div style="max-width:260px">${pushBtnHtml({ id: 'fg-back-main', label: '조작 화면으로 돌아가기', tone: 'mint' })}</div>
      </div>
    `;

    stage.querySelector('#fg-back-main')?.addEventListener('click', () => {
      soundEngine.playClick();
      this.activeTab = 'main';
      this.render();
    });
    stage.querySelectorAll<HTMLElement>('[data-req-radio]').forEach((btn) => {
      btn.onclick = () => {
        this.close();
        this.host.onOpenCMenu(btn.dataset.reqRadio as RoleId);
      };
    });
    stage.querySelectorAll<HTMLElement>('[data-req-bot]').forEach((btn) => {
      btn.onclick = () => {
        const hr = btn.dataset.reqBot as RoleId;
        soundEngine.playRadio();
        this.host.onRequestBotHelp(p.id, hr);
        this.feedback = { msg: `AI ${ROLES[hr].name}에게 무전 안내를 요청했습니다!`, kind: 'ok' };
        this.render();
      };
    });
  }

  private renderMainOperatorView(stage: HTMLElement, room: RoomState, p: PuzzleDef, _isSolved: boolean) {
    const s = (room.puzzleStates[this.pid] || {}) as Record<string, unknown>;
    const helpers = this.createHelpers(room, this.session.getMyRole());

    const boardHost = document.createElement('div');
    stage.innerHTML = '';
    stage.appendChild(boardHost);

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
      boardHost.innerHTML = `<div class="fg-panel">퍼즐 보드를 찾을 수 없습니다.</div>`;
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

    const suggestedChips = p.answerTokens
      .flat()
      .slice(0, 6)
      .map((tid) => tokenChipHtml(tid, 'md'))
      .join('<span class="fg-pin-plus">+</span>');

    stage.innerHTML = `
      <div class="fg-clue-shell">
        <div class="fg-row-between">
          <div class="fg-row">
            ${roleBadgeHtml(myRole, '단서')}
            <strong style="font-family:var(--fg-font-display);font-size:20px;color:${myMeta.color}">${escapeTokenText(roleClue?.title || `${myMeta.name} 담당 단서`)}</strong>
          </div>
          <button class="s-btn primary" id="au-send-to-main">📡 ${mainR.name}에게 무전 보내기</button>
        </div>
        <div class="fg-parchment">
          ${roleClue?.bodyHtml || `<div class="clue-card"><p>무전으로 ${mainR.name}에게 정보를 전달하세요.</p></div>`}
        </div>
        <div id="au-helper-interactive"></div>
        <div class="fg-send-guide">
          <div class="fg-send-chips">
            <span style="font-family:var(--fg-font-display);font-size:16px;color:var(--fg-gold);margin-right:6px">보낼 무전</span>
            ${suggestedChips}
          </div>
          <button class="s-btn amber" id="au-send-quick-radio">📡 C-Menu 2.0 열기</button>
        </div>
      </div>
    `;

    const helperMount = stage.querySelector<HTMLElement>('#au-helper-interactive')!;
    this.mountHelperControls(helperMount, room, p.id, myRole, h);

    stage.querySelector('#au-send-to-main')?.addEventListener('click', () => {
      this.close();
      this.host.onOpenCMenu(p.mainRole);
    });
    stage.querySelector('#au-send-quick-radio')?.addEventListener('click', () => {
      this.close();
      this.host.onOpenCMenu(p.mainRole);
    });
  }

  private renderUninvolvedRoleView(stage: HTMLElement, p: PuzzleDef) {
    const rMain = ROLES[p.mainRole];
    stage.innerHTML = `
      <div class="fg-locked-well">
        <div class="fg-locked-card">
          <img class="fg-locked-icon" src="${ROLE_ICON_URL[p.mainRole]}" alt="" />
          <div class="fg-locked-title">협동 구역 안내</div>
          <p class="fg-locked-desc">
            이 구역 퍼즐(${p.code})은 <strong style="color:${rMain.color}">${rMain.name}</strong> 주도 ·
            <strong>${p.helperRoles.map((hr) => ROLES[hr].name).join(' + ')}</strong> 협동 구역입니다.
          </p>
          <div class="fg-locked-actions">
            <button class="s-btn primary" id="au-uninv-radio">📡 ${rMain.name}에게 무전 보내기</button>
          </div>
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
    const padsCnt = pads.filter(Boolean).length;
    stage.innerHTML = `
      <div class="fg-stack">
        <div class="fg-panel fg-row-between">
          <div style="font-family:var(--fg-font-display);font-size:22px;color:var(--fg-mint)">집결 ${padsCnt} / 4</div>
          <div class="fg-row">
            <span class="fg-progress-mini">1~3막 ${priorDone}/15</span>
            <span class="fg-progress-mini">광선 ${p16.beamReachedAtrium ? '도착 ✔' : '대기'}</span>
            <span class="fg-progress-mini">집결 호출 ${p16.hereSent ? '발신 ✔' : '대기'}</span>
          </div>
        </div>
        <div class="p-grid-4">
          {ROLES_PLACEHOLDER}
        </div>
        <p class="clue-note">P01~P15 완료 → 기획전시실 프리즘 광선 연결 → 린이 [집결 호출 HERE] 발신 → 4명 모두 발판(gather-1~4) 위에 올라서면 대관식이 시작됩니다!</p>
      </div>
    `.replace(
      '{ROLES_PLACEHOLDER}',
      (['doyun', 'maria', 'lin', 'aisha'] as const)
        .map((rid, i) => {
          const rr = ROLES[rid];
          const on = pads[i];
          return `<div class="fg-panel" style="display:flex;flex-direction:column;align-items:center;gap:6px;border-color:${on ? rr.color : 'var(--fg-outline)'}">
            <img src="/assets/puzzle-ui/boards/p16-pad-${i + 1}-${on ? 'on' : 'off'}.svg" alt="gather-${i + 1}" style="width:68px;height:68px;object-fit:contain" />
            <strong style="color:${rr.color};font-family:var(--fg-font-display)">${rr.name}</strong>
            <small style="color:var(--fg-sub)">${on ? '✔ 발판 착지' : `gather-${i + 1}`}</small>
          </div>`;
        })
        .join('')
    );
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
      const rhOk = rh === 45;
      const tempOk = temp === 18;
      mount.innerHTML = `
        <div class="fg-p10-clue-grid">
          <div class="fg-dial-card" style="border-color:${rhOk ? 'var(--fg-mint)' : 'var(--fg-outline)'}">
            <div class="fg-dial-box">
              <img class="fg-dial-bg" src="/assets/puzzle-ui/boards/p10-rh-dial.svg" alt="" />
              <div class="fg-dial-center">
                <img src="${uiIconUrl('drop')}" alt="" />
                <span class="fg-dial-val" style="color:var(--fg-cyan)">${rh}%</span>
              </div>
            </div>
            <div class="fg-stack" style="align-items:center">
              <div style="font-family:var(--fg-font-display);font-size:15px;color:${rhOk ? 'var(--fg-mint)' : 'var(--fg-cyan)'}">목표 45% RH</div>
              <div class="fg-row">
                ${roundBtnHtml({ id: 'hc-p10-rhd', icon: 'rot-ccw', tone: 'steel', subLabel: '-9%' })}
                ${roundBtnHtml({ id: 'hc-p10-rhu', icon: 'rot-cw', tone: 'steel', subLabel: '+9%' })}
              </div>
            </div>
          </div>

          <div class="fg-dial-card" style="border-color:${tempOk ? 'var(--fg-mint)' : 'var(--fg-outline)'}">
            <div class="fg-dial-box">
              <img class="fg-dial-bg" src="/assets/puzzle-ui/boards/p10-temp-dial.svg" alt="" />
              <div class="fg-dial-center">
                <img src="${uiIconUrl('thermo')}" alt="" />
                <span class="fg-dial-val" style="color:var(--fg-red)">${temp}°C</span>
              </div>
            </div>
            <div class="fg-stack" style="align-items:center">
              <div style="font-family:var(--fg-font-display);font-size:15px;color:${tempOk ? 'var(--fg-mint)' : 'var(--fg-red)'}">목표 18°C</div>
              <div class="fg-row">
                ${roundBtnHtml({ id: 'hc-p10-td', icon: 'rot-ccw', tone: 'steel', subLabel: '-2°C' })}
                ${roundBtnHtml({ id: 'hc-p10-tu', icon: 'rot-cw', tone: 'steel', subLabel: '+2°C' })}
              </div>
            </div>
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
        <div class="fg-panel fg-row-between" style="border-color:${latch ? 'var(--fg-mint)' : 'var(--fg-amber)'}">
          <div>
            <div class="fg-panel-title" style="color:${latch ? 'var(--fg-mint)' : 'var(--fg-amber)'}">1번 방수 크레이트 걸쇠: ${latch ? '체결 완료 ✔' : '미체결'}</div>
            <div class="fg-panel-sub">걸쇠를 잠가야 린이 크레인으로 상자를 안전하게 인양할 수 있습니다.</div>
          </div>
          <div style="min-width:210px">
            ${pushBtnHtml({ id: 'hc-p10-latch', label: latch ? '✔ 걸쇠 체결됨' : '🔒 걸쇠 체결하기', tone: latch ? 'mint' : 'amber', disabled: latch })}
          </div>
        </div>
      `;
      mount.querySelector('#hc-p10-latch')?.addEventListener('click', () => {
        soundEngine.playClick();
        h.patchState(10, { crateLatch: true });
        h.setInfo('서하린: 1번 방수 크레이트 걸쇠 체결 완료! 린에게 [1번]+[안정] 무전을 보내세요.');
      });
      return;
    }

    if (pid === 12 && myRole === 'lin') {
      let fx = Number(s.fx ?? 15);
      let fy = Number(s.fy ?? 85);
      const calcMetrics = () => {
        const dist = Math.abs(fx - 60) + Math.abs(fy - 40);
        const blur = Math.min(9, Number((dist / 7).toFixed(1)));
        const sharpness = Math.max(10, Math.min(100, Math.round(100 - dist * 0.7)));
        return { dist, blur, sharpness, sharp: dist <= 12 };
      };
      const m = calcMetrics();
      const shiftX = (fx - 60) * 1.4;
      const shiftY = (fy - 40) * 1.1;

      mount.innerHTML = `
        <div class="fg-p12-clue-wrap" id="hc-p12-card" style="border-color:${m.sharp ? 'var(--fg-mint)' : 'var(--fg-outline)'}">
          <div class="fg-film-viewport">
            <img id="hc-p12-film" class="fg-film-img" src="/assets/puzzle-ui/boards/p12-film-clue.svg" alt="마이크로필름"
              style="filter:blur(${m.blur}px);transform:translate(${shiftX}px, ${shiftY}px)" />
            <img class="fg-film-crosshair" src="/assets/puzzle-ui/boards/p12-crosshair.svg" alt="" />
          </div>
          <div class="fg-stack">
            <div class="fg-row-between">
              ${lcdHtml(`${fx} · ${fy}`, 'XY', '', 'hc-p12-lcd')}
              <span id="hc-p12-sharp" style="padding:5px 12px;border-radius:10px;border:3px solid var(--fg-outline);font-family:var(--fg-font-display);background:${m.sharp ? 'var(--fg-mint)' : 'var(--fg-amber)'};color:var(--fg-outline)">
                선명도 ${m.sharpness}% ${m.sharp ? '✔' : ''}
              </span>
            </div>
            <div class="fg-row" style="justify-content:center">
              ${roundBtnHtml({ id: 'hc-p12-xl', icon: 'arrow-left', tone: 'steel', subLabel: 'X -5' })}
              ${roundBtnHtml({ id: 'hc-p12-xr', icon: 'arrow-right', tone: 'steel', subLabel: 'X +5' })}
              ${roundBtnHtml({ id: 'hc-p12-yu', icon: 'arrow-up', tone: 'steel', subLabel: 'Y -5' })}
              ${roundBtnHtml({ id: 'hc-p12-yd', icon: 'arrow-down', tone: 'steel', subLabel: 'Y +5' })}
            </div>
          </div>
        </div>
      `;

      const applyXY = (nx: number, ny: number) => {
        fx = Math.max(0, Math.min(100, nx));
        fy = Math.max(0, Math.min(100, ny));
        const next = calcMetrics();
        const film = mount.querySelector<HTMLElement>('#hc-p12-film');
        const lcd = mount.querySelector('#hc-p12-lcd');
        const pill = mount.querySelector<HTMLElement>('#hc-p12-sharp');
        const card = mount.querySelector<HTMLElement>('#hc-p12-card');
        if (film) {
          film.style.filter = `blur(${next.blur}px)`;
          film.style.transform = `translate(${(fx - 60) * 1.4}px, ${(fy - 40) * 1.1}px)`;
        }
        if (lcd) lcd.textContent = `${fx} · ${fy}`;
        if (pill) {
          pill.textContent = `선명도 ${next.sharpness}% ${next.sharp ? '✔' : ''}`;
          pill.style.background = next.sharp ? 'var(--fg-mint)' : 'var(--fg-amber)';
        }
        if (card) card.style.borderColor = next.sharp ? 'var(--fg-mint)' : 'var(--fg-outline)';
        soundEngine.playClick();
        h.patchState(12, { fx, fy });
      };

      mount.querySelector('#hc-p12-xl')?.addEventListener('click', () => applyXY(fx - 5, fy));
      mount.querySelector('#hc-p12-xr')?.addEventListener('click', () => applyXY(fx + 5, fy));
      mount.querySelector('#hc-p12-yu')?.addEventListener('click', () => applyXY(fx, fy - 5));
      mount.querySelector('#hc-p12-yd')?.addEventListener('click', () => applyXY(fx, fy + 5));
      return;
    }

    if (pid === 13 && myRole === 'doyun') {
      const valveOpen = Boolean(s.valveOpen);
      mount.innerHTML = `
        <div class="fg-panel fg-row-between" style="border-color:${valveOpen ? 'var(--fg-mint)' : 'var(--fg-amber)'}">
          <div>
            <div class="fg-panel-title" style="color:${valveOpen ? 'var(--fg-mint)' : 'var(--fg-amber)'}">시약 공급 안전 밸브: ${valveOpen ? '개방됨 ✔ (스포이드 사용 가능)' : '잠김'}</div>
            <div class="fg-panel-sub">안전 차단 밸브를 열어야 카이가 청록·호박 시약 스포이드를 사용할 수 있습니다.</div>
          </div>
          <div style="min-width:210px">
            ${pushBtnHtml({ id: 'hc-p13-valve', label: valveOpen ? '✔ 밸브 개방됨' : '🔧 시약 밸브 열기', tone: valveOpen ? 'mint' : 'amber', disabled: valveOpen })}
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
        <div class="fg-panel fg-row-between" style="border-color:${mountUnlocked ? 'var(--fg-mint)' : 'var(--fg-amber)'}">
          <div>
            <div class="fg-panel-title" style="color:${mountUnlocked ? 'var(--fg-mint)' : 'var(--fg-amber)'}">프리즘 거치대 베어링: ${mountUnlocked ? '잠금 해제됨 ✔' : '잠김'}</div>
            <div class="fg-panel-sub">거치대를 풀어 줘야 린이 프리즘 3개를 돌릴 수 있습니다. (명판 각인: M3 = 서 ←)</div>
          </div>
          <div style="min-width:210px">
            ${pushBtnHtml({ id: 'hc-p16-mount', label: mountUnlocked ? '✔ 잠금 해제됨' : '🔧 거치대 베어링 해제', tone: mountUnlocked ? 'mint' : 'amber', disabled: mountUnlocked })}
          </div>
        </div>
      `;
      mount.querySelector('#hc-p16-mount')?.addEventListener('click', () => {
        soundEngine.playClick();
        h.patchState(16, { mountUnlocked: true });
        h.setInfo('서하린: 프리즘 거치대 잠금 해제 완료! 린에게 [준비 완료] + [3번] + [서 ←] 무전을 보내세요.');
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
