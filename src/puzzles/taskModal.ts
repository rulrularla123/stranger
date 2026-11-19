import type { MapJson, MapObject, RoleId, RoomState } from '../types/stranger.ts';
import { ROLES, renderTokenPillHtml } from '../data/cMenuTokens.ts';
import { MAIN_OPERATOR_OBJECT_IDS, PUZZLES_BY_ID } from '../data/puzzleCatalog.ts';
import { soundEngine } from '../audio/soundEngine.ts';
import type { SessionClient } from '../net/sessionClient.ts';
import { renderAct1Act2Board, type BoardHelpers } from './boardsAct1Act2.ts';
import { renderAct3Act4Board } from './boardsAct3Act4.ts';

export interface TaskModalHost {
  onOpenCMenu: () => void;
  onRequestBotClue: (pid: number) => void;
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
  private viewMode: 'main' | 'clue' | 'coords' = 'main';
  private feedback: { msg: string; kind: '' | 'err' | 'ok' } = { msg: '', kind: '' };

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
    const myRole = this.session.getMyRole();
    const isMainObj = MAIN_OPERATOR_OBJECT_IDS.has(obj.id);
    if (isMainObj || myRole === pDef?.mainRole) {
      this.viewMode = 'main';
    } else {
      this.viewMode = 'clue';
    }

    this.open = true;
    this.root.classList.add('open');
    this.render();
  }

  openPuzzleDirect(pid: number, tab: 'main' | 'clue' = 'main') {
    this.pid = pid;
    this.currentObj = null;
    this.viewMode = tab;
    this.feedback = { msg: '', kind: '' };
    this.open = true;
    this.root.classList.add('open');
    this.render();
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.root.classList.remove('open');
  }

  render() {
    if (!this.open) return;
    const room = this.session.getRoom();
    const p = PUZZLES_BY_ID[this.pid];
    if (!room || !p) return;

    const rMain = ROLES[p.mainRole];
    const isSolved = room.solvedPids.includes(p.id);
    const totalSolved = room.solvedPids.length;
    const pct = Math.round((totalSolved / 16) * 100);

    // Pin last 2 radio packets in modal top-right
    const pinnedRadios = room.radioLog.slice(0, 2);
    const pinHtml = pinnedRadios.length
      ? pinnedRadios
          .map(
            (pkt) =>
              `<span class="au-pin-item"><strong style="color:${ROLES[pkt.roleId].color}">${pkt.senderName}:</strong>${pkt.tokenIds.map((id) => renderTokenPillHtml(id)).join('+')}</span>`
          )
          .join('<span class="au-pin-sep">|</span>')
      : '<span class="au-pin-empty">수신 무전 없음 · [C] 무전 휠로 단서 교환</span>';

    const objs = this.getPuzzleObjects(p.id);

    this.root.innerHTML = `
      <div class="au-modal" role="dialog" aria-modal="true" aria-label="${p.code} ${p.title}">
        <div class="au-task-stripe-bar">
          <span>TASK ${totalSolved} / 16</span>
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
            <button class="au-vtab ${this.viewMode === 'main' ? 'active' : ''}" data-vmode="main">★ 주도 조작 (${rMain.name})</button>
            <button class="au-vtab ${this.viewMode === 'clue' ? 'active' : ''}" data-vmode="clue">👁 단서·보조 (${p.helperRoles.map((hr) => ROLES[hr].name).join('+')})</button>
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
    this.root.querySelectorAll<HTMLElement>('[data-vmode]').forEach((btn) => {
      btn.onclick = () => {
        soundEngine.playClick();
        this.viewMode = btn.dataset.vmode as 'main' | 'clue' | 'coords';
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

  private renderClueView(stage: HTMLElement, _room: RoomState, pid: number) {
    const p = PUZZLES_BY_ID[pid];
    const objClue = this.currentObj && p.objectRoleClues?.[this.currentObj.id];
    const helpers = p.helperRoles.map((r) => ROLES[r]);
    const mainR = ROLES[p.mainRole];

    stage.innerHTML = `
      <div class="au-board p-stack">
        <div class="p-row-between">
          <div>
            <span style="font:800 13px sans-serif;color:${objClue ? ROLES[objClue.roleId].color : helpers[0].color}">
              ${objClue ? ROLES[objClue.roleId].badge + ' ' + ROLES[objClue.roleId].name : helpers.map((h) => h.badge + ' ' + h.name).join(' · ')} 전용 단서 뷰
            </span>
            <div style="font:800 16px sans-serif;margin-top:2px">${objClue ? objClue.title : p.clueTitle}</div>
          </div>
          <div class="p-row">
            <button class="s-btn primary" id="au-send-clue">📡 권장 무전 패킷 발신</button>
            <button class="s-btn" id="au-open-wheel">🎛 C-Menu 휠로 직접 조합</button>
          </div>
        </div>
        ${objClue ? objClue.bodyHtml : p.clueHtml}
        <div class="p-row" style="margin-top:4px">
          <span style="font-size:12px;color:#9BB0BE">권장 전달 패킷 (${mainR.name}에게):</span>
          ${p.answerTokens.map((pkt) => pkt.map((tid) => renderTokenPillHtml(tid)).join(' + ')).join(' <span style="color:#667">/</span> ')}
        </div>
      </div>
    `;

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

    const helpers: BoardHelpers = {
      patchState: (pid, patch) => this.session.patchPuzzle(pid, patch),
      solve: (pid, statePatch, msg) => {
        if (pid !== 9) soundEngine.playSolve();
        this.session.solvePuzzle(pid, statePatch, msg);
        this.feedback = { msg, kind: 'ok' };
        this.render();
      },
      setErr: (msg) => {
        soundEngine.playError();
        this.feedback = { msg, kind: 'err' };
        this.render();
      },
      setInfo: (msg) => {
        this.feedback = { msg, kind: '' };
        this.render();
      },
      rerender: () => this.render(),
    };

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

    // Add discreet helper button at bottom of board if player wants bot radio help in solo/bot mode
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
