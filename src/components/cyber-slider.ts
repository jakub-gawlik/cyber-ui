import { css, html, unsafeCSS } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import {
  FieldControl,
  formHostStyles,
  validityFlags,
  type NativeValidity,
} from './internal/form-control.js';
import inputStyles from '../styles/components/input.css?inline';
import sliderStyles from '../styles/components/slider.css?inline';

/**
 * The value a native `<input type="range">` settles on: clamped to
 * [min, max], snapped to the nearest step from min (stepping down if that
 * overshoots max), with the midpoint as the default.
 */
export function sanitizeRange(
  value: number | undefined,
  min: number,
  max: number,
  step: number,
): number {
  if (max < min) max = min;
  const fallback = min + (max - min) / 2;
  let x = value !== undefined && Number.isFinite(value) ? value : fallback;
  x = Math.min(Math.max(x, min), max);
  if (step > 0) {
    // toFixed first: 0.35 / 0.1 is 3.4999…, but the browser's decimal math
    // (and the spec's "ties round up") give 4
    const steps = Math.round(Number(((x - min) / step).toFixed(10)));
    x = min + steps * step;
    if (x > max) x -= step;
  }
  // drop float noise from the step arithmetic (0.1 + 0.2 …)
  const decimals = Math.max(decimalsOf(step), decimalsOf(min));
  return Number(x.toFixed(decimals));
}

function decimalsOf(n: number): number {
  return (String(n).split('.')[1] ?? '').length;
}

/**
 * <cyber-slider> — form-associated range slider: a native
 * `<input type="range">` with the `.cyber-slider` skin inside a
 * `.cyber-field`, plus a value readout. Keyboard (arrows, Page Up/Down,
 * Home/End) and pointer behavior are native. Submits the value under
 * `name`.
 *
 * `value` attribute = default value (default: the midpoint, like native);
 * `value` property = current value, sanitized like the native control
 * (clamped to `min`/`max`, snapped to `step`). Form reset restores the
 * default.
 *
 * @slot label - Rich label content (instead of the `label` attribute).
 * @slot help-text - Rich help text (instead of the `help-text` attribute).
 * @csspart field - The `.cyber-field` wrapper.
 * @csspart label - The label.
 * @csspart value - The value readout next to the label.
 * @csspart slider - The native range input.
 * @csspart help-text - The help text.
 * @fires {Event} input - The value is changing (native, composed).
 * @fires {Event} change - The user committed a value.
 *
 * @example
 * <cyber-slider name="shields" label="Shield power" min="0" max="100"
 *   step="5" value="60"></cyber-slider>
 */
@customElement('cyber-slider')
export class CyberSlider extends FieldControl {
  static styles = [
    unsafeCSS(inputStyles),
    unsafeCSS(sliderStyles),
    formHostStyles,
    css`
      .cyber-slider__value {
        font-family: var(--cyber-font-mono);
        font-size: 0.78rem;
        color: var(--cyber-primary);
      }
    `,
  ];

  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;
  @property({ type: Number }) step = 1;

  /** Default value — the `value` attribute; reset restores it. */
  @property({ type: Number, attribute: 'value' }) defaultValue?: number;

  /** @internal */
  @query('#control') protected control!: HTMLInputElement;

  private dirtyValue: number | null = null;

  /** Current value, sanitized like the native control. */
  get value(): number {
    return sanitizeRange(
      this.dirtyValue ?? this.defaultValue,
      this.min,
      this.max,
      this.step,
    );
  }

  set value(value: number) {
    const old = this.value;
    this.dirtyValue = Number(value);
    this.apply(old);
  }

  private apply(old: number) {
    if (this.control) this.control.value = String(this.value);
    this.requestUpdate('value', old);
    this.commit();
  }

  private onInput() {
    this.value = Number(this.control.value);
  }

  private onChange() {
    this.markInteracted();
    this.emitChange();
  }

  protected formValue(): [string, string] {
    const value = String(this.value);
    return [value, value];
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

  protected restoreState(state: string) {
    this.value = Number(state);
  }

  protected get validationTarget() {
    return this.control ?? null;
  }

  render() {
    const span = this.max - this.min;
    const fill = span > 0 ? ((this.value - this.min) / span) * 100 : 0;
    return this.renderField(
      html`
        <input
          id="control"
          class="cyber-slider"
          part="slider"
          type="range"
          min=${this.min}
          max=${this.max}
          step=${this.step}
          .value=${live(String(this.value))}
          style="--cyber-slider-fill: ${fill}%"
          ?disabled=${this.isDisabled}
          aria-label=${ifDefined(this.hasLabel ? undefined : this.fallbackLabel)}
          aria-describedby=${ifDefined(this.hasHelp ? 'help' : undefined)}
          @input=${this.onInput}
          @change=${this.onChange}
        />
      `,
      {
        // the slider announces its own value; keep the readout visual only
        aside: html`<span
          class="cyber-slider__value"
          part="value"
          aria-hidden="true"
          >${this.value}</span
        >`,
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-slider': CyberSlider;
  }
}
