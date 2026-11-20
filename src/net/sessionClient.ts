import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  CharacterSlot,
  Direction,
  FloorKey,
  RadioPacket,
  RoleId,
  RoomState,
  TransportMode,
} from '../types/stranger.ts';
import { ROLE_ORDER, ROLES, sanitizeRadioNumber } from '../data/cMenuTokens.ts';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  recordRoomClear,
  roomStateToRow,
  rowToRoomState,
  type RoomsRow,
} from './supabaseClient.ts';

type Listener = (state: RoomState, eventType: string, extra?: unknown) => void;

const CLIENT_ID_KEY = 'stranger2_client_id';
const LAST_ROOM_KEY = 'stranger2_last_room';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function loadOrCreateClientId(): string {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const saved = window.sessionStorage.getItem(CLIENT_ID_KEY);
    if (saved && saved.length >= 6 && saved.length <= 64) return saved;
    const fresh = 'CL_' + Math.random().toString(36).slice(2, 10).padEnd(8, '0');
    window.sessionStorage.setItem(CLIENT_ID_KEY, fresh);
    return fresh;
  }
  return 'CL_' + Math.random().toString(36).slice(2, 10).padEnd(8, '0');
}

function saveLastRoomCode(code: string | null) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  if (code) window.sessionStorage.setItem(LAST_ROOM_KEY, code);
  else window.sessionStorage.removeItem(LAST_ROOM_KEY);
}

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function createInitialPuzzleStatesClient(): Record<number, Record<string, unknown>> {
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
      prisms: ['S', 'W', 'N'],
      mountUnlocked: false,
      beamReachedAtrium: false,
      hereSent: false,
      pads: [false, false, false, false],
    },
  };
}

function normalizePuzzleStates(room: RoomState): RoomState {
  const base = createInitialPuzzleStatesClient();
  for (const [k, v] of Object.entries(room.puzzleStates || {})) {
    const pid = Number(k);
    if (!Number.isNaN(pid) && v && typeof v === 'object') {
      base[pid] = { ...(base[pid] || {}), ...v };
    }
  }
  const p16 = base[16] as { prisms?: unknown[] };
  if (
    !Array.isArray(p16.prisms) ||
    p16.prisms.length !== 3 ||
    p16.prisms.some((dir) => typeof dir !== 'string' || !['N', 'E', 'S', 'W'].includes(dir))
  ) {
    p16.prisms = ['S', 'W', 'N'];
  }
  room.puzzleStates = base;
  return room;
}

const DEFAULT_SPAWNS: Record<RoleId, { floor: FloorKey; scene: string; x: number; y: number; dir: Direction }> = {
  doyun: { floor: '1F', scene: 'hall', x: 913, y: 1552, dir: 'down' },
  maria: { floor: '1F', scene: 'hall', x: 939, y: 1552, dir: 'down' },
  lin: { floor: '1F', scene: 'hall', x: 965, y: 1552, dir: 'down' },
  aisha: { floor: '1F', scene: 'hall', x: 991, y: 1552, dir: 'down' },
};

function createLocalRoom(code: string, clientId: string, nickname: string, fillBots = true): RoomState {
  const slots = {} as Record<RoleId, CharacterSlot>;
  for (const r of ROLE_ORDER) {
    const sp = DEFAULT_SPAWNS[r];
    slots[r] = {
      roleId: r,
      ownerClientId: r === 'doyun' ? clientId : null,
      nickname: r === 'doyun' ? nickname || ROLES[r].name : ROLES[r].name,
      isBot: r !== 'doyun' ? fillBots : false,
      ...sp,
      moving: false,
    };
  }
  return {
    code,
    hostClientId: clientId,
    phase: 'lobby',
    difficulty: '보통',
    fillBots,
    soloSwitchEnabled: true,
    slots,
    solvedPids: [],
    puzzleStates: createInitialPuzzleStatesClient(),
    powerRestored: false,
    coronationTriggered: false,
    radioLog: [],
    startedAt: null,
  };
}

export class SessionClient {
  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;
  private sbChannel: RealtimeChannel | null = null;
  private transportMode: TransportMode = 'local';
  private connected = false;
  private clientId = loadOrCreateClientId();
  private myRole: RoleId = 'doyun';
  private room: RoomState | null = null;
  private listeners = new Set<Listener>();
  private lastMoveSentAt = 0;
  private pendingConnect: Promise<boolean> | null = null;
  private patchSaveTimer: number | null = null;
  private clearRecorded = false;
  private dbWriteQueue: Promise<void> = Promise.resolve();
  private radioSeq = 0;

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(eventType: string, extra?: unknown) {
    if (!this.room) return;
    for (const fn of this.listeners) fn(this.room, eventType, extra);
  }

  getClientId(): string {
    return this.clientId;
  }

  getMyRole(): RoleId {
    return this.myRole;
  }

  getLastRoomCode(): string | null {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const saved = window.sessionStorage.getItem(LAST_ROOM_KEY);
    return saved && saved.length === 6 ? saved : null;
  }

  getTransportMode(): TransportMode {
    return this.transportMode;
  }

  getConnectionLabel(): string {
    if (this.transportMode === 'supabase' && this.connected) return 'Supabase 실시간';
    if (this.transportMode === 'ws' && this.isWsConnected()) return '실시간 WebSocket';
    return '로컬/탭 동기화';
  }

  setLocalActiveRole(roleId: RoleId) {
    this.myRole = roleId;
    if (this.room) {
      this.emit('role_switched', { roleId });
    }
  }

  getRoom(): RoomState | null {
    return this.room;
  }

  isWsConnected(): boolean {
    if (this.transportMode === 'supabase') return this.connected;
    if (this.transportMode === 'ws') {
      return this.connected && this.ws?.readyState === WebSocket.OPEN;
    }
    return false;
  }

  async connectWs(): Promise<boolean> {
    if (this.transportMode === 'ws' && this.isWsConnected()) return true;
    if (this.pendingConnect) return this.pendingConnect;

    this.pendingConnect = new Promise<boolean>((resolve) => {
      if (typeof window === 'undefined' || !('WebSocket' in window)) {
        resolve(false);
        return;
      }
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${window.location.host}/ws`;
      let settled = false;
      const done = (ok: boolean) => {
        if (!settled) {
          settled = true;
          this.pendingConnect = null;
          resolve(ok);
        }
      };

      try {
        const ws = new WebSocket(url);
        const timer = window.setTimeout(() => done(false), 1800);
        ws.onopen = () => {
          window.clearTimeout(timer);
          this.ws = ws;
          this.transportMode = 'ws';
          this.connected = true;
          done(true);
        };
        ws.onerror = () => {
          window.clearTimeout(timer);
          if (this.transportMode === 'ws') this.connected = false;
          done(false);
        };
        ws.onclose = () => {
          if (this.transportMode === 'ws') this.connected = false;
        };
        ws.onmessage = (ev) => this.handleWsMessage(String(ev.data));
      } catch {
        done(false);
      }
    });
    return this.pendingConnect;
  }

  private handleWsMessage(raw: string) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === 'welcome' && typeof msg.clientId === 'string') {
      this.clientId = msg.clientId;
      return;
    }

    if (msg.type === 'error' && typeof msg.message === 'string') {
      this.emit('error', msg.message);
      return;
    }

    if (msg.type === 'room_joined' && msg.room) {
      this.room = msg.room as RoomState;
      if (typeof msg.clientId === 'string') this.clientId = msg.clientId;
      if (typeof msg.assignedRole === 'string') this.myRole = msg.assignedRole as RoleId;
      this.bindBroadcastChannel(this.room.code);
      this.emit('room_joined');
      return;
    }

    if (msg.type === 'room_state' && msg.room) {
      const next = msg.room as RoomState;
      this.room = next;
      const mine = ROLE_ORDER.find((r) => next.slots[r].ownerClientId === this.clientId);
      if (mine && (next.phase === 'lobby' || !next.soloSwitchEnabled)) {
        this.myRole = mine;
      }
      this.emit('room_state');
      return;
    }

    if (msg.type === 'player_moved' && this.room) {
      const roleId = msg.roleId as RoleId;
      const slot = this.room.slots[roleId];
      if (slot) {
        slot.floor = msg.floor as FloorKey;
        slot.scene = msg.scene as string;
        slot.x = Number(msg.x);
        slot.y = Number(msg.y);
        slot.dir = msg.dir as Direction;
        slot.moving = Boolean(msg.moving);
        this.emit('player_moved', { roleId });
      }
      return;
    }

    if (msg.type === 'radio_broadcast' && this.room && msg.entry) {
      const entry = msg.entry as RadioPacket;
      if (!this.room.radioLog.some((e) => e.id === entry.id)) {
        this.room.radioLog = [entry, ...this.room.radioLog].slice(0, 40);
      }
      if (msg.p16) {
        this.room.puzzleStates[16] = msg.p16 as Record<string, unknown>;
      }
      this.emit('radio_broadcast', entry);
      return;
    }

    if (msg.type === 'puzzle_updated' && this.room) {
      const pid = Number(msg.pid);
      if (msg.state) this.room.puzzleStates[pid] = msg.state as Record<string, unknown>;
      if (Array.isArray(msg.solvedPids)) this.room.solvedPids = msg.solvedPids as number[];
      if (typeof msg.powerRestored === 'boolean') this.room.powerRestored = msg.powerRestored;
      if (typeof msg.coronationTriggered === 'boolean') {
        this.room.coronationTriggered = msg.coronationTriggered;
      }
      if (typeof msg.phase === 'string') {
        this.room.phase = msg.phase as RoomState['phase'];
      }
      this.emit('puzzle_updated', { pid, message: msg.message });
    }
  }

  private async unsubscribeSupabaseChannel() {
    const sb = getSupabaseClient();
    if (this.sbChannel && sb) {
      try {
        await this.sbChannel.untrack();
      } catch {
        // ignore untrack errors
      }
      await sb.removeChannel(this.sbChannel);
    }
    this.sbChannel = null;
  }

  private async subscribeSupabaseChannel(code: string): Promise<boolean> {
    const sb = getSupabaseClient();
    if (!sb) return false;
    await this.unsubscribeSupabaseChannel();

    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const done = (ok: boolean) => {
        if (!settled) {
          settled = true;
          resolve(ok);
        }
      };

      const channel = sb.channel(`stranger-room:${code}`, {
        config: {
          broadcast: { self: false },
          presence: { key: this.clientId },
        },
      });
      this.sbChannel = channel;

      const timer = window.setTimeout(() => done(false), 4000);

      channel
        .on('broadcast', { event: 'room_state' }, ({ payload }) => {
          const next = payload?.room as RoomState | undefined;
          if (!next || !this.room || next.code !== this.room.code) return;
          this.room = normalizePuzzleStates(next);
          this.clearRecorded = Boolean(this.room.coronationTriggered);
          const mine = ROLE_ORDER.find((r) => this.room!.slots[r]?.ownerClientId === this.clientId);
          if (mine && (this.room.phase === 'lobby' || !this.room.soloSwitchEnabled)) {
            this.myRole = mine;
          }
          this.emit('room_state');
        })
        .on('broadcast', { event: 'player_move' }, ({ payload }) => {
          if (!this.room || !payload) return;
          const roleId = payload.roleId as RoleId;
          const slot = this.room.slots[roleId];
          if (!slot) return;
          slot.floor = payload.floor as FloorKey;
          slot.scene = String(payload.scene);
          slot.x = Number(payload.x);
          slot.y = Number(payload.y);
          slot.dir = payload.dir as Direction;
          slot.moving = Boolean(payload.moving);
          this.emit('player_moved', { roleId });
        })
        .on('broadcast', { event: 'radio_broadcast' }, ({ payload }) => {
          if (!this.room || !payload?.entry) return;
          const entry = payload.entry as RadioPacket;
          if (!this.room.radioLog.some((e) => e.id === entry.id)) {
            this.room.radioLog = [entry, ...this.room.radioLog].slice(0, 40);
          }
          if (payload.p16) {
            this.room.puzzleStates[16] = payload.p16 as Record<string, unknown>;
          }
          if (entry.tokenIds.includes('COOP_HERE') && this.room.puzzleStates[16]?.beamReachedAtrium) {
            this.room.puzzleStates[16].hereSent = true;
          }
          this.emit('radio_broadcast', entry);
        })
        .on('broadcast', { event: 'puzzle_updated' }, ({ payload }) => {
          if (!this.room || !payload) return;
          const pid = Number(payload.pid);
          if (payload.state && !Number.isNaN(pid)) {
            this.room.puzzleStates[pid] = payload.state as Record<string, unknown>;
          }
          if (Array.isArray(payload.solvedPids)) {
            this.room.solvedPids = payload.solvedPids as number[];
          }
          if (typeof payload.powerRestored === 'boolean') {
            this.room.powerRestored = payload.powerRestored;
          }
          if (typeof payload.coronationTriggered === 'boolean') {
            this.room.coronationTriggered = payload.coronationTriggered;
            if (payload.coronationTriggered) this.clearRecorded = true;
          }
          if (typeof payload.phase === 'string') {
            this.room.phase = payload.phase as RoomState['phase'];
          }
          this.emit('puzzle_updated', { pid, message: payload.message });
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          if (!this.room || this.transportMode !== 'supabase') return;
          const departedIds = new Set<string>();
          if (key) departedIds.add(key);
          for (const p of leftPresences || []) {
            const cid = (p as { clientId?: string }).clientId;
            if (cid) departedIds.add(cid);
          }
          const activePresence = channel.presenceState();
          for (const departedId of departedIds) {
            if (activePresence[departedId]?.length) continue;
            this.handleSupabasePeerLeave(departedId);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            window.clearTimeout(timer);
            this.connected = true;
            this.transportMode = 'supabase';
            const nick = this.room?.slots[this.myRole]?.nickname || ROLES[this.myRole].name;
            void channel.track({ clientId: this.clientId, roleId: this.myRole, nickname: nick });
            if (settled) this.emit('room_state');
            done(true);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            window.clearTimeout(timer);
            if (this.transportMode === 'supabase') this.connected = false;
            done(false);
          }
        });
    });
  }

  private handleSupabasePeerLeave(departedId: string) {
    if (!this.room || departedId === this.clientId) return;
    const ownedRoles = ROLE_ORDER.filter((r) => this.room!.slots[r]?.ownerClientId === departedId);
    if (ownedRoles.length === 0) return;

    // Elect a single authoritative updater (current host, or first remaining human owner)
    let nextHostId = this.room.hostClientId;
    if (nextHostId === departedId) {
      const candidate = ROLE_ORDER.map((r) => this.room!.slots[r]?.ownerClientId).find(
        (id) => Boolean(id && id !== departedId)
      );
      if (candidate) nextHostId = candidate;
    }
    if (nextHostId !== this.clientId) return;

    this.room.hostClientId = nextHostId;
    for (const r of ownedRoles) {
      const slot = this.room.slots[r];
      slot.ownerClientId = null;
      slot.isBot = this.room.fillBots;
      slot.nickname = ROLES[r].name;
    }
    this.sendSupabaseBroadcast('room_state', { room: this.room });
    this.enqueueSupabaseUpdate(() =>
      this.room
        ? {
            host_client_id: this.room.hostClientId,
            slots: this.room.slots,
          }
        : null
    );
    this.emit('room_state');
  }

  private sendSupabaseBroadcast(event: string, payload: Record<string, unknown>) {
    if (this.transportMode !== 'supabase' || !this.sbChannel || !this.connected) return;
    void this.sbChannel.send({ type: 'broadcast', event, payload });
  }

  private enqueueSupabaseUpdate(
    buildPatch: () => Partial<RoomsRow> | null,
    afterCommit?: (ok: boolean) => Promise<void>
  ) {
    if (this.transportMode !== 'supabase') return;
    const sb = getSupabaseClient();
    const code = this.room?.code;
    if (!sb || !code) return;

    this.dbWriteQueue = this.dbWriteQueue
      .then(async () => {
        const patch = buildPatch();
        if (!patch) return;
        const { error } = await sb.from('rooms').update(patch).eq('code', code);
        if (error) {
          console.warn('[Supabase] rooms update failed:', error.message);
        }
        if (afterCommit) await afterCommit(!error);
      })
      .catch((err) => {
        console.warn('[Supabase] rooms write error:', err);
      });
  }

  private bindBroadcastChannel(code: string) {
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    this.bc = new BroadcastChannel(`stranger2:${code}`);
    this.bc.onmessage = (ev) => {
      if (this.isWsConnected()) return;
      const data = ev.data;
      if (!data || data.sender === this.clientId) return;
      if (data.type === 'bc_room_sync' && data.room) {
        this.room = normalizePuzzleStates(data.room as RoomState);
        this.emit('room_state');
      } else if (data.type === 'bc_move' && this.room) {
        const slot = this.room.slots[data.roleId as RoleId];
        if (slot) {
          Object.assign(slot, data.pos);
          this.emit('player_moved', { roleId: data.roleId });
        }
      }
    };
  }

  private sendWs(payload: Record<string, unknown>) {
    if (this.transportMode === 'ws' && this.isWsConnected() && this.ws) {
      this.ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  private syncBc(type = 'bc_room_sync', payload?: Record<string, unknown>) {
    if (!this.bc || !this.room || this.isWsConnected()) return;
    this.bc.postMessage(payload || { type, sender: this.clientId, room: this.room });
  }

  async createRoom(nickname: string, fillBots = true): Promise<RoomState> {
    const sb = getSupabaseClient();
    if (sb) {
      try {
        for (let attempt = 0; attempt < 5; attempt++) {
          const code = generateRoomCode();
          const draft = createLocalRoom(code, this.clientId, nickname, fillBots);
          const { error } = await sb.from('rooms').insert(roomStateToRow(draft));
          if (!error) {
            this.room = draft;
            this.myRole = 'doyun';
            this.clearRecorded = false;
            this.transportMode = 'supabase';
            await this.subscribeSupabaseChannel(code);
            saveLastRoomCode(code);
            this.emit('room_joined');
            return this.room;
          }
          if (error.code !== '23505') {
            console.warn('[Supabase] create_room insert failed:', error.message);
            break;
          }
        }
      } catch (err) {
        console.warn('[Supabase] createRoom fallback to WS/local:', err);
      }
    }

    return await this.createRoomFallback(nickname, fillBots);
  }

  private async createRoomFallback(nickname: string, fillBots: boolean): Promise<RoomState> {
    const ok = await this.connectWs();
    if (ok) {
      return await new Promise<RoomState>((resolve) => {
        const off = this.onChange((room, ev) => {
          if (ev === 'room_joined') {
            off();
            saveLastRoomCode(room.code);
            resolve(room);
          }
        });
        this.sendWs({ type: 'create_room', nickname, fillBots });
        window.setTimeout(() => {
          if (!this.room) {
            off();
            resolve(this.createFallbackRoom(nickname, fillBots));
          }
        }, 1200);
      });
    }
    return this.createFallbackRoom(nickname, fillBots);
  }

  private createFallbackRoom(nickname: string, fillBots: boolean): RoomState {
    const code = generateRoomCode();
    this.transportMode = 'local';
    this.connected = false;
    this.clearRecorded = false;
    this.room = createLocalRoom(code, this.clientId, nickname, fillBots);
    this.myRole = 'doyun';
    this.bindBroadcastChannel(code);
    saveLastRoomCode(code);
    this.emit('room_joined');
    return this.room;
  }

  async joinRoom(codeRaw: string, nickname: string): Promise<{ ok: boolean; error?: string }> {
    const code = codeRaw.trim().toUpperCase();
    if (code.length < 4) return { ok: false, error: '6자리 방 코드를 입력해 주세요.' };

    const sb = getSupabaseClient();
    if (sb) {
      try {
        const { data, error } = await sb.from('rooms').select('*').eq('code', code).maybeSingle();
        if (!error && !data) {
          return { ok: false, error: '해당 방 코드를 찾을 수 없습니다.' };
        }
        if (!error && data) {
          const room = normalizePuzzleStates(rowToRoomState(data as RoomsRow));
          const trimmedNick = nickname.trim();
          let assignedRole = ROLE_ORDER.find((r) => room.slots[r]?.ownerClientId === this.clientId);
          if (assignedRole) {
            room.slots[assignedRole].isBot = false;
            if (trimmedNick) room.slots[assignedRole].nickname = trimmedNick;
          } else {
            assignedRole = ROLE_ORDER.find((r) => !room.slots[r]?.ownerClientId);
            if (!assignedRole) {
              return { ok: false, error: '방이 가득 찼습니다 (최대 4인).' };
            }
            room.slots[assignedRole].ownerClientId = this.clientId;
            room.slots[assignedRole].isBot = false;
            room.slots[assignedRole].nickname = trimmedNick || ROLES[assignedRole].name;
          }

          const humanCount = ROLE_ORDER.filter((r) => Boolean(room.slots[r]?.ownerClientId)).length;
          if (humanCount >= 2) {
            room.soloSwitchEnabled = false;
          }

          const { error: updErr } = await sb
            .from('rooms')
            .update({ slots: room.slots, solo_switch_enabled: room.soloSwitchEnabled })
            .eq('code', code);
          if (updErr) {
            return { ok: false, error: '방 슬롯 갱신에 실패했습니다. 잠시 후 다시 시도하세요.' };
          }

          this.room = room;
          this.myRole = assignedRole;
          this.clearRecorded = Boolean(room.coronationTriggered);
          this.transportMode = 'supabase';
          await this.subscribeSupabaseChannel(code);
          this.sendSupabaseBroadcast('room_state', { room: this.room });
          saveLastRoomCode(code);
          this.emit('room_joined');
          return { ok: true };
        }
      } catch (err) {
        console.warn('[Supabase] joinRoom fallback to WS:', err);
      }
    }

    const ok = await this.connectWs();
    if (!ok) {
      return { ok: false, error: '멀티플레이 서버에 연결할 수 없습니다. 방 만들기로 오프라인/솔로 플레이를 시작하세요.' };
    }
    return await new Promise((resolve) => {
      const off = this.onChange((_, ev, extra) => {
        if (ev === 'room_joined') {
          off();
          if (this.room) saveLastRoomCode(this.room.code);
          resolve({ ok: true });
        } else if (ev === 'error') {
          off();
          resolve({ ok: false, error: String(extra || '방 입장에 실패했습니다.') });
        }
      });
      this.sendWs({ type: 'join_room', code, nickname });
      window.setTimeout(() => {
        off();
        resolve({ ok: false, error: '방 입장 응답 시간이 초과되었습니다.' });
      }, 2000);
    });
  }

  selectRole(roleId: RoleId, nickname?: string) {
    if (!this.room) return;
    if (this.transportMode === 'ws' && this.sendWs({ type: 'select_role', roleId, nickname })) {
      return;
    }

    const target = this.room.slots[roleId];
    if (target.ownerClientId && target.ownerClientId !== this.clientId) {
      return;
    }

    const prev = this.room.slots[this.myRole];
    if (prev && prev.ownerClientId === this.clientId) {
      prev.ownerClientId = null;
      prev.isBot = this.room.fillBots;
      prev.nickname = ROLES[this.myRole].name;
    }
    target.ownerClientId = this.clientId;
    target.isBot = false;
    target.nickname = nickname?.trim() || ROLES[roleId].name;
    this.myRole = roleId;

    if (this.transportMode === 'supabase') {
      if (this.sbChannel && this.connected) {
        void this.sbChannel.track({
          clientId: this.clientId,
          roleId: this.myRole,
          nickname: target.nickname,
        });
      }
      this.sendSupabaseBroadcast('room_state', { room: this.room });
      const slotsSnapshot = structuredClone(this.room.slots);
      this.enqueueSupabaseUpdate(() => ({ slots: slotsSnapshot }));
    } else {
      this.syncBc();
    }
    this.emit('room_state');
  }

  updateLobby(opts: { fillBots?: boolean; soloSwitchEnabled?: boolean; difficulty?: string; nickname?: string }) {
    if (!this.room) return;
    if (this.transportMode === 'ws' && this.sendWs({ type: 'update_lobby', roleId: this.myRole, ...opts })) return;

    if (typeof opts.fillBots === 'boolean') {
      this.room.fillBots = opts.fillBots;
      for (const r of ROLE_ORDER) {
        if (!this.room.slots[r].ownerClientId) this.room.slots[r].isBot = opts.fillBots;
      }
    }
    if (typeof opts.soloSwitchEnabled === 'boolean') this.room.soloSwitchEnabled = opts.soloSwitchEnabled;
    if (typeof opts.difficulty === 'string') this.room.difficulty = opts.difficulty;
    if (typeof opts.nickname === 'string') {
      this.room.slots[this.myRole].nickname = opts.nickname.trim() || ROLES[this.myRole].name;
    }

    if (this.transportMode === 'supabase') {
      this.sendSupabaseBroadcast('room_state', { room: this.room });
      const snap = {
        fill_bots: this.room.fillBots,
        solo_switch_enabled: this.room.soloSwitchEnabled,
        difficulty: this.room.difficulty,
        slots: structuredClone(this.room.slots),
      };
      this.enqueueSupabaseUpdate(() => snap);
    } else {
      this.syncBc();
    }
    this.emit('room_state');
  }

  startGame() {
    if (!this.room) return;
    if (this.transportMode === 'ws' && this.sendWs({ type: 'start_game' })) return;

    this.room.phase = 'playing';
    this.room.startedAt = this.room.startedAt || Date.now();

    if (this.transportMode === 'supabase') {
      this.sendSupabaseBroadcast('room_state', { room: this.room });
      const snap = {
        phase: 'playing' as const,
        started_at: new Date(this.room.startedAt).toISOString(),
        slots: structuredClone(this.room.slots),
      };
      this.enqueueSupabaseUpdate(() => snap);
    } else {
      this.syncBc();
    }
    this.emit('room_state');
  }

  moveSlot(
    roleId: RoleId,
    pos: { floor: FloorKey; scene: string; x: number; y: number; dir: Direction; moving: boolean },
    forceBroadcast = false
  ) {
    if (!this.room) return;
    const slot = this.room.slots[roleId];
    if (!slot) return;
    Object.assign(slot, pos);
    const now = performance.now();
    if (forceBroadcast || now - this.lastMoveSentAt >= 48) {
      this.lastMoveSentAt = now;
      if (this.transportMode === 'supabase') {
        this.sendSupabaseBroadcast('player_move', { roleId, ...pos });
      } else if (!this.sendWs({ type: 'player_move', roleId, ...pos })) {
        this.syncBc('bc_move', { type: 'bc_move', sender: this.clientId, roleId, pos });
      }
    }
  }

  sendRadio(
    roleId: RoleId,
    tokenIds: string[],
    opts?: { targetRoleId?: RoleId | null; note?: string | null }
  ): RadioPacket | null {
    if (!this.room) return null;
    const cleanTokens = tokenIds
      .map((t) => {
        if (t.startsWith('VAL:')) {
          const num = sanitizeRadioNumber(t.slice(4));
          return num ? `VAL:${num}` : '';
        }
        return String(t || '').trim();
      })
      .filter(Boolean)
      .slice(0, 8);
    const cleanNote = opts?.note ? String(opts.note).trim().slice(0, 160) : null;
    if (cleanTokens.length === 0 && !cleanNote) return null;

    const targetRoleId = opts?.targetRoleId && ROLE_ORDER.includes(opts.targetRoleId) ? opts.targetRoleId : null;
    const targetName = targetRoleId ? this.room.slots[targetRoleId]?.nickname || ROLES[targetRoleId].name : null;

    if (
      this.transportMode === 'ws' &&
      this.sendWs({ type: 'send_radio', roleId, tokenIds: cleanTokens, targetRoleId, note: cleanNote })
    ) {
      return null;
    }

    const now = Date.now();
    const entry: RadioPacket = {
      id: 'R' + now + '_' + (++this.radioSeq),
      seq: this.radioSeq,
      roleId,
      senderName: this.room.slots[roleId]?.nickname || ROLES[roleId].name,
      targetRoleId,
      targetName,
      tokenIds: cleanTokens,
      note: cleanNote,
      ts: now,
      expiresAt: now + 12000,
    };
    this.room.radioLog = [entry, ...this.room.radioLog].slice(0, 40);
    if (tokenIds.includes('COOP_HERE') && this.room.puzzleStates[16]?.beamReachedAtrium) {
      this.room.puzzleStates[16].hereSent = true;
    }

    if (this.transportMode === 'supabase') {
      const p16Snap = structuredClone(this.room.puzzleStates[16]);
      this.sendSupabaseBroadcast('radio_broadcast', { entry, p16: p16Snap });
      const radioSnap = structuredClone(this.room.radioLog);
      const puzzleSnap = roomStateToRow(this.room).puzzle_states;
      this.enqueueSupabaseUpdate(() => ({
        radio_log: radioSnap,
        puzzle_states: puzzleSnap,
      }));
    } else {
      this.syncBc();
    }
    this.emit('radio_broadcast', entry);
    return entry;
  }

  patchPuzzle(pid: number, patch: Record<string, unknown>) {
    if (!this.room) return;
    const cur = this.room.puzzleStates[pid] || {};
    this.room.puzzleStates[pid] = { ...cur, ...patch };

    if (this.transportMode === 'supabase') {
      this.sendSupabaseBroadcast('puzzle_updated', {
        pid,
        state: this.room.puzzleStates[pid],
        solvedPids: this.room.solvedPids,
        powerRestored: this.room.powerRestored,
        coronationTriggered: this.room.coronationTriggered,
      });
      if (this.patchSaveTimer !== null) window.clearTimeout(this.patchSaveTimer);
      this.patchSaveTimer = window.setTimeout(() => {
        this.patchSaveTimer = null;
        if (!this.room || this.transportMode !== 'supabase') return;
        const puzzleSnap = roomStateToRow(this.room).puzzle_states;
        this.enqueueSupabaseUpdate(() => ({ puzzle_states: puzzleSnap }));
      }, 350);
    } else if (!this.sendWs({ type: 'puzzle_patch', pid, patch })) {
      this.syncBc();
    }
    this.emit('puzzle_updated', { pid });
  }

  solvePuzzle(pid: number, statePatch?: Record<string, unknown>, message?: string) {
    if (!this.room) return;
    if (!this.room.solvedPids.includes(pid)) {
      this.room.solvedPids = [...this.room.solvedPids, pid].sort((a, b) => a - b);
    }
    if (statePatch) {
      this.room.puzzleStates[pid] = { ...(this.room.puzzleStates[pid] || {}), ...statePatch };
    }
    if (pid === 9) this.room.powerRestored = true;
    if (pid === 16) {
      this.room.coronationTriggered = true;
      this.room.phase = 'ended';
    }

    if (this.transportMode === 'supabase') {
      if (this.patchSaveTimer !== null) {
        window.clearTimeout(this.patchSaveTimer);
        this.patchSaveTimer = null;
      }
      this.sendSupabaseBroadcast('puzzle_updated', {
        pid,
        state: this.room.puzzleStates[pid],
        solvedPids: this.room.solvedPids,
        powerRestored: this.room.powerRestored,
        coronationTriggered: this.room.coronationTriggered,
        phase: this.room.phase,
        message,
      });
      const roomSnapshot = structuredClone(this.room);
      const rowPatch = roomStateToRow(roomSnapshot);
      const shouldRecordClear = pid === 16 && !this.clearRecorded;
      if (shouldRecordClear) this.clearRecorded = true;
      this.enqueueSupabaseUpdate(
        () => ({
          solved_pids: rowPatch.solved_pids,
          puzzle_states: rowPatch.puzzle_states,
          power_restored: rowPatch.power_restored,
          coronation_triggered: rowPatch.coronation_triggered,
          phase: rowPatch.phase,
        }),
        async (ok) => {
          if (shouldRecordClear && ok) {
            await recordRoomClear(roomSnapshot);
          }
        }
      );
    } else if (!this.sendWs({ type: 'puzzle_solve', pid, state: this.room.puzzleStates[pid], message })) {
      this.syncBc();
    }
    this.emit('puzzle_updated', { pid, message });
  }

  resetGame() {
    if (!this.room) return;
    if (this.transportMode === 'ws' && this.sendWs({ type: 'reset_game' })) return;

    this.room.phase = 'playing';
    this.room.solvedPids = [];
    this.room.puzzleStates = createInitialPuzzleStatesClient();
    this.room.powerRestored = false;
    this.room.coronationTriggered = false;
    this.room.radioLog = [];
    this.room.startedAt = Date.now();
    this.clearRecorded = false;
    for (const r of ROLE_ORDER) {
      Object.assign(this.room.slots[r], DEFAULT_SPAWNS[r], { moving: false });
    }

    if (this.transportMode === 'supabase') {
      if (this.patchSaveTimer !== null) {
        window.clearTimeout(this.patchSaveTimer);
        this.patchSaveTimer = null;
      }
      this.sendSupabaseBroadcast('room_state', { room: this.room });
      const rowPatch = roomStateToRow(structuredClone(this.room));
      this.enqueueSupabaseUpdate(() => ({
        phase: rowPatch.phase,
        solved_pids: rowPatch.solved_pids,
        puzzle_states: rowPatch.puzzle_states,
        power_restored: rowPatch.power_restored,
        coronation_triggered: rowPatch.coronation_triggered,
        radio_log: rowPatch.radio_log,
        slots: rowPatch.slots,
        started_at: rowPatch.started_at,
      }));
    } else {
      this.syncBc();
    }
    this.emit('room_state');
  }

  leaveRoom() {
    if (this.patchSaveTimer !== null) {
      window.clearTimeout(this.patchSaveTimer);
      this.patchSaveTimer = null;
    }
    saveLastRoomCode(null);

    if (this.transportMode === 'supabase' && this.room) {
      const code = this.room.code;
      let changed = false;
      for (const r of ROLE_ORDER) {
        const slot = this.room.slots[r];
        if (slot.ownerClientId === this.clientId) {
          slot.ownerClientId = null;
          slot.isBot = this.room.fillBots;
          slot.nickname = ROLES[r].name;
          changed = true;
        }
      }
      if (this.room.hostClientId === this.clientId) {
        const nextHost = ROLE_ORDER.map((r) => this.room!.slots[r]?.ownerClientId).find(Boolean);
        if (nextHost) {
          this.room.hostClientId = nextHost;
          changed = true;
        }
      }
      if (changed) {
        this.sendSupabaseBroadcast('room_state', { room: this.room });
        const sb = getSupabaseClient();
        if (sb) {
          void sb
            .from('rooms')
            .update({ host_client_id: this.room.hostClientId, slots: this.room.slots })
            .eq('code', code);
        }
      }
      void this.unsubscribeSupabaseChannel();
    }

    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.connected = false;
    this.transportMode = 'local';
    this.clearRecorded = false;
    this.room = null;
  }
}
