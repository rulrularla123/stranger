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
      : '<span class="cw-hint">👆 그림을 1~2개 골라요</span>';

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
            <strong>📡 그림 무전</strong>
          </div>
          <button class="au-close-x" id="cw-close" aria-label="무전 휠 닫기">✕</button>
        </div>

        <div class="cw-body">
          <div class="cw-wheel-stage">
            <div class="cw-ring-bg"></div>
            <div class="cw-quad-lbl q1">🔢 숫자</div>
            <div class="cw-quad-lbl q2">🧭 방향</div>
            <div class="cw-quad-lbl q3">🎨 그림</div>
            <div class="cw-quad-lbl q4">🤝 신호</div>
            ${nodesHtml}
            <div class="cw-hub">
              <div class="cw-hub-title">보낼 그림 (2개까지)</div>
              <div class="cw-hub-sel">${selHtml}</div>
              <div class="cw-hub-actions">
                <button class="s-btn" id="cw-clear">🧽 지우기</button>
                <button class="s-btn primary" id="cw-send" ${this.selected.length ? '' : 'disabled'} title="Enter 키로도 보낼 수 있어요">📡 보내기</button>
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
            <p class="cw-access-note">👆 고르기 ➜ 📡 보내기 ➜ 👀 친구 화면 위에 떠요</p>
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
