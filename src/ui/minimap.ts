import type { FloorKey, MapJson, RoomState } from '../types/stranger.ts';
import { ROLE_ORDER, ROLES } from '../data/cMenuTokens.ts';
import { PUZZLES } from '../data/puzzleCatalog.ts';
import { PUZZLE_KID, puzzlePicHtml } from './kidVisuals.ts';

export class MinimapController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private modalRoot: HTMLElement;
  private mapData: MapJson;
  private modalOpen = false;
  private activeFloorTab: FloorKey = '1F';
  private onTeleport?: (floor: FloorKey, scene: string, x: number, y: number) => void;

  constructor(
    canvas: HTMLCanvasElement,
    modalContainer: HTMLElement,
    mapData: MapJson,
    onTeleport?: (floor: FloorKey, scene: string, x: number, y: number) => void
  ) {
    this.canvas = canvas;
    this.canvas.width = 216;
    this.canvas.height = 176;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Minimap 2D context unavailable');
    this.ctx = ctx;
    this.mapData = mapData;
    this.onTeleport = onTeleport;

    this.modalRoot = document.createElement('div');
    this.modalRoot.className = 'au-backdrop';
    this.modalRoot.id = 'minimap-guide-backdrop';
    modalContainer.appendChild(this.modalRoot);
    this.modalRoot.addEventListener('click', (e) => {
      if (e.target === this.modalRoot) this.toggleGuide(false);
    });
  }

  isGuideOpen(): boolean {
    return this.modalOpen;
  }

  toggleGuide(force?: boolean, room?: RoomState, myRole?: string) {
    const next = force !== undefined ? force : !this.modalOpen;
    this.modalOpen = next;
    this.modalRoot.classList.toggle('open', this.modalOpen);
    if (this.modalOpen && room) {
      const slot = room.slots[(myRole as keyof typeof room.slots) || 'doyun'];
      if (slot) this.activeFloorTab = slot.floor;
      this.renderGuideModal(room);
    }
  }

  renderMini(room: RoomState, activeRole: keyof typeof room.slots) {
    const slot = room.slots[activeRole];
    if (!slot) return;
    const fl = this.mapData.floors[slot.floor];
    if (!fl) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const sx = w / this.mapData.width;
    const sy = h / this.mapData.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B1017';
    ctx.fillRect(0, 0, w, h);

    // Draw rooms
    for (const r of fl.rooms) {
      const [rx, ry, rw, rh] = r.rect;
      const isCur = r.id === slot.scene;
      ctx.fillStyle = isCur ? 'rgba(82, 239, 191, 0.18)' : 'rgba(35, 48, 63, 0.72)';
      ctx.strokeStyle = isCur ? '#52EFBF' : '#3C4D5E';
      ctx.lineWidth = isCur ? 1.6 : 1;
      ctx.fillRect(rx * sx, ry * sy, rw * sx, rh * sy);
      ctx.strokeRect(rx * sx, ry * sy, rw * sx, rh * sy);

      // Room short label
      ctx.font = 'bold 8px "Noto Sans KR", sans-serif';
      ctx.fillStyle = isCur ? '#89EFD0' : '#8FA0AE';
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

    // For Lin (Navigator), draw compass rose + bearing crosshair + unsolved puzzle waypoints on minimap!
    if (activeRole === 'lin') {
      ctx.save();
      ctx.strokeStyle = 'rgba(82, 239, 191, 0.35)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(slot.x * sx, 0);
      ctx.lineTo(slot.x * sx, h);
      ctx.moveTo(0, slot.y * sy);
      ctx.lineTo(w, slot.y * sy);
      ctx.stroke();

      let nearestObj: { x: number; y: number; dist: number; code: string } | null = null;
      for (const p of PUZZLES) {
        if (p.floor !== slot.floor || room.solvedPids.includes(p.id)) continue;
        const obj = fl.objects.find((o) => o.id === p.focusObj);
        if (!obj) continue;
        const ox = (obj.x + obj.width / 2) * sx;
        const oy = (obj.y + obj.height / 2) * sy;
        ctx.fillStyle = '#FFD86B';
        ctx.beginPath();
        ctx.arc(ox, oy, 3.2, 0, Math.PI * 2);
        ctx.fill();
        const d = Math.hypot(obj.x - slot.x, obj.y - slot.y);
        if (!nearestObj || d < nearestObj.dist) {
          nearestObj = { x: ox, y: oy, dist: d, code: p.code };
        }
      }
      if (nearestObj) {
        ctx.strokeStyle = 'rgba(255, 216, 107, 0.65)';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(slot.x * sx, slot.y * sy);
        ctx.lineTo(nearestObj.x, nearestObj.y);
        ctx.stroke();
      }
      ctx.restore();
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#52EFBF';
      ctx.textAlign = 'left';
      ctx.fillText('N ↑ 🧭', 6, 11);
    } else {
      // Solved puzzle check pins on this floor
      for (const p of PUZZLES) {
        if (p.floor !== slot.floor || !room.solvedPids.includes(p.id)) continue;
        const obj = fl.objects.find((o) => o.id === p.focusObj);
        if (!obj) continue;
        ctx.fillStyle = '#27BA74';
        ctx.beginPath();
        ctx.arc((obj.x + obj.width / 2) * sx, (obj.y + obj.height / 2) * sy, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // All 4 players on this floor
    for (const rId of ROLE_ORDER) {
      const s = room.slots[rId];
      if (!s || s.floor !== slot.floor) continue;
      const meta = ROLES[rId];
      ctx.fillStyle = meta.color;
      ctx.strokeStyle = '#0B0E13';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(s.x * sx, s.y * sy, rId === activeRole ? 4.5 : 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  renderGuideModal(room: RoomState) {
    const fl = this.mapData.floors[this.activeFloorTab];
    const floorPuzzles = PUZZLES.filter((p) => p.floor === this.activeFloorTab);

    this.modalRoot.innerHTML = `
      <div class="au-modal guide-modal">
        <div class="au-modal-head">
          <div style="display:flex;align-items:center;gap:10px">
            <span class="au-rivet"></span>
            <strong style="font-size:16px">🗺 박물관 지도 (M)</strong>
          </div>
          <button class="au-close-x" id="mg-close">✕</button>
        </div>
        <div class="au-modal-sub">
          <div class="au-view-tabs">
            ${(['1F', '2F', 'B1'] as FloorKey[])
              .map(
                (fk) =>
                  `<button class="au-vtab ${this.activeFloorTab === fk ? 'active' : ''}" data-gfloor="${fk}">${this.mapData.floors[fk].label}</button>`
              )
              .join('')}
          </div>
          <span style="font-size:12px;color:#9BB0BE">🟨 바닥 표시 위에서 [E] = 🚪 이동</span>
        </div>
        <div class="au-body guide-grid">
          <div class="guide-img-box">
            <img src="/assets/guides/STRANGER-${this.activeFloorTab}.png" alt="${fl.label} 구조" />
          </div>
          <div class="guide-list-col">
            <div class="guide-sec-title">📍 ${fl.label} ${room.soloSwitchEnabled ? '· 눌러서 바로 가기' : ''}</div>
            ${
              room.soloSwitchEnabled
                ? `<div class="guide-room-btns">
                    ${Object.values(fl.scenes)
                      .map((sc) => `<button class="s-btn" data-go-scene="${sc.id}">📍 ${sc.label}</button>`)
                      .join('')}
                  </div>`
                : '<p style="margin:0;font-size:12px;color:#9BB0BE">🚪 문과 계단에서 [E] 로 이동해요</p>'
            }
            <div class="guide-sec-title" style="margin-top:12px">🧩 ${this.activeFloorTab} 퍼즐</div>
            <div class="guide-puz-list">
              ${floorPuzzles
                .map((p) => {
                  const done = room.solvedPids.includes(p.id);
                  const k = PUZZLE_KID[p.id];
                  const helpers = p.helperRoles.map((hr) => ROLES[hr].name).join('+');
                  return `<div class="guide-puz-row ${done ? 'done' : ''}" title="${p.code} ${p.title}">
                    <span class="kid-guide-puz">${puzzlePicHtml(p.id, 'kid-obj-xs')}${k ? `${k.emoji} ${k.title}` : p.title}</span>
                    <span class="guide-badge">${done ? '✅' : `★ ${ROLES[p.mainRole].name} · 🤝 ${helpers}`}</span>
                  </div>`;
                })
                .join('')}
            </div>
            <div class="guide-sec-title" style="margin-top:12px">🚪 층 연결 지도</div>
            <img class="guide-portal-thumb" src="/assets/guides/STRANGER-Portal-Guide.png" alt="포탈 연결 안내" />
          </div>
        </div>
      </div>
    `;

    this.modalRoot.querySelector('#mg-close')?.addEventListener('click', () => this.toggleGuide(false));
    this.modalRoot.querySelectorAll<HTMLElement>('[data-gfloor]').forEach((btn) => {
      btn.onclick = () => {
        this.activeFloorTab = btn.dataset.gfloor as FloorKey;
        this.renderGuideModal(room);
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
