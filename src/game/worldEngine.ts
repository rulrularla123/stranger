import type {
  AnimationsMeta,
  CharacterSlot,
  Direction,
  FloorKey,
  MapFloor,
  MapJson,
  MapObject,
  MapPortal,
  RadioPacket,
  RoleId,
  RoomState,
} from '../types/stranger.ts';
import { ROLE_ORDER, ROLES, TOKENS_BY_ID } from '../data/cMenuTokens.ts';
import { PUZZLES_BY_ID, getPortalLockReason } from '../data/puzzleCatalog.ts';
import { soundEngine } from '../audio/soundEngine.ts';
import type { SessionClient } from '../net/sessionClient.ts';

export const VIEWPORT_W = 384;
export const VIEWPORT_H = 240;
export const SCALE_X = 3; // 1152 x 720 main canvas

export interface WorldCallbacks {
  onInteractObject: (obj: MapObject) => void;
  onStatusToast: (msg: string, tone?: 'mint' | 'amber' | 'info') => void;
  onSceneEntered: (floor: FloorKey, scene: string, label: string, firstVisit: boolean) => void;
  onPromptChange: (text: string | null) => void;
  onCoronationTriggered: () => void;
}

const MOVE_SPEED = 135; // world px / sec

/**
 * Rooms the player may not walk out of once inside (by room id, per floor).
 * The boundary is the room's `outline` polygon in map.json.
 * Entering through a doorway is still allowed; only leaving the outline is blocked.
 */
const CONFINED_ROOMS: Partial<Record<FloorKey, string[]>> = {
  '2F': ['atrium'], // 반원 동상 홀
};

function pointInPolygon(px: number, py: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export class WorldEngine {
  private mapData: MapJson;
  private anims: AnimationsMeta;
  private session: SessionClient;
  private callbacks: WorldCallbacks;

  private displayCanvas: HTMLCanvasElement;
  private displayCtx: CanvasRenderingContext2D;
  private worldCanvas: HTMLCanvasElement;
  private worldCtx: CanvasRenderingContext2D;
  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;

  private images = new Map<string, HTMLImageElement>();
  private heldKeys = new Set<string>();
  private camera: [number, number] = [0, 0];
  private cameraSnap = true;
  private transitioning = false;
  private fadeAlpha = 0;
  private visitedScenes = new Set<string>(['1F:hall']);
  private lastRoomKey = '';
  private lastPrompt: string | null = null;
  private animClock = 0;
  private lastTick = 0;
  private rafId: number | null = null;
  private walkTimers: Record<RoleId, number> = { doyun: 0, maria: 0, lin: 0, aisha: 0 };
  private speechBubbles: Partial<Record<RoleId, { text: string; color: string; until: number }>> = {};
  private coronationHoldTimer = 0;
  private coronationDone = false;

  // Exposed diagnostic toggles
  public showWalkabilityOverlay = false;

  constructor(
    canvas: HTMLCanvasElement,
    mapData: MapJson,
    anims: AnimationsMeta,
    session: SessionClient,
    callbacks: WorldCallbacks
  ) {
    this.displayCanvas = canvas;
    this.displayCanvas.width = VIEWPORT_W * SCALE_X;
    this.displayCanvas.height = VIEWPORT_H * SCALE_X;
    const dctx = canvas.getContext('2d');
    if (!dctx) throw new Error('2D display context unavailable');
    this.displayCtx = dctx;

    this.worldCanvas = document.createElement('canvas');
    this.worldCanvas.width = VIEWPORT_W;
    this.worldCanvas.height = VIEWPORT_H;
    const wctx = this.worldCanvas.getContext('2d');
    if (!wctx) throw new Error('2D offscreen context unavailable');
    this.worldCtx = wctx;

    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = VIEWPORT_W;
    this.lightCanvas.height = VIEWPORT_H;
    const lctx = this.lightCanvas.getContext('2d');
    if (!lctx) throw new Error('2D lighting context unavailable');
    this.lightCtx = lctx;

    this.mapData = mapData;
    this.anims = anims;
    this.session = session;
    this.callbacks = callbacks;

    this.preloadAssets();
  }

  private preloadAssets() {
    this.loadImage(this.anims.sheet);
    for (const fl of Object.values(this.mapData.floors)) {
      this.loadImage(fl.background);
      this.loadImage(fl.walkability);
      for (const o of fl.objects) this.loadImage(o.sprite);
    }
  }

  private loadImage(path: string): HTMLImageElement {
    const clean = path.startsWith('/') ? path : '/' + path;
    let img = this.images.get(clean);
    if (!img) {
      img = new Image();
      img.src = clean;
      this.images.set(clean, img);
    }
    return img;
  }

  start() {
    if (this.rafId !== null) return;
    this.lastTick = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - this.lastTick) / 1000));
      this.lastTick = now;
      this.update(dt);
      this.render();
      this.rafId = window.requestAnimationFrame(loop);
    };
    this.rafId = window.requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  setHeldKey(key: string, down: boolean) {
    if (down) this.heldKeys.add(key);
    else this.heldKeys.delete(key);
  }

  clearHeldKeys() {
    this.heldKeys.clear();
  }

  onRadioReceived(pkt: RadioPacket) {
    const label = pkt.tokenIds
      .map((id) => {
        const t = TOKENS_BY_ID[id];
        return t ? `${t.glyph} ${t.label}` : id;
      })
      .join(' + ');
    this.speechBubbles[pkt.roleId] = {
      text: label,
      color: ROLES[pkt.roleId].color,
      until: Date.now() + 6500,
    };
  }

  snapCamera() {
    this.cameraSnap = true;
  }

  /**
   * Movement check for a footprint centred on (x, y).
   * When fromX/fromY are given and the character currently stands inside a
   * confined room (see CONFINED_ROOMS), a step that would take the footprint
   * outside that room's outline is rejected.
   */
  canMove(floorKey: FloorKey, x: number, y: number, fromX?: number, fromY?: number): boolean {
    const fl = this.mapData.floors[floorKey];
    if (!fl) return false;
    const [fw, fh] = this.mapData.player.footprint;
    const left = Math.floor(x - fw / 2);
    const right = Math.ceil(x + fw / 2);
    const top = Math.floor(y - fh / 2);
    const bottom = Math.ceil(y + fh / 2);
    for (let row = top; row <= bottom; row++) {
      const spans = fl.walkableRows[row];
      if (!spans || !spans.some(([start, end]) => left >= start && right < end)) return false;
    }
    for (const obj of fl.objects) {
      if (!obj.collision) continue;
      const [u, v, w, h] = obj.collision;
      if (left < u + w && right >= u && top < v + h && bottom >= v) return false;
    }
    if (fromX !== undefined && fromY !== undefined) {
      const outline = this.confinedOutline(floorKey, fromX, fromY);
      if (outline) {
        const corners: [number, number][] = [
          [left, top],
          [right, top],
          [left, bottom],
          [right, bottom],
        ];
        if (!corners.every(([cx, cy]) => pointInPolygon(cx, cy, outline))) return false;
      }
    }
    return true;
  }

  /** Outline of the confined room the character is currently standing in, if any. */
  private confinedOutline(floorKey: FloorKey, x: number, y: number): [number, number][] | null {
    const fl = this.mapData.floors[floorKey];
    const ids = CONFINED_ROOMS[floorKey];
    if (!fl || !ids) return null;
    for (const room of fl.rooms) {
      if (!ids.includes(room.id) || !room.outline) continue;
      if (pointInPolygon(x, y, room.outline)) return room.outline;
    }
    return null;
  }

  private insideRect(x: number, y: number, [rx, ry, rw, rh]: [number, number, number, number], pad = 0): boolean {
    return x >= rx - pad && y >= ry - pad && x < rx + rw + pad && y < ry + rh + pad;
  }

  getActiveSlot(): CharacterSlot | null {
    const room = this.session.getRoom();
    if (!room) return null;
    return room.slots[this.session.getMyRole()];
  }

  getNearbyPortal(slot: CharacterSlot): MapPortal | undefined {
    const fl = this.mapData.floors[slot.floor];
    if (!fl) return undefined;
    // Check exact rect first, then slight 10px edge tolerance
    return (
      fl.portals.find(
        (p) => (!p.sourceScene || p.sourceScene === slot.scene) && this.insideRect(slot.x, slot.y, p.rect, 0)
      ) ||
      fl.portals.find(
        (p) => (!p.sourceScene || p.sourceScene === slot.scene) && this.insideRect(slot.x, slot.y, p.rect, 10)
      )
    );
  }

  getClosestInteractable(slot: CharacterSlot): MapObject | undefined {
    const fl = this.mapData.floors[slot.floor];
    if (!fl) return undefined;
    let bestDist = this.mapData.player.inspectRadius;
    let bestObj: MapObject | undefined;
    for (const obj of fl.objects) {
      if (!obj.interact || obj.room !== slot.scene) continue;
      const d = Math.hypot(slot.x - obj.interact[0], slot.y - obj.interact[1]);
      if (d < bestDist) {
        bestDist = d;
        bestObj = obj;
      }
    }
    return bestObj;
  }

  async interact(uiBlocked: boolean) {
    if (uiBlocked || this.transitioning) return;
    const slot = this.getActiveSlot();
    if (!slot) return;

    const portal = this.getNearbyPortal(slot);
    if (portal) {
      await this.transitionViaPortal(slot, portal);
      return;
    }

    const obj = this.getClosestInteractable(slot);
    if (obj) {
      soundEngine.playClick();
      this.callbacks.onInteractObject(obj);
      return;
    }

    this.callbacks.onStatusToast('가까운 문·계단 또는 퍼즐 오브젝트에 조금 더 다가가세요.', 'info');
  }

  async transitionViaPortal(slot: CharacterSlot, portal: MapPortal) {
    if (this.transitioning) return;
    const room = this.session.getRoom();
    const lockMsg = room ? getPortalLockReason(room, portal) : null;
    if (lockMsg) {
      soundEngine.playError();
      this.callbacks.onStatusToast(lockMsg, 'amber');
      return;
    }
    this.transitioning = true;
    this.heldKeys.clear();
    soundEngine.playPortalTransition();

    await this.animateFade(0, 1, 130);
    const nextDir: Direction =
      portal.kind === 'stairs' ? (portal.targetFloor === '2F' ? 'up' : 'down') : slot.dir;
    this.session.moveSlot(
      slot.roleId,
      {
        floor: portal.targetFloor,
        scene: portal.targetScene,
        x: portal.arrival[0],
        y: portal.arrival[1],
        dir: nextDir,
        moving: false,
      },
      true
    );
    this.cameraSnap = true;
    this.checkSceneEntry(portal.targetFloor, portal.targetScene);
    await this.animateFade(1, 0, 160);
    this.transitioning = false;
  }

  teleportActiveRole(floor: FloorKey, scene: string, x: number, y: number) {
    const slot = this.getActiveSlot();
    if (!slot) return;
    this.session.moveSlot(slot.roleId, { floor, scene, x, y, dir: 'down', moving: false }, true);
    this.cameraSnap = true;
    this.checkSceneEntry(floor, scene);
  }

  summonAllTeammatesToActive() {
    const room = this.session.getRoom();
    const active = this.getActiveSlot();
    if (!room || !active) return;
    const offsets: [number, number][] = [
      [-18, 6],
      [18, 6],
      [-12, 16],
      [12, 16],
    ];
    let i = 0;
    for (const r of ROLE_ORDER) {
      if (r === active.roleId) continue;
      const [ox, oy] = offsets[i++ % offsets.length];
      const tx = this.canMove(active.floor, active.x + ox, active.y + oy, active.x, active.y) ? active.x + ox : active.x;
      const ty = this.canMove(active.floor, tx, active.y + oy, active.x, active.y) ? active.y + oy : active.y;
      this.session.moveSlot(
        r,
        { floor: active.floor, scene: active.scene, x: tx, y: ty, dir: 'down', moving: false },
        true
      );
    }
    soundEngine.playClick();
    this.callbacks.onStatusToast('동료들을 현재 위치로 집합시켰습니다.', 'mint');
  }

  private checkSceneEntry(floor: FloorKey, scene: string) {
    const key = `${floor}:${scene}`;
    if (key === this.lastRoomKey) return;
    this.lastRoomKey = key;
    const fl = this.mapData.floors[floor];
    const label = fl?.scenes[scene]?.label || scene;
    const first = !this.visitedScenes.has(key);
    this.visitedScenes.add(key);
    this.callbacks.onSceneEntered(floor, scene, label, first);
  }

  private animateFade(from: number, to: number, ms: number): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        this.fadeAlpha = from + (to - from) * t;
        if (t < 1) window.requestAnimationFrame(step);
        else resolve();
      };
      window.requestAnimationFrame(step);
    });
  }

  private update(dt: number) {
    this.animClock += dt;
    const room = this.session.getRoom();
    if (!room || room.phase === 'lobby') return;

    const slot = room.slots[this.session.getMyRole()];
    if (!slot) return;
    this.checkSceneEntry(slot.floor, slot.scene);

    // Handle active player movement when not transitioning
    if (!this.transitioning) {
      let dx = 0;
      let dy = 0;
      if (this.heldKeys.has('ArrowLeft') || this.heldKeys.has('a')) dx -= 1;
      if (this.heldKeys.has('ArrowRight') || this.heldKeys.has('d')) dx += 1;
      if (this.heldKeys.has('ArrowUp') || this.heldKeys.has('w')) dy -= 1;
      if (this.heldKeys.has('ArrowDown') || this.heldKeys.has('s')) dy += 1;

      const mag = Math.hypot(dx, dy);
      if (mag > 0) {
        const vx = (dx / mag) * MOVE_SPEED * dt;
        const vy = (dy / mag) * MOVE_SPEED * dt;
        let nx = slot.x;
        let ny = slot.y;
        const fromX = slot.x;
        const fromY = slot.y;
        if (this.canMove(slot.floor, nx + vx, ny, fromX, fromY)) nx += vx;
        if (this.canMove(slot.floor, nx, ny + vy, fromX, fromY)) ny += vy;

        let nextDir: Direction = slot.dir;
        if (Math.abs(dx) >= Math.abs(dy)) nextDir = dx < 0 ? 'left' : 'right';
        else nextDir = dy < 0 ? 'up' : 'down';

        const moved = Math.hypot(nx - slot.x, ny - slot.y) > 0.05;
        this.session.moveSlot(slot.roleId, {
          floor: slot.floor,
          scene: slot.scene,
          x: nx,
          y: ny,
          dir: nextDir,
          moving: moved,
        });
        if (moved) soundEngine.playStep();
      } else if (slot.moving) {
        this.session.moveSlot(
          slot.roleId,
          { floor: slot.floor, scene: slot.scene, x: slot.x, y: slot.y, dir: slot.dir, moving: false },
          true
        );
      }
    }

    // Advance walk clocks for all moving characters (local + remote + bots)
    for (const r of ROLE_ORDER) {
      const s = room.slots[r];
      if (s.moving) this.walkTimers[r] += dt;
      else this.walkTimers[r] = 0;
    }

    // Update contextual prompt
    const portal = this.getNearbyPortal(slot);
    const nearObj = this.getClosestInteractable(slot);
    let nextPrompt: string | null = null;
    if (portal) {
      const lockMsg = getPortalLockReason(room, portal);
      nextPrompt = lockMsg ? `[🔒] ${portal.name} (잠김)` : `[E] → ${portal.name}`;
    } else if (nearObj) {
      const pid = nearObj.puzzles?.[0];
      const tag = pid ? `P${String(pid).padStart(2, '0')} ` : '';
      nextPrompt = `[E] ${tag}${nearObj.name}`;
    }
    if (nextPrompt !== this.lastPrompt) {
      this.lastPrompt = nextPrompt;
      this.callbacks.onPromptChange(nextPrompt);
    }

    // Check P16 Part 2 live field 4/4 medallion pads in 2F atrium (NO MODAL!)
    this.checkAtriumGatherPads(room, dt);

    // Update camera
    const fl = this.mapData.floors[slot.floor];
    const scene = fl?.scenes[slot.scene];
    if (scene) {
      const targetCam = this.computeTargetCamera(slot.x, slot.y, scene.view);
      if (this.cameraSnap) {
        this.camera = targetCam;
        this.cameraSnap = false;
      } else {
        const lerp = 1 - Math.exp(-12 * dt);
        this.camera = [
          this.camera[0] + (targetCam[0] - this.camera[0]) * lerp,
          this.camera[1] + (targetCam[1] - this.camera[1]) * lerp,
        ];
      }
    }
  }

  private checkAtriumGatherPads(room: RoomState, dt: number) {
    const p16 = (room.puzzleStates[16] || {}) as {
      beamReachedAtrium?: boolean;
      hereSent?: boolean;
      pads?: boolean[];
    };
    const padCoords: [number, number][] = [
      [896, 623],
      [1004, 623],
      [896, 725],
      [1004, 725],
    ];
    const nextPads = ROLE_ORDER.map((r, idx) => {
      const s = room.slots[r];
      if (!s || s.floor !== '2F' || s.scene !== 'atrium') return false;
      const [px, py] = padCoords[idx];
      return Math.hypot(s.x - px, s.y - py) <= 22;
    });

    const curPads = Array.isArray(p16.pads) ? p16.pads : [false, false, false, false];
    if (nextPads.some((v, idx) => v !== curPads[idx])) {
      this.session.patchPuzzle(16, { pads: nextPads });
    }

    const allPriorSolved = Array.from({ length: 15 }, (_, i) => i + 1).every((id) => room.solvedPids.includes(id));

    if (
      !this.coronationDone &&
      !room.solvedPids.includes(16) &&
      allPriorSolved &&
      p16.beamReachedAtrium &&
      p16.hereSent &&
      nextPads.every(Boolean)
    ) {
      this.coronationHoldTimer += dt;
      if (this.coronationHoldTimer >= 0.45) {
        this.coronationDone = true;
        this.session.solvePuzzle(
          16,
          { pads: [true, true, true, true], beamReachedAtrium: true, hereSent: true },
          '16/16 대관식 엔딩 달성! 4인의 빛이 반원 홀 여신상에 모였습니다!'
        );
        soundEngine.playCoronation();
        this.callbacks.onCoronationTriggered();
      }
    } else {
      this.coronationHoldTimer = 0;
    }
  }

  private computeTargetCamera(px: number, py: number, view: [number, number, number, number]): [number, number] {
    function axis(point: number, start: number, span: number, size: number) {
      if (span <= size) return start + (span - size) / 2;
      return Math.max(start, Math.min(start + span - size, point - size / 2));
    }
    return [
      axis(px, view[0], view[2], VIEWPORT_W),
      axis(py - 18, view[1], view[3], VIEWPORT_H),
    ];
  }

  private render() {
    const room = this.session.getRoom();
    if (!room) return;
    const activeRole = this.session.getMyRole();
    const activeSlot = room.slots[activeRole];
    if (!activeSlot) return;

    const fl: MapFloor = this.mapData.floors[activeSlot.floor];
    const scene = fl?.scenes[activeSlot.scene];
    if (!fl || !scene) return;

    const camX = Math.round(this.camera[0]);
    const camY = Math.round(this.camera[1]);

    // PASS 1: Crisp 384x240 pixel world render
    const wctx = this.worldCtx;
    wctx.imageSmoothingEnabled = false;
    wctx.setTransform(1, 0, 0, 1, 0, 0);
    wctx.fillStyle = '#090C11';
    wctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

    wctx.save();
    wctx.setTransform(1, 0, 0, 1, -camX, -camY);
    wctx.beginPath();
    wctx.rect(...scene.view);
    wctx.clip();

    const bgImg = this.loadImage(fl.background);
    if (bgImg.complete && bgImg.naturalWidth > 0) {
      wctx.drawImage(bgImg, 0, 0);
    }

    // Floor portal highlights (since walls are cleanly unified without forced door sprites)
    const nearbyPortal = this.getNearbyPortal(activeSlot);
    const p01Solved = room.solvedPids.includes(1);
    for (const pt of fl.portals) {
      if (pt.sourceScene && pt.sourceScene !== activeSlot.scene) continue;
      const [rx, ry, rw, rh] = pt.rect;
      const isNear = nearbyPortal?.id === pt.id;
      const locked = Boolean(getPortalLockReason(room, pt));
      const pulse = 0.5 + 0.5 * Math.sin(this.animClock * 4);
      wctx.fillStyle = locked
        ? `rgba(255, 110, 110, ${isNear ? 0.25 : 0.1 + pulse * 0.06})`
        : isNear
          ? 'rgba(82, 239, 191, 0.28)'
          : `rgba(230, 200, 134, ${0.09 + pulse * 0.08})`;
      wctx.fillRect(rx, ry, rw, rh);
      wctx.strokeStyle = locked ? 'rgba(255, 110, 110, 0.7)' : isNear ? '#52EFBF' : 'rgba(230, 200, 134, 0.55)';
      wctx.lineWidth = 1;
      wctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);

      // P01 field clear effect: mint brass lamps above the 4 exhibition doors
      if (
        p01Solved &&
        activeSlot.floor === '1F' &&
        activeSlot.scene === 'hall' &&
        ['life-door', 'time-door', 'craft-door', 'city-door'].includes(pt.id)
      ) {
        const lx = Math.round(rx + rw / 2);
        const ly = Math.round(ry - 6);
        wctx.fillStyle = 'rgba(82, 239, 191, 0.35)';
        wctx.beginPath();
        wctx.arc(lx, ly, 7, 0, Math.PI * 2);
        wctx.fill();
        wctx.fillStyle = '#52EFBF';
        wctx.fillRect(lx - 2, ly - 2, 4, 4);
      }
    }

    // Characters in current floor & scene
    const party = ROLE_ORDER.map((r) => room.slots[r]).filter(
      (s) => s.floor === activeSlot.floor && s.scene === activeSlot.scene
    );
    party.sort((a, b) => a.y - b.y);

    const visibleObjs = fl.objects
      .filter((o) => o.room === activeSlot.scene || Math.abs(o.x - activeSlot.x) < 420)
      .sort((a, b) => a.order - b.order);

    let pIdx = 0;
    for (const obj of visibleObjs) {
      while (pIdx < party.length && party[pIdx].y < obj.order - 2) {
        this.drawPixelCharacter(wctx, party[pIdx++]);
      }
      // Solved focus-object field clear glow
      const solvedFocusPid = obj.puzzles?.find(
        (pid) => pid <= 15 && room.solvedPids.includes(pid) && PUZZLES_BY_ID[pid]?.focusObj === obj.id
      );
      if (solvedFocusPid) {
        const gx = Math.round(obj.x + obj.width / 2);
        const gy = Math.round(obj.y + obj.height / 2);
        const gr = Math.max(obj.width, obj.height) * 0.72;
        const glow = wctx.createRadialGradient(gx, gy, 2, gx, gy, gr);
        glow.addColorStop(0, 'rgba(255, 224, 130, 0.42)');
        glow.addColorStop(0.6, 'rgba(82, 239, 191, 0.2)');
        glow.addColorStop(1, 'rgba(82, 239, 191, 0)');
        wctx.fillStyle = glow;
        wctx.beginPath();
        wctx.arc(gx, gy, gr, 0, Math.PI * 2);
        wctx.fill();
      }
      const spImg = this.loadImage(obj.sprite);
      if (spImg.complete && spImg.naturalWidth > 0) {
        // Keep crisp pixel rendering at all times
        wctx.imageSmoothingEnabled = false;
        wctx.drawImage(spImg, obj.x, obj.y, obj.width, obj.height);
      }
      // P16 atrium pad glow when active
      if (obj.id.startsWith('gather-')) {
        const padIdx = Number(obj.id.split('-')[1]) - 1;
        const p16 = (room.puzzleStates[16] || {}) as { pads?: boolean[] };
        if (p16.pads?.[padIdx]) {
          wctx.strokeStyle = '#52EFBF';
          wctx.lineWidth = 1;
          wctx.strokeRect(obj.x - 1, obj.y - 1, obj.width + 2, obj.height + 2);
        }
      }
    }
    while (pIdx < party.length) {
      this.drawPixelCharacter(wctx, party[pIdx++]);
    }

    // P16 optical beam inside 2F atrium when Part 1 prism is aligned!
    const p16State = (room.puzzleStates[16] || {}) as { beamReachedAtrium?: boolean };
    if (activeSlot.floor === '2F' && activeSlot.scene === 'atrium' && p16State.beamReachedAtrium) {
      wctx.save();
      wctx.strokeStyle = 'rgba(124, 216, 255, 0.78)';
      wctx.lineWidth = 3;
      wctx.beginPath();
      wctx.moveTo(1320, 693);
      wctx.lineTo(950, 445);
      wctx.stroke();
      wctx.strokeStyle = 'rgba(255, 232, 158, 0.9)';
      wctx.lineWidth = 1;
      wctx.beginPath();
      wctx.moveTo(1320, 693);
      wctx.lineTo(950, 445);
      wctx.stroke();
      wctx.restore();
    }

    if (this.showWalkabilityOverlay) {
      wctx.save();
      wctx.globalAlpha = 0.28;
      const wImg = this.loadImage(fl.walkability);
      if (wImg.complete && wImg.naturalWidth > 0) wctx.drawImage(wImg, 0, 0);
      wctx.restore();
    }

    wctx.restore();

    // Storm Blackout Lighting before P09 is solved (separate lightCanvas so destination-out never erases map/characters!)
    if (!room.powerRestored) {
      const lctx = this.lightCtx;
      lctx.save();
      lctx.globalCompositeOperation = 'source-over';
      lctx.clearRect(0, 0, VIEWPORT_W, VIEWPORT_H);
      lctx.fillStyle = 'rgba(6, 9, 15, 0.56)';
      lctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);
      lctx.globalCompositeOperation = 'destination-out';
      for (const ch of party) {
        const sx = Math.round(ch.x - camX);
        const sy = Math.round(ch.y - 24 - camY);
        const radius = ch.roleId === activeRole ? 115 : 70;
        const grad = lctx.createRadialGradient(sx, sy, 18, sx, sy, radius);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(0.55, 'rgba(0,0,0,0.72)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        lctx.fillStyle = grad;
        lctx.beginPath();
        lctx.arc(sx, sy, radius, 0, Math.PI * 2);
        lctx.fill();
      }
      lctx.restore();
      wctx.drawImage(this.lightCanvas, 0, 0);
    }

    // PASS 2: Blit 384x240 -> 1152x720 with ZERO smoothing, then draw crisp HD overlays!
    const dctx = this.displayCtx;
    dctx.setTransform(1, 0, 0, 1, 0, 0);
    dctx.imageSmoothingEnabled = false;
    dctx.clearRect(0, 0, this.displayCanvas.width, this.displayCanvas.height);
    dctx.drawImage(this.worldCanvas, 0, 0, this.displayCanvas.width, this.displayCanvas.height);

    this.drawHdOverlays(dctx, room, fl, activeSlot, party, camX, camY, nearbyPortal);

    // Room transition fade
    if (this.fadeAlpha > 0.01) {
      dctx.fillStyle = `rgba(7, 10, 15, ${this.fadeAlpha.toFixed(3)})`;
      dctx.fillRect(0, 0, this.displayCanvas.width, this.displayCanvas.height);
    }
  }

  private drawPixelCharacter(ctx: CanvasRenderingContext2D, slot: CharacterSlot) {
    const sheet = this.loadImage(this.anims.sheet);
    const meta = this.anims.characters[slot.roleId];
    if (!sheet.complete || !sheet.naturalWidth || !meta) return;

    const frames = meta.frames[slot.dir] || meta.frames.down;
    let frameIdx = this.anims.idleIndex;
    if (slot.moving) {
      const seq = this.anims.walkSequence;
      frameIdx = seq[Math.floor(this.walkTimers[slot.roleId] * this.anims.walkFps) % seq.length];
    }
    const f = frames[frameIdx] || frames[0];

    const px = Math.round(slot.x) - meta.anchorX;
    const py = Math.round(slot.y) - meta.anchorY;

    // Ground shadow ellipse
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(Math.round(slot.x) - 6, Math.round(slot.y) - 2, 12, 4);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, f.sx, f.sy, f.w, f.h, px, py, f.w, f.h);
  }

  private drawHdOverlays(
    ctx: CanvasRenderingContext2D,
    room: RoomState,
    fl: MapFloor,
    activeSlot: CharacterSlot,
    party: CharacterSlot[],
    camX: number,
    camY: number,
    nearbyPortal?: MapPortal
  ) {
    const toScreen = (wx: number, wy: number): [number, number] => [
      Math.round((wx - camX) * SCALE_X),
      Math.round((wy - camY) * SCALE_X),
    ];

    const activeRole = this.session.getMyRole();
    const nearObj = this.getClosestInteractable(activeSlot);
    const roomObjs = fl.objects.filter((o) => o.room === activeSlot.scene && o.interact);

    // 1. Portal labels (clean world markers for unified walls)
    for (const pt of fl.portals) {
      if (pt.sourceScene && pt.sourceScene !== activeSlot.scene) continue;
      const [rx, ry, rw, rh] = pt.rect;
      const [sx, sy] = toScreen(rx + rw / 2, ry + rh / 2);
      const isNear = nearbyPortal?.id === pt.id;
      const locked = Boolean(getPortalLockReason(room, pt));
      const label = locked
        ? `🔒 ${pt.name}`
        : isNear
          ? `[E] ${pt.name}`
          : pt.kind === 'stairs'
            ? `🪜 ${pt.targetFloor}`
            : `🚪 ${pt.name}`;
      ctx.font = isNear ? '800 13px "Noto Sans KR", sans-serif' : '700 11px "Noto Sans KR", sans-serif';
      const tw = ctx.measureText(label).width + 16;
      const by = Math.max(22, sy - Math.round((rh * SCALE_X) / 2) - 12);
      ctx.fillStyle = locked ? 'rgba(42, 16, 20, 0.92)' : isNear ? 'rgba(14, 48, 38, 0.94)' : 'rgba(13, 18, 25, 0.82)';
      ctx.strokeStyle = locked ? '#FF6E6E' : isNear ? '#52EFBF' : 'rgba(230, 200, 134, 0.7)';
      ctx.lineWidth = isNear ? 2 : 1.2;
      this.roundRect(ctx, sx - tw / 2, by - 12, tw, 24, 6, true, true);
      ctx.fillStyle = locked ? '#FFB0B0' : isNear ? '#52EFBF' : '#E6C886';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, sx, by);
    }

    // 2. Role-specific exploration passive HUD overlays on puzzle objects + interact markers!
    for (const obj of roomObjs) {
      const pid = obj.puzzles?.[0];
      const solved = pid ? room.solvedPids.includes(pid) : false;
      const isNear = nearObj?.id === obj.id;
      const [ox, oy] = toScreen(obj.x + obj.width / 2, obj.y);

      // Role passive highlight!
      if (pid) {
        this.drawRolePassiveOverlay(ctx, activeRole, obj, room, toScreen, solved);
      }

      // Floating P01..P16 badge / [E] prompt
      if (pid) {
        const badgeText = isNear
          ? `[E] P${String(pid).padStart(2, '0')} · 열기`
          : solved
            ? `✔ P${String(pid).padStart(2, '0')}`
            : `P${String(pid).padStart(2, '0')}`;
        ctx.font = '800 11px ui-monospace, "Noto Sans KR", monospace';
        const bw = ctx.measureText(badgeText).width + 12;
        const py = Math.max(18, oy - 12);
        ctx.fillStyle = solved ? 'rgba(15, 56, 36, 0.92)' : isNear ? 'rgba(65, 44, 12, 0.95)' : 'rgba(14, 22, 30, 0.85)';
        ctx.strokeStyle = solved ? '#52EFBF' : isNear ? '#FFD86B' : 'rgba(82, 239, 191, 0.6)';
        ctx.lineWidth = isNear ? 2 : 1.2;
        this.roundRect(ctx, ox - bw / 2, py - 10, bw, 20, 5, true, true);
        ctx.fillStyle = solved ? '#52EFBF' : isNear ? '#FFE89E' : '#9CEFD7';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, ox, py);
      }
    }

    // 3. P16 Atrium live field progress overlay (NO MODAL!)
    if (activeSlot.floor === '2F' && activeSlot.scene === 'atrium') {
      const p16 = (room.puzzleStates[16] || {}) as {
        beamReachedAtrium?: boolean;
        hereSent?: boolean;
        pads?: boolean[];
      };
      const padsCnt = (p16.pads || []).filter(Boolean).length;
      const priorDone = Array.from({ length: 15 }, (_, i) => i + 1).filter((id) => room.solvedPids.includes(id)).length;
      const [sx, sy] = toScreen(950, 378);
      const statusTxt =
        priorDone < 15
          ? `1~3막 선행 복원 필요 (${priorDone}/15) · 먼저 모든 전시실 복구`
          : !p16.beamReachedAtrium
            ? '2F 기획전시실 프리즘 광선 대기 중'
            : !p16.hereSent
              ? '광선 도착! 린 [집결 호출 HERE] 발신 대기'
              : `대관식 집결 발판 ${padsCnt} / 4 (4인 동시 착지!)`;
      ctx.font = '800 13px "Noto Sans KR", sans-serif';
      const w = ctx.measureText(statusTxt).width + 20;
      ctx.fillStyle = 'rgba(13, 19, 27, 0.92)';
      ctx.strokeStyle = padsCnt === 4 && p16.hereSent && p16.beamReachedAtrium ? '#52EFBF' : '#E6C886';
      ctx.lineWidth = 2;
      this.roundRect(ctx, sx - w / 2, sy - 16, w, 28, 7, true, true);
      ctx.fillStyle = padsCnt === 4 ? '#52EFBF' : '#FFE89E';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(statusTxt, sx, sy - 2);
    }

    // 4. Character nameplates + overhead C-Menu radio speech bubbles
    const now = Date.now();
    for (const ch of party) {
      const rMeta = ROLES[ch.roleId];
      const [cx, cy] = toScreen(ch.x, ch.y);
      const isMe = ch.roleId === activeRole;
      const tag = isMe ? `${ch.nickname} (나)` : ch.isBot ? `${ch.nickname} · 봇` : ch.nickname;
      ctx.font = isMe ? '800 12px "Noto Sans KR", sans-serif' : '700 11px "Noto Sans KR", sans-serif';
      const tw = ctx.measureText(tag).width + 14;
      ctx.fillStyle = 'rgba(11, 14, 19, 0.85)';
      ctx.strokeStyle = isMe ? rMeta.color : 'rgba(255,255,255,0.28)';
      ctx.lineWidth = isMe ? 1.8 : 1;
      this.roundRect(ctx, cx - tw / 2, cy + 6, tw, 20, 5, true, true);
      ctx.fillStyle = rMeta.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tag, cx, cy + 16);

      const bubble = this.speechBubbles[ch.roleId];
      if (bubble && bubble.until > now) {
        const [, headY] = toScreen(ch.x, ch.y - 54);
        ctx.font = '800 12px "Noto Sans KR", sans-serif';
        const bText = `📡 ${bubble.text}`;
        const bw = ctx.measureText(bText).width + 18;
        ctx.fillStyle = 'rgba(15, 22, 31, 0.96)';
        ctx.strokeStyle = bubble.color;
        ctx.lineWidth = 2;
        this.roundRect(ctx, cx - bw / 2, headY - 28, bw, 26, 8, true, true);
        ctx.fillStyle = '#F4F7FA';
        ctx.fillText(bText, cx, headY - 15);
      }
    }
  }

  private drawRolePassiveOverlay(
    ctx: CanvasRenderingContext2D,
    role: RoleId,
    obj: MapObject,
    room: RoomState,
    toScreen: (x: number, y: number) => [number, number],
    solved: boolean
  ) {
    if (solved) return;
    const pid = obj.puzzles[0];
    const pDef = PUZZLES_BY_ID[pid];
    if (!pDef) return;
    const [cx, cy] = toScreen(obj.x + obj.width / 2, obj.y + obj.height / 2);
    const [x0, y0] = toScreen(obj.x, obj.y);
    const w = obj.width * SCALE_X;
    const h = obj.height * SCALE_X;

    if (role === 'doyun') {
      // Brass gear highlight on mechanical / main operator objects or Ha-rin clue targets
      const isMech =
        pDef.mainRole === 'doyun' ||
        (obj.role && (obj.role.includes('서하린') || obj.role.includes('밸브') || obj.role.includes('로프') || obj.role.includes('배전')));
      if (isMech) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 184, 107, 0.85)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x0 - 4, y0 - 4, w + 8, h + 8);
        ctx.translate(x0 + w - 4, y0 + 6);
        ctx.rotate(this.animClock * 1.4);
        ctx.setLineDash([]);
        ctx.fillStyle = '#FFB86B';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚙', 0, 0);
        ctx.restore();
      }
    } else if (role === 'maria') {
      // Parchment translation overlay tags on documents, charts, plaques, timelines
      const isDoc =
        pDef.mainRole === 'maria' ||
        (obj.role && (obj.role.includes('이안') || obj.role.includes('번역') || obj.role.includes('사료') || obj.role.includes('방명록')));
      if (isDoc) {
        ctx.save();
        ctx.strokeStyle = 'rgba(230, 200, 134, 0.85)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x0 - 3, y0 - 3, w + 6, h + 6);
        ctx.font = '800 10px "Noto Sans KR", sans-serif';
        const note = '📜 사료 번역 가능';
        const nw = ctx.measureText(note).width + 10;
        ctx.fillStyle = 'rgba(42, 33, 18, 0.92)';
        ctx.strokeStyle = '#E6C886';
        ctx.lineWidth = 1.2;
        this.roundRect(ctx, cx - nw / 2, y0 + h + 4, nw, 18, 4, true, true);
        ctx.fillStyle = '#FFE7A8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(note, cx, y0 + h + 13);
        ctx.restore();
      }
    } else if (role === 'lin') {
      // Spatial bearing lines, pipe headers, tram/optical vectors & exact coords
      const isNav = pDef.mainRole === 'lin' || (obj.role && (obj.role.includes('(린)') || obj.role.includes('네비게이터')));
      if (isNav) {
        ctx.save();
        ctx.strokeStyle = 'rgba(82, 239, 191, 0.72)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(x0 - 4, y0 - 4, w + 8, h + 8);
        ctx.beginPath();
        ctx.moveTo(cx - 22, cy);
        ctx.lineTo(cx + 22, cy);
        ctx.moveTo(cx, cy - 22);
        ctx.lineTo(cx, cy + 22);
        ctx.stroke();
        ctx.font = '700 10px ui-monospace, monospace';
        ctx.fillStyle = '#52EFBF';
        ctx.textAlign = 'center';
        ctx.fillText(`(${obj.x},${obj.y})`, cx, y0 + h + 12);
        ctx.restore();
      }
    } else if (role === 'aisha') {
      // Magnifying loupe reticle & live sensor readout (UV / Thermal / PSI / RH / pH)
      const isObs = pDef.mainRole === 'aisha' || (obj.role && obj.role.includes('카이'));
      if (isObs) {
        ctx.save();
        ctx.strokeStyle = '#7CD8FF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(18, Math.min(w, h) * 0.45), 0, Math.PI * 2);
        ctx.stroke();
        const tagMap: Record<number, string> = {
          2: '🔍 단면 루페',
          3: '🔍 나선 음각 180°',
          5: '🔍 황금→진홍→청록',
          8: `🔍 ${String((room.puzzleStates[8] as { boilerPsi?: number })?.boilerPsi ?? 145)} PSI`,
          9: '🔍 예열 60Hz 센서',
          10: `🔍 ${String((room.puzzleStates[10] as { rh?: number })?.rh ?? 72)}% RH`,
          11: '🔍 UV Kudlit 스캔',
          13: '🔍 pH 적정 · 초음파',
          14: '🔍 밀랍 · 도르래',
        };
        const sensorLabel = tagMap[pid] || '🔍 정밀 관측';
        ctx.font = '800 10px "Noto Sans KR", sans-serif';
        const sw = ctx.measureText(sensorLabel).width + 10;
        ctx.fillStyle = 'rgba(10, 28, 40, 0.92)';
        ctx.strokeStyle = '#7CD8FF';
        ctx.lineWidth = 1.2;
        this.roundRect(ctx, cx - sw / 2, y0 + h + 4, sw, 18, 4, true, true);
        ctx.fillStyle = '#9FE6FF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sensorLabel, cx, y0 + h + 13);
        ctx.restore();
      }
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: boolean,
    stroke: boolean
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
}
