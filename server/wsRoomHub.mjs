import { WebSocketServer } from 'ws';

const ROLE_ORDER = ['doyun', 'maria', 'lin', 'aisha'];
const DEFAULT_NAMES = {
  doyun: '서하린',
  maria: '이안',
  lin: '린',
  aisha: '카이',
};
const DEFAULT_SPAWNS = {
  doyun: { floor: '1F', scene: 'hall', x: 922, y: 1550, dir: 'down' },
  maria: { floor: '1F', scene: 'hall', x: 942, y: 1556, dir: 'down' },
  lin: { floor: '1F', scene: 'hall', x: 962, y: 1556, dir: 'down' },
  aisha: { floor: '1F', scene: 'hall', x: 982, y: 1550, dir: 'down' },
};

export function createInitialPuzzleStates() {
  return {
    1: { outerDeg: 90, innerDeg: 180, locked: false },
    2: { slots: { roof: null, floor: null, stilt: null }, picked: null },
    3: { turntableDeg: 60, lidTiltDeg: -15, seated: false },
    4: { links: { '1521': null, '1898': null, '1946': null }, selectedLeft: null },
    5: { rows: [null, null, null], heddleOpen: [false, false, false] },
    6: { switches: ['A', 'A', 'B'], dir: 'N', dispatched: false },
    7: { valves: [100, 50, 25] },
    8: { boilerPsi: 145, pump1Rpm: 800, pump2Rpm: 1560, synced: false },
    9: { heat: 0, genRunning: false, bus: [true, true, false], breaker: false },
    10: { rh: 72, temp: 24, crateLatch: false, crane: [0, 1], cratePos: [1, 3], holding: false },
    11: {
      activeSlot: 0,
      slots: [
        { syl: 'BA', kudlit: 'down' },
        { syl: 'MA', kudlit: 'up' },
        { syl: 'PA', kudlit: 'down' },
      ],
    },
    12: { fx: 15, fy: 85, holes: [false, false, false, false], punchGrid: Array(16).fill(false), stamped: false },
    13: { valveOpen: false, cyan: 0, amber: 0, clear: 0, scrubGrid: Array(24).fill(false) },
    14: { rope: [100, 100, 100, 100], waxRot: [90, 180, 270], pressed: false },
    15: { ox: 96, oy: -48, rot: 270 },
    16: {
      prisms: [0, 45, 45],
      mountUnlocked: false,
      beamReachedAtrium: false,
      hereSent: false,
      pads: [false, false, false, false],
    },
  };
}

function generateRoomCode(existing) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 100; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    if (!existing.has(code)) return code;
  }
  return 'STR206';
}

export function attachWsRoomHub(httpServer, { destroyUnmatched = false } = {}) {
  const wss = new WebSocketServer({ noServer: true });
  const rooms = new Map();
  const clients = new Map();

  function createRoomRecord(code, hostClientId, hostNick) {
    const slots = {};
    for (const r of ROLE_ORDER) {
      const sp = DEFAULT_SPAWNS[r];
      slots[r] = {
        roleId: r,
        ownerClientId: r === 'doyun' ? hostClientId : null,
        nickname: r === 'doyun' ? (hostNick || DEFAULT_NAMES[r]) : DEFAULT_NAMES[r],
        isBot: r !== 'doyun',
        floor: sp.floor,
        scene: sp.scene,
        x: sp.x,
        y: sp.y,
        dir: sp.dir,
        moving: false,
      };
    }
    return {
      code,
      hostClientId,
      phase: 'lobby',
      difficulty: '보통',
      fillBots: true,
      soloSwitchEnabled: true,
      slots,
      solvedPids: [],
      puzzleStates: createInitialPuzzleStates(),
      powerRestored: false,
      coronationTriggered: false,
      radioSeq: 0,
      radioLog: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  function serializeRoom(room) {
    return {
      code: room.code,
      hostClientId: room.hostClientId,
      phase: room.phase,
      difficulty: room.difficulty,
      fillBots: room.fillBots,
      soloSwitchEnabled: room.soloSwitchEnabled,
      slots: room.slots,
      solvedPids: room.solvedPids,
      puzzleStates: room.puzzleStates,
      powerRestored: room.powerRestored,
      coronationTriggered: room.coronationTriggered,
      radioLog: room.radioLog,
    };
  }

  function sendJson(ws, payload) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(payload));
    }
  }

  function broadcastRoom(room, payload, exceptClientId = null) {
    const raw = JSON.stringify(payload);
    for (const [cid, info] of clients.entries()) {
      if (info.roomCode === room.code && cid !== exceptClientId && info.ws.readyState === 1) {
        info.ws.send(raw);
      }
    }
  }

  function leaveCurrentRoom(clientId) {
    const info = clients.get(clientId);
    if (!info || !info.roomCode) return;
    const room = rooms.get(info.roomCode);
    info.roomCode = null;
    if (!room) return;

    for (const r of ROLE_ORDER) {
      if (room.slots[r].ownerClientId === clientId) {
        room.slots[r].ownerClientId = null;
        room.slots[r].nickname = DEFAULT_NAMES[r];
        room.slots[r].isBot = room.fillBots;
      }
    }

    const remainingHumans = [];
    for (const [cid, cinfo] of clients.entries()) {
      if (cinfo.roomCode === room.code) remainingHumans.push(cid);
    }

    if (remainingHumans.length === 0) {
      rooms.delete(room.code);
      return;
    }

    if (room.hostClientId === clientId) {
      room.hostClientId = remainingHumans[0];
    }
    broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) });
  }

  wss.on('connection', (ws) => {
    const clientId = 'C' + Math.random().toString(36).slice(2, 10);
    clients.set(clientId, { ws, roomCode: null });
    sendJson(ws, { type: 'welcome', clientId });

    ws.on('message', (buf) => {
      let msg;
      try {
        msg = JSON.parse(String(buf));
      } catch {
        return;
      }
      const cinfo = clients.get(clientId);
      if (!cinfo) return;

      if (msg.type === 'create_room') {
        leaveCurrentRoom(clientId);
        const code = generateRoomCode(rooms);
        const room = createRoomRecord(code, clientId, (msg.nickname || '').trim() || '서하린');
        if (typeof msg.fillBots === 'boolean') {
          room.fillBots = msg.fillBots;
          for (const r of ROLE_ORDER) {
            if (!room.slots[r].ownerClientId) room.slots[r].isBot = room.fillBots;
          }
        }
        rooms.set(code, room);
        cinfo.roomCode = code;
        sendJson(ws, { type: 'room_joined', clientId, assignedRole: 'doyun', room: serializeRoom(room) });
        return;
      }

      if (msg.type === 'join_room') {
        const code = String(msg.code || '').trim().toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          sendJson(ws, { type: 'error', message: `방 코드 '${code}' 를 찾을 수 없습니다.` });
          return;
        }
        leaveCurrentRoom(clientId);
        cinfo.roomCode = code;
        let assignedRole = ROLE_ORDER.find((r) => !room.slots[r].ownerClientId) || null;
        if (!assignedRole) {
          // Allow observer / shared role join if all 4 slots taken
          assignedRole = 'doyun';
        } else {
          room.slots[assignedRole].ownerClientId = clientId;
          room.slots[assignedRole].isBot = false;
          room.slots[assignedRole].nickname = (msg.nickname || '').trim() || DEFAULT_NAMES[assignedRole];
        }
        // Disable auto-solo switching if >= 2 humans unless explicitly enabled
        const humanCount = Object.values(room.slots).filter((s) => s.ownerClientId).length;
        if (humanCount >= 2 && typeof msg.preserveSoloSwitch !== 'boolean') {
          room.soloSwitchEnabled = false;
        }
        sendJson(ws, { type: 'room_joined', clientId, assignedRole, room: serializeRoom(room) });
        broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) }, clientId);
        return;
      }

      const room = cinfo.roomCode ? rooms.get(cinfo.roomCode) : null;
      if (!room) return;
      room.updatedAt = Date.now();

      if (msg.type === 'select_role') {
        const target = msg.roleId;
        if (!ROLE_ORDER.includes(target)) return;
        const slot = room.slots[target];
        if (slot.ownerClientId && slot.ownerClientId !== clientId) {
          sendJson(ws, { type: 'error', message: `${DEFAULT_NAMES[target]} 역할은 다른 플레이어가 사용 중입니다.` });
          return;
        }
        for (const r of ROLE_ORDER) {
          if (room.slots[r].ownerClientId === clientId) {
            room.slots[r].ownerClientId = null;
            room.slots[r].isBot = room.fillBots;
            room.slots[r].nickname = DEFAULT_NAMES[r];
          }
        }
        slot.ownerClientId = clientId;
        slot.isBot = false;
        slot.nickname = (msg.nickname || '').trim() || DEFAULT_NAMES[target];
        broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) });
        return;
      }

      if (msg.type === 'update_lobby') {
        if (typeof msg.fillBots === 'boolean') {
          room.fillBots = msg.fillBots;
          for (const r of ROLE_ORDER) {
            if (!room.slots[r].ownerClientId) room.slots[r].isBot = room.fillBots;
          }
        }
        if (typeof msg.soloSwitchEnabled === 'boolean') {
          room.soloSwitchEnabled = msg.soloSwitchEnabled;
        }
        if (typeof msg.difficulty === 'string') {
          room.difficulty = msg.difficulty;
        }
        if (typeof msg.nickname === 'string' && msg.roleId && room.slots[msg.roleId]?.ownerClientId === clientId) {
          room.slots[msg.roleId].nickname = msg.nickname.trim() || DEFAULT_NAMES[msg.roleId];
        }
        broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) });
        return;
      }

      if (msg.type === 'start_game') {
        room.phase = 'playing';
        broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) });
        return;
      }

      if (msg.type === 'player_move') {
        const { roleId, floor, scene, x, y, dir, moving } = msg;
        const slot = room.slots[roleId];
        if (!slot) return;
        slot.floor = floor;
        slot.scene = scene;
        slot.x = x;
        slot.y = y;
        slot.dir = dir;
        slot.moving = Boolean(moving);
        broadcastRoom(
          room,
          { type: 'player_moved', roleId, floor, scene, x, y, dir, moving: slot.moving },
          clientId
        );
        return;
      }

      if (msg.type === 'send_radio') {
        const { roleId, tokenIds, targetRoleId, note } = msg;
        if (!ROLE_ORDER.includes(roleId) || !Array.isArray(tokenIds)) return;
        const cleanTokens = tokenIds
          .map((t) => {
            const s = String(t || '').trim();
            if (s.startsWith('VAL:')) {
              const num = s.slice(4).replace(/[^0-9.\-/]/g, '').slice(0, 10);
              return num ? `VAL:${num}` : '';
            }
            return s;
          })
          .filter(Boolean)
          .slice(0, 8);
        const cleanNote = note ? String(note).trim().slice(0, 160) : null;
        if (cleanTokens.length === 0 && !cleanNote) return;
        const resolvedTarget = targetRoleId && ROLE_ORDER.includes(targetRoleId) ? targetRoleId : null;
        const resolvedTargetName = resolvedTarget
          ? room.slots[resolvedTarget]?.nickname || DEFAULT_NAMES[resolvedTarget]
          : null;
        const now = Date.now();
        const entry = {
          id: 'R' + now + '_' + (++room.radioSeq),
          seq: room.radioSeq,
          roleId,
          senderName: room.slots[roleId]?.nickname || DEFAULT_NAMES[roleId],
          targetRoleId: resolvedTarget,
          targetName: resolvedTargetName,
          tokenIds: cleanTokens,
          note: cleanNote,
          ts: now,
          expiresAt: now + 12000,
        };
        room.radioLog = [entry, ...room.radioLog].slice(0, 40);
        if (cleanTokens.includes('COOP_HERE') && room.puzzleStates[16]?.beamReachedAtrium) {
          room.puzzleStates[16].hereSent = true;
        }
        broadcastRoom(room, {
          type: 'radio_broadcast',
          entry,
          p16: room.puzzleStates[16],
        });
        return;
      }

      if (msg.type === 'puzzle_patch') {
        const pid = Number(msg.pid);
        if (!room.puzzleStates[pid]) return;
        room.puzzleStates[pid] = { ...room.puzzleStates[pid], ...msg.patch };
        broadcastRoom(room, {
          type: 'puzzle_updated',
          pid,
          state: room.puzzleStates[pid],
          solvedPids: room.solvedPids,
          powerRestored: room.powerRestored,
          coronationTriggered: room.coronationTriggered,
        });
        return;
      }

      if (msg.type === 'puzzle_solve') {
        const pid = Number(msg.pid);
        if (pid < 1 || pid > 16) return;
        if (!room.solvedPids.includes(pid)) {
          room.solvedPids = [...room.solvedPids, pid].sort((a, b) => a - b);
        }
        if (msg.state && room.puzzleStates[pid]) {
          room.puzzleStates[pid] = { ...room.puzzleStates[pid], ...msg.state };
        }
        if (pid === 9) {
          room.powerRestored = true;
        }
        if (pid === 16) {
          room.coronationTriggered = true;
          room.phase = 'ended';
        }
        broadcastRoom(room, {
          type: 'puzzle_updated',
          pid,
          state: room.puzzleStates[pid],
          solvedPids: room.solvedPids,
          powerRestored: room.powerRestored,
          coronationTriggered: room.coronationTriggered,
          phase: room.phase,
          message: msg.message || '',
        });
        return;
      }

      if (msg.type === 'reset_game') {
        room.phase = 'playing';
        room.solvedPids = [];
        room.puzzleStates = createInitialPuzzleStates();
        room.powerRestored = false;
        room.coronationTriggered = false;
        room.radioLog = [];
        for (const r of ROLE_ORDER) {
          const sp = DEFAULT_SPAWNS[r];
          Object.assign(room.slots[r], sp, { moving: false });
        }
        broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) });
      }
    });

    ws.on('close', () => {
      leaveCurrentRoom(clientId);
      clients.delete(clientId);
    });
  });

  httpServer.on('upgrade', (req, socket, head) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      if (url.pathname === '/ws') {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      } else if (destroyUnmatched) {
        socket.destroy();
      }
    } catch {
      if (destroyUnmatched) socket.destroy();
    }
  });

  return { wss, rooms };
}
