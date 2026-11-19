import type { MapJson, RoleId } from '../types/stranger.ts';
import { ROLE_ORDER } from '../data/cMenuTokens.ts';
import { PUZZLES_BY_ID } from '../data/puzzleCatalog.ts';
import type { SessionClient } from '../net/sessionClient.ts';
import type { WorldEngine } from './worldEngine.ts';

const GATHER_TARGETS: Record<RoleId, [number, number]> = {
  doyun: [896, 623],
  maria: [1004, 623],
  lin: [896, 725],
  aisha: [1004, 725],
};

export class BotController {
  private session: SessionClient;
  private world: WorldEngine;
  private mapData: MapJson;
  private timerId: number | null = null;
  private sentClueFor = new Set<string>();
  private patrolAngles: Record<RoleId, number> = { doyun: 0, maria: 1.5, lin: 3.1, aisha: 4.7 };

  constructor(session: SessionClient, world: WorldEngine, mapData: MapJson) {
    this.session = session;
    this.world = world;
    this.mapData = mapData;
  }

  start() {
    if (this.timerId !== null) return;
    this.timerId = window.setInterval(() => this.tick(), 260);
  }

  stop() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  requestBotClueForPuzzle(pid: number) {
    const room = this.session.getRoom();
    const pDef = PUZZLES_BY_ID[pid];
    if (!room || !pDef) return;
    const helper = pDef.helperRoles.find((r) => room.slots[r]?.isBot) || pDef.helperRoles[0];
    if (!helper) return;
    for (const pkt of pDef.answerTokens) {
      this.session.sendRadio(helper, pkt);
    }
  }

  private tick() {
    const room = this.session.getRoom();
    if (!room || room.phase !== 'playing') return;

    const activeRole = this.session.getMyRole();
    const activeSlot = room.slots[activeRole];
    if (!activeSlot) return;

    const p16 = (room.puzzleStates[16] || {}) as { beamReachedAtrium?: boolean; hereSent?: boolean };
    const isP16GatherPhase = Boolean(p16.beamReachedAtrium && p16.hereSent && !room.solvedPids.includes(16));

    // Only simulate bots on host/local client (when slot.isBot && !slot.ownerClientId)
    for (const r of ROLE_ORDER) {
      if (r === activeRole) continue;
      const slot = room.slots[r];
      if (!slot || !slot.isBot || slot.ownerClientId) continue;

      if (isP16GatherPhase) {
        const [gx, gy] = GATHER_TARGETS[r];
        if (slot.floor !== '2F' || slot.scene !== 'atrium') {
          this.session.moveSlot(r, { floor: '2F', scene: 'atrium', x: 950, y: 690, dir: 'up', moving: true });
          continue;
        }
        const dx = gx - slot.x;
        const dy = gy - slot.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 4) {
          const step = Math.min(dist, 22);
          const nx = slot.x + (dx / dist) * step;
          const ny = slot.y + (dy / dist) * step;
          const dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
          this.session.moveSlot(r, { floor: '2F', scene: 'atrium', x: nx, y: ny, dir, moving: true });
        } else if (slot.moving) {
          this.session.moveSlot(r, { floor: '2F', scene: 'atrium', x: gx, y: gy, dir: 'down', moving: false });
        }
        continue;
      }

      // Gently follow player to the same room if player lingers in a room, and stay walkable
      if (slot.floor !== activeSlot.floor || slot.scene !== activeSlot.scene) {
        const fl = this.mapData.floors[activeSlot.floor];
        const nearScene = fl?.scenes[activeSlot.scene];
        if (nearScene && Math.random() < 0.25) {
          const offsets: [number, number][] = [
            [-20, 10],
            [20, 10],
            [-14, 18],
            [14, 18],
          ];
          const [ox, oy] = offsets[ROLE_ORDER.indexOf(r)];
          const tx = this.world.canMove(activeSlot.floor, activeSlot.x + ox, activeSlot.y + oy)
            ? activeSlot.x + ox
            : activeSlot.x;
          const ty = this.world.canMove(activeSlot.floor, tx, activeSlot.y + oy)
            ? activeSlot.y + oy
            : activeSlot.y;
          this.session.moveSlot(r, {
            floor: activeSlot.floor,
            scene: activeSlot.scene,
            x: tx,
            y: ty,
            dir: 'down',
            moving: false,
          });
        }
        continue;
      }

      // Idle stroll around active player
      this.patrolAngles[r] += 0.35;
      const idx = ROLE_ORDER.indexOf(r);
      const targetX = activeSlot.x + Math.cos(this.patrolAngles[r] + idx) * 26;
      const targetY = activeSlot.y + Math.sin(this.patrolAngles[r] + idx) * 20;
      const dx = targetX - slot.x;
      const dy = targetY - slot.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 14) {
        const step = Math.min(8, dist);
        const nx = slot.x + (dx / dist) * step;
        const ny = slot.y + (dy / dist) * step;
        if (this.world.canMove(slot.floor, nx, ny)) {
          const dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
          this.session.moveSlot(r, { floor: slot.floor, scene: slot.scene, x: nx, y: ny, dir, moving: true });
        } else if (slot.moving) {
          this.session.moveSlot(r, { floor: slot.floor, scene: slot.scene, x: slot.x, y: slot.y, dir: slot.dir, moving: false });
        }
      } else if (slot.moving) {
        this.session.moveSlot(r, { floor: slot.floor, scene: slot.scene, x: slot.x, y: slot.y, dir: slot.dir, moving: false });
      }
    }

    // Automatically broadcast helpful bot clue once when the player enters a puzzle room for the first time
    for (const p of Object.values(PUZZLES_BY_ID)) {
      if (
        p.floor === activeSlot.floor &&
        p.room === activeSlot.scene &&
        !room.solvedPids.includes(p.id) &&
        !this.sentClueFor.has(p.code)
      ) {
        const botHelper = p.helperRoles.find((hr) => room.slots[hr]?.isBot && hr !== activeRole);
        if (botHelper) {
          this.sentClueFor.add(p.code);
          const firstPkt = p.answerTokens[0];
          if (firstPkt) {
            window.setTimeout(() => {
              const cur = this.session.getRoom();
              if (cur && cur.phase === 'playing' && !cur.solvedPids.includes(p.id)) {
                this.session.sendRadio(botHelper, firstPkt);
              }
            }, 900);
          }
        }
      }
    }
  }
}
