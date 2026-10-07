import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { DismissController } from './internal/dismiss.js';
import dropdownStyles from '../styles/components/dropdown.css?inline';

/**
 * <cyber-dropdown> — trigger + anchored menu. Closes on Escape, outside
 * click, or item selection. Arrow keys move focus through the items.
 * Flips above the trigger when there is no room below.
 *
 * Slots: `trigger` (a button), default (menu items — give them
 * `role="menuitem"`; `.cyber-menu__item` from the global stylesheet or the
 * built-in slotted styling provides the skin).
 * Events: `cyber-open`, `cyber-close`, `cyber-select` (detail: { item }).
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
        transition: background 0.1s ease, color 0.1s ease;
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

  constructor() {
    super();
    new DismissController(this, {
      isOpen: () => this.open,
      dismiss: () => this.hide(),
    });
  }

  private get items(): HTMLElement[] {
    const slot =
      this.renderRoot.querySelector<HTMLSlotElement>('slot:not([name])');
    return (slot?.assignedElements() ?? []).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && el.getAttribute('aria-disabled') !== 'true',
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

  hide(emit = true) {
    if (!this.open) return;
    this.open = false;
    if (emit) this.emit('cyber-close');
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
    this.open ? this.hide() : this.show();
  };

  private onMenuClick = (event: Event) => {
    const item = (event.target as HTMLElement).closest('[role="menuitem"]');
    if (item) {
      this.emit('cyber-select', { item });
      this.hide();
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
    }
    if (next !== null) {
      event.preventDefault();
      items[next]?.focus();
    }
  };

  render() {
    return html`
      <slot
        name="trigger"
        @click=${this.onTriggerClick}
        aria-haspopup="menu"
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
