import type { PuzzleDef, RoleId } from '../types/stranger.ts';
import type { DifficultyConfig } from '../data/puzzleCatalog.ts';
import { soundEngine } from '../audio/soundEngine.ts';

export interface BoardHelpers {
  patchState: (pid: number, patch: Record<string, unknown>) => void;
  solve: (pid: number, statePatch: Record<string, unknown>, msg: string) => void;
  setErr: (msg: string) => void;
  setInfo: (msg: string) => void;
  rerender: () => void;
  registerCleanup: (fn: () => void) => void;
  difficulty: DifficultyConfig;
  myRole: RoleId;
  soloMode: boolean;
  isSolved: boolean;
}

export function renderAct1Act2Board(
  pid: number,
  stage: HTMLElement,
  _p: PuzzleDef,
  s: Record<string, unknown>,
  h: BoardHelpers
): boolean {
  switch (pid) {
    case 1:
      boardP01(stage, s, h);
      return true;
    case 2:
      boardP02(stage, s, h);
      return true;
    case 3:
      boardP03(stage, s, h);
      return true;
    case 4:
      boardP04(stage, s, h);
      return true;
    case 5:
      boardP05(stage, s, h);
      return true;
    case 6:
      boardP06(stage, s, h);
      return true;
    case 7:
      boardP07(stage, s, h);
      return true;
    case 8:
      boardP08(stage, s, h);
      return true;
    case 9:
      boardP09(stage, s, h);
      return true;
    case 10:
      boardP10(stage, s, h);
      return true;
    default:
      return false;
  }
}

function boardP01(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const outerDeg = Number(s.outerDeg ?? 90);
  const innerDeg = Number(s.innerDeg ?? 180);
  const locked = Boolean(s.locked);
  const aligned = outerDeg % 360 === 0 && innerDeg % 360 === 0;
  const hint = h.difficulty.showTargetHints;

  stage.innerHTML = `
    <div class="au-board p-grid-2">
      <div class="p-center">
        <svg viewBox="0 0 240 240" width="236" height="236" class="p-svg-interactive">
          <circle cx="120" cy="120" r="110" fill="#18202A" stroke="#C89D54" stroke-width="6"/>
          <g transform="rotate(${outerDeg} 120 120)">
            <circle cx="120" cy="120" r="96" fill="none" stroke="#52EFBF" stroke-width="2" stroke-dasharray="6 4"/>
            <text x="120" y="30" text-anchor="middle" fill="#FFD86B" font-size="13" font-weight="800">↑ N 북</text>
            <text x="208" y="124" text-anchor="middle" fill="#D5DFE8" font-size="12" font-weight="700">→ E 동</text>
            <text x="120" y="216" text-anchor="middle" fill="#7CD8FF" font-size="12" font-weight="700">↓ S 남</text>
            <text x="32" y="124" text-anchor="middle" fill="#D5DFE8" font-size="12" font-weight="700">← W 서</text>
          </g>
          <g transform="rotate(${innerDeg} 120 120)">
            <circle cx="120" cy="120" r="64" fill="#232F3D" stroke="#C89D54" stroke-width="4"/>
            <text x="120" y="72" text-anchor="middle" fill="#E6C886" font-size="12" font-weight="800">☀ 생활사</text>
            <text x="165" y="124" text-anchor="middle" fill="#91A8FF" font-size="11" font-weight="700">★ 역사</text>
            <text x="120" y="176" text-anchor="middle" fill="#7CD8FF" font-size="12" font-weight="700">🌊 도시</text>
            <text x="74" y="124" text-anchor="middle" fill="#D49B6A" font-size="11" font-weight="700">⛰ 공예</text>
          </g>
          <polygon points="120,6 113,18 127,18" fill="#FF6E6E"/>
          <circle cx="120" cy="120" r="24" fill="${locked ? '#27BA74' : aligned && hint ? '#1E7A5D' : '#3A4858'}" stroke="#0B0E13" stroke-width="4"/>
          <text x="120" y="124" text-anchor="middle" fill="#fff" font-size="11" font-weight="900">${locked ? 'OPEN' : 'PIN'}</text>
        </svg>
      </div>
      <div class="p-stack">
        <div class="p-card">
          <div class="p-card-lbl" style="color:#52EFBF">① 외륜 방위 베젤 (현재 ${outerDeg}°${hint ? ' · 목표 북↑ 0°' : ''})</div>
          <div class="p-row">
            <button class="s-btn" id="p1-ol">↺ -90°</button>
            <button class="s-btn" id="p1-or">↻ +90°</button>
          </div>
        </div>
        <div class="p-card">
          <div class="p-card-lbl" style="color:#E6C886">② 내륜 전시관 문양 링 (현재 ${innerDeg}°${hint ? ' · 목표 ☀ 0°' : ''})</div>
          <div class="p-row">
            <button class="s-btn" id="p1-il">↺ -90°</button>
            <button class="s-btn" id="p1-ir">↻ +90°</button>
          </div>
        </div>
        <button class="s-btn primary" id="p1-lock">🔓 중앙 황동 핀 잠금 해제 (1F 전시관 개방)</button>
      </div>
    </div>
  `;

  stage.querySelector<HTMLElement>('#p1-ol')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(1, { outerDeg: (outerDeg + 270) % 360 });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p1-or')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(1, { outerDeg: (outerDeg + 90) % 360 });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p1-il')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(1, { innerDeg: (innerDeg + 270) % 360 });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p1-ir')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(1, { innerDeg: (innerDeg + 90) % 360 });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p1-lock')!.onclick = () => {
    if (aligned) {
      h.solve(1, { outerDeg: 0, innerDeg: 0, locked: true }, '로비 나침반 정렬 완료! 1F 4대 전시관의 황동 잠금이 해제되었습니다.');
    } else {
      h.setErr(
        hint
          ? `방위(${outerDeg}°) 또는 문양(${innerDeg}°)이 이안의 방명록 기준(0°)과 어긋납니다. 다시 돌려 보세요.`
          : '표시된 무전 신호와 다른 방향/문양입니다. 이안의 방명록 단서를 확인해 다시 맞춰 보세요.'
      );
    }
  };
}

function boardP02(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const rawSlots = (s.slots as Partial<Record<'roof' | 'floor' | 'stilt', string | null>>) || {};
  const slots: Record<'roof' | 'floor' | 'stilt', string | null> = {
    roof: rawSlots.roof ?? null,
    floor: rawSlots.floor ?? null,
    stilt: rawSlots.stilt ?? null,
  };
  const picked = (s.picked as string | null) || null;
  const hint = h.difficulty.showTargetHints;
  const cards = [
    { id: 'grain_jar', label: '🌾 건조 곡식 단지' },
    { id: 'basket', label: '🧺 대나무 직조 바구니' },
    { id: 'mortar', label: '🪨 돌절구' },
    { id: 'lamp', label: '🏮 등유 램프' },
  ];
  const tiers = [
    { id: 'roof', name: '① 지붕 다락 (Bubong · ☀ 태양)' },
    { id: 'floor', name: '② 대나무 마루 (Sala · 🌊 파도)' },
    { id: 'stilt', name: '③ 고상 기둥 아래 (Silong · ⛰ 산맥)' },
  ];
  const placed = Object.values(slots);

  stage.innerHTML = `
    <div class="au-board p-grid-2">
      <div>
        <div class="p-subhead" style="color:#7CD8FF">바하이 쿠보 3층위 가옥 단면 (드래그 또는 클릭 배치)</div>
        <div class="p-bahay-house">
          ${tiers
            .map((t) => {
              const cid = slots[t.id as keyof typeof slots];
              const card = cards.find((c) => c.id === cid);
              return `<div class="au-slot-box ${cid ? 'filled' : ''}" data-tier="${t.id}">
                <span class="p-tier-name">${t.name}</span>
                <strong>${card ? card.label : '빈 슬롯 (여기에 배치)'}</strong>
              </div>`;
            })
            .join('')}
        </div>
      </div>
      <div class="p-stack-between">
        <div>
          <div class="p-subhead" style="color:#E6C886">생활 유물 트레이</div>
          <div class="p-stack">
            ${cards
              .map((c) => {
                const used = placed.includes(c.id);
                return `<button class="au-card-chip ${picked === c.id ? 'picked' : ''}" draggable="true" data-card="${c.id}" ${used ? 'disabled' : ''}>${c.label}</button>`;
              })
              .join('')}
          </div>
        </div>
        <button class="s-btn primary" id="p2-check">✔ 가옥 단면 조립 확정</button>
      </div>
    </div>
  `;

  stage.querySelectorAll<HTMLElement>('[data-card]').forEach((btn) => {
    btn.onclick = () => {
      soundEngine.playClick();
      h.patchState(2, { picked: btn.dataset.card });
      h.rerender();
    };
    btn.ondragstart = (e) => {
      h.patchState(2, { picked: btn.dataset.card });
      e.dataTransfer?.setData('text/plain', btn.dataset.card || '');
    };
  });

  stage.querySelectorAll<HTMLElement>('[data-tier]').forEach((box) => {
    const place = (cid: string | null) => {
      const tierKey = box.dataset.tier as keyof typeof slots;
      const nextSlots = { ...slots };
      if (!cid) {
        nextSlots[tierKey] = null;
      } else {
        for (const k of Object.keys(nextSlots) as (keyof typeof slots)[]) {
          if (nextSlots[k] === cid) nextSlots[k] = null;
        }
        nextSlots[tierKey] = cid;
      }
      soundEngine.playClick();
      h.patchState(2, { slots: nextSlots, picked: null });
      h.rerender();
    };
    box.onclick = () => place(picked);
    box.ondragover = (e) => e.preventDefault();
    box.ondrop = (e) => {
      e.preventDefault();
      place(e.dataTransfer?.getData('text/plain') || picked);
    };
  });

  stage.querySelector<HTMLElement>('#p2-check')!.onclick = () => {
    if (slots.roof === 'grain_jar' && slots.floor === 'basket' && slots.stilt === 'mortar') {
      h.solve(2, { slots }, '바하이 쿠보 3층위 생활 유물 배치 완료! 모형 가옥에 따뜻한 조명이 켜졌습니다.');
    } else {
      const cleaned = {
        roof: slots.roof === 'grain_jar' ? 'grain_jar' : null,
        floor: slots.floor === 'basket' ? 'basket' : null,
        stilt: slots.stilt === 'mortar' ? 'mortar' : null,
      };
      h.patchState(2, { slots: cleaned });
      h.setErr(
        hint
          ? '일치하지 않는 층위의 유물만 트레이로 돌려보냈습니다. Bubong-Sala-Silong 순서를 확인하세요!'
          : '일치하지 않는 층위의 유물만 트레이로 돌려보냈습니다. 이안의 무전 단서를 확인해 다시 배치해 보세요.'
      );
    }
  };
}

function boardP03(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const turntableDeg = Number(s.turntableDeg ?? 60);
  const lidTiltDeg = Number(s.lidTiltDeg ?? -15);
  const seated = Boolean(s.seated);
  const aligned = turntableDeg % 360 === 180 && lidTiltDeg === 0;
  const hint = h.difficulty.showTargetHints;

  stage.innerHTML = `
    <div class="au-board p-grid-auto-1">
      <div class="p-jar-box">
        <svg viewBox="0 0 180 180" width="196" height="196">
          <ellipse cx="90" cy="148" rx="68" ry="15" fill="#2A3642" stroke="#7CD8FF" stroke-width="2"/>
          <g transform="translate(0 ${seated ? 4 : -14}) rotate(${lidTiltDeg} 90 66)">
            <path d="M56 76 Q90 42 124 76 Z" fill="#9E6242" stroke="#0B0E13" stroke-width="3"/>
            <path d="M70 52 L82 40 L102 42 L114 52" fill="none" stroke="#E6C886" stroke-width="4" stroke-linecap="round"/>
            <circle cx="80" cy="40" r="4" fill="#E6C886"/><circle cx="102" cy="40" r="4" fill="#E6C886"/>
          </g>
          <ellipse cx="90" cy="112" rx="44" ry="38" fill="#8B5438" stroke="#0B0E13" stroke-width="3"/>
          <path d="M${56 + Math.sin((turntableDeg * Math.PI) / 180) * 14} 110 Q90 ${100 + Math.cos((turntableDeg * Math.PI) / 180) * 10} ${124 + Math.sin((turntableDeg * Math.PI) / 180) * 14} 110"
            fill="none" stroke="${turntableDeg === 180 && hint ? '#52EFBF' : '#FFB86B'}" stroke-width="4"/>
          <text x="90" y="172" text-anchor="middle" fill="#89EFD0" font-size="11" font-weight="800">${turntableDeg}° · 틸트 ${lidTiltDeg}°</text>
        </svg>
      </div>
      <div class="p-stack">
        <div class="p-card">
          <div class="p-card-lbl" style="color:#7CD8FF">① 원통 턴테이블 회전 각도: ${turntableDeg}°${hint ? ' (목표 180°)' : ''}</div>
          <div class="p-row">
            <button class="s-btn" id="p3-rot-l">↺ -30°</button>
            <input type="range" min="0" max="330" step="30" value="${turntableDeg}" id="p3-rot-r" class="p-range"/>
            <button class="s-btn" id="p3-rot-p">↻ +30°</button>
          </div>
        </div>
        <div class="p-card">
          <div class="p-card-lbl" style="color:#FFB86B">② 영혼의 배 뚜껑 수평 기울기: ${lidTiltDeg}°${hint ? ' (목표 0°)' : ''}</div>
          <div class="p-row">
            <button class="s-btn" id="p3-tl">-5°</button>
            <input type="range" min="-30" max="30" step="5" value="${lidTiltDeg}" id="p3-tr" class="p-range"/>
            <button class="s-btn" id="p3-tp">+5°</button>
          </div>
        </div>
        <button class="s-btn primary" id="p3-seat">${aligned && hint ? '✨ 뚜껑 안착 결합 (준비 완료)' : '🔒 뚜껑 안착 결합 시도'}</button>
      </div>
    </div>
  `;

  stage.querySelector<HTMLElement>('#p3-rot-l')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(3, { turntableDeg: (turntableDeg + 330) % 360 });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p3-rot-p')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(3, { turntableDeg: (turntableDeg + 30) % 360 });
    h.rerender();
  };
  stage.querySelector<HTMLInputElement>('#p3-rot-r')!.onchange = (e) => {
    h.patchState(3, { turntableDeg: Number((e.target as HTMLInputElement).value) });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p3-tl')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(3, { lidTiltDeg: Math.max(-30, lidTiltDeg - 5) });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p3-tp')!.onclick = () => {
    soundEngine.playClick();
    h.patchState(3, { lidTiltDeg: Math.min(30, lidTiltDeg + 5) });
    h.rerender();
  };
  stage.querySelector<HTMLInputElement>('#p3-tr')!.onchange = (e) => {
    h.patchState(3, { lidTiltDeg: Number((e.target as HTMLInputElement).value) });
    h.rerender();
  };
  stage.querySelector<HTMLElement>('#p3-seat')!.onclick = () => {
    if (aligned) {
      h.solve(3, { turntableDeg: 180, lidTiltDeg: 0, seated: true }, '마눙굴 항아리 톱니(180°)와 영혼의 배 뚜껑(0°) 결합 복원 완료!');
    } else {
      h.setErr(
        hint
          ? `톱니(${turntableDeg}° → 180°) 또는 뚜껑 기울기(${lidTiltDeg}° → 0°)가 어긋나 톱니가 물리지 않습니다.`
          : `톱니 각도 차이(${Math.abs(180 - turntableDeg)}°) 또는 뚜껑 기울기(${lidTiltDeg}°)가 물리지 않습니다. 서하린의 기어 실측 단서를 확인하세요.`
      );
    }
  };
}

function boardP04(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const links = { '1521': null, '1898': null, '1946': null, ...((s.links as Record<string, string | null>) || {}) };
  const selectedLeft = (s.selectedLeft as string | null) || null;
  const checkedWrong = Array.isArray(s.checkedWrong) ? (s.checkedWrong as string[]) : [];
  const hint = h.difficulty.showTargetHints;

  const leftNodes = [
    { id: '1521', label: '① 1521 막탄 항해', y: 44, color: '#FFD86B' },
    { id: '1898', label: '② 1898 말롤로스 헌법', y: 112, color: '#52EFBF' },
    { id: '1946', label: '③ 1946 공화국 독립', y: 180, color: '#7CD8FF' },
  ];
  const mapPins = [
    { id: 'manila_north', label: '마닐라 북부 (북↑)', x: 256, y: 58 },
    { id: 'malolos', label: '말롤로스 성당 (서←)', x: 204, y: 98 },
    { id: 'visayas', label: '비사야 해협 (동남)', x: 288, y: 162 },
  ];

  const wires = leftNodes
    .map((ln) => {
      const rid = links[ln.id as keyof typeof links];
      const pin = mapPins.find((p) => p.id === rid);
      if (!pin) return '';
      const isBad = checkedWrong.includes(ln.id);
      return `<line x1="12" y1="${ln.y}" x2="${pin.x}" y2="${pin.y}" stroke="${isBad ? '#FF6E6E' : ln.color}" stroke-width="${
        isBad ? 4 : 5
      }" ${isBad ? 'stroke-dasharray="7 5"' : ''} stroke-linecap="round"/>`;
    })
    .join('');

  stage.innerHTML = `
    <div class="au-board">
      <div class="p-subhead" style="color:#E6C886">왼쪽 연표 노드를 클릭(또는 드래그)한 뒤 2D 필리핀 군도 고지도 위 거점 핀과 연결하세요</div>
      <div class="p-map-cross-grid">
        <div class="p-stack-lg">
          ${leftNodes
            .map(
              (n) =>
                `<button class="s-btn" data-ln="${n.id}" draggable="true" style="border-color:${
                  selectedLeft === n.id ? '#fff' : checkedWrong.includes(n.id) ? '#FF6E6E' : n.color
                };background:${selectedLeft === n.id ? '#364654' : '#202A34'};text-align:left">${n.label}</button>`
            )
            .join('')}
        </div>
        <svg viewBox="0 0 360 220" class="p-map-svg">
          <defs>
            <pattern id="seaGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(124,216,255,0.08)" stroke-width="1"/>
            </pattern>
          </defs>
          <rect x="0" y="0" width="360" height="220" rx="8" fill="#0B1520"/>
          <rect x="0" y="0" width="360" height="220" rx="8" fill="url(#seaGrid)"/>
          <text x="16" y="18" fill="rgba(124,216,255,0.65)" font-size="10" font-weight="700">SULU · ARCHIPELAGO MAP</text>
          <!-- Stylized Philippine archipelago landmasses (Luzon, Visayas, Mindanao) -->
          <path d="M225 22 L272 28 L280 70 L264 102 L236 105 L206 96 L212 62 Z" fill="#2A3A47" stroke="#5D7486" stroke-width="2"/>
          <path d="M238 124 L268 120 L312 138 L302 162 L262 158 L242 142 Z" fill="#2A3A47" stroke="#5D7486" stroke-width="2"/>
          <path d="M250 172 L308 168 L328 198 L284 208 L248 196 Z" fill="#2A3A47" stroke="#5D7486" stroke-width="2"/>
          <text x="334" y="24" text-anchor="end" fill="#52EFBF" font-size="10" font-weight="800">N ↑</text>
          ${wires}
          ${mapPins
            .map((pin) => {
              const linkedNode = leftNodes.find((n) => links[n.id as keyof typeof links] === pin.id);
              const isBad = linkedNode && checkedWrong.includes(linkedNode.id);
              const col = isBad ? '#FF6E6E' : linkedNode ? linkedNode.color : '#E6C886';
              return `<g class="p-map-pin" data-rn="${pin.id}" style="cursor:pointer">
                <circle cx="${pin.x}" cy="${pin.y}" r="14" fill="rgba(11,14,19,0.72)" stroke="${col}" stroke-width="2.2"/>
                <circle cx="${pin.x}" cy="${pin.y}" r="5" fill="${col}"/>
                <rect x="${pin.x - 52}" y="${pin.y + 16}" width="104" height="17" rx="4" fill="rgba(11,16,23,0.9)" stroke="rgba(230,200,134,0.4)"/>
                <text x="${pin.x}" y="${pin.y + 28}" text-anchor="middle" fill="#F1F5F9" font-size="9.5" font-weight="800">${pin.label}</text>
              </g>`;
            })
            .join('')}
        </svg>
      </div>
      <div class="p-row-end" style="margin-top:12px">
        <button class="s-btn primary" id="p4-verify">✔ 3대 연표 결선 확인</button>
      </div>
    </div>
  `;

  stage.querySelectorAll<HTMLElement>('[data-ln]').forEach((b) => {
    b.onclick = () => {
      soundEngine.playClick();
      h.patchState(4, { selectedLeft: b.dataset.ln });
      h.rerender();
    };
    b.ondragstart = (e) => {
      h.patchState(4, { selectedLeft: b.dataset.ln });
      e.dataTransfer?.setData('text/plain', b.dataset.ln || '');
    };
  });
  stage.querySelectorAll<HTMLElement>('[data-rn]').forEach((b) => {
    const connect = (ln: string | null) => {
      if (!ln) {
        h.setErr('먼저 왼쪽 연표(1521·1898·1946) 노드를 선택하세요.');
        return;
      }
      soundEngine.playClick();
      const nextWrong = checkedWrong.filter((id) => id !== ln);
      h.patchState(4, { links: { ...links, [ln]: b.dataset.rn }, selectedLeft: null, checkedWrong: nextWrong });
      h.rerender();
    };
    b.onclick = () => connect(selectedLeft);
    b.ondragover = (e) => e.preventDefault();
    b.ondrop = (e) => {
      e.preventDefault();
      connect(e.dataTransfer?.getData('text/plain') || selectedLeft);
    };
  });
  stage.querySelector<HTMLElement>('#p4-verify')!.onclick = () => {
    const expected: Record<string, string> = {
      '1521': 'visayas',
      '1898': 'malolos',
      '1946': 'manila_north',
    };
    const wrong = Object.keys(expected).filter((k) => links[k as keyof typeof links] !== expected[k]);
    if (wrong.length === 0) {
      h.solve(4, { links, checkedWrong: [] }, '군도 해협과 3대 독립 연표 크로스 결선 완벽 일치!');
    } else {
      h.patchState(4, { checkedWrong: wrong });
      h.setErr(
        hint
          ? '적색 점선으로 표시된 노선이 어긋났습니다. (2번 말롤로스=서←, 3번 마닐라=북↑) 다시 연결하세요.'
          : '적색 점선으로 표시된 노선이 린의 해협 측량 좌표와 일치하지 않습니다. 해당 선만 다시 연결하세요.'
      );
    }
  };
}

function boardP05(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const rows = ((s.rows as (string | null)[]) || [null, null, null]).slice(0, 3);
  const heddleOpen = ((s.heddleOpen as boolean[]) || [false, false, false]).slice(0, 3);
  const hint = h.difficulty.showTargetHints;
  const shuttles = [
    { id: 'gold', label: hint ? '☀ 황금 실 (1줄)' : '☀ 황금 실', hex: '#E6C886' },
    { id: 'crimson', label: hint ? '⚡ 진홍 실 (2줄)' : '⚡ 진홍 실', hex: '#E35B5B' },
    { id: 'cyan', label: hint ? '🌊 청록 실 (3줄)' : '🌊 청록 실', hex: '#52D7E8' },
  ];

  stage.innerHTML = `
    <div class="au-board p-stack">
      <div class="p-loom-frame">
        <div class="p-subhead" style="color:#E6C886">이푸가오 수직 베틀 (먼저 페달 1~3으로 줄을 벌린 뒤 맞는 색 북을 통과시키세요)</div>
        <div class="p-stack">
          ${[0, 1, 2]
            .map((i) => {
              const col = shuttles.find((x) => x.id === rows[i]);
              return `<div class="p-loom-row">
                <button class="s-btn ${heddleOpen[i] ? 'primary' : ''}" data-ped="${i}">페달 ${i + 1} ${heddleOpen[i] ? '열림' : '닫힘'}</button>
                <div class="p-loom-thread" style="background:${col ? col.hex : heddleOpen[i] ? '#2C3846' : '#161B21'};color:${col ? '#0B0E13' : '#9AA7B4'}">
                  ${col ? col.label + ' 직조됨' : heddleOpen[i] ? '날실 열림 — 아래 실을 선택!' : '페달로 줄을 먼저 여세요'}
                </div>
                <button class="s-btn" data-rew="${i}">↺ 되감기</button>
              </div>`;
            })
            .join('')}
        </div>
      </div>
      <div class="p-row-between">
        <div class="p-row">
          ${shuttles.map((sh) => `<button class="s-btn" data-sh="${sh.id}" style="background:${sh.hex};color:#0B0E13;font-weight:800">🧵 ${sh.label} 왕복</button>`).join('')}
        </div>
        <button class="s-btn primary" id="p5-done">✔ 직물 완성 검증</button>
      </div>
    </div>
  `;

  stage.querySelectorAll<HTMLElement>('[data-ped]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.ped);
      soundEngine.playClick();
      h.patchState(5, { heddleOpen: heddleOpen.map((v, i) => (i === idx ? !v : false)) });
      h.rerender();
    };
  });
  stage.querySelectorAll<HTMLElement>('[data-rew]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.rew);
      const next = [...rows];
      next[idx] = null;
      soundEngine.playClick();
      h.patchState(5, { rows: next });
      h.rerender();
    };
  });
  stage.querySelectorAll<HTMLElement>('[data-sh]').forEach((b) => {
    b.onclick = () => {
      const openIdx = heddleOpen.findIndex(Boolean);
      if (openIdx === -1) {
        h.setErr('먼저 페달(1~3) 중 하나를 밟아 실틈을 열어 주세요!');
        return;
      }
      const next = [...rows];
      next[openIdx] = b.dataset.sh || null;
      soundEngine.playClick();
      h.patchState(5, { rows: next });
      h.rerender();
    };
  });
  stage.querySelector<HTMLElement>('#p5-done')!.onclick = () => {
    if (rows[0] === 'gold' && rows[1] === 'crimson' && rows[2] === 'cyan') {
      h.solve(5, { rows }, '이푸가오 3색 씨실·날실 직조 완료! 전통 직물 전시가 복원되었습니다.');
    } else {
      h.setErr(
        hint
          ? '상단(황금)→중단(진홍)→하단(청록) 순서가 어긋났습니다. 잘못된 줄만 되감기 후 다시 엮어 보세요.'
          : '카이의 직물 루페 무전 순서와 어긋납니다. 잘못된 줄만 되감기 후 다시 엮어 보세요.'
      );
    }
  };
}

function boardP06(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const switches = ((s.switches as string[]) || ['A', 'A', 'B']).slice(0, 3);
  const dir = String(s.dir || 'N');
  const dispatched = Boolean(s.dispatched);
  const routeOk = switches[0] === 'B' && switches[1] === 'B' && switches[2] === 'A';
  const hint = h.difficulty.showTargetHints;

  stage.innerHTML = `
    <div class="au-board p-stack">
      <svg viewBox="0 0 460 120" class="p-tram-svg">
        <text x="16" y="20" fill="#89EFD0" font-size="11" font-weight="700">Intramuros 출발</text>
        <text x="200" y="108" fill="#E6C886" font-size="11" font-weight="700">2번 비논도 우회선</text>
        <text x="346" y="20" fill="#52EFBF" font-size="11" font-weight="700">파시그강 도개교</text>
        <path d="M20 40 L140 40 L290 40 L430 40" stroke="#303D4A" stroke-width="6" fill="none"/>
        <path d="M140 40 L200 84 L320 84 L360 40" stroke="#303D4A" stroke-width="6" fill="none"/>
        <path d="${routeOk ? 'M20 40 L140 40 L200 84 L320 84 L360 40 L430 40' : 'M20 40 L140 40'}" stroke="${routeOk ? '#52EFBF' : '#FF6E6E'}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <circle cx="${dispatched && routeOk ? 420 : 28}" cy="40" r="9" fill="#FFD86B" stroke="#0B0E13" stroke-width="2"/>
      </svg>
      <div class="p-grid-3">
        ${[0, 1, 2]
          .map(
            (i) =>
              `<button class="s-btn ${hint && switches[i] === (i < 2 ? 'B' : 'A') ? 'amber' : ''}" data-sw="${i}">레버 S${i + 1}: <strong>${switches[i]} 분기</strong></button>`
          )
          .join('')}
      </div>
      <div class="p-row-between">
        <div class="p-row">
          <span style="font:800 12px sans-serif;color:#7CD8FF">광학 뷰파인더:</span>
          ${(['N', 'E', 'S', 'W'] as const)
            .map(
              (d) =>
                `<button class="s-btn ${dir === d ? 'primary' : ''}" data-vdir="${d}">${{ N: '북↑', E: '동→', S: '남↓', W: '서←' }[d]}</button>`
            )
            .join('')}
        </div>
        <button class="s-btn primary" id="p6-go">🚋 1910 전차 출발</button>
      </div>
    </div>
  `;

  stage.querySelectorAll<HTMLElement>('[data-sw]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.sw);
      const next = [...switches];
      next[idx] = next[idx] === 'A' ? 'B' : 'A';
      soundEngine.playClick();
      h.patchState(6, { switches: next });
      h.rerender();
    };
  });
  stage.querySelectorAll<HTMLElement>('[data-vdir]').forEach((b) => {
    b.onclick = () => {
      soundEngine.playClick();
      h.patchState(6, { dir: b.dataset.vdir });
      h.rerender();
    };
  });
  stage.querySelector<HTMLElement>('#p6-go')!.onclick = () => {
    if (routeOk && dir === 'E') {
      h.solve(6, { switches, dir: 'E', dispatched: true }, '전차가 2번 우회선로를 따라 동쪽 파시그강 도개교를 무사히 건넜습니다!');
    } else {
      h.setErr(
        hint
          ? '선로 조합(S1=B, S2=B, S3=A) 또는 뷰파인더 방위(동 →)가 맞지 않아 완충기에 정지했습니다.'
          : '선로 연결 또는 뷰파인더 방위가 이안의 노선표 무전과 일치하지 않아 완충기에 정지했습니다.'
      );
    }
  };
}

function boardP07(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const valves = ((s.valves as number[]) || [100, 50, 25]).slice(0, 3);
  const p1 = Math.round(50 + 0.4 * (100 - valves[0]) - 0.2 * valves[2]);
  const p2 = Math.round(40 + 0.4 * valves[1]);
  const p3 = Math.round(20 + 0.4 * valves[2]);
  const psis = [p1, p2, p3];
  const allGreen = psis.every((v) => v >= 55 && v <= 65);
  const hint = h.difficulty.showTargetHints;

  stage.innerHTML = `
    <div class="au-board p-stack">
      <div class="p-grid-3">
        ${[0, 1, 2]
          .map((i) => {
            const psi = psis[i];
            const ok = psi >= 55 && psi <= 65;
            const ang = -110 + Math.min(120, Math.max(0, psi)) * 1.83;
            return `<div class="p-gauge-card ${ok ? 'ok' : ''}">
              <div style="font:800 12px monospace;color:${ok ? '#52EFBF' : '#FFB86B'}">구역 ${i + 1} · ${psi} PSI</div>
              <svg viewBox="0 0 120 74" width="110" height="68" style="margin:4px auto;display:block">
                <path d="M18 62 A42 42 0 1 1 102 62" fill="none" stroke="#2D3844" stroke-width="10"/>
                <path d="M48 21 A42 42 0 0 1 72 21" fill="none" stroke="#52EFBF" stroke-width="10"/>
                <line x1="60" y1="60" x2="60" y2="24" stroke="#FF6E6E" stroke-width="3" transform="rotate(${ang} 60 60)" stroke-linecap="round"/>
                <circle cx="60" cy="60" r="6" fill="#C89D54"/>
              </svg>
              <div style="font:700 12px monospace;margin:4px 0">밸브 ${i + 1}: <strong>${valves[i]}%</strong></div>
              <div class="p-row" style="justify-content:center">
                <button class="s-btn" data-vd="${i}">-25%</button>
                <button class="s-btn" data-vu="${i}">+25%</button>
              </div>
            </div>`;
          })
          .join('')}
      </div>
      <button class="s-btn primary" id="p7-lock">${allGreen ? '✔ 전 구역 60 PSI 녹색 존 안착 — 배수 완료!' : '⚙ 수압 평형 검증 (3구역 모두 55~65 PSI)'}</button>
    </div>
  `;

  stage.querySelectorAll<HTMLElement>('[data-vd]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.vd);
      const next = [...valves];
      next[idx] = Math.max(0, next[idx] - 25);
      soundEngine.playClick();
      h.patchState(7, { valves: next });
      h.rerender();
    };
  });
  stage.querySelectorAll<HTMLElement>('[data-vu]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.vu);
      const next = [...valves];
      next[idx] = Math.min(100, next[idx] + 25);
      soundEngine.playClick();
      h.patchState(7, { valves: next });
      h.rerender();
    };
  });
  stage.querySelector<HTMLElement>('#p7-lock')!.onclick = () => {
    if (allGreen) {
      h.solve(7, { valves }, 'B1 주 급수관 3구역 모두 60 PSI 평형 달성! 통로 배수가 완료되었습니다.');
    } else {
      h.setErr(
        hint
          ? `현재 수압 [${psis.join(', ')}] PSI. 3구역 모두 55~65 PSI 녹색 대역에 맞추세요 (1:25%, 2:50%, 3:100%).`
          : `현재 수압 [${psis.join(', ')}] PSI. 세 압력계 바늘을 모두 중앙 녹색 대역(55~65 PSI)에 맞추세요.`
      );
    }
  };
}

function boardP08(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  let livePsi = Number(s.boilerPsi ?? 145);
  let pump1Rpm = Number(s.pump1Rpm ?? 800);
  let pump2Rpm = Number(s.pump2Rpm ?? 1560);
  const tol = h.difficulty.p08RpmTolerance;
  const hint = h.difficulty.showTargetHints;
  const psiOk = (v: number) => v >= 70 && v <= 90;
  const isPsiOk = psiOk(livePsi);

  stage.innerHTML = `
    <div class="au-board p-stack">
      <div class="p-card ${isPsiOk ? 'ok' : 'warn'}" id="p8-psi-card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <div id="p8-psi-lbl" style="font:800 13px sans-serif;color:${isPsiOk ? '#52EFBF' : '#FF6E6E'}">① 보일러 증기 압력: ${Math.round(livePsi)} PSI (안전 대역 70~90 PSI${h.difficulty.p08DriftPerSec > 0 ? ' · 실시간 상승 중!' : ''})</div>
          <div class="p-meter-track"><div id="p8-psi-bar" class="p-meter-fill" style="width:${Math.min(100, Math.round((livePsi / 160) * 100))}%;background:${isPsiOk ? '#52EFBF' : '#FF6E6E'}"></div></div>
        </div>
        <div class="p-row">
          <button class="s-btn danger" id="p8-bleed">💨 증기 배출 (-15 PSI)</button>
          <button class="s-btn" id="p8-add">+10 PSI</button>
        </div>
      </div>
      <div class="p-grid-2">
        <div class="p-card">
          <div id="p8-r1-lbl" style="font:800 12px monospace;color:#FFB86B">펌프 1호기: ${pump1Rpm} RPM${hint ? ' (목표 ~1200)' : ''}</div>
          <input type="range" min="700" max="1600" step="20" value="${pump1Rpm}" id="p8-r1" style="width:100%;margin-top:8px"/>
        </div>
        <div class="p-card">
          <div id="p8-r2-lbl" style="font:800 12px monospace;color:#7CD8FF">펌프 2호기: ${pump2Rpm} RPM (차이: ${Math.abs(pump1Rpm - pump2Rpm)} RPM · 허용 ±${tol})</div>
          <input type="range" min="700" max="1600" step="20" value="${pump2Rpm}" id="p8-r2" style="width:100%;margin-top:8px"/>
        </div>
      </div>
      <button class="s-btn primary" id="p8-sync">⚡ 복식 펌프 위상 동기 잠금</button>
    </div>
  `;

  const syncPsiDom = () => {
    const rounded = Math.round(livePsi);
    const ok = psiOk(rounded);
    const card = stage.querySelector('#p8-psi-card');
    const lbl = stage.querySelector<HTMLElement>('#p8-psi-lbl');
    const bar = stage.querySelector<HTMLElement>('#p8-psi-bar');
    if (card) {
      card.classList.toggle('ok', ok);
      card.classList.toggle('warn', !ok);
    }
    if (lbl) {
      lbl.style.color = ok ? '#52EFBF' : '#FF6E6E';
      lbl.textContent = `① 보일러 증기 압력: ${rounded} PSI (안전 대역 70~90 PSI${h.difficulty.p08DriftPerSec > 0 ? ' · 실시간 상승 중!' : ''})`;
    }
    if (bar) {
      bar.style.width = `${Math.min(100, Math.round((rounded / 160) * 100))}%`;
      bar.style.background = ok ? '#52EFBF' : '#FF6E6E';
    }
  };

  if (h.difficulty.p08DriftPerSec > 0 && !h.isSolved) {
    let tickCount = 0;
    const timer = window.setInterval(() => {
      if (livePsi < 160) {
        livePsi = Math.min(160, livePsi + h.difficulty.p08DriftPerSec * 0.25);
        syncPsiDom();
        tickCount++;
        if (tickCount % 4 === 0) {
          h.patchState(8, { boilerPsi: Math.round(livePsi) });
        }
      }
    }, 250);
    h.registerCleanup(() => window.clearInterval(timer));
  }

  stage.querySelector<HTMLElement>('#p8-bleed')!.onclick = () => {
    soundEngine.playClick();
    livePsi = Math.max(50, Math.round(livePsi) - 15);
    h.patchState(8, { boilerPsi: livePsi });
    syncPsiDom();
  };
  stage.querySelector<HTMLElement>('#p8-add')!.onclick = () => {
    soundEngine.playClick();
    livePsi = Math.min(160, Math.round(livePsi) + 10);
    h.patchState(8, { boilerPsi: livePsi });
    syncPsiDom();
  };
  stage.querySelector<HTMLInputElement>('#p8-r1')!.oninput = (e) => {
    pump1Rpm = Number((e.target as HTMLInputElement).value);
    const l1 = stage.querySelector('#p8-r1-lbl');
    const l2 = stage.querySelector('#p8-r2-lbl');
    if (l1) l1.textContent = `펌프 1호기: ${pump1Rpm} RPM${hint ? ' (목표 ~1200)' : ''}`;
    if (l2) l2.textContent = `펌프 2호기: ${pump2Rpm} RPM (차이: ${Math.abs(pump1Rpm - pump2Rpm)} RPM · 허용 ±${tol})`;
  };
  stage.querySelector<HTMLInputElement>('#p8-r1')!.onchange = (e) => {
    pump1Rpm = Number((e.target as HTMLInputElement).value);
    h.patchState(8, { pump1Rpm });
  };
  stage.querySelector<HTMLInputElement>('#p8-r2')!.oninput = (e) => {
    pump2Rpm = Number((e.target as HTMLInputElement).value);
    const l2 = stage.querySelector('#p8-r2-lbl');
    if (l2) l2.textContent = `펌프 2호기: ${pump2Rpm} RPM (차이: ${Math.abs(pump1Rpm - pump2Rpm)} RPM · 허용 ±${tol})`;
  };
  stage.querySelector<HTMLInputElement>('#p8-r2')!.onchange = (e) => {
    pump2Rpm = Number((e.target as HTMLInputElement).value);
    h.patchState(8, { pump2Rpm });
  };
  stage.querySelector<HTMLElement>('#p8-sync')!.onclick = () => {
    const curPsi = Math.round(livePsi);
    const curRpmOk = Math.abs(pump1Rpm - pump2Rpm) <= tol && pump1Rpm >= 1150 && pump1Rpm <= 1250;
    if (psiOk(curPsi) && curRpmOk) {
      h.solve(8, { boilerPsi: curPsi, pump1Rpm, pump2Rpm, synced: true }, '보일러 압력 정상(70~90 PSI) & 복식 순환 펌프 1200 RPM 동기 잠금 완료!');
    } else {
      h.setErr(
        hint
          ? `보일러(${curPsi} PSI → 70~90 PSI)와 1·2호기 펌프(1150~1250 RPM, 차이 ±${tol} 이내)를 모두 맞춘 뒤 잠그세요.`
          : `릴리프 밸브 작동! 보일러 압력(70~90 PSI)을 유지한 채 카이의 안정 RPM 대역(±${tol} 이내)에 동기화하세요.`
      );
    }
  };
}

function boardP09(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  let heat = Number(s.heat ?? 0);
  const genRunning = Boolean(s.genRunning);
  const bus = ((s.bus as boolean[]) || [true, true, false]).slice(0, 3);
  const busOk = !bus[0] && !bus[1] && bus[2];
  const hint = h.difficulty.showTargetHints;
  const holdSec = (h.difficulty.p09HoldMs / 1000).toFixed(1);

  stage.innerHTML = `
    <div class="au-board p-stack">
      <div class="p-card ${genRunning ? 'ok' : 'warn'}" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div style="flex:1;min-width:220px">
          <div id="p9-heat-lbl" style="font:800 13px sans-serif;color:#FFB86B">① 비상 디젤 발전기 (${genRunning ? '60Hz 정상 가동 중 ✔' : `예열 ${Math.round(heat)}% / 정지`})</div>
          <div style="font-size:12px;color:#9BB0BE">예열 스위치를 ${holdSec}초간 꾹 눌러 코일을 100% 예열한 뒤 크랭크를 기동하세요.</div>
          <div class="p-hold-bar"><div id="p9-heat-fill" class="p-hold-fill" style="width:${Math.min(100, Math.round(heat))}%"></div></div>
        </div>
        <div class="p-row">
          <button class="s-btn amber" id="p9-heat" ${heat >= 100 || genRunning ? 'disabled' : ''}>🔥 ${heat >= 100 ? '예열 완료 ✔' : `코일 예열 (${holdSec}초 꾹 누르기)`}</button>
          <button class="s-btn primary" id="p9-crank" ${heat < 100 || genRunning ? 'disabled' : ''}>🔑 크랭크 기동</button>
        </div>
      </div>
      <div class="p-grid-3">
        ${[0, 1, 2]
          .map(
            (i) => `<button class="s-btn ${bus[i] ? (hint && i < 2 ? 'danger' : i < 2 ? 'amber' : 'primary') : ''}" data-bus="${i}">
              베이 ${i + 1} (${hint ? (i < 2 ? '침수 단락 위험!' : '예비 우회 모선') : `고압 모선 #${i + 1}`})<br>
              <strong>${bus[i] ? '🔌 ON (투입)' : '⬜ OFF (차단)'}</strong>
            </button>`
          )
          .join('')}
      </div>
      <button class="s-btn primary" id="p9-main">🔴 중앙 로터리 주 차단기 투입 (박물관 전역 조명 복구)</button>
    </div>
  `;

  const heatBtn = stage.querySelector<HTMLButtonElement>('#p9-heat')!;
  let holdTimer: number | null = null;
  const stopHold = (commitIfPartial: boolean) => {
    if (holdTimer === null) return;
    window.clearInterval(holdTimer);
    holdTimer = null;
    if (commitIfPartial && heat < 100) {
      h.patchState(9, { heat: Math.round(heat) });
    }
  };
  h.registerCleanup(() => {
    if (holdTimer !== null) window.clearInterval(holdTimer);
  });

  heatBtn.addEventListener('pointerdown', () => {
    if (heat >= 100 || genRunning || holdTimer !== null) return;
    const stepPer50Ms = (100 / h.difficulty.p09HoldMs) * 50;
    soundEngine.playClick();
    holdTimer = window.setInterval(() => {
      heat = Math.min(100, heat + stepPer50Ms);
      const fill = stage.querySelector<HTMLElement>('#p9-heat-fill');
      const lbl = stage.querySelector('#p9-heat-lbl');
      if (fill) fill.style.width = `${Math.round(heat)}%`;
      if (lbl) lbl.textContent = `① 비상 디젤 발전기 (예열 ${Math.round(heat)}% / 정지)`;
      if (heat >= 100) {
        stopHold(false);
        soundEngine.playClick();
        h.patchState(9, { heat: 100 });
        h.rerender();
      }
    }, 50);
  });
  heatBtn.addEventListener('pointerup', () => stopHold(true));
  heatBtn.addEventListener('pointerleave', () => stopHold(true));
  heatBtn.addEventListener('pointercancel', () => stopHold(true));

  stage.querySelector<HTMLElement>('#p9-crank')!.onclick = () => {
    soundEngine.playPowerOn();
    h.patchState(9, { genRunning: true });
    h.setInfo('디젤 발전기 60Hz 기동 성공! 이제 린의 점검표 무전에 맞춰 배전반 모선(1~3)을 라우팅하세요.');
  };
  stage.querySelectorAll<HTMLElement>('[data-bus]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.bus);
      const next = [...bus];
      next[idx] = !next[idx];
      soundEngine.playClick();
      h.patchState(9, { bus: next });
      h.rerender();
    };
  });
  stage.querySelector<HTMLElement>('#p9-main')!.onclick = () => {
    if (!genRunning) {
      h.setErr('먼저 디젤 발전기를 끝까지 예열(100%)한 뒤 크랭크 기동하세요.');
      return;
    }
    if (busOk) {
      soundEngine.playPowerOn();
      h.solve(9, { heat: 100, genRunning: true, bus, breaker: true }, '비상 전력 복구 완료! 박물관 1F·2F·B1 전체 정식 조명이 점등되었습니다!');
    } else {
      h.setErr(
        hint
          ? '과전류 트립! 단락된 1·2번 모선을 OFF로 끄고, 3번 예비 우회 모선만 ON 상태로 투입하세요.'
          : '과전류 트립! 침수 단락된 모선을 차단하고 린의 무전([3번]+[반전 ⇄])대로 우회 모선만 투입하세요.'
      );
    }
  };
}

function boardP10(stage: HTMLElement, s: Record<string, unknown>, h: BoardHelpers) {
  const rh = Number(s.rh ?? 72);
  const temp = Number(s.temp ?? 24);
  const crateLatch = Boolean(s.crateLatch);
  const crane = ((s.crane as number[]) || [0, 1]).slice(0, 2);
  const cratePos = ((s.cratePos as number[]) || [1, 3]).slice(0, 2);
  const holding = Boolean(s.holding);
  const dewOk = rh === 45 && temp === 18;
  const puddles = new Set(['2,2', '3,2', '2,3']);
  const targetKey = '4,1';

  let cells = '';
  for (let y = 1; y <= 4; y++) {
    for (let x = 0; x <= 4; x++) {
      const key = `${x},${y}`;
      const isPud = puddles.has(key);
      const isTarget = key === targetKey;
      const isCrane = crane[0] === x && crane[1] === y;
      const isCrate = cratePos[0] === x && cratePos[1] === y;
      const mistCell = !dewOk && !isCrane && !isCrate && !isTarget;
      cells += `<div class="au-cell ${dewOk && isPud ? 'puddle' : ''} ${isTarget ? 'rack' : ''}">
        ${
          isCrane
            ? `<span style="color:#FFD86B">${holding ? '🏗📦' : '🏗'}</span>`
            : isCrate
              ? '📦'
              : isTarget
                ? '선반'
                : mistCell
                  ? '🌫'
                  : isPud
                    ? '🌊'
                    : `${x},${y}`
        }
      </div>`;
    }
  }

  stage.innerHTML = `
    <div class="au-board p-grid-1-auto">
      <div class="p-stack">
        <div class="p-card ${dewOk ? 'ok' : 'warn'}">
          <div style="font:800 13px sans-serif;color:${dewOk ? '#52EFBF' : '#7CD8FF'}">
            ① 🔍 카이 · 제습 공조: ${dewOk ? '안정화 완료 ✔ (안개 제거됨)' : '도움 필요 🔒'}
          </div>
          <p style="margin:5px 0 0;font-size:12px;color:#C8D6E2">
            ${
              dewOk
                ? '수장고 습기 안개가 걷혀 침수 물웅덩이 위치가 보입니다. 안전 경로로 상자를 옮기세요.'
                : '카이가 항온·제습 공조기(rescue-dehumid-nw)를 조절해 수장고 안개를 걷어줘야 합니다.'
            }
          </p>
        </div>
        <div class="p-card ${crateLatch ? 'ok' : 'warn'}">
          <div style="font:800 13px sans-serif;color:${crateLatch ? '#52EFBF' : '#FFB86B'}">
            ② ⚙ 서하린 · 방수 크레이트 걸쇠: ${crateLatch ? '체결 완료 ✔ (인양 가능)' : '도움 필요 🔒'}
          </div>
          <p style="margin:5px 0 0;font-size:12px;color:#C8D6E2">
            ${
              crateLatch
                ? '인양 대상 1번 방수 크레이트의 걸쇠가 체결되었습니다.'
                : '서하린이 방수 크레이트(rescue-crate-sw1/2) 걸쇠를 체결하고 무전을 보내야 합니다.'
            }
          </p>
        </div>
        <div class="p-stack">
          <div style="font:800 12px sans-serif;color:#52EFBF">③ 🧭 린 · 2축 호이스트 크레인 조작 (📦 → (4,1) 선반)</div>
          <div class="p-row">
            <button class="s-btn" data-mv="-1,0">◀</button>
            <button class="s-btn" data-mv="0,-1">▲</button>
            <button class="s-btn" data-mv="0,1">▼</button>
            <button class="s-btn" data-mv="1,0">▶</button>
            <button class="s-btn amber" id="p10-hook">${holding ? '⬇ 상자 내리기' : '⬆ 상자 집기'}</button>
          </div>
        </div>
      </div>
      <div class="au-grid-5x4">${cells}</div>
    </div>
  `;

  stage.querySelectorAll<HTMLElement>('[data-mv]').forEach((b) => {
    b.onclick = () => {
      const [dx, dy] = (b.dataset.mv || '0,0').split(',').map(Number);
      const nx = Math.max(0, Math.min(4, crane[0] + dx));
      const ny = Math.max(1, Math.min(4, crane[1] + dy));
      if (holding && puddles.has(`${nx},${ny}`)) {
        h.setErr(
          dewOk
            ? '침수 물웅덩이 구역 위로는 상자를 지날 수 없습니다! 우회 경로로 이동하세요.'
            : '짙은 안개 속 침수 물웅덩이에 가로막혔습니다! 카이가 안개를 걷어내야 경로가 보입니다.'
        );
        return;
      }
      soundEngine.playClick();
      h.patchState(10, { crane: [nx, ny], cratePos: holding ? [nx, ny] : cratePos });
      h.rerender();
    };
  });
  stage.querySelector<HTMLElement>('#p10-hook')!.onclick = () => {
    if (!holding) {
      if (!crateLatch) {
        h.setErr('먼저 서하린이 1번 방수 크레이트 걸쇠(rescue-crate-sw1/2)를 체결해야 인양할 수 있습니다.');
        return;
      }
      if (crane[0] === cratePos[0] && crane[1] === cratePos[1]) {
        soundEngine.playClick();
        h.patchState(10, { holding: true });
        h.rerender();
      } else {
        h.setErr('크레인을 먼저 상자 📦 위로 이동시킨 후 집어 올리세요.');
      }
    } else {
      h.patchState(10, { holding: false });
      if (dewOk && cratePos[0] === 4 && cratePos[1] === 1) {
        h.solve(10, { rh, temp, crateLatch, crane, cratePos: [4, 1], holding: false }, '제습 안정화 및 스틸 선반(4,1) 방수 상자 안전 안착 완료!');
      } else {
        h.rerender();
        if (!dewOk) h.setErr('먼저 카이가 제습 공조(안개 제거)를 완료한 뒤 선반(4,1)에 내려놓으세요!');
      }
    }
  };
}
