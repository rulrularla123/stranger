import { C_CATEGORIES, ROLES, TOKENS_BY_ID, renderTokenPillHtml } from '../data/cMenuTokens.ts';
import { soundEngine } from '../audio/soundEngine.ts';
import type { SessionClient } from '../net/sessionClient.ts';

export class CMenuWheel {
  private root: HTMLElement;
  private session: SessionClient;
  private open = false;
  private selected: string[] = [];
  private activeCatIdx = 0;

  constructor(container: HTMLElement, session: SessionClient) {
    this.session = session;
    this.root = document.createElement('div');
    this.root.className = 'cwheel-backdrop';
    this.root.id = 'cwheel-backdrop';
    container.appendChild(this.root);

    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.close();
    });
  }

  isOpen(): boolean {
    return this.open;
  }

  toggle(force?: boolean) {
    const next = force !== undefined ? force : !this.open;
    if (next === this.open) return;
    this.open = next;
    this.root.classList.toggle('open', this.open);
    if (this.open) {
      soundEngine.playClick();
      this.render();
    }
  }

  close() {
    this.toggle(false);
  }

  render() {
    if (!this.open) return;
    const role = this.session.getMyRole();
    const rMeta = ROLES[role];
    const selHtml = this.selected.length
      ? this.selected.map((id) => renderTokenPillHtml(id)).join(' <span class="cw-plus">+</span> ')
      : '<span class="cw-hint">1~2개 토큰을 선택해 조합 무전을 보내세요</span>';

    const ringTokens = C_CATEGORIES.flatMap((cat) => cat.tokens);
    const radius = 196;
    const cx = 250;
    const cy = 250;

    const nodesHtml = ringTokens
      .map((tok, i) => {
        const angle = ((i / ringTokens.length) * Math.PI * 2) - Math.PI / 2;
        const x = Math.round(cx + Math.cos(angle) * radius);
        const y = Math.round(cy + Math.sin(angle) * radius);
        const isSel = this.selected.includes(tok.id);
        return `<button class="cw-node ${isSel ? 'selected' : ''}" data-tok="${tok.id}"
          style="left:${x}px;top:${y}px;--tok-color:${tok.color}" title="${tok.sub}">
          <span class="cw-glyph">${tok.glyph}</span>
          <span class="cw-label">${tok.label}</span>
        </button>`;
      })
      .join('');

    const activeCat = C_CATEGORIES[this.activeCatIdx];

    this.root.innerHTML = `
      <div class="cw-dialog" role="dialog" aria-label="C-Menu 2.0 20토큰 무전 휠">
        <div class="cw-head">
          <div>
            <span class="cw-badge" style="color:${rMeta.color};border-color:${rMeta.color}">${rMeta.badge} ${rMeta.name} (${rMeta.shortRole})</span>
            <strong>C-Menu 2.0 전술 무전 휠 (4분류 20토큰)</strong>
          </div>
          <button class="au-close-x" id="cw-close" aria-label="무전 휠 닫기">✕</button>
        </div>

        <div class="cw-body">
          <div class="cw-wheel-stage">
            <div class="cw-ring-bg"></div>
            <div class="cw-quad-lbl q1">① 수치·순서</div>
            <div class="cw-quad-lbl q2">② 방위·동작</div>
            <div class="cw-quad-lbl q3">③ 문양·속성</div>
            <div class="cw-quad-lbl q4">④ 협동 콜사인</div>
            ${nodesHtml}
            <div class="cw-hub">
              <div class="cw-hub-title">조합 패킷 (최대 2개)</div>
              <div class="cw-hub-sel">${selHtml}</div>
              <div class="cw-hub-actions">
                <button class="s-btn" id="cw-clear">지우기</button>
                <button class="s-btn primary" id="cw-send" ${this.selected.length ? '' : 'disabled'}>📡 무전 발신</button>
              </div>
            </div>
          </div>

          <div class="cw-cat-side">
            <div class="cw-cat-tabs">
              ${C_CATEGORIES.map(
                (c, idx) =>
                  `<button class="cw-cat-tab ${idx === this.activeCatIdx ? 'active' : ''}" data-cidx="${idx}" style="--cat-col:${c.color}">${c.label}</button>`
              ).join('')}
            </div>
            <div class="cw-cat-grid">
              ${activeCat.tokens
                .map(
                  (t) => `<button class="cw-list-btn ${this.selected.includes(t.id) ? 'selected' : ''}" data-tok="${t.id}" style="--tok-color:${t.color}">
                    <span class="cw-list-glyph">${t.glyph}</span>
                    <span><strong>${t.label}</strong><small>${t.sub}</small></span>
                  </button>`
                )
                .join('')}
            </div>
            <p class="cw-access-note">색맹·저연령 배려: 모든 토큰에 고유 아이콘 + 색상 + 한글 명칭이 함께 표기됩니다. 발신 시 상단 배너(12초)와 퍼즐 모달 우측 상단에 고정됩니다.</p>
          </div>
        </div>
      </div>
    `;

    this.root.querySelector('#cw-close')?.addEventListener('click', () => this.close());
    this.root.querySelector('#cw-clear')?.addEventListener('click', () => {
      this.selected = [];
      this.render();
    });
    this.root.querySelector('#cw-send')?.addEventListener('click', () => this.transmit());

    this.root.querySelectorAll<HTMLElement>('[data-cidx]').forEach((btn) => {
      btn.onclick = () => {
        this.activeCatIdx = Number(btn.dataset.cidx);
        this.render();
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-tok]').forEach((btn) => {
      btn.onclick = () => {
        const tid = btn.dataset.tok!;
        if (!TOKENS_BY_ID[tid]) return;
        soundEngine.playClick();
        const existing = this.selected.indexOf(tid);
        if (existing >= 0) {
          this.selected.splice(existing, 1);
        } else {
          if (this.selected.length >= 2) this.selected.shift();
          this.selected.push(tid);
        }
        this.render();
      };
    });
  }

  transmit() {
    if (this.selected.length === 0) return;
    const role = this.session.getMyRole();
    this.session.sendRadio(role, [...this.selected]);
    soundEngine.playRadio();
    this.selected = [];
    this.close();
  }
}
