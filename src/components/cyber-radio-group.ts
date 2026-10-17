import {
  LitElement,
  css,
  html,
  nothing,
  unsafeCSS,
  type PropertyValues,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import {
  FieldControl,
  FormControl,
  formHostStyles,
  validityFlags,
  type NativeValidity,
} from './internal/form-control.js';
import inputStyles from '../styles/components/input.css?inline';
import radioStyles from '../styles/components/radio.css?inline';

/**
 * <cyber-radio> — one option of a <cyber-radio-group>; its content is the
 * option's label. The group renders the actual radio button for it.
 *
 * @slot - Label text.
 */
@customElement('cyber-radio')
export class CyberRadio extends LitElement {
  static styles = css`
    :host {
      display: inline;
    }
  `;

  /** Submitted (as the group's value) while this option is selected. */
  @property({ reflect: true }) value = '';

  /** Takes this option out of selection and keyboard order. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  protected updated() {
    // the radio button lives in the group's shadow root
    if (this.parentElement instanceof CyberRadioGroup) {
      this.parentElement.requestUpdate();
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}

export type RadioGroupOrientation = 'vertical' | 'horizontal';

/**
 * <cyber-radio-group> — form-associated radio group. Renders one native
 * radio button (`.cyber-radio` skin) per child <cyber-radio>, all in one
 * shadow root, so grouping and keyboard behavior are the browser's own:
 * Tab stops on the selected radio, arrow keys move and select. Submits the
 * selected radio's `value` under `name`; `required` fails validation
 * (`valueMissing`) until one is selected.
 *
 * `value` attribute = default selection; `value` property = current; form
 * reset restores the default.
 *
 * @slot - <cyber-radio> elements.
 * @slot label - Rich group label (instead of the `label` attribute).
 * @slot help-text - Rich help text (instead of the `help-text` attribute).
 * @csspart field - The `.cyber-field` wrapper.
 * @csspart label - The group label.
 * @csspart options - The `role="radiogroup"` container.
 * @csspart radio - Each option's `.cyber-radio` label.
 * @csspart help-text - The help text.
 * @fires {Event} input - The user selected a radio (native, composed).
 * @fires {Event} change - The user selected a radio.
 *
 * @example
 * <cyber-radio-group name="faction" label="Faction" value="union">
 *   <cyber-radio value="union">Union</cyber-radio>
 *   <cyber-radio value="syndicate">Syndicate</cyber-radio>
 * </cyber-radio-group>
 */
@customElement('cyber-radio-group')
export class CyberRadioGroup extends FieldControl {
  /** @internal */
  static shadowRootOptions: ShadowRootInit = {
    ...FormControl.shadowRootOptions,
    // each <cyber-radio> is assigned to the label of its own radio button
    slotAssignment: 'manual',
  };

  static styles = [
    unsafeCSS(inputStyles),
    unsafeCSS(radioStyles),
    formHostStyles,
    css`
      .cyber-radio-group__options {
        display: flex;
        flex-direction: column;
        gap: var(--cyber-space-2);
      }

      :host([orientation='horizontal']) .cyber-radio-group__options {
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--cyber-space-2) var(--cyber-space-3);
      }
    `,
  ];

  /** Default selection — the `value` attribute; reset restores it. */
  @property({ attribute: 'value' }) defaultValue = '';

  /** Stack the options (`vertical`, default) or line them up. */
  @property({ reflect: true }) orientation: RadioGroupOrientation = 'vertical';

  @state() private radios: CyberRadio[] = [];

  private others: Element[] = [];

  private dirtyValue: string | null = null;

  private observer = new MutationObserver(() => this.collect());

  /** Selected radio's value, or `''` when none is selected. */
  get value(): string {
    return this.dirtyValue ?? this.defaultValue;
  }

  set value(value: string) {
    const old = this.value;
    this.dirtyValue = String(value ?? '');
    this.apply(old);
  }

  connectedCallback() {
    super.connectedCallback();
    this.observer.observe(this, { childList: true });
    this.collect();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.observer.disconnect();
  }

  /** Focus the selected radio (else the first enabled one), like Tab does. */
  focus(options?: FocusOptions) {
    const inputs = this.inputs.filter((input) => !input.disabled);
    (inputs.find((input) => input.checked) ?? inputs[0])?.focus(options);
  }

  private get inputs(): HTMLInputElement[] {
    return [
      ...this.renderRoot.querySelectorAll<HTMLInputElement>(
        'input[type="radio"]',
      ),
    ];
  }

  private collect() {
    const children = [...this.children];
    this.radios = children.filter(
      (el): el is CyberRadio => el instanceof CyberRadio,
    );
    this.others = children.filter((el) => !(el instanceof CyberRadio));
    this.requestUpdate();
  }

  private onSelect(radio: CyberRadio) {
    this.value = radio.value;
    this.markInteracted();
    this.emitChange();
  }

  private apply(old: string) {
    for (const input of this.inputs) input.checked = input.value === this.value;
    this.requestUpdate('value', old);
    this.commit();
  }

  protected updated(changed: PropertyValues<this>) {
    // manual assignment: radios into their labels, label/help slot content
    // into the field shell's named slots
    const slots =
      this.renderRoot.querySelectorAll<HTMLSlotElement>('.cyber-radio slot');
    this.radios.forEach((radio, i) => slots[i]?.assign(radio));
    for (const name of ['label', 'help-text']) {
      this.renderRoot
        .querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
        ?.assign(...this.others.filter((el) => el.slot === name));
    }
    super.updated(changed);
  }

  protected formValue(): [string | null, string] {
    return this.value ? [this.value, this.value] : [null, ''];
  }

  protected nativeValidity(): NativeValidity {
    // every radio of a required group reports the same valueMissing
    const first = this.inputs[0];
    if (!first) return { flags: {}, message: '' };
    return {
      flags: validityFlags(first.validity),
      message: first.validationMessage,
      anchor: first,
    };
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
    return this.renderRoot.querySelector<HTMLElement>('[role="radiogroup"]');
  }

  render() {
    return this.renderField(
      html`
        <div
          class="cyber-radio-group__options"
          part="options"
          role="radiogroup"
          aria-labelledby=${ifDefined(this.hasLabel ? 'label' : undefined)}
          aria-label=${ifDefined(this.hasLabel ? undefined : this.fallbackLabel)}
          aria-describedby=${ifDefined(this.hasHelp ? 'help' : undefined)}
          aria-required=${this.required ? 'true' : nothing}
        >
          ${this.radios.map(
            (radio) => html`
              <label class="cyber-radio" part="radio">
                <input
                  type="radio"
                  name=${this.controlId}
                  .value=${radio.value}
                  .checked=${live(radio.value === this.value)}
                  ?disabled=${this.isDisabled || radio.disabled}
                  ?required=${this.required}
                  @change=${() => this.onSelect(radio)}
                />
                <span><slot></slot></span>
              </label>
            `,
          )}
        </div>
      `,
      { forControl: false },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-radio-group': CyberRadioGroup;
    'cyber-radio': CyberRadio;
  }
}
