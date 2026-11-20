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
import { ROLE_ORDER, ROLES, formatRadioPlainText } from '../data/cMenuTokens.ts';
import { PUZZLES_BY_ID, getObjectOwnerRole, getPortalLockReason } from '../data/puzzleCatalog.ts';
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

/** Direction a character at (x, y) should face to look at (tx, ty). */
export function faceToward(x: number, y: number, tx: number, ty: number): Direction {
  const dx = tx - x;
  const dy = ty - y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

// Two characters closer than this (feet to feet) visibly overlap: sprites are ~20px
// wide and ~50px tall, so someone standing less than ~36px straight behind is hidden.
const PARTY_GAP_X = 22;
const PARTY_GAP_Y = 36;
// Preferred places for teammates around a leader: side by side in a row first,
// then a staggered second row behind, then in front.
const PARTY_OFFSETS: [number, number][] = [
  [-26, 2],
  [26, 2],
  [-52, 0],
  [52, 0],
  [-13, -40],
  [13, -40],
  [-39, -40],
  [39, -40],
  [-13, 40],
  [13, 40],
];

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
  /**
   * Where each character is drawn. Bots and remote players update their real
   * position in coarse steps (bot tick / network), so we glide the drawn sprite
   * toward it at walking speed instead of letting it jump.
   */
  private drawPos: Partial<Record<RoleId, { x: number; y: number; floor: FloorKey; scene: string; gliding: boolean }>> = {};
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
    const label = formatRadioPlainText(pkt);
    this.speechBubbles[pkt.roleId] = {
      text: label.length > 42 ? label.slice(0, 41) + '…' : label,
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

    this.callbacks.onStatusToast('👣 조금 더 가까이 가 봐요!', 'info');
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
    const mates = ROLE_ORDER.filter((r) => r !== active.roleId);
    const spots = this.findPartySpots(active.floor, active.x, active.y, mates.length);
    mates.forEach((r, i) => {
      const [tx, ty] = spots[i];
      this.session.moveSlot(
        r,
        { floor: active.floor, scene: active.scene, x: tx, y: ty, dir: faceToward(tx, ty, active.x, active.y), moving: false },
        true
      );
    });
    soundEngine.playClick();
    this.callbacks.onStatusToast('🧲 친구들이 모였어요!', 'mint');
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

    // Glide drawn positions of other characters toward their real positions
    const myRole = this.session.getMyRole();
    for (const r of ROLE_ORDER) {
      const s = room.slots[r];
      if (!s) continue;
      const dp = this.drawPos[r];
      const dist = dp ? Math.hypot(s.x - dp.x, s.y - dp.y) : Infinity;
      if (!dp || r === myRole || dp.floor !== s.floor || dp.scene !== s.scene || dist > 110) {
        this.drawPos[r] = { x: s.x, y: s.y, floor: s.floor, scene: s.scene, gliding: false };
      } else if (dist > 0.5) {
        const step = Math.min(dist, Math.max(MOVE_SPEED * 1.05, dist * 4) * dt);
        dp.x += ((s.x - dp.x) / dist) * step;
        dp.y += ((s.y - dp.y) / dist) * step;
        dp.gliding = dist - step > 0.5;
      } else {
        dp.x = s.x;
        dp.y = s.y;
        dp.gliding = false;
      }
    }

    // Advance walk clocks for all moving characters (local + remote + bots)
    for (const r of ROLE_ORDER) {
      const s = room.slots[r];
      if (s.moving || this.drawPos[r]?.gliding) this.walkTimers[r] += dt;
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
      const pDef = pid ? PUZZLES_BY_ID[pid] : undefined;
      const owner = getObjectOwnerRole(nearObj, pDef);
      const myRoleNow = this.session.getMyRole();
      const ownerHint = owner !== 'all' && owner !== myRoleNow ? ` (${ROLES[owner].name} 담당)` : '';
      nextPrompt = nearObj.id.startsWith('gather-')
        ? `👣 ${nearObj.name}${ownerHint} — 발판 위에서 대기`
        : `[E] ${tag}${nearObj.name}${ownerHint}`;
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
          '👑 16/16 성공! 4명이 모두 모였어요!'
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

    // Characters in current floor & scene (drawn at their smoothed positions)
    const party = ROLE_ORDER.map((r) => this.visualSlot(room.slots[r])).filter(
      (s) => s.floor === activeSlot.floor && s.scene === activeSlot.scene
    );
    party.sort((a, b) => a.y - b.y || a.x - b.x);

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
      // P16 2F atrium gather pads use authentic Figma pad-1..4 off/on SVG sprites
      if (obj.id.startsWith('gather-')) {
        const padIdx = Number(obj.id.split('-')[1]) - 1;
        const p16 = (room.puzzleStates[16] || {}) as { pads?: boolean[] };
        const padOn = Boolean(p16.pads?.[padIdx]);
        const padImg = this.loadImage(`/assets/puzzle-ui/boards/p16-pad-${padIdx + 1}-${padOn ? 'on' : 'off'}.svg`);
        if (padImg.complete && padImg.naturalWidth > 0) {
          wctx.drawImage(padImg, obj.x - 4, obj.y - 4, obj.width + 8, obj.height + 8);
        } else if (spImg.complete && spImg.naturalWidth > 0) {
          wctx.imageSmoothingEnabled = false;
          wctx.drawImage(spImg, obj.x, obj.y, obj.width, obj.height);
        }
      } else if (spImg.complete && spImg.naturalWidth > 0) {
        // Keep crisp pixel rendering at all times
        wctx.imageSmoothingEnabled = false;
        wctx.drawImage(spImg, obj.x, obj.y, obj.width, obj.height);
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

  /** The slot as it should be drawn this frame (smoothed position, walking while gliding). */
  private visualSlot(slot: CharacterSlot): CharacterSlot {
    const dp = this.drawPos[slot.roleId];
    if (!dp || dp.floor !== slot.floor || dp.scene !== slot.scene) return slot;
    return { ...slot, x: dp.x, y: dp.y, moving: slot.moving || dp.gliding };
  }

  /**
   * Walkable spots around a leader where followers can stand side by side without
   * overlapping the leader, each other or anyone listed in `others`.
   */
  findPartySpots(
    floorKey: FloorKey,
    leaderX: number,
    leaderY: number,
    count: number,
    others: [number, number][] = []
  ): [number, number][] {
    const taken: [number, number][] = [[leaderX, leaderY], ...others];
    const spots: [number, number][] = [];
    const tooClose = (x: number, y: number) =>
      taken.some(([tx, ty]) => Math.abs(x - tx) < PARTY_GAP_X && Math.abs(y - ty) < PARTY_GAP_Y);
    const candidates: [number, number][] = [...PARTY_OFFSETS];
    for (const r of [40, 56, 72, 90]) {
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        candidates.push([Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r * 0.7)]);
      }
    }
    for (const [ox, oy] of candidates) {
      if (spots.length >= count) break;
      const x = leaderX + ox;
      const y = leaderY + oy;
      if (tooClose(x, y) || !this.canMove(floorKey, x, y, leaderX, leaderY)) continue;
      spots.push([x, y]);
      taken.push([x, y]);
    }
    while (spots.length < count) spots.push([leaderX, leaderY]);
    return spots;
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

    // Ground shadow: a small pixel ellipse (two overlapping rects filled once)
    const fx = Math.round(slot.x);
    const fy = Math.round(slot.y);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.rect(fx - 4, fy - 2, 8, 4);
    ctx.rect(fx - 6, fy - 1, 12, 2);
    ctx.fill();

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
      const pDef = pid ? PUZZLES_BY_ID[pid] : undefined;
      const solved = pid ? room.solvedPids.includes(pid) : false;
      const isNear = nearObj?.id === obj.id;
      const [ox, oy] = toScreen(obj.x + obj.width / 2, obj.y);
      const owner = getObjectOwnerRole(obj, pDef);
      const isMine = owner === activeRole || owner === 'all';

      // Role passive highlight!
      if (pid) {
        this.drawRolePassiveOverlay(ctx, activeRole, activeSlot, obj, room, toScreen, solved);
      }

      // Floating P01..P16 badge / ownership marker / [E] prompt
      if (pid) {
        const pCode = `P${String(pid).padStart(2, '0')}`;
        const ownerMeta = owner !== 'all' ? ROLES[owner as RoleId] : null;
        const isGatherPad = obj.id.startsWith('gather-');
        const badgeText = solved
          ? `✔ ${pCode}`
          : isGatherPad
            ? isMine
              ? `👣 ${pCode} · 내 발판 ★`
              : `👣 ${pCode} · ${ownerMeta ? ownerMeta.name : '전체'} 발판`
            : isNear
              ? isMine
                ? owner === 'all'
                  ? `[E] ${pCode} · 협동 안내`
                  : `[E] ${pCode} · 내 담당 ★`
                : `[E] ${pCode} · ${ownerMeta ? ownerMeta.name : '동료'} 담당`
              : isMine
                ? owner === 'all'
                  ? `✦ ${pCode}`
                  : `★ ${pCode}`
                : `${ownerMeta ? ownerMeta.badge : '🔒'} ${ownerMeta ? ownerMeta.name : '동료'}`;
        ctx.font = '800 11px ui-monospace, "Noto Sans KR", monospace';
        const bw = ctx.measureText(badgeText).width + 12;
        const py = Math.max(18, oy - 12);
        ctx.fillStyle = solved
          ? 'rgba(15, 56, 36, 0.92)'
          : isNear
            ? 'rgba(65, 44, 12, 0.95)'
            : isMine
              ? 'rgba(14, 24, 34, 0.9)'
              : 'rgba(18, 22, 28, 0.72)';
        ctx.strokeStyle = solved
          ? '#52EFBF'
          : isNear
            ? '#FFD86B'
            : isMine
              ? ROLES[activeRole].color
              : 'rgba(130, 148, 165, 0.45)';
        ctx.lineWidth = isNear || isMine ? 2 : 1;
        this.roundRect(ctx, ox - bw / 2, py - 10, bw, 20, 5, true, true);
        ctx.fillStyle = solved
          ? '#52EFBF'
          : isNear
            ? '#FFE89E'
            : isMine
              ? ROLES[activeRole].color
              : '#9AA7B4';
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
          ? `🧩 먼저 퍼즐을 다 풀어요 (${priorDone}/15)`
          : !p16.beamReachedAtrium
            ? '🌈 기획전시실에서 빛을 기다려요'
            : !p16.hereSent
              ? '✨ 빛 도착! 린이 📍 모여라 보내기'
              : `👣 발판 ${padsCnt} / 4 · 모두 올라서요!`;
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
    activeSlot: CharacterSlot,
    obj: MapObject,
    room: RoomState,
    toScreen: (x: number, y: number) => [number, number],
    solved: boolean
  ) {
    if (solved) return;
    const pid = obj.puzzles[0];
    const pDef = PUZZLES_BY_ID[pid];
    if (!pDef) return;
    const owner = getObjectOwnerRole(obj, pDef);
    const [cx, cy] = toScreen(obj.x + obj.width / 2, obj.y + obj.height / 2);
    const [x0, y0] = toScreen(obj.x, obj.y);
    const w = obj.width * SCALE_X;
    const h = obj.height * SCALE_X;

    // Non-owned objects: draw only a subtle lock hint when close — never show another role's passive vision
    if (owner !== role) {
      if (owner !== 'all') {
        const dist = Math.hypot(activeSlot.x - (obj.x + obj.width / 2), activeSlot.y - (obj.y + obj.height / 2));
        if (dist <= 105) {
          ctx.save();
          ctx.font = '700 10px "Noto Sans KR", sans-serif';
          const tag = `🔒 ${ROLES[owner].name} 담당`;
          const tw = ctx.measureText(tag).width + 10;
          ctx.fillStyle = 'rgba(13, 18, 25, 0.85)';
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
          ctx.lineWidth = 1;
          this.roundRect(ctx, cx - tw / 2, y0 + h + 4, tw, 17, 4, true, true);
          ctx.fillStyle = '#9FB0C0';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tag, cx, y0 + h + 12.5);
          ctx.restore();
        }
      }
      return;
    }

    if (role === 'doyun') {
      // Brass gear highlight strictly on Ha-rin's mechanical objects
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 184, 107, 0.88)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x0 - 4, y0 - 4, w + 8, h + 8);
      ctx.save();
      ctx.translate(x0 + w - 4, y0 + 6);
      ctx.rotate(this.animClock * 1.6);
      ctx.setLineDash([]);
      ctx.fillStyle = '#FFB86B';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚙', 0, 0);
      ctx.restore();
      const note = '⚙ 기계 조작/점검';
      ctx.font = '800 10px "Noto Sans KR", sans-serif';
      const nw = ctx.measureText(note).width + 10;
      ctx.fillStyle = 'rgba(42, 27, 14, 0.92)';
      ctx.strokeStyle = '#FFB86B';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([]);
      this.roundRect(ctx, cx - nw / 2, y0 + h + 4, nw, 18, 4, true, true);
      ctx.fillStyle = '#FFD39E';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(note, cx, y0 + h + 13);
      ctx.restore();
    } else if (role === 'maria') {
      // Parchment translation overlay strictly on Ian's document/timeline objects
      ctx.save();
      ctx.strokeStyle = 'rgba(230, 200, 134, 0.88)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x0 - 3, y0 - 3, w + 6, h + 6);
      ctx.font = '800 10px "Noto Sans KR", sans-serif';
      const note = '📜 사료 번역·해독';
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
    } else if (role === 'lin') {
      // Spatial bearing vector line from Lin to target + surveying crosshair + exact coords
      const [px, py] = toScreen(activeSlot.x, activeSlot.y - 8);
      ctx.save();
      ctx.strokeStyle = 'rgba(82, 239, 191, 0.36)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(cx, cy);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(82, 239, 191, 0.82)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(x0 - 4, y0 - 4, w + 8, h + 8);
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy);
      ctx.lineTo(cx + 20, cy);
      ctx.moveTo(cx, cy - 20);
      ctx.lineTo(cx, cy + 20);
      ctx.stroke();

      ctx.setLineDash([]);
      const coordLbl = `🧭 (${obj.x},${obj.y})`;
      ctx.font = '800 10px ui-monospace, monospace';
      const cw = ctx.measureText(coordLbl).width + 10;
      ctx.fillStyle = 'rgba(10, 32, 26, 0.92)';
      ctx.strokeStyle = '#52EFBF';
      ctx.lineWidth = 1.2;
      this.roundRect(ctx, cx - cw / 2, y0 + h + 4, cw, 18, 4, true, true);
      ctx.fillStyle = '#52EFBF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(coordLbl, cx, y0 + h + 13);
      ctx.restore();
    } else if (role === 'aisha') {
      // Magnifying loupe reticle & live sensor readout strictly on Kai's objects
      ctx.save();
      ctx.strokeStyle = '#7CD8FF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(18, Math.min(w, h) * 0.45), 0, Math.PI * 2);
      ctx.stroke();
      const tagMap: Record<number, string> = {
        2: '🔍 단면 루페',
        3: '🔍 턴테이블 · 뚜껑',
        5: '🔍 직조 씨실 루페',
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
