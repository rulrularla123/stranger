export type RoleId = 'doyun' | 'maria' | 'lin' | 'aisha';
export type Direction = 'down' | 'up' | 'left' | 'right';
export type FloorKey = '1F' | '2F' | 'B1';
export type GamePhase = 'splash' | 'title' | 'gather' | 'lobby' | 'intro' | 'playing' | 'ended';

export interface RoleMeta {
  id: RoleId;
  name: string;
  shortRole: string;
  title: string;
  color: string;
  badge: string;
  passiveName: string;
  passiveDesc: string;
  country: string;
}

export interface TokenCategory {
  id: 'num' | 'dir' | 'sym' | 'coop';
  label: string;
  color: string;
  tokens: TokenDef[];
}

export interface TokenDef {
  id: string;
  category: 'num' | 'dir' | 'sym' | 'coop';
  glyph: string;
  label: string;
  sub: string;
  color: string;
}

export interface CharacterSlot {
  roleId: RoleId;
  ownerClientId: string | null;
  nickname: string;
  isBot: boolean;
  floor: FloorKey;
  scene: string;
  x: number;
  y: number;
  dir: Direction;
  moving: boolean;
}

export interface RadioPacket {
  id: string;
  seq: number;
  roleId: RoleId;
  senderName: string;
  tokenIds: string[];
  ts: number;
  expiresAt: number;
}

export type TransportMode = 'supabase' | 'ws' | 'local';

export interface ClearRecord {
  id: number;
  roomCode: string;
  difficulty: string;
  solvedCount: number;
  radioCount: number;
  durationSeconds: number;
  teamMembers: { roleId: RoleId; nickname: string; isBot: boolean }[];
  clearedAt: string;
}

export interface RoomState {
  code: string;
  hostClientId: string;
  phase: 'lobby' | 'playing' | 'ended';
  difficulty: string;
  fillBots: boolean;
  soloSwitchEnabled: boolean;
  slots: Record<RoleId, CharacterSlot>;
  solvedPids: number[];
  puzzleStates: Record<number, Record<string, unknown>>;
  powerRestored: boolean;
  coronationTriggered: boolean;
  radioLog: RadioPacket[];
  startedAt?: number | null;
}

export interface MapRoom {
  id: string;
  name: string;
  rect: [number, number, number, number];
  outline?: [number, number][];
}

export interface MapScene {
  id: string;
  label: string;
  view: [number, number, number, number];
}

export interface MapPortal {
  id: string;
  name: string;
  kind: 'door' | 'stairs';
  rect: [number, number, number, number];
  sourceScene: string;
  targetScene: string;
  targetFloor: FloorKey;
  targetPortal: string;
  arrival: [number, number];
  appearance?: { angleDegrees?: number };
}

export interface MapObject {
  id: string;
  name: string;
  sprite: string;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
  room: string;
  puzzles: number[];
  role?: string;
  description?: string;
  wall?: boolean;
  interact?: [number, number];
  collision?: [number, number, number, number];
  /** Sprite already has a baked-in 1px outline (see scripts/add-object-outlines.mjs). */
  outlined?: boolean;
}

export interface MapFloor {
  label: string;
  spawn: [number, number];
  background: string;
  walkability: string;
  defaultScene: string;
  rooms: MapRoom[];
  walkableRows: [number, number][][];
  objects: MapObject[];
  portals: MapPortal[];
  scenes: Record<string, MapScene>;
}

export interface MapJson {
  width: number;
  height: number;
  player: {
    width: number;
    height: number;
    footprint: [number, number];
    inspectRadius: number;
  };
  floors: Record<FloorKey, MapFloor>;
}

export interface SpriteFrameRect {
  sx: number;
  sy: number;
  w: number;
  h: number;
}

export interface CharacterAnimMeta {
  id: RoleId;
  name: string;
  roleTitle: string;
  color: string;
  badge: string;
  individualSheet: string;
  rowIndex: number;
  anchorX: number;
  anchorY: number;
  opaqueSpanY: [number, number];
  frames: Record<Direction, SpriteFrameRect[]>;
}

export interface AnimationsMeta {
  sheet: string;
  frameWidth: number;
  frameHeight: number;
  worldSize: { width: number; height: number; footprint: [number, number] };
  walkSequence: number[];
  idleIndex: number;
  walkFps: number;
  directions: Direction[];
  characters: Record<RoleId, CharacterAnimMeta>;
}

export interface PuzzleDef {
  id: number;
  code: string;
  act: 1 | 2 | 3 | 4;
  floor: FloorKey;
  room: string;
  roomLabel: string;
  title: string;
  arch: string;
  mainRole: RoleId;
  helperRoles: RoleId[];
  focusObj: string;
  answerTokens: string[][];
  clueTitle: string;
  clueSummary: string;
  clueHtml: string;
  objectRoleClues?: Record<string, { roleId: RoleId; title: string; bodyHtml: string; recommendedTokens?: string[][] }>;
}
