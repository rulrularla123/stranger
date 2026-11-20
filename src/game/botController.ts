import type { FloorKey, MapJson, RadioPacket, RoleId, RoomState } from '../types/stranger.ts';
import { ROLES, ROLE_ORDER } from '../data/cMenuTokens.ts';
import { PUZZLES_BY_ID, getObjectOwnerRole } from '../data/puzzleCatalog.ts';
import type { SessionClient } from '../net/sessionClient.ts';
import { faceToward, type WorldEngine } from './worldEngine.ts';

const GATHER_TARGETS: Record<RoleId, [number, number]> = {
  doyun: [896, 623],
  maria: [1004, 623],
  lin: [896, 725],
  aisha: [1004, 725],
};

interface BotHelpScript {
  tokens: string[];
  note: string;
  statePatch?: Record<string, unknown>;
}

const BOT_HELPER_SCRIPTS: Record<number, Partial<Record<RoleId, BotHelpScript>>> = {
  1: {
    maria: {
      tokens: ['DIR_N', 'SYM_SUN', 'SYM_STAR'],
      note: '',
    },
  },
  2: {
    maria: {
      tokens: ['NUM_1', 'SYM_SUN', 'SYM_WAVE'],
      note: '',
    },
  },
  3: {
    doyun: {
      tokens: ['ACT_ROT', 'VAL:180', 'VAL:0'],
      note: '',
    },
  },
  4: {
    lin: {
      tokens: ['SYM_WAVE', 'DIR_W', 'DIR_N'],
      note: '',
    },
  },
  5: {
    aisha: {
      tokens: ['SYM_SUN', 'SYM_VOLT', 'SYM_WAVE'],
      note: '',
    },
  },
  6: {
    maria: {
      tokens: ['NUM_2', 'DIR_E', 'COOP_OK'],
      note: '',
    },
  },
  7: {
    lin: {
      tokens: ['VAL:25', 'VAL:50', 'VAL:100'],
      note: '',
    },
  },
  8: {
    aisha: {
      tokens: ['VAL:80', 'NUM_2', 'VAL:1200'],
      note: '',
    },
  },
  9: {
    lin: {
      tokens: ['NUM_3', 'COOP_SWAP', 'COOP_OK'],
      note: '',
    },
    aisha: {
      tokens: ['VAL:60', 'COOP_OK'],
      note: '',
    },
  },
  10: {
    aisha: {
      tokens: ['VAL:45/18', 'DIR_N', 'SYM_SAFE'],
      note: '',
      statePatch: { rh: 45, temp: 18 },
    },
    doyun: {
      tokens: ['NUM_1', 'VAL:1/3', 'SYM_SAFE'],
      note: '',
      statePatch: { crateLatch: true },
    },
  },
  11: {
    aisha: {
      tokens: ['SYM_STAR', 'NUM_0', 'ACT_ROT'],
      note: '',
    },
    doyun: {
      tokens: ['NUM_1', 'NUM_2', 'SYM_SUN'],
      note: '',
    },
  },
  12: {
    lin: {
      tokens: ['NUM_2', 'SYM_STAR', 'SYM_WAVE'],
      note: '',
      statePatch: { fx: 60, fy: 40 },
    },
  },
  13: {
    maria: {
      tokens: ['SYM_WAVE', 'VAL:2', 'VAL:7.0'],
      note: '',
    },
    doyun: {
      tokens: ['COOP_OK'],
      note: '',
      statePatch: { valveOpen: true },
    },
  },
  14: {
    doyun: {
      tokens: ['NUM_1', 'NUM_3', 'VAL:0'],
      note: '',
    },
  },
  15: {
    lin: {
      tokens: ['DIR_W', 'ACT_ROT', 'VAL:0'],
      note: '',
    },
  },
  16: {
    maria: {
      tokens: ['DIR_E', 'DIR_S', 'ACT_ROT'],
      note: '',
    },
    doyun: {
      tokens: ['COOP_OK', 'NUM_3', 'DIR_W'],
      note: '',
      statePatch: { mountUnlocked: true },
    },
  },
};

export class BotController {
  private session: SessionClient;
  private world: WorldEngine;
  private mapData: MapJson;
  private timerId: number | null = null;
  private sentClueFor = new Set<string>();
  private roomEnterTicks = new Map<string, number>();

  constructor(session: SessionClient, world: WorldEngine, mapData: MapJson) {
    this.session = session;
    this.world = world;
    this.mapData = mapData;
  }

  start() {
    if (this.timerId !== null) return;
    this.timerId = window.setInterval(() => this.tick(), 110);
  }

  stop() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private isBotControlled(room: RoomState, r: RoleId): boolean {
    if (r === this.session.getMyRole()) return false;
    const slot = room.slots[r];
    if (!slot) return false;
    if (slot.isBot && !slot.ownerClientId) return true;
    if (room.fillBots && room.soloSwitchEnabled && slot.ownerClientId === this.session.getClientId()) {
      return true;
    }
    return false;
  }

  private stepToward(
    floor: FloorKey,
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    maxStep: number
  ): { x: number; y: number } | null {
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.5) return null;
    const ux = dx / dist;
    const uy = dy / dist;
    const step = Math.min(maxStep, dist);

    // Try straight diagonal, then single-axis slides
    const directX = x + ux * step;
    const directY = y + uy * step;
    if (this.world.canMove(floor, directX, directY, x, y)) return { x: directX, y: directY };

    let movedX = x;
    let movedY = y;
    if (Math.abs(ux * step) >= 0.4 && this.world.canMove(floor, directX, y, x, y)) movedX = directX;
    if (Math.abs(uy * step) >= 0.4 && this.world.canMove(floor, movedX, directY, x, y)) movedY = directY;
    if (Math.hypot(movedX - x, movedY - y) >= 1.5) return { x: movedX, y: movedY };

    // Bypass corners smoothly along +-45deg / +-90deg vectors
    const angles = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2];
    let best: { x: number; y: number; score: number } | null = null;
    for (const ang of angles) {
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      const rx = ux * cos - uy * sin;
      const ry = ux * sin + uy * cos;
      const cx = x + rx * step * 0.85;
      const cy = y + ry * step * 0.85;
      if (this.world.canMove(floor, cx, cy, x, y)) {
        const afterDist = Math.hypot(targetX - cx, targetY - cy);
        if (!best || afterDist < best.score) best = { x: cx, y: cy, score: afterDist };
      }
    }
    return best ? { x: best.x, y: best.y } : null;
  }

  private executeBotHelp(pid: number, helperRole: RoleId): boolean {
    const room = this.session.getRoom();
    const pDef = PUZZLES_BY_ID[pid];
    if (!room || !pDef) return false;
    if (!this.isBotControlled(room, helperRole)) return false;

    const script = BOT_HELPER_SCRIPTS[pid]?.[helperRole];
    if (!script) return false;

    if (script.statePatch) {
      this.session.patchPuzzle(pid, script.statePatch);
    }
    this.session.sendRadio(helperRole, script.tokens.slice(0, 3), {
      targetRoleId: null,
      note: null,
    });
    return true;
  }

  requestBotHelpForPuzzle(pid: number, helperRole?: RoleId) {
    const room = this.session.getRoom();
    const pDef = PUZZLES_BY_ID[pid];
    if (!room || !pDef) return;
    const candidates = helperRole ? [helperRole] : pDef.helperRoles;
    for (const r of candidates) {
      if (this.executeBotHelp(pid, r)) {
        this.sentClueFor.add(`${pDef.code}:${r}`);
        if (helperRole) break;
      }
    }
  }

  onRadioDirectedAtBot(pkt: RadioPacket) {
    const room = this.session.getRoom();
    if (!room || room.phase !== 'playing') return;
    if (room.hostClientId !== this.session.getClientId()) return;

    const senderSlot = room.slots[pkt.roleId];
    if (!senderSlot || senderSlot.isBot || this.isBotControlled(room, pkt.roleId)) return;

    // Radio is broadcast-only: bots in the room respond with their clue tokens when a player broadcasts
    const botCandidates = ROLE_ORDER.filter((r) => this.isBotControlled(room, r));
    if (botCandidates.length === 0) return;

    let responded = false;
    for (const botRole of botCandidates) {
      const roomPuzzle = Object.values(PUZZLES_BY_ID).find(
        (p) =>
          p.floor === senderSlot.floor &&
          p.room === senderSlot.scene &&
          !room.solvedPids.includes(p.id) &&
          p.helperRoles.includes(botRole)
      );
      if (roomPuzzle) {
        responded = true;
        window.setTimeout(() => {
          this.executeBotHelp(roomPuzzle.id, botRole);
          this.sentClueFor.add(`${roomPuzzle.code}:${botRole}`);
        }, 450);
      }
    }

    if (!responded) {
      const nearestBot = botCandidates[0];
      if (nearestBot) {
        window.setTimeout(() => {
          this.session.sendRadio(nearestBot, ['COOP_OK'], { targetRoleId: null, note: null });
        }, 450);
      }
    }
  }

  private getBotObjectTarget(pid: number, botRole: RoleId): [number, number] | null {
    const pDef = PUZZLES_BY_ID[pid];
    if (!pDef) return null;
    const fl = this.mapData.floors[pDef.floor];
    if (!fl) return null;
    const obj = fl.objects.find((o) => o.puzzles?.includes(pid) && getObjectOwnerRole(o, pDef) === botRole);
    if (!obj) return null;
    if (obj.interact) return obj.interact;
    return [obj.x + obj.width / 2, obj.y + obj.height + 8];
  }

  private tick() {
    const room = this.session.getRoom();
    if (!room || room.phase !== 'playing') return;
    if (room.hostClientId !== this.session.getClientId()) return;

    const activeRole = this.session.getMyRole();
    const activeSlot = room.slots[activeRole];
    if (!activeSlot) return;

    const p16 = (room.puzzleStates[16] || {}) as { beamReachedAtrium?: boolean; hereSent?: boolean };
    if (
      p16.beamReachedAtrium &&
      !p16.hereSent &&
      !room.solvedPids.includes(16) &&
      this.isBotControlled(room, 'lin') &&
      !this.sentClueFor.has('P16:HERE_BOT')
    ) {
      this.sentClueFor.add('P16:HERE_BOT');
      this.session.patchPuzzle(16, { hereSent: true });
      this.session.sendRadio('lin', ['COOP_HERE'], { note: null, targetRoleId: null });
    }
    const isP16GatherPhase = Boolean(p16.beamReachedAtrium && p16.hereSent && !room.solvedPids.includes(16));

    // Identify unsolved puzzles in the active player's current room
    const roomPuzzles = Object.values(PUZZLES_BY_ID).filter(
      (p) => p.floor === activeSlot.floor && p.room === activeSlot.scene && !room.solvedPids.includes(p.id)
    );

    // Free spots beside the player for following bots, assigned with idle hysteresis + nearest neighbor
    // so bots neither crisscross each other nor dance in place when the player stops.
    const followers = ROLE_ORDER.filter((r) => this.isBotControlled(room, r));
    const othersHere = ROLE_ORDER.filter((r) => r !== activeRole && !followers.includes(r))
      .map((r) => room.slots[r])
      .filter((s) => s && s.floor === activeSlot.floor && s.scene === activeSlot.scene)
      .map((s) => [s.x, s.y] as [number, number]);
    const candidates = this.world.findPartySpots(
      activeSlot.floor,
      activeSlot.x,
      activeSlot.y,
      Math.max(followers.length + 2, 4),
      othersHere
    );
    const placed: [number, number][] = [[activeSlot.x, activeSlot.y], ...othersHere];
    const formation = new Map<RoleId, [number, number]>();
    const needAssign: RoleId[] = [];

    for (const r of followers) {
      const s = room.slots[r];
      const distLeader = s ? Math.hypot(s.x - activeSlot.x, s.y - activeSlot.y) : Infinity;
      const validIdleSpot =
        !activeSlot.moving &&
        s &&
        s.floor === activeSlot.floor &&
        s.scene === activeSlot.scene &&
        distLeader >= 22 &&
        distLeader <= 62 &&
        this.world.canMove(s.floor, s.x, s.y, activeSlot.x, activeSlot.y) &&
        placed.every(([px, py]) => Math.abs(s.x - px) >= 20 || Math.abs(s.y - py) >= 32);
      if (validIdleSpot) {
        formation.set(r, [s.x, s.y]);
        placed.push([s.x, s.y]);
      } else {
        needAssign.push(r);
      }
    }

    const available = [...candidates];
    for (const r of needAssign) {
      const s = room.slots[r];
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < available.length; i++) {
        const [cx, cy] = available[i];
        if (!placed.every(([px, py]) => Math.abs(cx - px) >= 20 || Math.abs(cy - py) >= 32)) continue;
        const d = s ? Math.hypot(cx - s.x, cy - s.y) : i;
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      const chosen = available.splice(bestIdx, 1)[0] || [activeSlot.x, activeSlot.y];
      formation.set(r, chosen);
      placed.push(chosen);
    }

    for (const r of ROLE_ORDER) {
      if (!this.isBotControlled(room, r)) continue;
      const slot = room.slots[r];

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
          const step = Math.min(dist, 14);
          const nx = slot.x + (dx / dist) * step;
          const ny = slot.y + (dy / dist) * step;
          const dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
          this.session.moveSlot(r, { floor: '2F', scene: 'atrium', x: nx, y: ny, dir, moving: true });
        } else if (slot.moving) {
          this.session.moveSlot(r, { floor: '2F', scene: 'atrium', x: gx, y: gy, dir: 'down', moving: false });
        }
        continue;
      }

      // Promptly follow active player to the new room if separated
      if (slot.floor !== activeSlot.floor || slot.scene !== activeSlot.scene) {
        const fl = this.mapData.floors[activeSlot.floor];
        const nearScene = fl?.scenes[activeSlot.scene];
        if (nearScene) {
          const [tx, ty] = formation.get(r) || [activeSlot.x, activeSlot.y];
          this.session.moveSlot(r, {
            floor: activeSlot.floor,
            scene: activeSlot.scene,
            x: tx,
            y: ty,
            dir: faceToward(tx, ty, activeSlot.x, activeSlot.y),
            moving: false,
          });
          this.roomEnterTicks.set(`${r}:${activeSlot.floor}:${activeSlot.scene}`, 0);
        }
        continue;
      }

      // Check if this bot has an unsolved helper task in the current room
      const helperPuzzle = roomPuzzles.find((p) => p.helperRoles.includes(r));
      const roomKey = `${r}:${activeSlot.floor}:${activeSlot.scene}`;
      const ticksHere = (this.roomEnterTicks.get(roomKey) || 0) + 1;
      this.roomEnterTicks.set(roomKey, ticksHere);

      let targetX: number;
      let targetY: number;
      let objDist = Infinity;
      let following = false;

      if (helperPuzzle && !this.sentClueFor.has(`${helperPuzzle.code}:${r}`)) {
        const pt = this.getBotObjectTarget(helperPuzzle.id, r);
        if (pt) {
          targetX = pt[0];
          targetY = pt[1];
          objDist = Math.hypot(targetX - slot.x, targetY - slot.y);
          // Once near its clue/device (or after ~1.6s in the room), inspect it & radio the info!
          if (objDist <= 38 || ticksHere >= 15) {
            this.sentClueFor.add(`${helperPuzzle.code}:${r}`);
            this.executeBotHelp(helperPuzzle.id, r);
          }
        } else {
          this.sentClueFor.add(`${helperPuzzle.code}:${r}`);
          this.executeBotHelp(helperPuzzle.id, r);
          targetX = activeSlot.x;
          targetY = activeSlot.y;
        }
      } else {
        // Stand in its own free spot beside the active player
        [targetX, targetY] = formation.get(r) || [activeSlot.x, activeSlot.y];
        following = true;
      }

      const dx = targetX - slot.x;
      const dy = targetY - slot.y;
      const dist = Math.hypot(dx, dy);
      if (dist > (following ? 6 : 14)) {
        // Match tick step (~123 px/s at 110ms) to WorldEngine's glide speed so motion stays continuous.
        const maxStep = following ? (dist > 90 ? 18 : 13.5) : 12.5;
        const moved = this.stepToward(slot.floor, slot.x, slot.y, targetX, targetY, maxStep);
        if (moved) {
          const dir = faceToward(slot.x, slot.y, moved.x, moved.y);
          this.session.moveSlot(r, { floor: slot.floor, scene: slot.scene, x: moved.x, y: moved.y, dir, moving: true });
        } else if (slot.moving) {
          this.session.moveSlot(r, { floor: slot.floor, scene: slot.scene, x: slot.x, y: slot.y, dir: slot.dir, moving: false });
        }
      } else if (following) {
        // Arrived: stop and look at the player
        const lookDir = faceToward(slot.x, slot.y, activeSlot.x, activeSlot.y);
        if (slot.moving || slot.dir !== lookDir) {
          this.session.moveSlot(r, { floor: slot.floor, scene: slot.scene, x: slot.x, y: slot.y, dir: lookDir, moving: false });
        }
      } else if (slot.moving) {
        this.session.moveSlot(r, { floor: slot.floor, scene: slot.scene, x: slot.x, y: slot.y, dir: slot.dir, moving: false });
      }
    }
  }
}
