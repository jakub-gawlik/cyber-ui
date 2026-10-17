import { property, query } from 'lit/decorators.js';
import {
  FieldControl,
  validityFlags,
  type NativeValidity,
} from './form-control.js';

/**
 * Shared base of <cyber-input> and <cyber-textarea>: a native text control
 * (`#control`) inside a `.cyber-field`. Value semantics match the native
 * elements — the `value` attribute is the default (`defaultValue`), the
 * `value` property is the live value, and form reset returns to the default.
 */
export abstract class TextControl extends FieldControl {
  /** Default value — the `value` attribute; form reset restores it. */
  @property({ attribute: 'value' }) defaultValue = '';

  /** Hint shown while the field is empty. */
  @property() placeholder = '';

  /** Native `readonly`: focusable and submitted, but not editable. */
  @property({ type: Boolean, reflect: true }) readonly = false;

  /** Minimum length (`tooShort` once the user has edited the value). */
  @property({ type: Number }) minlength?: number;

  /** Maximum length; the browser stops input past it. */
  @property({ type: Number }) maxlength?: number;

  /** Native autocomplete hint (e.g. `email`, `off`). */
  @property() autocomplete?: string;

  /** @internal */
  @query('#control') protected control!: HTMLInputElement | HTMLTextAreaElement;

  /** null until the value is set by the user or a script ("dirty") */
  private dirtyValue: string | null = null;

  /** Current value. Assigning it detaches it from `defaultValue`. */
  get value(): string {
    return this.dirtyValue ?? this.defaultValue;
  }

  set value(value: string) {
    const old = this.value;
    this.dirtyValue = String(value ?? '');
    this.apply(old);
  }

  /** Select all text in the control. */
  select() {
    this.control?.select();
  }

  protected onInput() {
    this.value = this.control.value;
  }

  protected onChange() {
    this.markInteracted();
    this.emitChange();
  }

  protected formValue(): [string, string] {
    return [this.value, this.value];
  }

  protected nativeValidity(): NativeValidity {
    return {
      flags: validityFlags(this.control.validity),
      message: this.control.validationMessage,
      anchor: this.control,
    };
  }

  protected resetValue() {
    const old = this.value;
    this.dirtyValue = null;
    this.apply(old);
  }

  /** Mirror the value into the native control now, so validity is current. */
  private apply(old: string) {
    if (this.control && this.control.value !== this.value) {
      this.control.value = this.value;
    }
    this.requestUpdate('value', old);
    this.commit();
  }

  protected restoreState(state: string) {
    this.value = state;
  }

  protected get validationTarget() {
    return this.control ?? null;
  }
}
