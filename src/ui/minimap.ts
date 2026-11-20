import type { FloorKey, MapJson, RoleId, RoomState } from '../types/stranger.ts';
import { ROLE_ORDER, ROLES } from '../data/cMenuTokens.ts';
import { PUZZLES } from '../data/puzzleCatalog.ts';
import { PUZZLE_KID, puzzlePicHtml } from './kidVisuals.ts';

const MINI_CSS_W = 248;
const MINI_CSS_H = 200;

export class MinimapController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private modalRoot: HTMLElement;
  private mapData: MapJson;
  private modalOpen = false;
  private activeFloorTab: FloorKey = '1F';
  private miniZoom = 1;
  private modalZoom = 1;
  private panX = 0;
  private panY = 0;
  private panelCollapsed = false;
  private onTeleport?: (floor: FloorKey, scene: string, x: number, y: number) => void;
  private onZoomChange?: (zoom: number) => void;

  constructor(
    canvas: HTMLCanvasElement,
    modalContainer: HTMLElement,
    mapData: MapJson,
    onTeleport?: (floor: FloorKey, scene: string, x: number, y: number) => void,
    onZoomChange?: (zoom: number) => void
  ) {
    this.canvas = canvas;
    this.dpr = typeof window !== 'undefined' ? Math.min(2, Math.max(1.5, window.devicePixelRatio || 1.5)) : 2;
    this.canvas.width = Math.round(MINI_CSS_W * this.dpr);
    this.canvas.height = Math.round(MINI_CSS_H * this.dpr);
    this.canvas.style.width = `${MINI_CSS_W}px`;
    this.canvas.style.height = `${MINI_CSS_H}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Minimap 2D context unavailable');
    this.ctx = ctx;
    this.mapData = mapData;
    this.onTeleport = onTeleport;
    this.onZoomChange = onZoomChange;

    this.modalRoot = document.createElement('div');
    this.modalRoot.className = 'au-backdrop';
    this.modalRoot.id = 'minimap-guide-backdrop';
    modalContainer.appendChild(this.modalRoot);
    this.modalRoot.addEventListener('click', (e) => {
      if (e.target === this.modalRoot) this.toggleGuide(false);
    });
  }

  getMiniZoom(): number {
    return this.miniZoom;
  }

  stepMiniZoom(delta: number, room?: RoomState, myRole?: RoleId) {
    const levels = [1, 1.75, 2.5];
    const curIdx = levels.findIndex((v) => Math.abs(v - this.miniZoom) < 0.05);
    const nextIdx = Math.max(0, Math.min(levels.length - 1, (curIdx === -1 ? 0 : curIdx) + delta));
    this.miniZoom = levels[nextIdx];
    this.onZoomChange?.(this.miniZoom);
    if (room && myRole) this.renderMini(room, myRole);
  }

  isGuideOpen(): boolean {
    return this.modalOpen;
  }

  toggleGuide(force?: boolean, room?: RoomState, myRole?: RoleId): boolean {
    const next = force !== undefined ? force : !this.modalOpen;
    if (next && myRole && myRole !== 'lin') {
      return false;
    }
    this.modalOpen = next;
    this.modalRoot.classList.toggle('open', this.modalOpen);
    if (this.modalOpen && room) {
      const slot = room.slots[myRole || 'lin'];
      if (slot) this.activeFloorTab = slot.floor;
      this.modalZoom = 1;
      this.panX = 0;
      this.panY = 0;
      this.renderGuideModal(room);
    }
    return true;
  }

  private getPuzzleCoord(floorKey: FloorKey, pid: number, focusObj: string, roomId: string): [number, number] | null {
    const fl = this.mapData.floors[floorKey];
    if (!fl) return null;
    const focus = fl.objects.find((o) => o.id === focusObj) || fl.objects.find((o) => o.puzzles?.includes(pid));
    if (focus) {
      return [focus.x + focus.width / 2, focus.y + focus.height / 2];
    }
    const rm = fl.rooms.find((r) => r.id === roomId);
    if (rm) {
      return [rm.rect[0] + rm.rect[2] / 2, rm.rect[1] + rm.rect[3] / 2];
    }
    return null;
  }

  renderMini(room: RoomState, activeRole: RoleId) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Map is exclusive to Navigator (lin)
    if (activeRole !== 'lin') return;

    const slot = room.slots[activeRole];
    if (!slot) return;
    const fl = this.mapData.floors[slot.floor];
    if (!fl) return;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const w = MINI_CSS_W;
    const h = MINI_CSS_H;
    const sx = w / this.mapData.width;
    const sy = h / this.mapData.height;

    ctx.fillStyle = '#0B1017';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    if (this.miniZoom > 1) {
      const cx = slot.x * sx;
      const cy = slot.y * sy;
      ctx.translate(w / 2, h / 2);
      ctx.scale(this.miniZoom, this.miniZoom);
      ctx.translate(-cx, -cy);
    }

    // Draw rooms
    for (const r of fl.rooms) {
      const [rx, ry, rw, rh] = r.rect;
      const isCur = r.id === slot.scene;
      ctx.fillStyle = isCur ? 'rgba(82, 239, 191, 0.16)' : 'rgba(35, 48, 63, 0.72)';
      ctx.strokeStyle = isCur ? '#52EFBF' : '#3C4D5E';
      ctx.lineWidth = (isCur ? 1.5 : 1) / this.miniZoom;
      ctx.fillRect(rx * sx, ry * sy, rw * sx, rh * sy);
      ctx.strokeRect(rx * sx, ry * sy, rw * sx, rh * sy);
      if (r.extraRects) {
        for (const [ex, ey, ew, eh] of r.extraRects) {
          ctx.fillRect(ex * sx, ey * sy, ew * sx, eh * sy);
          ctx.strokeRect(ex * sx, ey * sy, ew * sx, eh * sy);
        }
      }

      ctx.font = `800 ${this.miniZoom > 1.5 ? 7 : 8}px "Noto Sans KR", sans-serif`;
      ctx.fillStyle = isCur ? '#DDF8F0' : '#8FA0AE';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.name.replace(' 전시실', ''), (rx + rw / 2) * sx, (ry + rh / 2) * sy);
    }

    // Draw portals
    for (const pt of fl.portals) {
      const [px, py, pw, ph] = pt.rect;
      ctx.fillStyle = pt.kind === 'stairs' ? '#FFB86B' : '#E6C886';
      ctx.fillRect(px * sx - 1, py * sy - 1, Math.max(4, pw * sx + 2), Math.max(4, ph * sy + 2));
    }

    // Navigator spatial crosshair
    ctx.save();
    ctx.strokeStyle = 'rgba(82, 239, 191, 0.32)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1 / this.miniZoom;
    ctx.beginPath();
    ctx.moveTo(slot.x * sx, 0);
    ctx.lineTo(slot.x * sx, h);
    ctx.moveTo(0, slot.y * sy);
    ctx.lineTo(w, slot.y * sy);
    ctx.stroke();
    ctx.restore();

    // Plot all puzzle locations on this floor (NO green tint on completed quests)
    let nearestObj: { x: number; y: number; dist: number } | null = null;
    for (const p of PUZZLES) {
      if (p.floor !== slot.floor) continue;
      const pt = this.getPuzzleCoord(slot.floor, p.id, p.focusObj, p.room);
      if (!pt) continue;
      const done = room.solvedPids.includes(p.id);
      const ox = pt[0] * sx;
      const oy = pt[1] * sy;

      ctx.fillStyle = done ? '#7B8897' : '#FFD86B';
      ctx.strokeStyle = '#0B0E13';
      ctx.lineWidth = 1 / this.miniZoom;
      ctx.beginPath();
      ctx.arc(ox, oy, done ? 2.6 : 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = `800 ${this.miniZoom > 1.5 ? 6.5 : 7}px ui-monospace, monospace`;
      ctx.fillStyle = done ? '#99A5B4' : '#FFE89E';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(p.code, ox, oy - 3);

      if (!done) {
        const d = Math.hypot(pt[0] - slot.x, pt[1] - slot.y);
        if (!nearestObj || d < nearestObj.dist) {
          nearestObj = { x: ox, y: oy, dist: d };
        }
      }
    }

    if (nearestObj) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 216, 107, 0.65)';
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 1 / this.miniZoom;
      ctx.beginPath();
      ctx.moveTo(slot.x * sx, slot.y * sy);
      ctx.lineTo(nearestObj.x, nearestObj.y);
      ctx.stroke();
      ctx.restore();
    }

    // All 4 players on this floor
    for (const rId of ROLE_ORDER) {
      const s = room.slots[rId];
      if (!s || s.floor !== slot.floor) continue;
      const meta = ROLES[rId];
      ctx.fillStyle = meta.color;
      ctx.strokeStyle = '#0B0E13';
      ctx.lineWidth = 1.4 / this.miniZoom;
      ctx.beginPath();
      ctx.arc(s.x * sx, s.y * sy, rId === activeRole ? 4.4 : 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();

    ctx.font = '800 9px ui-monospace, monospace';
    ctx.fillStyle = '#52EFBF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`N ${this.miniZoom > 1 ? `(${this.miniZoom}x)` : ''}`, 6, 5);
  }

  renderGuideModal(room: RoomState) {
    const fl = this.mapData.floors[this.activeFloorTab];
    const floorPuzzles = PUZZLES.filter((p) => p.floor === this.activeFloorTab);

    const puzzlePinsHtml = floorPuzzles
      .map((p) => {
        const coord = this.getPuzzleCoord(this.activeFloorTab, p.id, p.focusObj, p.room);
        if (!coord) return '';
        const done = room.solvedPids.includes(p.id);
        const k = PUZZLE_KID[p.id];
        const leftPct = ((coord[0] / this.mapData.width) * 100).toFixed(2);
        const topPct = ((coord[1] / this.mapData.height) * 100).toFixed(2);
        return `<div class="guide-map-pin ${done ? 'solved' : 'unsolved'}" style="left:${leftPct}%;top:${topPct}%" title="${p.code} ${k ? k.title : p.title}">
          <span class="guide-pin-code">${p.code}</span>
          <span class="guide-pin-title">${k ? k.title : p.title}</span>
        </div>`;
      })
      .join('');

    const playerPinsHtml = ROLE_ORDER.map((rId) => {
      const s = room.slots[rId];
      if (!s || s.floor !== this.activeFloorTab) return '';
      const meta = ROLES[rId];
      const leftPct = ((s.x / this.mapData.width) * 100).toFixed(2);
      const topPct = ((s.y / this.mapData.height) * 100).toFixed(2);
      return `<div class="guide-player-pin" style="left:${leftPct}%;top:${topPct}%;--pc:${meta.color}" title="${meta.name}">
        <span class="guide-player-dot"></span>
        <span class="guide-player-name">${meta.name}</span>
      </div>`;
    }).join('');

    this.modalRoot.innerHTML = `
      <div class="au-modal guide-modal">
        <div class="au-modal-head">
          <div style="display:flex;align-items:center;gap:10px">
            <img class="hud-btn-ico" src="/assets/ui-icons/map.svg" alt="" />
            <strong style="font-size:16px">박물관 지도 (네비게이터 전용 · M)</strong>
          </div>
          <div class="au-view-tabs">
            ${(['1F', '2F', 'B1'] as FloorKey[])
              .map(
                (fk) =>
                  `<button class="au-vtab ${this.activeFloorTab === fk ? 'active' : ''}" data-gfloor="${fk}">${this.mapData.floors[fk].label}</button>`
              )
              .join('')}
          </div>
          <button class="au-close-x" id="mg-close">✕</button>
        </div>

        <div class="guide-map-viewport" id="mg-viewport">
          <div class="guide-map-canvas-wrap" id="mg-canvas-wrap" style="transform:translate(${this.panX}px, ${this.panY}px) scale(${this.modalZoom})">
            <img class="guide-map-img" src="/assets/guides/STRANGER-${this.activeFloorTab}.png" alt="${fl.label} 지도" draggable="false" />
            <div class="guide-pins-layer">
              ${puzzlePinsHtml}
              ${playerPinsHtml}
            </div>
          </div>

          <div class="guide-zoom-controls">
            <button class="s-btn" id="mg-zoom-out" title="축소">−</button>
            <span class="guide-zoom-readout" id="mg-zoom-val">${Math.round(this.modalZoom * 100)}%</span>
            <button class="s-btn" id="mg-zoom-in" title="확대">+</button>
            <button class="s-btn" id="mg-zoom-reset" title="원래 크기">초기화</button>
          </div>

          <div class="guide-map-hint">드래그로 이동 · 마우스 휠로 확대/축소</div>

          <div class="guide-floating-panel ${this.panelCollapsed ? 'collapsed' : ''}" id="mg-floating-panel">
            <div class="guide-panel-bar">
              <span>${this.activeFloorTab} 퍼즐 위치 (${floorPuzzles.length})</span>
              <button class="hud-chk-toggle" id="mg-panel-toggle">${this.panelCollapsed ? '펼치기' : '접기'}</button>
            </div>
            <div class="guide-panel-body">
              ${
                room.soloSwitchEnabled
                  ? `<div class="guide-room-btns">
                      ${Object.entries(fl.scenes)
                        .map(([sid, sc]) => `<button class="s-btn guide-go-btn" data-go-scene="${sid}">${sc.label}</button>`)
                        .join('')}
                    </div>`
                  : ''
              }
              <div class="guide-puz-list">
                ${floorPuzzles
                  .map((p) => {
                    const done = room.solvedPids.includes(p.id);
                    const k = PUZZLE_KID[p.id];
                    const helpers = p.helperRoles.map((hr) => ROLES[hr].name).join('+');
                    return `<button type="button" class="guide-puz-row ${done ? 'done' : ''}" data-focus-pid="${p.id}" title="${p.code} ${p.title}">
                      <span class="kid-guide-puz">${puzzlePicHtml(p.id, 'kid-obj-xs')}<span>${p.code} · ${k ? k.title : p.title}</span></span>
                      <span class="guide-badge ${done ? 'done' : ''}">${done ? '완료' : `${ROLES[p.mainRole].name} · ${helpers}`}</span>
                    </button>`;
                  })
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.modalRoot.querySelector('#mg-close')?.addEventListener('click', () => this.toggleGuide(false));
    this.modalRoot.querySelectorAll<HTMLElement>('[data-gfloor]').forEach((btn) => {
      btn.onclick = () => {
        this.activeFloorTab = btn.dataset.gfloor as FloorKey;
        this.modalZoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.renderGuideModal(room);
      };
    });

    const viewport = this.modalRoot.querySelector<HTMLElement>('#mg-viewport');
    const canvasWrap = this.modalRoot.querySelector<HTMLElement>('#mg-canvas-wrap');
    const zoomValEl = this.modalRoot.querySelector<HTMLElement>('#mg-zoom-val');

    const applyTransform = () => {
      if (canvasWrap) {
        canvasWrap.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.modalZoom})`;
      }
      if (zoomValEl) {
        zoomValEl.textContent = `${Math.round(this.modalZoom * 100)}%`;
      }
    };

    const zoomBy = (factor: number, clientX?: number, clientY?: number) => {
      const nextZoom = Math.max(0.7, Math.min(4.5, Number((this.modalZoom * factor).toFixed(2))));
      if (nextZoom === this.modalZoom || !viewport) return;
      const rect = viewport.getBoundingClientRect();
      const cx = (clientX ?? rect.left + rect.width / 2) - (rect.left + rect.width / 2);
      const cy = (clientY ?? rect.top + rect.height / 2) - (rect.top + rect.height / 2);
      const ratio = nextZoom / this.modalZoom;
      this.panX = cx - (cx - this.panX) * ratio;
      this.panY = cy - (cy - this.panY) * ratio;
      this.modalZoom = nextZoom;
      applyTransform();
    };

    if (viewport) {
      viewport.addEventListener(
        'wheel',
        (e) => {
          const t = e.target as HTMLElement | null;
          if (t?.closest('.guide-floating-panel')) return;
          e.preventDefault();
          const factor = e.deltaY < 0 ? 1.15 : 0.87;
          zoomBy(factor, e.clientX, e.clientY);
        },
        { passive: false }
      );

      let dragging = false;
      let startX = 0;
      let startY = 0;
      let startPanX = 0;
      let startPanY = 0;

      viewport.addEventListener('pointerdown', (e) => {
        const t = e.target as HTMLElement | null;
        if (t?.closest('.guide-floating-panel, .guide-zoom-controls')) return;
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startPanX = this.panX;
        startPanY = this.panY;
        viewport.classList.add('dragging');
        viewport.setPointerCapture(e.pointerId);
      });
      viewport.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        this.panX = startPanX + (e.clientX - startX);
        this.panY = startPanY + (e.clientY - startY);
        applyTransform();
      });
      const stopDrag = () => {
        dragging = false;
        viewport.classList.remove('dragging');
      };
      viewport.addEventListener('pointerup', stopDrag);
      viewport.addEventListener('pointercancel', stopDrag);
    }

    this.modalRoot.querySelector('#mg-zoom-in')?.addEventListener('click', () => zoomBy(1.25));
    this.modalRoot.querySelector('#mg-zoom-out')?.addEventListener('click', () => zoomBy(0.8));
    this.modalRoot.querySelector('#mg-zoom-reset')?.addEventListener('click', () => {
      this.modalZoom = 1;
      this.panX = 0;
      this.panY = 0;
      applyTransform();
    });

    this.modalRoot.querySelector('#mg-panel-toggle')?.addEventListener('click', () => {
      this.panelCollapsed = !this.panelCollapsed;
      this.modalRoot.querySelector('#mg-floating-panel')?.classList.toggle('collapsed', this.panelCollapsed);
      const btn = this.modalRoot.querySelector('#mg-panel-toggle');
      if (btn) btn.textContent = this.panelCollapsed ? '펼치기' : '접기';
    });

    this.modalRoot.querySelectorAll<HTMLElement>('[data-focus-pid]').forEach((btn) => {
      btn.onclick = () => {
        const pid = Number(btn.dataset.focusPid);
        const pz = PUZZLES.find((x) => x.id === pid);
        if (!pz || !canvasWrap) return;
        const coord = this.getPuzzleCoord(this.activeFloorTab, pz.id, pz.focusObj, pz.room);
        if (!coord) return;
        this.modalZoom = Math.max(this.modalZoom, 2.0);
        const w = canvasWrap.clientWidth || 900;
        const h = canvasWrap.clientHeight || 560;
        this.panX = (0.5 - coord[0] / this.mapData.width) * w * this.modalZoom;
        this.panY = (0.5 - coord[1] / this.mapData.height) * h * this.modalZoom;
        applyTransform();
      };
    });

    this.modalRoot.querySelectorAll<HTMLElement>('[data-go-scene]').forEach((btn) => {
      btn.onclick = () => {
        const sid = btn.dataset.goScene!;
        const sc = fl.scenes[sid];
        const pt = fl.portals.find((p) => p.targetFloor === this.activeFloorTab && p.targetScene === sid);
        const obj = fl.objects.find((o) => o.room === sid && o.interact);
        const dest: [number, number] = pt?.arrival || obj?.interact || fl.spawn;
        if (sc && this.onTeleport) {
          this.onTeleport(this.activeFloorTab, sid, dest[0], dest[1]);
          this.toggleGuide(false);
        }
      };
    });
  }
}
