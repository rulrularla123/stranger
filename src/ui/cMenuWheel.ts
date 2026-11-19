import {
  C_CATEGORIES,
  ROLES,
  ROLE_ORDER,
  TOKENS_BY_ID,
  escapeTokenText,
  renderRadioTargetHtml,
  renderTokenPillHtml,
  sanitizeRadioNumber,
} from '../data/cMenuTokens.ts';
import type { RoleId } from '../types/stranger.ts';
import { soundEngine } from '../audio/soundEngine.ts';
import type { SessionClient } from '../net/sessionClient.ts';
import { charSpriteHtml } from './kidVisuals.ts';

const MAX_COMPOSED_TOKENS = 8;

export class CMenuWheel {
  private root: HTMLElement;
  private session: SessionClient;
  private open = false;
  private selected: string[] = [];
  private targetRoleId: RoleId | null = null;
  private numDraft = '';

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

  openWithTarget(targetRoleId: RoleId | null) {
    this.targetRoleId = targetRoleId && ROLE_ORDER.includes(targetRoleId) ? targetRoleId : null;
    if (!this.open) {
      this.toggle(true);
    } else {
      this.render();
    }
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

  private pushToken(tid: string) {
    if (this.selected.length >= MAX_COMPOSED_TOKENS) {
      this.selected.shift();
    }
    this.selected.push(tid);
  }

  private commitDraftNumber(): boolean {
    const clean = sanitizeRadioNumber(this.numDraft);
    if (!clean) return false;
    this.pushToken(`VAL:${clean}`);
    this.numDraft = '';
    const inp = this.root.querySelector<HTMLInputElement>('#cw-num-input');
    if (inp) inp.value = '';
    return true;
  }

  private buildPreviewHtml(): string {
    const room = this.session.getRoom();
    const targetName = this.targetRoleId
      ? room?.slots[this.targetRoleId]?.nickname || ROLES[this.targetRoleId].name
      : null;
    const targetHtml = renderRadioTargetHtml({ targetRoleId: this.targetRoleId, targetName });
    const draftClean = sanitizeRadioNumber(this.numDraft);

    const chips = this.selected
      .map((id, idx) => {
        const pill = renderTokenPillHtml(id, room?.slots);
        return `<span class="cw-chip-wrap">${pill}<button class="cw-chip-rm" data-rm-idx="${idx}" title="항목 삭제">×</button></span>`;
      })
      .join('');

    const draftPill = draftClean
      ? `<span class="cw-chip-draft">${renderTokenPillHtml(`VAL:${draftClean}`, room?.slots)}</span>`
      : '';

    const emptyHint =
      !chips && !draftPill
        ? '<span class="cw-hint">아래에서 아이콘 · 숫자 · 이름을 눌러 조합하세요 (최대 8개)</span>'
        : '';

    return `${targetHtml} <span class="cw-preview-list">${chips}${draftPill}${emptyHint}</span>`;
  }

  private updatePreviewDom() {
    const composeEl = this.root.querySelector('#cw-compose-chips');
    const sendBtn = this.root.querySelector<HTMLButtonElement>('#cw-send');
    const undoBtn = this.root.querySelector<HTMLButtonElement>('#cw-undo');
    const countEl = this.root.querySelector('#cw-count');
    const hasDraft = Boolean(sanitizeRadioNumber(this.numDraft));
    const canSend = this.selected.length > 0 || hasDraft;

    if (composeEl) {
      composeEl.innerHTML = this.buildPreviewHtml();
      composeEl.querySelectorAll<HTMLElement>('[data-rm-idx]').forEach((btn) => {
        btn.onclick = () => {
          const idx = Number(btn.dataset.rmIdx);
          if (!Number.isNaN(idx)) {
            soundEngine.playClick();
            this.selected.splice(idx, 1);
            this.render();
          }
        };
      });
    }
    if (sendBtn) sendBtn.disabled = !canSend;
    if (undoBtn) undoBtn.disabled = this.selected.length === 0;
    if (countEl) countEl.textContent = `${this.selected.length}/${MAX_COMPOSED_TOKENS}`;
  }

  render() {
    if (!this.open) return;
    const room = this.session.getRoom();
    const myRole = this.session.getMyRole();
    const rMeta = ROLES[myRole];
    const hasDraft = Boolean(sanitizeRadioNumber(this.numDraft));
    const canSend = this.selected.length > 0 || hasDraft;

    const rowsHtml = C_CATEGORIES.map(
      (cat) => `
        <div class="cw-cat-row">
          <div class="cw-cat-row-lbl" style="color:${cat.color}">${cat.label}</div>
          <div class="cw-tile-row">
            ${cat.tokens
              .map(
                (t) => `<button class="cw-tile ${this.selected.includes(t.id) ? 'selected' : ''}" data-tok="${t.id}"
                  style="--tok-color:${t.color}" title="${escapeTokenText(t.sub)}">
                  <img class="cw-tile-icon" src="/assets/puzzle-ui/icons/tok-${t.id}.svg" alt="" />
                  <span class="cw-tile-label">${t.label.replace(/\s*[↑→↓←↻☀🌊⛰★⚡🛡]\s*$/u, '')}</span>
                </button>`
              )
              .join('')}
          </div>
        </div>
      `
    ).join('');

    this.root.innerHTML = `
      <div class="cw-dialog" role="dialog" aria-label="무전 보내기">
        <div class="cw-head">
          <div class="cw-head-who">
            ${charSpriteHtml(myRole, 0.85)}
            <span class="cw-badge" style="color:${rMeta.color};border-color:${rMeta.color}">
              <img class="cw-badge-ico" src="/assets/puzzle-ui/icons/role-${myRole}.svg" alt="" />
              보내는 사람 · ${rMeta.name}
            </span>
            <strong>📡 C-Menu 2.0 무전 보내기</strong>
          </div>
          <button class="fg-cw-close" id="cw-close" aria-label="닫기"><img src="/assets/puzzle-ui/parts/close-btn.svg" alt="✕" /></button>
        </div>

        <div class="cw-target-bar">
          <span class="cw-step-num">1</span>
          <span class="cw-bar-lbl">받는 사람</span>
          <button class="cw-target-btn ${this.targetRoleId === null ? 'active' : ''}" data-target="">📢 전체</button>
          ${ROLE_ORDER.map((rId) => {
            const meta = ROLES[rId];
            const nick = room?.slots[rId]?.nickname || meta.name;
            const selfTag = rId === myRole ? ' (나)' : '';
            return `<button class="cw-target-btn ${this.targetRoleId === rId ? 'active' : ''}" data-target="${rId}" style="--rc:${meta.color}">
              ${meta.badge} ${escapeTokenText(nick)}${selfTag}
            </button>`;
          }).join('')}
        </div>

        <div class="cw-compose-bar">
          <span class="cw-step-num">2</span>
          <div class="cw-compose-chips" id="cw-compose-chips"></div>
          <div class="cw-compose-ctrl">
            <span class="cw-count-pill" id="cw-count">${this.selected.length}/${MAX_COMPOSED_TOKENS}</span>
            <button class="s-btn" id="cw-undo" ${this.selected.length ? '' : 'disabled'} title="마지막 항목 지우기">⌫</button>
            <button class="s-btn" id="cw-clear">지우기</button>
            <button class="s-btn primary" id="cw-send" ${canSend ? '' : 'disabled'} title="Enter 키로도 바로 보내기">📡 보내기</button>
          </div>
        </div>

        <div class="cw-composer-grid">
          <div class="cw-icon-palette">
            <div class="cw-palette-head"><span class="cw-step-num">3</span> 아이콘 눌러 추가</div>
            ${rowsHtml}
          </div>

          <div class="cw-extra-col">
            <div class="cw-num-panel">
              <div class="cw-bar-lbl">🔢 숫자 추가</div>
              <div class="cw-num-row">
                <input id="cw-num-input" class="cw-num-input" type="text" inputmode="decimal" maxlength="10"
                  value="${escapeTokenText(this.numDraft)}" placeholder="180, 45/18, 7.0" />
                <button class="s-btn amber" id="cw-num-add">+ 추가</button>
              </div>
              <div class="cw-keypad">
                ${['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '/']
                  .map((k) => `<button class="cw-key-btn" data-kpad="${k}">${k}</button>`)
                  .join('')}
                <button class="cw-key-btn cw-key-bs" data-kpad="⌫">⌫ 지우기</button>
              </div>
            </div>

            <div class="cw-mention-panel">
              <div class="cw-bar-lbl">👤 이름 넣기</div>
              <div class="cw-mention-grid">
                ${ROLE_ORDER.map((rId) => {
                  const meta = ROLES[rId];
                  const nick = room?.slots[rId]?.nickname || meta.name;
                  return `<button class="cw-mention-btn" data-mention="${rId}" style="--rc:${meta.color}">+${meta.badge} @${escapeTokenText(nick)}</button>`;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.updatePreviewDom();

    this.root.querySelector('#cw-close')?.addEventListener('click', () => this.close());
    this.root.querySelector('#cw-undo')?.addEventListener('click', () => {
      if (this.selected.length > 0) {
        soundEngine.playClick();
        this.selected.pop();
        this.render();
      }
    });
    this.root.querySelector('#cw-clear')?.addEventListener('click', () => {
      soundEngine.playClick();
      this.selected = [];
      this.numDraft = '';
      this.targetRoleId = null;
      this.render();
    });
    this.root.querySelector('#cw-send')?.addEventListener('click', () => this.transmit());

    this.root.querySelectorAll<HTMLElement>('[data-target]').forEach((btn) => {
      btn.onclick = () => {
        soundEngine.playClick();
        const t = btn.dataset.target || '';
        this.targetRoleId = t && ROLE_ORDER.includes(t as RoleId) ? (t as RoleId) : null;
        this.render();
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-mention]').forEach((btn) => {
      btn.onclick = () => {
        const rid = btn.dataset.mention as RoleId;
        if (!ROLE_ORDER.includes(rid)) return;
        soundEngine.playClick();
        this.pushToken(`ROLE:${rid}`);
        this.render();
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-tok]').forEach((btn) => {
      btn.onclick = () => {
        const tid = btn.dataset.tok!;
        if (!TOKENS_BY_ID[tid]) return;
        soundEngine.playClick();
        this.pushToken(tid);
        this.render();
      };
    });

    const numInput = this.root.querySelector<HTMLInputElement>('#cw-num-input');
    if (numInput) {
      numInput.addEventListener('input', () => {
        const clean = sanitizeRadioNumber(numInput.value);
        if (numInput.value !== clean) numInput.value = clean;
        this.numDraft = clean;
        this.updatePreviewDom();
      });
      numInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.transmit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
        }
      });
    }

    this.root.querySelector('#cw-num-add')?.addEventListener('click', () => {
      if (this.commitDraftNumber()) {
        soundEngine.playClick();
        this.render();
      }
    });

    this.root.querySelectorAll<HTMLElement>('[data-kpad]').forEach((btn) => {
      btn.onclick = () => {
        const k = btn.dataset.kpad!;
        soundEngine.playClick();
        if (k === '⌫') {
          this.numDraft = this.numDraft.slice(0, -1);
        } else {
          this.numDraft = sanitizeRadioNumber(this.numDraft + k);
        }
        if (numInput) numInput.value = this.numDraft;
        this.updatePreviewDom();
      };
    });
  }

  transmit() {
    this.commitDraftNumber();
    if (this.selected.length === 0) return;
    const role = this.session.getMyRole();
    this.session.sendRadio(role, [...this.selected], { targetRoleId: this.targetRoleId });
    soundEngine.playRadio();
    this.selected = [];
    this.numDraft = '';
    this.targetRoleId = null;
    this.close();
  }
}
