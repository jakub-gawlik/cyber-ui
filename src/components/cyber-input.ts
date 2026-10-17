import { html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { formHostStyles } from './internal/form-control.js';
import { TextControl } from './internal/text-control.js';
import inputStyles from '../styles/components/input.css?inline';

export type InputType =
  'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';

/**
 * <cyber-input> — form-associated text field: a native `<input>` with the
 * `.cyber-input` skin inside a `.cyber-field` (label, help text). Takes part
 * in `<form>` submission, validation (`required`, `minlength`, `pattern`,
 * `type="email"`, … with the browser's own messages), reset and fieldset
 * disabling like a native input.
 *
 * `value` attribute = default value; `value` property = current value.
 * Native `input` events pass through; `change` is re-dispatched from the
 * element. Enter submits the owning form (implicit submission).
 *
 * Label it with the `label` attribute or slot. A `<label for>` pointing at
 * the element focuses it and is used as its accessible name.
 *
 * @slot label - Rich label content (instead of the `label` attribute).
 * @slot help-text - Rich help text (instead of the `help-text` attribute).
 * @csspart field - The `.cyber-field` wrapper.
 * @csspart label - The label.
 * @csspart input - The native `<input>`.
 * @csspart help-text - The help text.
 * @fires {Event} input - The user edited the value (native, composed).
 * @fires {Event} change - The user committed a change.
 *
 * @example
 * <cyber-input name="callsign" label="Callsign" required minlength="3"
 *   help-text="Visible to allied fleets"></cyber-input>
 */
@customElement('cyber-input')
export class CyberInput extends TextControl {
  static styles = [unsafeCSS(inputStyles), formHostStyles];

  /** Native input type. */
  @property({ reflect: true }) type: InputType = 'text';

  /** Regular expression the value must match (`patternMismatch`). */
  @property() pattern?: string;

  /** Minimum for `type="number"` (`rangeUnderflow`). */
  @property() min?: string;

  /** Maximum for `type="number"` (`rangeOverflow`). */
  @property() max?: string;

  /** Step for `type="number"` (`stepMismatch`). */
  @property() step?: string;

  /**
   * Implicit submission: Enter in a native input submits its form, but the
   * inner input has no form owner (it's in another tree), so do it here —
   * via the form's default button like the browser, or requestSubmit().
   */
  private onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.isComposing || !this.form) return;
    const button = [...this.form.elements].find(
      (el): el is HTMLButtonElement | HTMLInputElement =>
        (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) &&
        el.type === 'submit',
    );
    event.preventDefault();
    if (button) {
      if (!button.disabled) button.click();
    } else {
      this.form.requestSubmit();
    }
  }

  render() {
    return this.renderField(html`
      <input
        id="control"
        class="cyber-input"
        part="input"
        type=${this.type}
        .value=${live(this.value)}
        placeholder=${ifDefined(this.placeholder || undefined)}
        ?disabled=${this.isDisabled}
        ?readonly=${this.readonly}
        ?required=${this.required}
        minlength=${ifDefined(this.minlength)}
        maxlength=${ifDefined(this.maxlength)}
        pattern=${ifDefined(this.pattern)}
        min=${ifDefined(this.min)}
        max=${ifDefined(this.max)}
        step=${ifDefined(this.step)}
        autocomplete=${ifDefined(this.autocomplete as AutoFill | undefined)}
        aria-label=${ifDefined(this.hasLabel ? undefined : this.fallbackLabel)}
        aria-describedby=${ifDefined(this.hasHelp ? 'help' : undefined)}
        @input=${this.onInput}
        @change=${this.onChange}
        @keydown=${this.onKeyDown}
      />
    `);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-input': CyberInput;
  }
}
