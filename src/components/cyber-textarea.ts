import { html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { formHostStyles } from './internal/form-control.js';
import { TextControl } from './internal/text-control.js';
import inputStyles from '../styles/components/input.css?inline';

/**
 * <cyber-textarea> — form-associated multi-line text field: a native
 * `<textarea>` with the `.cyber-input` skin inside a `.cyber-field`. Same
 * form, validation and value semantics as <cyber-input>.
 *
 * @slot label - Rich label content (instead of the `label` attribute).
 * @slot help-text - Rich help text (instead of the `help-text` attribute).
 * @csspart field - The `.cyber-field` wrapper.
 * @csspart label - The label.
 * @csspart textarea - The native `<textarea>`.
 * @csspart help-text - The help text.
 * @fires {Event} input - The user edited the value (native, composed).
 * @fires {Event} change - The user committed a change.
 *
 * @example
 * <cyber-textarea name="log" label="Captain's log" rows="6"></cyber-textarea>
 */
@customElement('cyber-textarea')
export class CyberTextarea extends TextControl {
  static styles = [unsafeCSS(inputStyles), formHostStyles];

  /** Visible text lines. */
  @property({ type: Number }) rows = 4;

  render() {
    return this.renderField(html`
      <textarea
        id="control"
        class="cyber-input"
        part="textarea"
        rows=${this.rows}
        .value=${live(this.value)}
        placeholder=${ifDefined(this.placeholder || undefined)}
        ?disabled=${this.isDisabled}
        ?readonly=${this.readonly}
        ?required=${this.required}
        minlength=${ifDefined(this.minlength)}
        maxlength=${ifDefined(this.maxlength)}
        autocomplete=${ifDefined(this.autocomplete as AutoFill | undefined)}
        aria-label=${ifDefined(this.hasLabel ? undefined : this.fallbackLabel)}
        aria-describedby=${ifDefined(this.hasHelp ? 'help' : undefined)}
        @input=${this.onInput}
        @change=${this.onChange}
      ></textarea>
    `);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-textarea': CyberTextarea;
  }
}
