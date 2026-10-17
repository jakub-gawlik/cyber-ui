import { css, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import { formHostStyles } from './internal/form-control.js';
import { ToggleControl } from './internal/toggle-control.js';
import switchStyles from '../styles/components/switch.css?inline';

/**
 * <cyber-switch> — form-associated on/off switch: a native checkbox with
 * `role="switch"` and the `.cyber-switch` skin, labelled by its content.
 * Same form, value and reset semantics as <cyber-checkbox> (submits
 * `value`, default `"on"`, while checked).
 *
 * Custom states: `:state(checked)`, `:state(invalid)`, `:state(user-invalid)`.
 *
 * @slot - Label text.
 * @csspart base - The `.cyber-switch` label wrapper.
 * @csspart control - The native checkbox (the track).
 * @csspart label - Wrapper around the slotted label text.
 * @fires {Event} input - The user toggled it (native, composed).
 * @fires {Event} change - The user toggled it.
 *
 * @example
 * <cyber-switch name="cloak">Cloaking device</cyber-switch>
 */
@customElement('cyber-switch')
export class CyberSwitch extends ToggleControl {
  static styles = [
    unsafeCSS(switchStyles),
    formHostStyles,
    css`
      :host {
        display: inline-block;
      }
    `,
  ];

  protected readonly skin = 'cyber-switch';

  render() {
    return this.renderControl({ role: 'switch' });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-switch': CyberSwitch;
  }
}
