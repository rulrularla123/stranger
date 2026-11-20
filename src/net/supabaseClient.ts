import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ROLE_ORDER } from '../data/cMenuTokens.ts';
import type {
  CharacterSlot,
  ClearRecord,
  RadioPacket,
  RoleId,
  RoomState,
} from '../types/stranger.ts';

export interface RoomsRow {
  code: string;
  host_client_id: string;
  phase: 'lobby' | 'playing' | 'ended';
  difficulty: string;
  fill_bots: boolean;
  solo_switch_enabled: boolean;
  slots: Record<RoleId, CharacterSlot>;
  solved_pids: number[];
  puzzle_states: Record<string, Record<string, unknown>>;
  power_restored: boolean;
  coronation_triggered: boolean;
  radio_log: RadioPacket[];
  started_at: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ClearRecordsRow {
  id: number;
  room_code: string;
  difficulty: string;
  solved_count: number;
  radio_count: number;
  duration_seconds: number;
  team_members: { roleId: RoleId; nickname: string; isBot: boolean }[];
  cleared_at: string;
}

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

let singleton: SupabaseClient | null = null;

/** Returns true when public Supabase env vars are configured. */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

/** Returns the cached browser Supabase client configured for Realtime multiplayer. */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!singleton) {
    singleton = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 25,
        },
      },
    });
  }
  return singleton;
}

/** Converts an in-memory RoomState to a public.rooms Postgres row payload. */
export function roomStateToRow(room: RoomState): RoomsRow {
  const puzzleStates: Record<string, Record<string, unknown>> = {};
  for (const [k, v] of Object.entries(room.puzzleStates)) {
    puzzleStates[String(k)] = v;
  }
  if (Array.isArray(room.introSkipVotes) || room.introStarted) {
    puzzleStates.__meta_skip_votes = {
      roles: room.introSkipVotes || [],
      introStarted: Boolean(room.introStarted),
    };
  }
  return {
    code: room.code,
    host_client_id: room.hostClientId,
    phase: room.phase,
    difficulty: room.difficulty,
    fill_bots: room.fillBots,
    solo_switch_enabled: room.soloSwitchEnabled,
    slots: room.slots,
    solved_pids: room.solvedPids,
    puzzle_states: puzzleStates,
    power_restored: room.powerRestored,
    coronation_triggered: room.coronationTriggered,
    radio_log: room.radioLog,
    started_at: room.startedAt ? new Date(room.startedAt).toISOString() : null,
  };
}

/** Converts a public.rooms Postgres row into a normalized RoomState. */
export function rowToRoomState(row: RoomsRow): RoomState {
  const puzzleStates: Record<number, Record<string, unknown>> = {};
  let introSkipVotes: RoleId[] = [];
  let introStarted = false;
  if (row.puzzle_states && typeof row.puzzle_states === 'object') {
    for (const [k, v] of Object.entries(row.puzzle_states)) {
      if (k === '__meta_skip_votes' && v && typeof v === 'object') {
        const meta = v as { roles?: unknown; introStarted?: unknown };
        if (Array.isArray(meta.roles)) {
          introSkipVotes = meta.roles.filter((r): r is RoleId => ROLE_ORDER.includes(r as RoleId));
        }
        introStarted = Boolean(meta.introStarted);
        continue;
      }
      const pid = Number(k);
      if (!Number.isNaN(pid) && v && typeof v === 'object') {
        puzzleStates[pid] = v;
      }
    }
  }
  return {
    code: row.code,
    hostClientId: row.host_client_id,
    phase: row.phase,
    difficulty: row.difficulty,
    fillBots: Boolean(row.fill_bots),
    soloSwitchEnabled: Boolean(row.solo_switch_enabled),
    slots: row.slots,
    solvedPids: Array.isArray(row.solved_pids) ? row.solved_pids : [],
    puzzleStates,
    powerRestored: Boolean(row.power_restored),
    coronationTriggered: Boolean(row.coronation_triggered),
    radioLog: Array.isArray(row.radio_log) ? row.radio_log : [],
    introStarted,
    introSkipVotes,
    startedAt: row.started_at ? Date.parse(row.started_at) : null,
  };
}

function rowToClearRecord(row: ClearRecordsRow): ClearRecord {
  return {
    id: Number(row.id),
    roomCode: row.room_code,
    difficulty: row.difficulty,
    solvedCount: Number(row.solved_count),
    radioCount: Number(row.radio_count),
    durationSeconds: Number(row.duration_seconds),
    teamMembers: Array.isArray(row.team_members) ? row.team_members : [],
    clearedAt: row.cleared_at,
  };
}

/** Fetches the latest museum clear records ordered by most recent completion. */
export async function fetchRecentClearRecords(limit = 6): Promise<ClearRecord[]> {
  const sb = getSupabaseClient();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('clear_records')
      .select('id, room_code, difficulty, solved_count, radio_count, duration_seconds, team_members, cleared_at')
      .order('cleared_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (data as ClearRecordsRow[]).map(rowToClearRecord);
  } catch {
    return [];
  }
}

/** Persists a completed 16/16 coronation run into public.clear_records. */
export async function recordRoomClear(room: RoomState): Promise<ClearRecord | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const durationSeconds = room.startedAt
    ? Math.max(0, Math.round((Date.now() - room.startedAt) / 1000))
    : 0;
  const teamMembers = ROLE_ORDER.map((r) => ({
    roleId: r,
    nickname: room.slots[r]?.nickname || r,
    isBot: Boolean(room.slots[r]?.isBot),
  }));

  try {
    const { data, error } = await sb
      .from('clear_records')
      .insert({
        room_code: room.code,
        difficulty: room.difficulty,
        solved_count: 16,
        radio_count: room.radioLog.length,
        duration_seconds: durationSeconds,
        team_members: teamMembers,
      })
      .select('id, room_code, difficulty, solved_count, radio_count, duration_seconds, team_members, cleared_at')
      .single();

    if (error || !data) {
      console.warn('[Supabase] clear_records insert failed:', error?.message);
      return null;
    }
    return rowToClearRecord(data as ClearRecordsRow);
  } catch (err) {
    console.warn('[Supabase] clear_records insert error:', err);
    return null;
  }
}
