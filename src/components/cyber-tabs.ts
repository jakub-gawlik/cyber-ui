import { LitElement, html, css, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import tabsStyles from '../styles/components/tabs.css?inline';

/**
 * <cyber-tab-panel> — one panel inside <cyber-tabs>. The `label` attribute
 * becomes the tab button's text.
 */
@customElement('cyber-tab-panel')
export class CyberTabPanel extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    :host([hidden]) {
      display: none;
    }
  `;

  /** Text shown on the tab button. */
  @property() label = '';

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'tabpanel');
    this.setAttribute('tabindex', '0');
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('label')) this.setAttribute('aria-label', this.label);
  }

  render() {
    return html`<slot></slot>`;
  }
}

/**
 * <cyber-tabs> — tab strip with roving-tabindex keyboard navigation
 * (arrows / Home / End). Renders one tab button per slotted
 * <cyber-tab-panel>. Emits `cyber-tab-change` with `{ index, label }`.
 *
 * @example
 * <cyber-tabs>
 *   <cyber-tab-panel label="Overview">…</cyber-tab-panel>
 *   <cyber-tab-panel label="Fleet">…</cyber-tab-panel>
 * </cyber-tabs>
 */
@customElement('cyber-tabs')
export class CyberTabs extends LitElement {
  static styles = [
    unsafeCSS(tabsStyles),
    css`
      :host {
        display: block;
      }
    `,
  ];

  /** Index of the active tab. */
  @property({ type: Number, reflect: true }) selected = 0;

  @state() private panels: CyberTabPanel[] = [];

  private onSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    this.panels = slot
      .assignedElements()
      .filter((el): el is CyberTabPanel => el instanceof CyberTabPanel);
    this.syncPanels();
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('selected')) this.syncPanels();
  }

  private syncPanels() {
    this.panels.forEach((panel, i) => {
      panel.hidden = i !== this.selected;
    });
  }

  private select(index: number, focus = false) {
    if (index < 0 || index >= this.panels.length) return;
    if (focus) {
      const buttons =
        this.renderRoot.querySelectorAll<HTMLButtonElement>('.cyber-tab');
      buttons[index]?.focus();
    }
    if (index === this.selected) return;
    this.selected = index;
    this.dispatchEvent(
      new CustomEvent('cyber-tab-change', {
        detail: { index, label: this.panels[index]?.label ?? '' },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onKeyDown(event: KeyboardEvent) {
    const last = this.panels.length - 1;
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
        next = this.selected >= last ? 0 : this.selected + 1;
        break;
      case 'ArrowLeft':
        next = this.selected <= 0 ? last : this.selected - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
    }
    if (next !== null) {
      event.preventDefault();
      this.select(next, true);
    }
  }

  render() {
    return html`
      <div
        class="cyber-tabs__list"
        part="list"
        role="tablist"
        @keydown=${this.onKeyDown}
      >
        ${this.panels.map(
          (panel, i) => html`
            <button
              class="cyber-tab"
              part="tab"
              role="tab"
              aria-selected=${i === this.selected ? 'true' : 'false'}
              tabindex=${i === this.selected ? '0' : '-1'}
              @click=${() => this.select(i)}
            >
              ${panel.label}
            </button>
          `,
        )}
      </div>
      <div class="cyber-tabs__panels" part="panels">
        <slot @slotchange=${this.onSlotChange}></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-tabs': CyberTabs;
    'cyber-tab-panel': CyberTabPanel;
  }
}
