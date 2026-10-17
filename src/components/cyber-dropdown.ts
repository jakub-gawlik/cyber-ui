import { LitElement, html, css, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { DismissController } from './internal/dismiss.js';
import dropdownStyles from '../styles/components/dropdown.css?inline';

/**
 * <cyber-dropdown> — trigger + anchored menu. Closes on Escape, outside
 * click, or item selection; Escape and selection return focus to the
 * trigger. Arrow keys / Home / End move focus through the items, and typing
 * jumps to the next item whose text starts with the typed characters
 * (typeahead). Flips above the trigger when there is no room below.
 *
 * Escape is scoped: it closes this menu only when the key event comes from
 * inside it (or focus is inside it), or when it is the top-most open
 * overlay — so nested / stacked overlays close one layer at a time.
 *
 * @slot trigger - The button that toggles the menu. It receives
 *   `aria-haspopup="menu"` and a live `aria-expanded`.
 * @slot - Menu items. Give them `role="menuitem"`; `.cyber-menu__item`
 *   from the global stylesheet or the built-in slotted styling provides the
 *   skin.
 * @csspart menu - The `role="menu"` surface.
 * @fires {CustomEvent} cyber-open - The menu opened.
 * @fires {CustomEvent} cyber-close - The menu closed.
 * @fires {CustomEvent<{ item: HTMLElement }>} cyber-select - A menu item was
 *   chosen; the menu closes right after.
 *
 * @example
 * <cyber-dropdown>
 *   <button slot="trigger" class="cyber-btn">Actions</button>
 *   <button role="menuitem">Scan system</button>
 *   <button role="menuitem">Open starmap</button>
 * </cyber-dropdown>
 */
@customElement('cyber-dropdown')
export class CyberDropdown extends LitElement {
  static styles = [
    unsafeCSS(dropdownStyles),
    css`
      :host {
        position: relative;
        display: inline-block;
      }

      .cyber-dropdown__menu {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        z-index: 50;
      }

      .cyber-dropdown__menu[data-up] {
        top: auto;
        bottom: calc(100% + 6px);
      }

      .cyber-dropdown__menu[hidden] {
        display: none;
      }

      /* mirror of .cyber-menu__item (dropdown.css) for slotted items */
      ::slotted([role='menuitem']) {
        -webkit-tap-highlight-color: transparent;
        display: block;
        width: 100%;
        box-sizing: border-box;
        padding: 0.5em 1em;
        border: 0;
        background: transparent;
        text-align: left;
        font-family: var(--cyber-font-mono);
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--cyber-text);
        text-decoration: none;
        cursor: pointer;
        transition:
          background 0.1s ease,
          color 0.1s ease;
      }

      ::slotted([role='menuitem']:hover),
      ::slotted([role='menuitem']:focus-visible) {
        outline: none;
        background: color-mix(in srgb, var(--cyber-primary) 14%, transparent);
        color: var(--cyber-primary);
      }

      ::slotted([role='menuitem']:active) {
        background: color-mix(in srgb, var(--cyber-primary) 24%, transparent);
      }
    `,
  ];

  /** Whether the menu is open. */
  @property({ type: Boolean, reflect: true }) open = false;

  @query('.cyber-dropdown__menu') private menu!: HTMLElement;

  private trigger: HTMLElement | null = null;

  /** typeahead buffer, cleared after a pause in typing */
  private typed = '';
  private typedTimer = 0;

  constructor() {
    super();
    new DismissController(this, {
      isOpen: () => this.open,
      dismiss: (reason) => this.hide(true, reason === 'escape'),
    });
  }

  private get items(): HTMLElement[] {
    const slot =
      this.renderRoot.querySelector<HTMLSlotElement>('slot:not([name])');
    return (slot?.assignedElements() ?? []).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement &&
        el.getAttribute('aria-disabled') !== 'true',
    );
  }

  show() {
    if (this.open) return;
    this.open = true;
    this.emit('cyber-open');
    this.updateComplete.then(() => {
      this.flipIfNeeded();
      this.items[0]?.focus();
    });
  }

  hide(emit = true, restoreFocus = false) {
    if (!this.open) return;
    this.open = false;
    if (emit) this.emit('cyber-close');
    if (restoreFocus) this.trigger?.focus();
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('open')) this.syncTrigger();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearTimeout(this.typedTimer);
  }

  private syncTrigger() {
    this.trigger?.setAttribute('aria-haspopup', 'menu');
    this.trigger?.setAttribute('aria-expanded', String(this.open));
  }

  private onTriggerSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    const trigger =
      slot.assignedElements().find((el) => el instanceof HTMLElement) ?? null;
    if (trigger === this.trigger) return;
    this.trigger?.removeAttribute('aria-haspopup');
    this.trigger?.removeAttribute('aria-expanded');
    this.trigger = trigger as HTMLElement | null;
    this.syncTrigger();
  }

  private emit(name: string, detail?: unknown) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true }),
    );
  }

  private flipIfNeeded() {
    delete this.menu.dataset.up;
    const rect = this.menu.getBoundingClientRect();
    if (rect.bottom > window.innerHeight && rect.height < rect.top) {
      this.menu.dataset.up = '';
    }
  }

  private onTriggerClick = () => {
    if (this.open) this.hide();
    else this.show();
  };

  private onMenuClick = (event: Event) => {
    const item = (event.target as HTMLElement).closest('[role="menuitem"]');
    if (item) {
      this.emit('cyber-select', { item });
      this.hide(true, true);
    }
  };

  private onMenuKeyDown = (event: KeyboardEvent) => {
    const items = this.items;
    const current = items.indexOf(event.target as HTMLElement);
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowDown':
        next = current >= items.length - 1 ? 0 : current + 1;
        break;
      case 'ArrowUp':
        next = current <= 0 ? items.length - 1 : current - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = items.length - 1;
        break;
      case 'Tab':
        this.hide();
        break;
      default:
        next = this.typeahead(event, items, current);
    }
    if (next !== null) {
      event.preventDefault();
      items[next]?.focus();
    }
  };

  /** Index of the item matching the typed prefix, or null. */
  private typeahead(
    event: KeyboardEvent,
    items: HTMLElement[],
    current: number,
  ): number | null {
    const { key } = event;
    if (key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) {
      return null;
    }
    // a leading space activates the focused item; don't swallow it
    if (key === ' ' && !this.typed) return null;
    this.typed += key.toLowerCase();
    window.clearTimeout(this.typedTimer);
    this.typedTimer = window.setTimeout(() => (this.typed = ''), 500);

    // repeating one character cycles through items starting with it;
    // otherwise keep matching the whole prefix from the current item
    const repeated = [...this.typed].every((c) => c === this.typed[0]);
    const prefix = repeated ? this.typed[0] : this.typed;
    const start = repeated ? current + 1 : Math.max(current, 0);
    for (let i = 0; i < items.length; i++) {
      const index = (start + i) % items.length;
      const text = items[index].textContent?.trim().toLowerCase() ?? '';
      if (text.startsWith(prefix)) return index;
    }
    return null;
  }

  render() {
    return html`
      <slot
        name="trigger"
        @click=${this.onTriggerClick}
        @slotchange=${this.onTriggerSlotChange}
      ></slot>
      <div
        class="cyber-dropdown__menu cyber-menu"
        part="menu"
        role="menu"
        ?hidden=${!this.open}
        @click=${this.onMenuClick}
        @keydown=${this.onMenuKeyDown}
      >
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-dropdown': CyberDropdown;
  }
}
