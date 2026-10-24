import {
  LitElement,
  css,
  html,
  nothing,
  unsafeCSS,
  type PropertyValues,
} from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { AnchorController, floatingStyles } from './internal/anchor.js';
import { DismissController } from './internal/dismiss.js';
import {
  FieldControl,
  formHostStyles,
  type NativeValidity,
} from './internal/form-control.js';
import { Typeahead } from './internal/typeahead.js';
import dropdownStyles from '../styles/components/dropdown.css?inline';
import inputStyles from '../styles/components/input.css?inline';
import selectStyles from '../styles/components/select.css?inline';

/**
 * <cyber-option> — one option of a <cyber-select>. Its text is the label;
 * `value` (defaults to the text, like a native `<option>`) is what the
 * select submits.
 *
 * @slot - Option label.
 * @csspart base - The `.cyber-menu__item` row.
 */
@customElement('cyber-option')
export class CyberOption extends LitElement {
  static styles = [
    unsafeCSS(dropdownStyles),
    css`
      :host {
        display: block;
        outline: none;
      }

      :host([hidden]) {
        display: none;
      }

      /* the host takes focus, so mirror the item's hover/focus look */
      :host(:hover) .cyber-menu__item,
      :host(:focus-visible) .cyber-menu__item {
        background: color-mix(in srgb, var(--cyber-primary) 14%, transparent);
        color: var(--cyber-primary);
      }

      :host([aria-selected='true']) .cyber-menu__item {
        color: var(--cyber-primary);
        box-shadow: inset 2px 0 0 var(--cyber-primary);
      }

      :host([aria-disabled='true']) {
        opacity: 0.4;
        pointer-events: none;
      }
    `,
  ];

  /** Submitted value; when absent, the option's text is used. */
  @property({ reflect: true }) value?: string;

  /** Takes the option out of selection and keyboard order. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** The option's text. */
  get label(): string {
    return this.textContent?.trim() ?? '';
  }

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'option');
    this.setAttribute('tabindex', '-1');
    if (!this.hasAttribute('aria-selected')) {
      this.setAttribute('aria-selected', 'false');
    }
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('disabled')) {
      this.setAttribute('aria-disabled', String(this.disabled));
    }
    // the parent renders the selected label and keyboard order
    if (this.parentElement instanceof CyberSelect) {
      this.parentElement.requestUpdate();
    }
  }

  render() {
    return html`<div class="cyber-menu__item" part="base"><slot></slot></div>`;
  }
}

const optionValue = (option: CyberOption) => option.value ?? option.label;

/** The browser's own (localized) "select an item" message. */
let probe: HTMLSelectElement | undefined;
function valueMissingMessage(): string {
  probe ??= Object.assign(document.createElement('select'), { required: true });
  return probe.validationMessage;
}

/**
 * <cyber-select> — form-associated select: a styled listbox in place of
 * the native `<select>` (whose popup can't be styled). Follows the
 * WAI-ARIA select-only combobox pattern: the `.cyber-select` trigger is a
 * `role="combobox"`, the popup a `role="listbox"` of <cyber-option>s.
 * Submits the selected option's value under `name`; `required` fails
 * validation (`valueMissing`, with the browser's message) while the value
 * is empty.
 *
 * `value` attribute = default selection — without one, the first enabled
 * option, like a native select (or none, when `placeholder` is set);
 * `value` property = current selection; form reset restores the default.
 *
 * Keyboard — closed: ArrowDown / ArrowUp / Enter / Space open; Home / End
 * open on the first / last option; typing selects the matching option.
 * Open: arrows / Home / End move, typing jumps, Enter / Space select and
 * close, Escape closes; both return focus to the trigger. Tab closes.
 *
 * The popup is an anchored panel (top-layer popover + CSS anchor
 * positioning where supported, else absolute + flip), see <cyber-dropdown>.
 *
 * Custom states: `:state(open)`, `:state(invalid)`, `:state(user-invalid)`.
 *
 * @slot - <cyber-option> elements.
 * @slot label - Rich label content (instead of the `label` attribute).
 * @slot help-text - Rich help text (instead of the `help-text` attribute).
 * @csspart field - The `.cyber-field` wrapper.
 * @csspart label - The label.
 * @csspart trigger - The `.cyber-select` combobox showing the selection.
 * @csspart listbox - The popup.
 * @csspart help-text - The help text.
 * @fires {Event} input - The user selected a different option.
 * @fires {Event} change - The user selected a different option.
 *
 * @example
 * <cyber-select name="sector" label="Sector" placeholder="Choose a sector" required>
 *   <cyber-option value="kepler">Kepler Belt</cyber-option>
 *   <cyber-option value="orion">Orion Reach</cyber-option>
 * </cyber-select>
 */
@customElement('cyber-select')
export class CyberSelect extends FieldControl {
  static styles = [
    unsafeCSS(inputStyles),
    unsafeCSS(selectStyles),
    unsafeCSS(dropdownStyles),
    formHostStyles,
    floatingStyles,
    css`
      :host {
        position: static;
      }

      .cyber-select__anchor {
        position: relative;
        --cyber-floating-gap: 4px;
      }

      .cyber-select {
        display: block;
        min-height: 2.4em;
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        user-select: none;
      }

      .cyber-select__placeholder {
        color: var(--cyber-text-dim);
      }

      .cyber-select__listbox {
        box-sizing: border-box;
        max-height: 16rem;
        overflow-y: auto;
      }

      /* as wide as the trigger: left/right in the host, anchor-size()
         in the top layer */
      .cyber-select__listbox:not([popover]) {
        right: 0;
      }

      .cyber-select__listbox[popover] {
        width: anchor-size(width);
      }
    `,
  ];

  /** Default selection — the `value` attribute; reset restores it. */
  @property({ attribute: 'value' }) defaultValue?: string;

  /** Shown while nothing is selected; also means "no default selection". */
  @property() placeholder = '';

  /** Whether the listbox is open. */
  @property({ type: Boolean, reflect: true }) open = false;

  @state() private options: CyberOption[] = [];

  @query('#control') private trigger!: HTMLElement;
  @query('#listbox') private listbox!: HTMLElement;
  @query('.cyber-select__anchor') private anchor!: HTMLElement;

  private dirtyValue: string | null = null;
  private typeahead = new Typeahead();
  private observer = new MutationObserver(() => this.collect());

  constructor() {
    super();
    new DismissController(this, {
      isOpen: () => this.open,
      dismiss: (reason) => this.hide(reason === 'escape'),
    });
    new AnchorController(this, {
      panel: () => this.listbox,
      anchor: () => this.anchor,
      placement: () => 'bottom-start',
      isOpen: () => this.open,
    });
  }

  /** Selected option's value, or `''` when nothing is selected. */
  get value(): string {
    if (this.dirtyValue !== null) return this.dirtyValue;
    if (this.defaultValue !== undefined) return this.defaultValue;
    if (this.placeholder) return '';
    const first = this.options.find((option) => !option.disabled);
    return first ? optionValue(first) : '';
  }

  set value(value: string) {
    const old = this.value;
    this.dirtyValue = String(value ?? '');
    this.apply(old);
  }

  /** The option matching `value`, if any. */
  get selectedOption(): CyberOption | undefined {
    const value = this.value;
    return this.options.find((option) => optionValue(option) === value);
  }

  connectedCallback() {
    super.connectedCallback();
    // options come and go, and their text is the displayed label
    this.observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    this.collect();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.observer.disconnect();
    this.typeahead.dispose();
  }

  /** Open the listbox and focus the selected (or given) option. */
  show(focus: 'selected' | 'first' | 'last' = 'selected') {
    if (this.open || this.isDisabled) return;
    this.open = true;
    this.updateComplete.then(() => {
      const enabled = this.enabledOptions;
      const target =
        focus === 'first'
          ? enabled[0]
          : focus === 'last'
            ? enabled[enabled.length - 1]
            : this.selectedOption && !this.selectedOption.disabled
              ? this.selectedOption
              : enabled[0];
      target?.focus();
    });
  }

  /** Close the listbox; with `restoreFocus`, focus the trigger. */
  hide(restoreFocus = false) {
    if (!this.open) return;
    this.open = false;
    if (restoreFocus) this.trigger?.focus();
  }

  private get enabledOptions(): CyberOption[] {
    return this.options.filter((option) => !option.disabled);
  }

  private collect() {
    this.options = [...this.children].filter(
      (el): el is CyberOption => el instanceof CyberOption,
    );
    this.requestUpdate();
  }

  private apply(old: string) {
    this.requestUpdate('value', old);
    this.syncOptions();
    this.commit();
  }

  private syncOptions() {
    const selected = this.selectedOption;
    for (const option of this.options) {
      option.setAttribute('aria-selected', String(option === selected));
    }
  }

  /** A user pick: update, and fire input + change when it differs. */
  private pick(option: CyberOption) {
    if (option.disabled) return;
    const value = optionValue(option);
    if (value === this.value) return;
    this.value = value;
    this.markInteracted();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.emitChange();
  }

  private onTriggerClick() {
    if (this.open) this.hide();
    else this.show();
  }

  private onTriggerKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.show();
        return;
      case 'Home':
        event.preventDefault();
        this.show('first');
        return;
      case 'End':
        event.preventDefault();
        this.show('last');
        return;
    }
    // closed typeahead selects directly, like a native select
    const enabled = this.enabledOptions;
    const current = this.selectedOption
      ? enabled.indexOf(this.selectedOption)
      : -1;
    const next = this.typeahead.match(
      event,
      enabled.map((option) => option.label),
      current,
    );
    if (next !== null) {
      event.preventDefault();
      this.pick(enabled[next]);
    }
  }

  private onListboxKeyDown(event: KeyboardEvent) {
    const enabled = this.enabledOptions;
    const current = enabled.indexOf(event.target as CyberOption);
    let next: number | null;
    switch (event.key) {
      case 'ArrowDown':
        next = Math.min(current + 1, enabled.length - 1);
        break;
      case 'ArrowUp':
        next = Math.max(current - 1, 0);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = enabled.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (enabled[current]) this.pick(enabled[current]);
        this.hide(true);
        return;
      case 'Tab':
        this.hide();
        return;
      default:
        next = this.typeahead.match(
          event,
          enabled.map((option) => option.label),
          current,
        );
    }
    if (next !== null) {
      event.preventDefault();
      enabled[next]?.focus();
    }
  }

  private onListboxClick(event: MouseEvent) {
    const option = event
      .composedPath()
      .find((node): node is CyberOption => node instanceof CyberOption);
    if (!option || option.disabled) return;
    this.pick(option);
    this.hide(true);
  }

  protected willUpdate(changed: PropertyValues<this>) {
    super.willUpdate(changed);
    if (this.isDisabled && this.open) this.open = false;
  }

  protected updated(changed: PropertyValues<this>) {
    this.syncOptions();
    this.toggleState('open', this.open);
    super.updated(changed);
  }

  protected formValue(): [string | null, string] {
    if (!this.value && !this.selectedOption) return [null, ''];
    return [this.value, this.value];
  }

  protected nativeValidity(): NativeValidity {
    if (this.required && !this.value) {
      return {
        flags: { valueMissing: true },
        message: valueMissingMessage(),
        anchor: this.trigger,
      };
    }
    return { flags: {}, message: '' };
  }

  protected resetValue() {
    const old = this.value;
    this.dirtyValue = null;
    this.apply(old);
  }

  protected restoreState(state: string) {
    this.value = state;
  }

  protected get validationTarget() {
    return this.trigger ?? null;
  }

  render() {
    const selected = this.selectedOption;
    const name = this.hasLabel ? undefined : this.fallbackLabel;
    return this.renderField(
      html`
        <div class="cyber-select__anchor cyber-anchor">
          <div
            id="control"
            class="cyber-select"
            part="trigger"
            role="combobox"
            tabindex=${this.isDisabled ? nothing : '0'}
            aria-haspopup="listbox"
            aria-expanded=${this.open ? 'true' : 'false'}
            aria-controls="listbox"
            aria-labelledby=${ifDefined(this.hasLabel ? 'label' : undefined)}
            aria-label=${ifDefined(name)}
            aria-describedby=${ifDefined(this.hasHelp ? 'help' : undefined)}
            aria-required=${this.required ? 'true' : nothing}
            aria-disabled=${this.isDisabled ? 'true' : nothing}
            @click=${this.onTriggerClick}
            @keydown=${this.onTriggerKeyDown}
          >
            ${
              selected
                ? selected.label
                : html`<span class="cyber-select__placeholder"
                    >${this.placeholder}</span
                  >`
            }
          </div>
          <div
            id="listbox"
            class="cyber-menu cyber-select__listbox cyber-floating"
            part="listbox"
            role="listbox"
            aria-labelledby=${ifDefined(this.hasLabel ? 'label' : undefined)}
            aria-label=${ifDefined(name)}
            ?hidden=${!this.open}
            @click=${this.onListboxClick}
            @keydown=${this.onListboxKeyDown}
          >
            <slot></slot>
          </div>
        </div>
      `,
      {
        forControl: false,
        onLabelClick: () => this.trigger?.focus(),
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-select': CyberSelect;
    'cyber-option': CyberOption;
  }
}
