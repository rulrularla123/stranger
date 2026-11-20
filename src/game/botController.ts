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
      tokens: ['DIR_N', 'SYM_SUN', 'DIR_E', 'SYM_STAR', 'DIR_S', 'SYM_WAVE', 'DIR_W', 'SYM_MTN'],
      note: '방명록 해독: 북=☀생활, 동=★역사, 남=🌊도시, 서=⛰공예 (모두 0° 기준)',
    },
  },
  2: {
    maria: {
      tokens: ['NUM_1', 'SYM_SUN', 'NUM_2', 'SYM_WAVE', 'NUM_3', 'SYM_MTN'],
      note: '1다락=곡식단지, 2마루=바구니, 3기둥=돌절구 (등유 램프는 미끼)',
    },
  },
  3: {
    doyun: {
      tokens: ['ACT_ROT', 'VAL:180', 'NUM_0', 'VAL:0'],
      note: '기어 실측: 턴테이블 180°, 영혼의 배 뚜껑 기울기 0°로 맞추세요',
    },
  },
  4: {
    lin: {
      tokens: ['NUM_1', 'SYM_WAVE', 'NUM_2', 'DIR_W', 'NUM_3', 'DIR_N'],
      note: '해협 측량: 1521=비사야, 1898=말롤로스(서←), 1946=마닐라 북부(북↑)',
    },
  },
  5: {
    aisha: {
      tokens: ['NUM_1', 'SYM_SUN', 'NUM_2', 'SYM_VOLT', 'NUM_3', 'SYM_WAVE'],
      note: '직물 루페: 1줄 황금(☀) → 2줄 진홍(⚡) → 3줄 청록(🌊) 순서입니다',
    },
  },
  6: {
    maria: {
      tokens: ['NUM_2', 'DIR_E'],
      note: '노선표 판독: 2번 비논도 우회(S1=B, S2=B, S3=A) → 동쪽(→) 도개교',
    },
  },
  7: {
    lin: {
      tokens: ['NUM_1', 'VAL:25', 'NUM_2', 'VAL:50', 'NUM_3', 'VAL:100'],
      note: '배관 계통도: 1번=25%, 2번=50%, 3번=100% 개방 시 60 PSI 평형!',
    },
  },
  8: {
    aisha: {
      tokens: ['SYM_VOLT', 'VAL:70-90', 'NUM_2', 'VAL:1200'],
      note: '센서 경보: 보일러 70~90 PSI로 감압 후 1·2호기 1200 RPM 동기화하세요',
    },
  },
  9: {
    lin: {
      tokens: ['NUM_3', 'COOP_SWAP'],
      note: 'UPS 단락 점검: Bus 1·2 OFF, 3번 예비 우회 모선만 ON 하세요',
    },
    aisha: {
      tokens: ['VAL:60', 'COOP_OK'],
      note: '코일 센서: 발전기 100% 예열 후 크랭크 기동(60Hz) 하세요',
    },
  },
  10: {
    aisha: {
      tokens: ['SYM_WAVE', 'VAL:45/18', 'DIR_N'],
      note: '제습(45%/18°C) 완료! 침수 (2,2)(3,2)(2,3) 피해 북쪽 우회 → (4,1)',
      statePatch: { rh: 45, temp: 18 },
    },
    doyun: {
      tokens: ['NUM_1', 'VAL:1/3', 'SYM_SAFE'],
      note: '(1,3) 1번 방수 크레이트 걸쇠 체결 완료! 크레인으로 인양하세요',
      statePatch: { crateLatch: true },
    },
  },
  11: {
    aisha: {
      tokens: ['SYM_STAR', 'NUM_0', 'ACT_ROT'],
      note: 'UV 스캔: 3개 음절 모두 모음점 없는 무점(기본 모음 a)입니다',
    },
    doyun: {
      tokens: ['NUM_1', 'NUM_2', 'NUM_3', 'SYM_SUN'],
      note: '목판 판독: 자유(Kalayaan) 앞 세 자음은 KA(ᜃ) - LA(ᜎ) - YA(ᜌ)',
    },
  },
  12: {
    lin: {
      tokens: ['NUM_2', 'SYM_STAR', 'NUM_4', 'SYM_WAVE'],
      note: '마이크로필름 초점(60,40) 맞춤! 2열 ★별자리, 4열 🌊파도 타공하세요',
      statePatch: { fx: 60, fy: 40 },
    },
  },
  13: {
    maria: {
      tokens: ['SYM_WAVE', 'VAL:2', 'SYM_SUN', 'VAL:1', 'VAL:7.0'],
      note: '화학 노트: 청록 2방울 + 호박 1방울 + 투명 0방울 = pH 7.0, 세척 90%+',
    },
    doyun: {
      tokens: ['COOP_OK'],
      note: '약품 보관장 시약 공급 안전 밸브 개방 완료! 스포이드 사용 가능합니다',
      statePatch: { valveOpen: true },
    },
  },
  14: {
    doyun: {
      tokens: ['NUM_1', 'NUM_3', 'COOP_SWAP', 'VAL:0'],
      note: '도르래 순서: 대각선 #1(좌상)·#3(우하) 먼저 0% 풀고 #2·#4! 밀랍 0° 압착',
    },
  },
  15: {
    lin: {
      tokens: ['DIR_W', 'ACT_ROT', 'VAL:0'],
      note: '축선 측량: 서쪽(←) 원점 이동 + 시계 90° 회전(0°)으로 3점 일치',
    },
  },
  16: {
    maria: {
      tokens: ['DIR_E', 'DIR_S', 'ACT_ROT'],
      note: '항로 비문: 화살표 프리즘 M1=동(→), M2=남(↓)으로 맞추세요 (M3는 서하린 확인)',
    },
    doyun: {
      tokens: ['COOP_OK', 'NUM_3', 'DIR_W'],
      note: '거치대 베어링 잠금 해제 완료! 3번 프리즘 방향은 M3=서(←) 아치문 쪽입니다',
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
    this.session.sendRadio(helperRole, script.tokens, {
      targetRoleId: pDef.mainRole,
      note: script.note,
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
    if (!senderSlot || senderSlot.isBot) return;

    const botTargets = new Set<RoleId>();
    if (pkt.targetRoleId && pkt.targetRoleId !== pkt.roleId) {
      botTargets.add(pkt.targetRoleId);
    }
    for (const tid of pkt.tokenIds) {
      if (tid.startsWith('ROLE:')) {
        const rid = tid.slice(5) as RoleId;
        if (ROLE_ORDER.includes(rid) && rid !== pkt.roleId) botTargets.add(rid);
      }
    }
    if (botTargets.size === 0) return;

    for (const botRole of botTargets) {
      if (!this.isBotControlled(room, botRole)) continue;

      // Prefer an unsolved puzzle in the sender's current room where this bot is a helper
      const roomPuzzle = Object.values(PUZZLES_BY_ID).find(
        (p) =>
          p.floor === senderSlot.floor &&
          p.room === senderSlot.scene &&
          !room.solvedPids.includes(p.id) &&
          p.helperRoles.includes(botRole)
      );

      window.setTimeout(() => {
        if (roomPuzzle) {
          this.executeBotHelp(roomPuzzle.id, botRole);
          this.sentClueFor.add(`${roomPuzzle.code}:${botRole}`);
        } else {
          // Inform the player if this bot has an unsolved puzzle elsewhere
          const nextElsewhere = Object.values(PUZZLES_BY_ID).find(
            (p) => !room.solvedPids.includes(p.id) && p.helperRoles.includes(botRole)
          );
          const note = nextElsewhere
            ? `${ROLES[botRole].name}: 이 방엔 제 단서가 없어요. ${nextElsewhere.roomLabel}(${nextElsewhere.code})에서 도울 수 있습니다!`
            : `${ROLES[botRole].name}: 지금 맡을 단서 작업이 모두 완료되었습니다!`;
          this.session.sendRadio(botRole, ['COOP_OK'], {
            targetRoleId: pkt.roleId,
            note,
          });
        }
      }, 450);
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
      this.session.sendRadio('lin', ['COOP_HERE'], { note: '2층 중앙 홀 발판으로 모여!' });
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
