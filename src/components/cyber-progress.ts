import { customElement, property } from 'lit/decorators.js';
import {
  BarElement,
  barVariantClass,
  clampPercent,
  type BarVariant,
} from './internal/bar.js';

/**
 * <cyber-progress> — progress bar (`role="progressbar"`). The fill is
 * `value / max`; `indeterminate` sweeps the bar and drops `aria-valuenow`
 * for work of unknown length. The readout defaults to the percentage;
 * slot `value` to show something else.
 *
 * Give it a name: `label` (or the `label` slot) also labels the bar for
 * assistive tech.
 *
 * @slot label - Rich label (instead of the `label` attribute).
 * @slot value - Custom readout (default: the rounded percentage).
 * @csspart base - The `.cyber-progress` root.
 * @csspart label - The label row.
 * @csspart value - The readout.
 * @csspart track - The `role="progressbar"` track.
 * @csspart bar - The fill.
 *
 * @example
 * <cyber-progress label="Hull" value="72"></cyber-progress>
 * <cyber-progress label="Decrypting" indeterminate striped></cyber-progress>
 */
@customElement('cyber-progress')
export class CyberProgress extends BarElement {
  /** Current value, 0–`max`. */
  @property({ type: Number }) value = 0;

  /** Value that fills the bar. */
  @property({ type: Number }) max = 100;

  /** Unknown progress: a sweeping bar, no `aria-valuenow`. */
  @property({ type: Boolean, reflect: true }) indeterminate = false;

  /** Color: `primary` (default), `accent`, `warning`, `danger`, `success`. */
  @property({ reflect: true }) variant: BarVariant = 'primary';

  /** Animated diagonal stripes. */
  @property({ type: Boolean, reflect: true }) striped = false;

  /** Carve the bar into segments (`--cyber-progress-segments`, default 8). */
  @property({ type: Boolean, reflect: true }) segmented = false;

  get percent(): number {
    return clampPercent(this.value, 0, this.max);
  }

  protected trackRole = 'progressbar';

  protected aria() {
    return {
      valuemin: '0',
      valuemax: String(this.max),
      valuenow: this.indeterminate ? undefined : String(this.value),
      valuetext: undefined,
    };
  }

  protected modifiers() {
    return [
      ...barVariantClass(this.variant),
      ...(this.striped ? ['cyber-progress--striped'] : []),
      ...(this.segmented ? ['cyber-progress--segmented'] : []),
      ...(this.indeterminate ? ['cyber-progress--indeterminate'] : []),
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-progress': CyberProgress;
  }
}
