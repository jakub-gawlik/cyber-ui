import { html } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import {
  FormControl,
  validityFlags,
  type NativeValidity,
} from './form-control.js';
import { slotHasContent } from './slots.js';

/**
 * Shared base of <cyber-checkbox> and <cyber-switch>: a native checkbox
 * inside a `<label>` wrapping the default slot, so the slotted text names
 * it and clicking it toggles. Value semantics match a native checkbox —
 * the `checked` attribute is the default (`defaultChecked`), the `checked`
 * property is live, reset restores the default, and the form submits
 * `value` (default `"on"`) only while checked.
 *
 * Custom state: `:state(checked)`.
 */
export abstract class ToggleControl extends FormControl {
  /** Default checked state — the `checked` attribute; reset restores it. */
  @property({ type: Boolean, attribute: 'checked' }) defaultChecked = false;

  /** Submitted while checked. */
  @property() value = 'on';

  /** @internal */
  @query('#control') protected control!: HTMLInputElement;

  @state() private hasText = false;

  private dirtyChecked: boolean | null = null;

  /** skin class on the wrapping label */
  protected abstract readonly skin: string;

  constructor() {
    super();
    // a <label for> outside clicks the host; toggle like a native control
    this.addEventListener('click', (event) => {
      if (event.composedPath()[0] === this && !this.isDisabled) {
        this.control?.click();
      }
    });
  }

  /** Current checked state. Assigning it detaches it from `defaultChecked`. */
  get checked(): boolean {
    return this.dirtyChecked ?? this.defaultChecked;
  }

  set checked(checked: boolean) {
    const old = this.checked;
    this.dirtyChecked = !!checked;
    this.apply(old);
  }

  /** Toggle as if clicked (fires input and change). */
  toggle() {
    if (!this.isDisabled) this.control?.click();
  }

  protected onChange() {
    this.checked = this.control.checked;
    this.markInteracted();
    this.emitChange();
  }

  private onSlotChange(event: Event) {
    this.hasText = slotHasContent(event.target as HTMLSlotElement);
  }

  /** Extra bindings on the native input, per subclass. */
  protected renderControl(extra: { role?: string; indeterminate?: boolean }) {
    return html`
      <label class=${this.skin} part="base">
        <input
          id="control"
          type="checkbox"
          part="control"
          role=${ifDefined(extra.role)}
          .checked=${live(this.checked)}
          .indeterminate=${extra.indeterminate ?? false}
          ?disabled=${this.isDisabled}
          ?required=${this.required}
          aria-label=${ifDefined(this.hasText ? undefined : this.fallbackLabel)}
          @change=${this.onChange}
        />
        <span part="label" ?hidden=${!this.hasText}
          ><slot @slotchange=${this.onSlotChange}></slot
        ></span>
      </label>
    `;
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    super.updated(changed);
    this.toggleState('checked', this.checked);
  }

  protected formValue(): [string | null, string] {
    return this.checked ? [this.value, 'checked'] : [null, ''];
  }

  protected nativeValidity(): NativeValidity {
    return {
      flags: validityFlags(this.control.validity),
      message: this.control.validationMessage,
      anchor: this.control,
    };
  }

  protected resetValue() {
    const old = this.checked;
    this.dirtyChecked = null;
    this.apply(old);
  }

  /** Mirror into the native checkbox now, so validity is current. */
  private apply(old: boolean) {
    if (this.control) this.control.checked = this.checked;
    this.requestUpdate('checked', old);
    this.toggleState('checked', this.checked);
    this.commit();
  }

  protected restoreState(state: string) {
    this.checked = state === 'checked';
  }

  protected get validationTarget() {
    return this.control ?? null;
  }
}
