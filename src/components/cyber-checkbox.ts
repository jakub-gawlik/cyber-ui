import { css, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { formHostStyles } from './internal/form-control.js';
import { ToggleControl } from './internal/toggle-control.js';
import checkboxStyles from '../styles/components/checkbox.css?inline';

/**
 * <cyber-checkbox> — form-associated checkbox: a native checkbox with the
 * `.cyber-checkbox` skin, labelled by its content. Submits `value`
 * (default `"on"`) under `name` while checked; `required` fails validation
 * (`valueMissing`) while unchecked. `checked` attribute = default state,
 * `checked` property = current state; form reset restores the default.
 *
 * Space toggles it (native); so does clicking it, its text or a
 * `<label for>` pointing at it.
 *
 * Custom states: `:state(checked)`, `:state(indeterminate)`,
 * `:state(invalid)`, `:state(user-invalid)`.
 *
 * @slot - Label text.
 * @csspart base - The `.cyber-checkbox` label wrapper.
 * @csspart control - The native checkbox.
 * @csspart label - Wrapper around the slotted label text.
 * @fires {Event} input - The user toggled it (native, composed).
 * @fires {Event} change - The user toggled it.
 *
 * @example
 * <cyber-checkbox name="shields" checked>Raise shields</cyber-checkbox>
 */
@customElement('cyber-checkbox')
export class CyberCheckbox extends ToggleControl {
  static styles = [
    unsafeCSS(checkboxStyles),
    formHostStyles,
    css`
      :host {
        display: inline-block;
      }

      /* "mixed": a bar instead of the filled square */
      .cyber-checkbox input[type='checkbox']:indeterminate::before {
        height: 0.18em;
        transform: scale(1);
      }
    `,
  ];

  protected readonly skin = 'cyber-checkbox';

  /**
   * Shows the "mixed" state (`aria-checked="mixed"`) without changing
   * `checked`; cleared when the user toggles it, like the native property.
   */
  @property({ type: Boolean, reflect: true }) indeterminate = false;

  protected onChange() {
    this.indeterminate = false;
    super.onChange();
  }

  protected updated(changed: PropertyValues<this>) {
    super.updated(changed);
    this.toggleState('indeterminate', this.indeterminate);
  }

  render() {
    return this.renderControl({ indeterminate: this.indeterminate });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-checkbox': CyberCheckbox;
  }
}
