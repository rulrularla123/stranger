import './styles/main.css';
import type {
  AnimationsMeta,
  ClearRecord,
  FloorKey,
  GamePhase,
  MapJson,
  RadioPacket,
  RoleId,
  RoomState,
} from './types/stranger.ts';
import {
  ROLE_ORDER,
  ROLES,
  renderRadioContentHtml,
  renderRadioTargetHtml,
} from './data/cMenuTokens.ts';
import { PUZZLES, ROOM_INTROS } from './data/puzzleCatalog.ts';
import { soundEngine } from './audio/soundEngine.ts';
import { SessionClient } from './net/sessionClient.ts';
import { fetchRecentClearRecords, isSupabaseConfigured } from './net/supabaseClient.ts';
import { WorldEngine } from './game/worldEngine.ts';
import { BotController } from './game/botController.ts';
import { CMenuWheel } from './ui/cMenuWheel.ts';
import { MinimapController } from './ui/minimap.ts';
import { TaskModal } from './puzzles/taskModal.ts';
import {
  renderClearRecordsHtml,
  renderControlsModalHtml,
  renderCoronationEndingHtml,
  renderExitConfirmModalHtml,
  renderGatherHtml,
  renderIntroHtml,
  renderLobbyHtml,
  renderRoomIntroModalHtml,
  renderSettingsModalHtml,
  renderSplashHtml,
  renderTitleHtml,
  startLobbyCharacterPreviewLoop,
  startTitleCanvasAnimation,
} from './ui/screens.ts';

class StrangerApp {
  private root: HTMLElement;
  private mapData!: MapJson;
  private anims!: AnimationsMeta;
  private session = new SessionClient();

  private phase: GamePhase = 'splash';
  private nickname = '서하린';
  private gatherError = '';
  private recentClears: ClearRecord[] = [];
  private recordsLoading = false;
  private introSlide = 0;
  private overlayMode: 'none' | 'settings' | 'controls' | 'exit' | 'room_intro' = 'none';
  private roomIntroKey = '1F:hall';
  private checklistExpanded = true;
  private showCoronation = false;
  private logExpanded = true;

  private cleanupScreenAnim: (() => void) | null = null;
  private world: WorldEngine | null = null;
  private bots: BotController | null = null;
  private cMenu: CMenuWheel | null = null;
  private minimap: MinimapController | null = null;
  private taskModal: TaskModal | null = null;

  private overlayBackdrop!: HTMLElement;
  private coronationMount!: HTMLElement;
  private radioBannerEl!: HTMLElement;
  private roomBannerEl!: HTMLElement;
  private promptBtnEl!: HTMLButtonElement;
  private toastEl!: HTMLElement;
  private radioBannerTimer: number | null = null;
  private roomBannerTimer: number | null = null;
  private toastTimer: number | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  async init() {
    const [mapRes, animRes] = await Promise.all([
      fetch('/assets/map.json'),
      fetch('/assets/characters/animations.json'),
    ]);
    this.mapData = (await mapRes.json()) as MapJson;
    this.anims = (await animRes.json()) as AnimationsMeta;

    this.session.onChange((room, ev, extra) => this.handleSessionEvent(room, ev, extra));
    this.bindGlobalKeys();

    this.renderCurrentPhase();
    window.setTimeout(() => {
      if (this.phase === 'splash') {
        this.phase = 'title';
        this.renderCurrentPhase();
      }
    }, 1100);

    // Expose inspectable handle
    (window as unknown as Record<string, unknown>).__STRANGER__ = {
      getPhase: () => this.phase,
      getRoom: () => this.session.getRoom(),
      getMyRole: () => this.session.getMyRole(),
      switchRole: (r: RoleId) => this.switchRole(r),
      teleport: (f: FloorKey, s: string, x: number, y: number) => this.world?.teleportActiveRole(f, s, x, y),
      openPuzzle: (pid: number) => this.taskModal?.openPuzzleDirect(pid),
      summonAll: () => this.world?.summonAllTeammatesToActive(),
    };
  }

  private clearScreenAnim() {
    if (this.cleanupScreenAnim) {
      this.cleanupScreenAnim();
      this.cleanupScreenAnim = null;
    }
  }

  private loadRecentClears() {
    if (!isSupabaseConfigured()) return;
    this.recordsLoading = true;
    void fetchRecentClearRecords(5).then((list) => {
      this.recentClears = list;
      this.recordsLoading = false;
      const listEl = this.root.querySelector('#gather-records-list');
      if (listEl && this.phase === 'gather') {
        listEl.innerHTML = renderClearRecordsHtml(this.recentClears, false);
      }
    });
  }

  private renderCurrentPhase() {
    this.clearScreenAnim();

    if (this.phase === 'splash') {
      this.root.innerHTML = renderSplashHtml();
      this.root.querySelector('.splash-screen')?.addEventListener('click', () => {
        this.phase = 'title';
        this.renderCurrentPhase();
      });
      return;
    }

    if (this.phase === 'title') {
      const lastCode = this.session.getLastRoomCode();
      this.root.innerHTML = renderTitleHtml(lastCode);
      const cv = this.root.querySelector<HTMLCanvasElement>('#title-bg-canvas');
      if (cv) this.cleanupScreenAnim = startTitleCanvasAnimation(cv);
      this.mountOverlayLayer();

      this.root.querySelector('#btn-title-start')?.addEventListener('click', () => {
        soundEngine.startAmbientBgm();
        soundEngine.playClick();
        this.phase = 'gather';
        this.gatherError = '';
        this.loadRecentClears();
        this.renderCurrentPhase();
      });
      this.root.querySelector('#btn-title-continue')?.addEventListener('click', async () => {
        if (!lastCode) return;
        soundEngine.startAmbientBgm();
        soundEngine.playClick();
        const res = await this.session.joinRoom(lastCode, this.nickname);
        if (!res.ok) {
          this.phase = 'gather';
          this.gatherError = res.error || '직전 방 이어하기에 실패했습니다.';
          this.loadRecentClears();
          this.renderCurrentPhase();
        } else {
          const joined = this.session.getRoom();
          this.phase = joined && (joined.phase === 'playing' || joined.phase === 'ended') ? joined.phase : 'lobby';
          this.overlayMode = 'none';
          this.renderCurrentPhase();
        }
      });
      this.root.querySelector('#btn-title-solo')?.addEventListener('click', async () => {
        soundEngine.startAmbientBgm();
        soundEngine.playClick();
        await this.session.createRoom(this.nickname, true);
        this.session.updateLobby({ fillBots: true, soloSwitchEnabled: true });
        this.session.startGame();
        this.phase = 'playing';
        this.overlayMode = 'none';
        this.renderCurrentPhase();
      });
      this.root.querySelector('#btn-title-settings')?.addEventListener('click', () => {
        soundEngine.playClick();
        this.openOverlay('settings');
      });
      this.root.querySelector('#btn-title-controls')?.addEventListener('click', () => {
        soundEngine.playClick();
        this.openOverlay('controls');
      });
      return;
    }

    if (this.phase === 'gather') {
      const lastCode = this.session.getLastRoomCode();
      this.root.innerHTML = renderGatherHtml(
        this.nickname,
        this.gatherError,
        lastCode,
        this.recentClears,
        this.recordsLoading
      );
      this.mountOverlayLayer();

      const nickInput = this.root.querySelector<HTMLInputElement>('#inp-gather-nick');
      nickInput?.addEventListener('input', () => {
        this.nickname = nickInput.value || '서하린';
      });

      this.root.querySelector('#btn-rejoin-last')?.addEventListener('click', async () => {
        if (!lastCode) return;
        soundEngine.playClick();
        const res = await this.session.joinRoom(lastCode, this.nickname);
        if (!res.ok) {
          this.gatherError = res.error || '직전 방 이어하기에 실패했습니다.';
          this.renderCurrentPhase();
        } else {
          this.gatherError = '';
          const joined = this.session.getRoom();
          this.phase = joined && (joined.phase === 'playing' || joined.phase === 'ended') ? joined.phase : 'lobby';
          this.overlayMode = 'none';
          this.renderCurrentPhase();
        }
      });

      this.root.querySelector('#btn-gather-back')?.addEventListener('click', () => {
        soundEngine.playClick();
        this.phase = 'title';
        this.renderCurrentPhase();
      });
      this.root.querySelector('#btn-gather-settings')?.addEventListener('click', () => {
        soundEngine.playClick();
        this.openOverlay('settings');
      });
      this.root.querySelector('#btn-create-room')?.addEventListener('click', async () => {
        soundEngine.playClick();
        this.gatherError = '';
        await this.session.createRoom(this.nickname, true);
        this.phase = 'lobby';
        this.renderCurrentPhase();
      });

      const codeBoxes = [...this.root.querySelectorAll<HTMLInputElement>('[data-cbox]')];
      codeBoxes.forEach((box, idx) => {
        box.addEventListener('input', () => {
          box.value = box.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 1);
          if (box.value && idx < codeBoxes.length - 1) codeBoxes[idx + 1].focus();
        });
        box.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !box.value && idx > 0) codeBoxes[idx - 1].focus();
          if (e.key === 'Enter') this.root.querySelector<HTMLButtonElement>('#btn-join-room')?.click();
        });
        box.addEventListener('paste', (e) => {
          const text = (e.clipboardData?.getData('text') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (text.length >= 2) {
            e.preventDefault();
            codeBoxes.forEach((b, bi) => {
              b.value = text[bi] || '';
            });
            codeBoxes[Math.min(5, text.length - 1)]?.focus();
          }
        });
      });

      this.root.querySelector('#btn-join-room')?.addEventListener('click', async () => {
        soundEngine.playClick();
        const code = codeBoxes.map((b) => b.value).join('');
        const res = await this.session.joinRoom(code, this.nickname);
        if (!res.ok) {
          this.gatherError = res.error || '방 입장에 실패했습니다.';
          this.renderCurrentPhase();
        } else {
          this.gatherError = '';
          const joined = this.session.getRoom();
          this.phase = joined && (joined.phase === 'playing' || joined.phase === 'ended') ? joined.phase : 'lobby';
          this.overlayMode = 'none';
          this.renderCurrentPhase();
        }
      });
      return;
    }

    if (this.phase === 'lobby') {
      const room = this.session.getRoom();
      if (!room) {
        this.phase = 'gather';
        this.renderCurrentPhase();
        return;
      }
      this.root.innerHTML = renderLobbyHtml(
        room,
        this.session.getMyRole(),
        this.session.getClientId(),
        this.session.isWsConnected(),
        this.session.getConnectionLabel()
      );
      this.cleanupScreenAnim = startLobbyCharacterPreviewLoop(this.root, this.anims);
      this.mountOverlayLayer();

      this.root.querySelector('#btn-copy-code')?.addEventListener('click', () => {
        navigator.clipboard?.writeText(room.code).catch(() => {});
        soundEngine.playClick();
      });
      this.root.querySelector('#btn-lobby-diff')?.addEventListener('click', () => {
        const order = ['쉬움', '보통', '어려움'];
        const next = order[(order.indexOf(room.difficulty) + 1) % order.length];
        soundEngine.playClick();
        this.session.updateLobby({ difficulty: next });
      });
      this.root.querySelector('#btn-lobby-settings')?.addEventListener('click', () => {
        soundEngine.playClick();
        this.openOverlay('settings');
      });
      this.root.querySelector('#btn-lobby-leave')?.addEventListener('click', () => {
        soundEngine.playClick();
        this.session.leaveRoom();
        this.phase = 'gather';
        this.loadRecentClears();
        this.renderCurrentPhase();
      });
      this.root.querySelector('#btn-lobby-bots')?.addEventListener('click', () => {
        soundEngine.playClick();
        this.session.updateLobby({ fillBots: !room.fillBots });
      });
      this.root.querySelector('#btn-lobby-solo')?.addEventListener('click', () => {
        soundEngine.playClick();
        this.session.updateLobby({ soloSwitchEnabled: !room.soloSwitchEnabled });
      });
      const nickInp = this.root.querySelector<HTMLInputElement>('#inp-lobby-nick');
      nickInp?.addEventListener('change', () => {
        this.nickname = nickInp.value || ROLES[this.session.getMyRole()].name;
        this.session.updateLobby({ nickname: this.nickname });
      });
      this.root.querySelectorAll<HTMLElement>('[data-pick-role]').forEach((btn) => {
        btn.onclick = () => {
          soundEngine.playClick();
          this.session.selectRole(btn.dataset.pickRole as RoleId, this.nickname);
        };
      });
      this.root.querySelector('#btn-lobby-start')?.addEventListener('click', () => {
        soundEngine.startAmbientBgm();
        soundEngine.playClick();
        this.introSlide = 0;
        this.phase = 'intro';
        this.renderCurrentPhase();
      });
      return;
    }

    if (this.phase === 'intro') {
      this.root.innerHTML = renderIntroHtml(this.introSlide);
      this.mountOverlayLayer();
      this.root.querySelector('#btn-intro-skip')?.addEventListener('click', () => this.finishIntro());
      this.root.querySelector('#btn-intro-next')?.addEventListener('click', () => {
        soundEngine.playClick();
        if (this.introSlide < 2) {
          this.introSlide++;
          this.renderCurrentPhase();
        } else {
          this.finishIntro();
        }
      });
      return;
    }

    // Playing or Ended (Game shell mounted!)
    this.mountGameShell();
  }

  private finishIntro() {
    soundEngine.playClick();
    this.session.startGame();
    this.phase = 'playing';
    this.overlayMode = 'controls';
    this.renderCurrentPhase();
  }

  private mountGameShell() {
    const room = this.session.getRoom();
    if (!room) return;

    this.root.innerHTML = `
      <div class="game-shell">
        <canvas id="game-canvas" class="game-canvas"></canvas>

        <div class="hud-top-left">
          <div class="hud-box">
            <div class="hud-task-row">
              <span id="hud-task-label">TASK 0 / 16</span>
              <div class="au-progress-track"><div class="au-progress-fill" id="hud-task-fill" style="width:0%"></div></div>
            </div>
            <div class="p-row-between" style="margin-top:6px">
              <div class="hud-obj-title" style="margin-bottom:0">공용 목표</div>
              <button class="hud-chk-toggle" id="hud-chk-toggle">${this.checklistExpanded ? '목록 접기 ▴' : '체크리스트 ▾'}</button>
            </div>
            <div class="hud-obj-line" id="hud-objective">1층 로비 나침반과 전시관을 복원하세요</div>
            <div class="hud-checklist" id="hud-checklist" style="display:${this.checklistExpanded ? 'flex' : 'none'}"></div>
          </div>
          <div class="hud-box hud-role-banner" id="hud-role-box"></div>
          <div class="signal-log-box ${this.logExpanded ? 'expanded' : ''}" id="hud-log-box">
            <div class="signal-log-bar">
              <button class="signal-log-head" id="hud-log-toggle">📡 팀 무전 채팅 (${this.logExpanded ? '▴' : '▾'})</button>
              <button class="hud-chk-toggle" id="hud-log-send" title="C-Menu 2.0 조합 무전 보내기">+ 보내기 (C)</button>
            </div>
            <div class="signal-log-list" id="hud-log-list">
              <span style="color:#8597a6">수신된 무전이 없습니다. [C]로 신호를 보내보세요.</span>
            </div>
          </div>
        </div>

        <div class="hud-top-center">
          <div class="shared-radio-banner" id="hud-radio-banner" style="display:none"></div>
          <div class="room-banner" id="hud-room-banner" style="display:none"></div>
        </div>

        <div class="hud-top-right">
          <div class="hud-btn-row">
            <span class="room-code-pill" style="padding:4px 9px;font-size:11px">방 <strong>${room.code}</strong></span>
            <button class="s-btn primary" id="hud-c-btn">[C] 무전</button>
            <button class="s-btn" id="hud-m-btn">[M] 안내도</button>
            <button class="s-btn" id="hud-h-btn">[H] 조작</button>
            <button class="s-btn danger" id="hud-p-btn">[P] 나가기</button>
          </div>
          <div class="hud-minimap-wrap" id="hud-minimap-wrap" title="클릭하거나 M 키를 눌러 전체 층 안내도 열기">
            <canvas id="minimap-canvas"></canvas>
            <div class="hud-minimap-lbl" id="hud-minimap-lbl">1F · 중앙 복도</div>
          </div>
          <div class="hud-role-switcher" id="hud-role-switcher"></div>
        </div>

        <div class="hud-bottom-center">
          <button class="interact-prompt-btn" id="hud-prompt-btn" style="display:none"></button>
          <div class="status-toast" id="hud-toast" style="display:none"></div>
        </div>

        <div class="hud-bottom-left" aria-label="터치 이동 패드">
          <div></div><button class="s-btn" data-pad-key="ArrowUp">↑</button><div></div>
          <button class="s-btn" data-pad-key="ArrowLeft">←</button>
          <button class="s-btn" data-pad-key="ArrowDown">↓</button>
          <button class="s-btn" data-pad-key="ArrowRight">→</button>
        </div>
      </div>
    `;

    this.mountOverlayLayer();
    this.coronationMount = document.createElement('div');
    this.root.appendChild(this.coronationMount);

    this.radioBannerEl = this.root.querySelector('#hud-radio-banner')!;
    this.roomBannerEl = this.root.querySelector('#hud-room-banner')!;
    this.promptBtnEl = this.root.querySelector('#hud-prompt-btn')!;
    this.toastEl = this.root.querySelector('#hud-toast')!;

    const gameCanvas = this.root.querySelector<HTMLCanvasElement>('#game-canvas')!;
    const miniCanvas = this.root.querySelector<HTMLCanvasElement>('#minimap-canvas')!;

    this.world = new WorldEngine(gameCanvas, this.mapData, this.anims, this.session, {
      onInteractObject: (obj) => {
        // P16 Part 2 (2F atrium statue & gather-1..4) is MODAL-FREE in the live field!
        if (obj.puzzles?.[0] === 16 && obj.room === 'atrium') {
          const rNow = this.session.getRoom();
          const p16 = (rNow?.puzzleStates[16] || {}) as {
            beamReachedAtrium?: boolean;
            hereSent?: boolean;
            pads?: boolean[];
          };
          const padsCnt = (p16.pads || []).filter(Boolean).length;
          if (!p16.beamReachedAtrium) {
            this.showToast('먼저 동쪽 [2F 기획전시실] 프리즘 3개를 맞춰 빛을 반원 홀로 쏘세요!', 'amber');
          } else if (!p16.hereSent) {
            this.showToast('빛이 도착했습니다! 린이 [C] → [📍 집결 호출 HERE] 무전을 발신하세요.', 'mint');
          } else {
            this.showToast(`반원 홀 발판 집결 중 (${padsCnt}/4) — 4인 모두 발판에 올라서세요!`, 'mint');
          }
          return;
        }
        this.taskModal?.openForObject(obj);
      },
      onStatusToast: (msg, tone) => this.showToast(msg, tone),
      onSceneEntered: (floor, scene, label, firstVisit) => {
        this.showRoomBanner(`${floor} · ${label}`);
        this.refreshHud();
        const key = `${floor}:${scene}`;
        if (firstVisit && ROOM_INTROS[key] && !this.isGameplayBlocked()) {
          this.roomIntroKey = key;
          this.openOverlay('room_intro');
        }
      },
      onPromptChange: (text) => {
        if (text) {
          this.promptBtnEl.style.display = 'inline-flex';
          this.promptBtnEl.textContent = text;
        } else {
          this.promptBtnEl.style.display = 'none';
        }
      },
      onCoronationTriggered: () => {
        this.showCoronation = true;
        this.renderCoronation();
      },
    });

    this.bots = new BotController(this.session, this.world, this.mapData);
    this.cMenu = new CMenuWheel(this.root, this.session);
    this.minimap = new MinimapController(miniCanvas, this.root, this.mapData, (f, s, x, y) => {
      this.world?.teleportActiveRole(f, s, x, y);
      this.refreshHud();
    });
    this.taskModal = new TaskModal(this.root, this.session, this.mapData, {
      onOpenCMenu: (targetRoleId) => this.cMenu?.openWithTarget(targetRoleId ?? null),
      onRequestBotHelp: (pid, helperRole) => this.bots?.requestBotHelpForPuzzle(pid, helperRole),
      onSwitchRole: (roleId) => this.switchRole(roleId),
      onJumpToAtrium: () => this.world?.teleportActiveRole('2F', 'atrium', 950, 560),
    });

    this.world.start();
    this.bots.start();

    this.root.querySelector('#hud-c-btn')?.addEventListener('click', () => this.cMenu?.toggle());
    this.root.querySelector('#hud-m-btn')?.addEventListener('click', () =>
      this.minimap?.toggleGuide(undefined, this.session.getRoom() || undefined, this.session.getMyRole())
    );
    this.root.querySelector('#hud-minimap-wrap')?.addEventListener('click', () =>
      this.minimap?.toggleGuide(true, this.session.getRoom() || undefined, this.session.getMyRole())
    );
    this.root.querySelector('#hud-h-btn')?.addEventListener('click', () => this.openOverlay('controls'));
    this.root.querySelector('#hud-p-btn')?.addEventListener('click', () => this.openOverlay('exit'));
    this.promptBtnEl.addEventListener('click', () => this.world?.interact(this.isGameplayBlocked()));

    this.root.querySelector('#hud-log-toggle')?.addEventListener('click', () => {
      this.logExpanded = !this.logExpanded;
      this.root.querySelector('#hud-log-box')?.classList.toggle('expanded', this.logExpanded);
      const toggleEl = this.root.querySelector('#hud-log-toggle');
      if (toggleEl) toggleEl.textContent = `📡 팀 무전 채팅 (${this.logExpanded ? '▴' : '▾'})`;
    });
    this.root.querySelector('#hud-log-send')?.addEventListener('click', () => this.cMenu?.toggle(true));
    this.root.querySelector('#hud-chk-toggle')?.addEventListener('click', () => {
      this.checklistExpanded = !this.checklistExpanded;
      const list = this.root.querySelector<HTMLElement>('#hud-checklist');
      const btn = this.root.querySelector('#hud-chk-toggle');
      if (list) list.style.display = this.checklistExpanded ? 'flex' : 'none';
      if (btn) btn.textContent = this.checklistExpanded ? '목록 접기 ▴' : '체크리스트 ▾';
    });

    this.root.querySelectorAll<HTMLElement>('[data-pad-key]').forEach((btn) => {
      const k = btn.dataset.padKey!;
      btn.addEventListener('pointerdown', () => this.world?.setHeldKey(k, true));
      btn.addEventListener('pointerup', () => this.world?.setHeldKey(k, false));
      btn.addEventListener('pointercancel', () => this.world?.setHeldKey(k, false));
    });

    this.refreshHud();
    this.renderOverlay();
    if (this.showCoronation || room.coronationTriggered) {
      this.showCoronation = true;
      this.renderCoronation();
    }
  }

  private mountOverlayLayer() {
    const existing = this.root.querySelector('#overlay-backdrop');
    if (existing) {
      this.overlayBackdrop = existing as HTMLElement;
      return;
    }
    this.overlayBackdrop = document.createElement('div');
    this.overlayBackdrop.id = 'overlay-backdrop';
    this.overlayBackdrop.className = 'au-backdrop';
    this.overlayBackdrop.addEventListener('click', (e) => {
      if (e.target === this.overlayBackdrop) this.closeOverlay();
    });
    this.root.appendChild(this.overlayBackdrop);
    this.renderOverlay();
  }

  private openOverlay(mode: 'settings' | 'controls' | 'exit' | 'room_intro') {
    this.overlayMode = mode;
    this.world?.clearHeldKeys();
    this.renderOverlay();
  }

  private closeOverlay() {
    this.overlayMode = 'none';
    this.renderOverlay();
  }

  private renderOverlay() {
    if (!this.overlayBackdrop) return;
    if (this.overlayMode === 'none') {
      this.overlayBackdrop.classList.remove('open');
      this.overlayBackdrop.innerHTML = '';
      return;
    }
    this.overlayBackdrop.classList.add('open');
    const room = this.session.getRoom();
    if (this.overlayMode === 'settings') {
      this.overlayBackdrop.innerHTML = renderSettingsModalHtml();
      const sfx = this.overlayBackdrop.querySelector<HTMLInputElement>('#rng-sfx')!;
      const bgm = this.overlayBackdrop.querySelector<HTMLInputElement>('#rng-bgm')!;
      sfx.oninput = () => {
        soundEngine.setSfxVolume(Number(sfx.value));
        this.overlayBackdrop.querySelector('#lbl-sfx')!.textContent = `${sfx.value}%`;
      };
      bgm.oninput = () => {
        soundEngine.setBgmVolume(Number(bgm.value));
        this.overlayBackdrop.querySelector('#lbl-bgm')!.textContent = `${bgm.value}%`;
      };
      this.overlayBackdrop.querySelector('#btn-settings-ok')?.addEventListener('click', () => this.closeOverlay());
    } else if (this.overlayMode === 'controls') {
      this.overlayBackdrop.innerHTML = renderControlsModalHtml(Boolean(room?.soloSwitchEnabled ?? true));
      this.overlayBackdrop.querySelector('#btn-controls-ok')?.addEventListener('click', () => this.closeOverlay());
    } else if (this.overlayMode === 'exit') {
      this.overlayBackdrop.innerHTML = renderExitConfirmModalHtml();
      this.overlayBackdrop.querySelector('#btn-exit-cancel')?.addEventListener('click', () => this.closeOverlay());
      this.overlayBackdrop.querySelector('#btn-exit-confirm')?.addEventListener('click', () => {
        this.closeOverlay();
        this.exitToLobby();
      });
    } else if (this.overlayMode === 'room_intro') {
      const info = ROOM_INTROS[this.roomIntroKey];
      if (!info) {
        this.closeOverlay();
        return;
      }
      this.overlayBackdrop.innerHTML = renderRoomIntroModalHtml(info);
      this.overlayBackdrop.querySelector('#btn-room-intro-ok')?.addEventListener('click', () => this.closeOverlay());
    }
    this.overlayBackdrop.querySelector('#btn-close-overlay')?.addEventListener('click', () => this.closeOverlay());
  }

  private exitToLobby() {
    this.world?.stop();
    this.bots?.stop();
    this.world = null;
    this.bots = null;
    this.showCoronation = false;
    this.session.leaveRoom();
    this.phase = 'gather';
    this.loadRecentClears();
    this.renderCurrentPhase();
  }

  private handleSessionEvent(room: RoomState, ev: string, extra?: unknown) {
    if (this.phase === 'lobby') {
      if (room.phase === 'playing' || room.phase === 'ended') {
        this.phase = room.phase;
      }
      this.renderCurrentPhase();
      return;
    }

    if (this.phase !== 'playing' && this.phase !== 'ended') return;

    if (ev === 'radio_broadcast' && extra) {
      const pkt = extra as RadioPacket;
      this.world?.onRadioReceived(pkt);
      this.showRadioBanner(pkt);
      this.refreshSignalLog(room);
      this.taskModal?.refreshPinnedRadios();
      this.bots?.onRadioDirectedAtBot(pkt);
      return;
    }

    if (ev === 'puzzle_updated') {
      const info = (extra || {}) as { pid?: number; message?: string };
      if (info.message) this.showToast(info.message, 'mint');
      if (room.coronationTriggered && !this.showCoronation) {
        this.showCoronation = true;
        soundEngine.playCoronation();
        this.renderCoronation();
      }
      this.refreshHud();
      this.taskModal?.onPuzzleUpdated(info.pid);
      return;
    }

    if (ev === 'role_switched' || ev === 'room_state') {
      this.world?.snapCamera();
      this.refreshHud();
      if (this.taskModal?.isOpen()) this.taskModal.render();
      return;
    }

    if (ev === 'player_moved') {
      this.minimap?.renderMini(room, this.session.getMyRole());
    }
  }

  private switchRole(roleId: RoleId) {
    const room = this.session.getRoom();
    if (!room || !room.soloSwitchEnabled) return;
    soundEngine.playClick();
    this.session.setLocalActiveRole(roleId);
    const rMeta = ROLES[roleId];
    this.showToast(`역할 전환: ${rMeta.badge} ${rMeta.name} (${rMeta.shortRole})`, 'mint');
  }

  private refreshHud() {
    const room = this.session.getRoom();
    if (!room) return;
    const myRole = this.session.getMyRole();
    const rMeta = ROLES[myRole];
    const slot = room.slots[myRole];

    const solvedCount = room.solvedPids.length;
    const lbl = this.root.querySelector('#hud-task-label');
    const fill = this.root.querySelector<HTMLElement>('#hud-task-fill');
    if (lbl) lbl.textContent = `TASK ${solvedCount} / 16`;
    if (fill) fill.style.width = `${Math.round((solvedCount / 16) * 100)}%`;

    const objEl = this.root.querySelector('#hud-objective');
    if (objEl) {
      if (!room.powerRestored) {
        objEl.textContent = '1F 전시관(P01~P06) 및 B1 전기실(P09)을 복구해 박물관 조명을 켜세요';
      } else if (solvedCount < 15) {
        objEl.textContent = `전력 복구 완료! 남은 전시·아카이브 복원 (${solvedCount}/15) 후 2F 기획전(P16)으로 이동하세요`;
      } else if (!room.solvedPids.includes(16)) {
        objEl.textContent = '2F 기획전시실 광학 프리즘(P16) 연결 → 반원 홀 발판 4/4 동시 집결!';
      } else {
        objEl.textContent = '박물관 전체 복원 및 정식 개관 대관식 완료!';
      }
    }

    const chkEl = this.root.querySelector<HTMLElement>('#hud-checklist');
    if (chkEl) {
      const solvedSet = new Set(room.solvedPids);
      const act1Done = [1, 2, 3, 4, 5, 6].every((id) => solvedSet.has(id));
      const act2Done = [7, 8, 9, 10].every((id) => solvedSet.has(id));
      const act3Done = [11, 12, 13, 14, 15].every((id) => solvedSet.has(id));
      const activeAct: 1 | 2 | 3 | 4 = !act1Done ? 1 : !act2Done ? 2 : !act3Done ? 3 : 4;
      const actTitles: Record<1 | 2 | 3 | 4, string> = {
        1: '1막 · 1F 상설 전시관',
        2: '2막 · B1 지하 설비·전력',
        3: '3막 · 2F 아카이브·보존',
        4: '4막 · 2F 기획전 → 대관식',
      };
      const items = PUZZLES.filter((pz) => pz.act === activeAct);
      chkEl.innerHTML =
        `<div class="hud-chk-act">${actTitles[activeAct]}</div>` +
        items
          .map((pz) => {
            const done = solvedSet.has(pz.id);
            return `<div class="hud-chk-row ${done ? 'done' : ''}">
              <span>${done ? '✔' : '○'} <strong>${pz.code}</strong> ${pz.title}</span>
            </div>`;
          })
          .join('');
    }

    const roleBox = this.root.querySelector<HTMLElement>('#hud-role-box');
    if (roleBox) {
      roleBox.style.borderLeftColor = rMeta.color;
      let roomAssignLine = '';
      if (slot) {
        const roomUnsolved = PUZZLES.filter(
          (pz) => pz.floor === slot.floor && pz.room === slot.scene && !room.solvedPids.includes(pz.id)
        );
        const myMain = roomUnsolved.find((pz) => pz.mainRole === myRole);
        const myHelper = roomUnsolved.find((pz) => pz.helperRoles.includes(myRole));
        if (myMain) {
          roomAssignLine = `<div class="hud-role-assign" style="color:${rMeta.color}">📍 이 방 담당: ★ ${myMain.code} 주도 조작</div>`;
        } else if (myHelper) {
          const sum = myHelper.helperSummaryByRole?.[myRole] || '단서·보조';
          roomAssignLine = `<div class="hud-role-assign" style="color:${rMeta.color}">📍 이 방 담당: 👁 ${myHelper.code} ${sum} (${ROLES[myHelper.mainRole].name} 지원)</div>`;
        } else if (roomUnsolved.length > 0) {
          roomAssignLine = `<div class="hud-role-assign" style="color:#9BB0BE">📍 이 방: ${roomUnsolved[0].code} 동료 구역 (무전 협동)</div>`;
        } else if (slot.scene === 'atrium') {
          roomAssignLine = `<div class="hud-role-assign" style="color:#52EFBF">📍 반원 홀: 4인 대관식 집결 광장</div>`;
        } else {
          roomAssignLine = `<div class="hud-role-assign" style="color:#52EFBF">📍 이 방 복원 완료 ✔</div>`;
        }
      }
      roleBox.innerHTML = `
        <div style="font-size:13px;font-weight:900;color:${rMeta.color}">${rMeta.badge} ${rMeta.name} · ${rMeta.title}</div>
        <div style="font-size:11px;color:#b8c7d4;margin-top:2px">${rMeta.passiveName}: ${rMeta.passiveDesc}</div>
        ${roomAssignLine}
      `;
    }

    const miniLbl = this.root.querySelector('#hud-minimap-lbl');
    if (miniLbl && slot) {
      const fl = this.mapData.floors[slot.floor];
      const scName = fl?.scenes[slot.scene]?.label || slot.scene;
      miniLbl.textContent = `${slot.floor} · ${scName}`;
    }
    this.minimap?.renderMini(room, myRole);

    const switcher = this.root.querySelector('#hud-role-switcher');
    if (switcher) {
      if (room.soloSwitchEnabled) {
        switcher.innerHTML = `
          ${ROLE_ORDER.map((r, i) => {
            const rm = ROLES[r];
            return `<button class="role-pill-btn ${r === myRole ? 'active' : ''}" data-sw-role="${r}" style="--rc:${rm.color}">[${i + 1}] ${rm.name}</button>`;
          }).join('')}
          <button class="role-pill-btn" id="btn-summon-all" style="--rc:#E6C886">🧲 동료 집합</button>
        `;
        switcher.querySelectorAll<HTMLElement>('[data-sw-role]').forEach((b) => {
          b.onclick = () => this.switchRole(b.dataset.swRole as RoleId);
        });
        switcher.querySelector('#btn-summon-all')?.addEventListener('click', () => {
          this.world?.summonAllTeammatesToActive();
        });
      } else {
        switcher.innerHTML = `<span class="role-pill-btn active" style="--rc:${rMeta.color}">고정 역할: ${rMeta.name}</span>`;
      }
    }

    this.refreshSignalLog(room);
  }

  private refreshSignalLog(room: RoomState) {
    const list = this.root.querySelector('#hud-log-list');
    if (!list) return;
    if (room.radioLog.length === 0) {
      list.innerHTML = `<span style="color:#8597a6">수신된 무전이 없습니다. [C]로 조합 무전을 보내보세요.</span>`;
      return;
    }
    list.innerHTML = room.radioLog
      .slice(0, 14)
      .map((pkt) => {
        const rm = ROLES[pkt.roleId];
        return `<div class="signal-log-item">
          <div class="signal-log-meta">
            <strong style="color:${rm.color}">${rm.badge} ${pkt.senderName}</strong>
            ${renderRadioTargetHtml(pkt)}
          </div>
          <div class="signal-log-content">${renderRadioContentHtml(pkt, room.slots)}</div>
        </div>`;
      })
      .join('');
  }

  private showRadioBanner(pkt: RadioPacket) {
    if (!this.radioBannerEl) return;
    const rm = ROLES[pkt.roleId];
    const room = this.session.getRoom();
    this.radioBannerEl.style.display = 'flex';
    this.radioBannerEl.style.borderColor = rm.color;
    this.radioBannerEl.innerHTML = `
      <span>📡</span>
      <strong style="color:${rm.color}">${rm.badge} ${pkt.senderName}</strong>
      ${renderRadioTargetHtml(pkt)}
      ${renderRadioContentHtml(pkt, room?.slots)}
    `;
    if (this.radioBannerTimer) window.clearTimeout(this.radioBannerTimer);
    this.radioBannerTimer = window.setTimeout(() => {
      if (this.radioBannerEl) this.radioBannerEl.style.display = 'none';
    }, 12000);
  }

  private showRoomBanner(text: string) {
    if (!this.roomBannerEl) return;
    this.roomBannerEl.style.display = 'block';
    this.roomBannerEl.textContent = text;
    if (this.roomBannerTimer) window.clearTimeout(this.roomBannerTimer);
    this.roomBannerTimer = window.setTimeout(() => {
      if (this.roomBannerEl) this.roomBannerEl.style.display = 'none';
    }, 2600);
  }

  private showToast(msg: string, tone: 'mint' | 'amber' | 'info' = 'mint') {
    if (!this.toastEl) return;
    this.toastEl.style.display = 'block';
    this.toastEl.style.color = tone === 'amber' ? '#FFD86B' : tone === 'info' ? '#DCE6EE' : '#52EFBF';
    this.toastEl.textContent = msg;
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      if (this.toastEl) this.toastEl.style.display = 'none';
    }, 3400);
  }

  private renderCoronation() {
    if (!this.coronationMount) return;
    const room = this.session.getRoom();
    if (!this.showCoronation || !room) {
      this.coronationMount.innerHTML = '';
      return;
    }
    this.coronationMount.innerHTML = renderCoronationEndingHtml(
      room,
      this.session.getTransportMode() === 'supabase'
    );
    this.coronationMount.querySelector('#btn-coro-explore')?.addEventListener('click', () => {
      this.showCoronation = false;
      this.renderCoronation();
    });
    this.coronationMount.querySelector('#btn-coro-replay')?.addEventListener('click', () => {
      this.showCoronation = false;
      this.renderCoronation();
      this.session.resetGame();
      this.refreshHud();
    });
  }

  private isGameplayBlocked(): boolean {
    return (
      this.overlayMode !== 'none' ||
      Boolean(this.cMenu?.isOpen()) ||
      Boolean(this.taskModal?.isOpen()) ||
      Boolean(this.minimap?.isGuideOpen()) ||
      this.showCoronation
    );
  }

  private bindGlobalKeys() {
    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null;
      const inInput = Boolean(target?.closest('input, textarea, select'));
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      if (this.phase === 'splash') {
        this.phase = 'title';
        this.renderCurrentPhase();
        return;
      }

      if (this.phase === 'intro' && !e.repeat) {
        if (key === 'x') this.finishIntro();
        else if (key === 'Enter' || key === ' ') {
          e.preventDefault();
          this.root.querySelector<HTMLButtonElement>('#btn-intro-next')?.click();
        }
        return;
      }

      if (inInput) return;

      if (key === 'Escape') {
        if (this.cMenu?.isOpen()) {
          this.cMenu.close();
        } else if (this.overlayMode !== 'none') {
          this.closeOverlay();
        } else if (this.taskModal?.isOpen()) {
          this.taskModal.close();
        } else if (this.minimap?.isGuideOpen()) {
          this.minimap.toggleGuide(false);
        }
        return;
      }

      if (key === 'x' && !e.repeat) {
        if (this.overlayMode !== 'none') {
          this.closeOverlay();
          return;
        }
      }

      if (this.cMenu?.isOpen() && key === 'Enter' && !e.repeat) {
        e.preventDefault();
        this.cMenu.transmit();
        return;
      }

      if (this.overlayMode === 'room_intro' && !e.repeat && (key === 'e' || key === 'Enter' || key === ' ')) {
        e.preventDefault();
        this.closeOverlay();
        return;
      }

      if (this.overlayMode === 'exit' && key === 'Enter' && !e.repeat) {
        this.closeOverlay();
        this.exitToLobby();
        return;
      }

      if (this.phase !== 'playing') return;

      // Movement keys
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'].includes(key)) {
        if (!this.isGameplayBlocked()) {
          e.preventDefault();
          this.world?.setHeldKey(key, true);
        }
        return;
      }

      if (e.repeat) return;

      if (key === 'c') {
        if (this.overlayMode === 'none') this.cMenu?.toggle();
      } else if (key === 'e') {
        if (this.overlayMode === 'controls') {
          this.closeOverlay();
        } else if (this.taskModal?.isOpen()) {
          this.taskModal.close();
        } else {
          this.world?.interact(this.isGameplayBlocked());
        }
      } else if (key === 'm') {
        if (!this.cMenu?.isOpen() && !this.taskModal?.isOpen()) {
          this.minimap?.toggleGuide(undefined, this.session.getRoom() || undefined, this.session.getMyRole());
        }
      } else if (key === 'h') {
        if (this.overlayMode === 'controls') this.closeOverlay();
        else if (!this.taskModal?.isOpen() && !this.cMenu?.isOpen()) this.openOverlay('controls');
      } else if (key === 'p') {
        if (this.overlayMode === 'exit') this.closeOverlay();
        else if (!this.taskModal?.isOpen() && !this.cMenu?.isOpen()) this.openOverlay('exit');
      } else if (['1', '2', '3', '4'].includes(key) && !this.isGameplayBlocked()) {
        const idx = Number(key) - 1;
        this.switchRole(ROLE_ORDER[idx]);
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.world?.setHeldKey(key, false);
    });
    window.addEventListener('blur', () => {
      this.world?.clearHeldKeys();
    });
  }
}

const appRoot = document.querySelector<HTMLElement>('#app');
if (appRoot) {
  const app = new StrangerApp(appRoot);
  app.init().catch((err) => {
    console.error('STRANGER 2.0 init error:', err);
  });
}
