import { LitElement, html, css, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import tabsStyles from '../styles/components/tabs.css?inline';

/**
 * <cyber-tab-panel> — one panel inside <cyber-tabs>. The `label` attribute
 * becomes the tab button's text. The surrounding <cyber-tabs> wraps it in
 * its `role="tabpanel"` region, so the element itself carries no role.
 *
 * @slot - Panel content.
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

  protected updated(changed: PropertyValues<this>) {
    // the tab button text lives in the parent's shadow root
    if (changed.has('label') && this.parentElement instanceof CyberTabs) {
      this.parentElement.requestUpdate();
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}

export type TabsOrientation = 'horizontal' | 'vertical';
export type TabsActivation = 'automatic' | 'manual';

let nextTabsId = 0;

/**
 * <cyber-tabs> — tab strip with roving-tabindex keyboard navigation
 * (arrows / Home / End). Renders one tab button per child
 * <cyber-tab-panel>. Emits `cyber-tab-change` with `{ index, label }`.
 *
 * Each tab and its panel region get generated ids and are wired with
 * `aria-controls` / `aria-labelledby`. Both live in the shadow root (the
 * panel element is slotted into its region), so the references resolve.
 *
 * Attributes:
 * - `selected` — index of the active tab; out-of-range values are clamped.
 * - `orientation="vertical"` — tabs stacked beside the panels; ArrowUp /
 *   ArrowDown navigate instead of ArrowLeft / ArrowRight.
 * - `activation="manual"` — arrows move focus only; Enter / Space (or a
 *   click) selects. Default `automatic` selects on focus.
 *
 * @slot - `<cyber-tab-panel>` elements, one per tab.
 * @csspart base - Wrapper around the strip and the panels.
 * @csspart list - The `role="tablist"` strip.
 * @csspart tab - Each tab button.
 * @csspart panels - Wrapper around the panel regions.
 * @csspart panel - Each `role="tabpanel"` region.
 * @fires {CustomEvent<{ index: number; label: string }>} cyber-tab-change -
 *   The selected tab changed through user interaction.
 *
 * @example
 * <cyber-tabs orientation="vertical" activation="manual">
 *   <cyber-tab-panel label="Overview">…</cyber-tab-panel>
 *   <cyber-tab-panel label="Fleet">…</cyber-tab-panel>
 * </cyber-tabs>
 */
@customElement('cyber-tabs')
export class CyberTabs extends LitElement {
  /** @internal */
  static shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    // panels are assigned to their own tabpanel region by index
    slotAssignment: 'manual',
  };

  static styles = [
    unsafeCSS(tabsStyles),
    css`
      :host {
        display: block;
      }

      [hidden] {
        display: none !important;
      }
    `,
  ];

  /** Index of the active tab. */
  @property({ type: Number, reflect: true }) selected = 0;

  /** Layout and arrow-key axis of the tab strip. */
  @property({ reflect: true }) orientation: TabsOrientation = 'horizontal';

  /** Whether focusing a tab selects it (`automatic`) or Enter/Space does. */
  @property({ reflect: true }) activation: TabsActivation = 'automatic';

  @state() private panels: CyberTabPanel[] = [];

  /** roving-tabindex position; differs from `selected` in manual mode */
  @state() private focused = 0;

  /** non-panel children, rendered after the panels */
  private others: Element[] = [];

  private idPrefix = `cyber-tabs-${++nextTabsId}`;

  private observer = new MutationObserver(() => this.collect());

  connectedCallback() {
    super.connectedCallback();
    this.observer.observe(this, { childList: true });
    this.collect();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.observer.disconnect();
  }

  private collect() {
    const children = [...this.children];
    this.panels = children.filter(
      (el): el is CyberTabPanel => el instanceof CyberTabPanel,
    );
    this.others = children.filter((el) => !(el instanceof CyberTabPanel));
    this.requestUpdate();
  }

  protected willUpdate(changed: PropertyValues<this>) {
    if (this.panels.length > 0) {
      const max = this.panels.length - 1;
      const index = Number.isFinite(this.selected)
        ? Math.trunc(this.selected)
        : 0;
      const clamped = Math.min(Math.max(index, 0), max);
      if (clamped !== this.selected) this.selected = clamped;
    }
    if (changed.has('selected')) this.focused = this.selected;
  }

  protected updated() {
    const slots = this.renderRoot.querySelectorAll<HTMLSlotElement>('slot');
    this.panels.forEach((panel, i) => {
      slots[i]?.assign(panel);
      panel.hidden = i !== this.selected;
    });
    slots[this.panels.length]?.assign(...this.others);
  }

  private get tabs(): HTMLButtonElement[] {
    return [
      ...this.renderRoot.querySelectorAll<HTMLButtonElement>('.cyber-tab'),
    ];
  }

  private tabId(i: number) {
    return `${this.idPrefix}-tab-${i}`;
  }

  private panelId(i: number) {
    return `${this.idPrefix}-panel-${i}`;
  }

  private select(index: number) {
    this.focused = index;
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
    const current = this.tabs.indexOf(event.target as HTMLButtonElement);
    if (current === -1) return;
    const vertical = this.orientation === 'vertical';
    const last = this.panels.length - 1;
    let next: number | null = null;
    switch (event.key) {
      case vertical ? 'ArrowDown' : 'ArrowRight':
        next = current >= last ? 0 : current + 1;
        break;
      case vertical ? 'ArrowUp' : 'ArrowLeft':
        next = current <= 0 ? last : current - 1;
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
      this.focused = next;
      this.tabs[next]?.focus();
      if (this.activation === 'automatic') this.select(next);
    }
  }

  /** Leaving the strip resets the roving tabindex to the selected tab. */
  private onFocusOut(event: FocusEvent) {
    const list = event.currentTarget as HTMLElement;
    if (!list.contains(event.relatedTarget as Node | null)) {
      this.focused = this.selected;
    }
  }

  render() {
    const vertical = this.orientation === 'vertical';
    return html`
      <div
        class="cyber-tabs ${vertical ? 'cyber-tabs--vertical' : ''}"
        part="base"
      >
        <div
          class="cyber-tabs__list"
          part="list"
          role="tablist"
          aria-orientation=${this.orientation}
          @keydown=${this.onKeyDown}
          @focusout=${this.onFocusOut}
        >
          ${this.panels.map(
            (panel, i) => html`
              <button
                id=${this.tabId(i)}
                class="cyber-tab"
                part="tab"
                role="tab"
                aria-selected=${i === this.selected ? 'true' : 'false'}
                aria-controls=${this.panelId(i)}
                tabindex=${i === this.focused ? '0' : '-1'}
                @click=${() => this.select(i)}
              >
                ${panel.label}
              </button>
            `,
          )}
        </div>
        <div class="cyber-tabs__panels" part="panels">
          ${this.panels.map(
            (_, i) => html`
              <div
                id=${this.panelId(i)}
                class="cyber-tabs__panel"
                part="panel"
                role="tabpanel"
                aria-labelledby=${this.tabId(i)}
                tabindex="0"
                ?hidden=${i !== this.selected}
              >
                <slot></slot>
              </div>
            `,
          )}
          <slot></slot>
        </div>
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
