import { LitElement, css, html, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { slotHasContent } from './slots.js';

const VALIDITY_KEYS = [
  'badInput',
  'patternMismatch',
  'rangeOverflow',
  'rangeUnderflow',
  'stepMismatch',
  'tooLong',
  'tooShort',
  'typeMismatch',
  'valueMissing',
] as const;

/** The set flags of a native ValidityState (customError is ours to set). */
export function validityFlags(validity: ValidityState): ValidityStateFlags {
  const flags: ValidityStateFlags = {};
  for (const key of VALIDITY_KEYS) if (validity[key]) flags[key] = true;
  return flags;
}

export interface NativeValidity {
  flags: ValidityStateFlags;
  message: string;
  /** where the browser anchors its validation bubble */
  anchor?: HTMLElement;
}

let nextControlId = 0;

/**
 * Base for form-associated cyber-ui elements. Subclasses render a native
 * control (or, for <cyber-select>, a custom one) in their shadow root and
 * report its value and validity here; this class mirrors both to
 * ElementInternals, so the element takes part in <form> submission,
 * constraint validation, reset, fieldset disabling and state restore.
 *
 * Custom states: `:state(invalid)` while the value fails validation;
 * `:state(user-invalid)` once the user has interacted (a committed change,
 * a failed submit or reportValidity()) and it is still invalid — the
 * `:user-invalid` equivalent. The native control inside also gets
 * `aria-invalid="true"` then, which the skins style.
 */
export abstract class FormControl extends LitElement {
  /** @internal */
  static formAssociated = true;

  /** @internal */
  static shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  /** Name the value is submitted under. */
  @property({ reflect: true }) name = '';

  /** Disables the control (a disabled ancestor <fieldset> does too). */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** Fails validation (`valueMissing`) while the control has no value. */
  @property({ type: Boolean, reflect: true }) required = false;

  /** @internal */
  protected readonly internals = this.attachInternals();

  /** set by formDisabledCallback for a disabled ancestor <fieldset> */
  @state() protected formDisabled = false;

  private interacted = false;
  private customMessage = '';

  /** unique per instance; for ids/names inside the shadow root */
  protected readonly controlId = `cyber-control-${++nextControlId}`;

  constructor() {
    super();
    // a failed form submission (or checkValidity()) fires `invalid` here
    this.addEventListener('invalid', () => this.markInteracted());
    // a click aimed at the host itself comes from a <label for> (or
    // host.click()): focus like a native control. Firefox forwards the
    // label's click to a form-associated element but doesn't focus it.
    this.addEventListener('click', (event) => {
      if (event.composedPath()[0] === this && !this.isDisabled) this.focus();
    });
  }

  /** The value as the form submits it, plus the state to restore from. */
  protected abstract formValue(): [value: string | null, state: string];

  /** Validity of the underlying control, before custom validity. */
  protected abstract nativeValidity(): NativeValidity;

  /** Return to the default value (form reset). */
  protected abstract resetValue(): void;

  /** Re-apply a state saved by formValue() (back/forward cache, autofill). */
  protected abstract restoreState(state: string): void;

  /** Element that gets aria-invalid while the control is user-invalid. */
  protected abstract get validationTarget(): HTMLElement | null;

  /** The owning form, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** `<label>` elements associated with this control. */
  get labels(): NodeList {
    return this.internals.labels;
  }

  get validity(): ValidityState {
    return this.internals.validity;
  }

  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  reportValidity(): boolean {
    this.markInteracted();
    return this.internals.reportValidity();
  }

  /** Like the native method: a non-empty message makes the control invalid. */
  setCustomValidity(message: string) {
    this.customMessage = message;
    this.syncValidity();
  }

  /** @internal */
  formDisabledCallback(disabled: boolean) {
    this.formDisabled = disabled;
  }

  /** @internal */
  formResetCallback() {
    this.interacted = false;
    this.resetValue();
  }

  /** @internal */
  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') this.restoreState(state);
  }

  /** Disabled by its own attribute or by an ancestor fieldset. */
  protected get isDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  /** Call when the user commits a change: enables `:state(user-invalid)`. */
  protected markInteracted() {
    if (this.interacted) return;
    this.interacted = true;
    this.syncValidity();
  }

  /**
   * A native `change` doesn't leave the shadow root (it isn't composed);
   * re-dispatch one from the host. `input` is composed and needs no help.
   */
  protected emitChange() {
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Accessible name for the inner control when nothing in the shadow root
   * labels it: the host's aria-label, else the text of `<label for>`
   * elements pointing at the host (IDREFs can't reach into the shadow root).
   */
  protected get fallbackLabel(): string | undefined {
    const own = this.getAttribute('aria-label');
    if (own) return own;
    const text = [...this.internals.labels]
      .map((label) => label.textContent?.trim())
      .filter(Boolean)
      .join(' ');
    return text || undefined;
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    super.updated(changed);
    this.commit();
  }

  /**
   * Push the form value and validity to ElementInternals. Runs after every
   * render, and synchronously from value setters and reset — a native
   * control's form data and validity are current right after `el.value = …`
   * or a click, and so are ours.
   */
  protected commit() {
    const [value, state] = this.formValue();
    this.internals.setFormValue(value, state);
    this.syncValidity();
  }

  private syncValidity() {
    if (!this.hasUpdated) return;
    const native = this.nativeValidity();
    if (this.customMessage) {
      this.internals.setValidity(
        { ...native.flags, customError: true },
        this.customMessage,
        native.anchor,
      );
    } else if (Object.keys(native.flags).length > 0) {
      this.internals.setValidity(native.flags, native.message, native.anchor);
    } else {
      this.internals.setValidity({});
    }
    const invalid = !this.internals.validity.valid;
    const userInvalid = invalid && this.interacted;
    this.toggleState('invalid', invalid);
    this.toggleState('user-invalid', userInvalid);
    if (userInvalid)
      this.validationTarget?.setAttribute('aria-invalid', 'true');
    else this.validationTarget?.removeAttribute('aria-invalid');
  }

  protected toggleState(name: string, on: boolean) {
    if (on) this.internals.states.add(name);
    else this.internals.states.delete(name);
  }
}

/**
 * A FormControl laid out as a `.cyber-field`: label above, control, help
 * text below. `label` / `help-text` attributes, or `label` / `help-text`
 * slots for rich content.
 */
export abstract class FieldControl extends FormControl {
  /** Field label, rendered above the control. */
  @property() label = '';

  /** Hint rendered below the control (and announced with it). */
  @property({ attribute: 'help-text' }) helpText = '';

  @state() private hasLabelSlot = false;
  @state() private hasHelpSlot = false;

  /** Whether the field renders a label of its own. */
  protected get hasLabel(): boolean {
    return !!this.label || this.hasLabelSlot;
  }

  protected get hasHelp(): boolean {
    return !!this.helpText || this.hasHelpSlot;
  }

  private onSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    if (slot.name === 'label') this.hasLabelSlot = slotHasContent(slot);
    else this.hasHelpSlot = slotHasContent(slot);
  }

  /**
   * Field shell around `control`. With `forControl`, the label is a
   * `<label for="control">` (native inputs); otherwise a plain element the
   * control references with aria-labelledby="label".
   */
  protected renderField(
    control: TemplateResult,
    {
      forControl = true,
      aside,
      onLabelClick,
    }: {
      forControl?: boolean;
      aside?: unknown;
      /** for a plain-element label: focus the control like <label for> */
      onLabelClick?: () => void;
    } = {},
  ) {
    const content = html`<slot name="label" @slotchange=${this.onSlotChange}
      >${this.label}</slot
    >`;
    return html`
      <div class="cyber-field" part="field">
        <div class="cyber-field__head" ?hidden=${!this.hasLabel && !aside}>
          ${
            forControl
              ? html`<label
                  id="label"
                  for="control"
                  part="label"
                  ?hidden=${!this.hasLabel}
                  >${content}</label
                >`
              : html`<span
                  id="label"
                  class="cyber-field__label"
                  part="label"
                  ?hidden=${!this.hasLabel}
                  @click=${onLabelClick}
                  >${content}</span
                >`
          }
          ${aside ?? nothing}
        </div>
        ${control}
        <div
          id="help"
          class="cyber-field__help"
          part="help-text"
          ?hidden=${!this.hasHelp}
        >
          <slot name="help-text" @slotchange=${this.onSlotChange}
            >${this.helpText}</slot
          >
        </div>
      </div>
    `;
  }
}

/** Host rules every form element shares. */
export const formHostStyles = css`
  :host {
    display: block;
  }

  :host([hidden]),
  [hidden] {
    display: none !important;
  }
`;
