import { customElement, property } from 'lit/decorators.js';
import { BarElement, clampPercent } from './internal/bar.js';

/** How the meter's value relates to its optimum range — like a native meter. */
export type MeterState = 'optimum' | 'suboptimum' | 'even-less-good';

/**
 * <cyber-meter> — scalar readout within a known range (`role="meter"`):
 * hull integrity, shield charge, disk usage. Shares the `.cyber-progress`
 * skin with <cyber-progress>.
 *
 * `low` / `high` / `optimum` work like the native `<meter>`: the range is
 * split into [min, low), [low, high] and (high, max]; the bar is green
 * when the value is in the same region as `optimum`, amber when in the
 * neighbouring region and red otherwise. Without any of the three the bar
 * stays in the primary color.
 *
 * @slot label - Rich label (instead of the `label` attribute).
 * @slot value - Custom readout (default: the rounded percentage).
 * @csspart base - The `.cyber-progress` root.
 * @csspart label - The label row.
 * @csspart value - The readout.
 * @csspart track - The `role="meter"` track.
 * @csspart bar - The fill.
 *
 * @example
 * <cyber-meter label="Shields" value="35" low="30" high="70" optimum="100">
 * </cyber-meter>
 */
@customElement('cyber-meter')
export class CyberMeter extends BarElement {
  /** Current value, `min`–`max`. */
  @property({ type: Number }) value = 0;

  @property({ type: Number }) min = 0;

  @property({ type: Number }) max = 100;

  /** Upper bound of the "low" region. */
  @property({ type: Number }) low?: number;

  /** Lower bound of the "high" region. */
  @property({ type: Number }) high?: number;

  /** The ideal value; decides which region is the good one. */
  @property({ type: Number }) optimum?: number;

  get percent(): number {
    return clampPercent(this.value, this.min, this.max);
  }

  /** The native-meter state of the current value, or `undefined` when no
      `low` / `high` / `optimum` is set. */
  get state(): MeterState | undefined {
    if (
      this.low === undefined &&
      this.high === undefined &&
      this.optimum === undefined
    ) {
      return undefined;
    }
    const { min, max } = this;
    const low = Math.min(Math.max(this.low ?? min, min), max);
    const high = Math.min(Math.max(this.high ?? max, low), max);
    const optimum = Math.min(
      Math.max(this.optimum ?? (min + max) / 2, min),
      max,
    );
    const value = Math.min(Math.max(this.value, min), max);
    const region = (v: number) => (v < low ? 0 : v > high ? 2 : 1);
    const distance = Math.abs(region(value) - region(optimum));
    return distance === 0
      ? 'optimum'
      : distance === 1
        ? 'suboptimum'
        : 'even-less-good';
  }

  protected trackRole = 'meter';

  protected aria() {
    return {
      valuemin: String(this.min),
      valuemax: String(this.max),
      valuenow: String(this.value),
      valuetext: undefined,
    };
  }

  protected modifiers() {
    switch (this.state) {
      case 'optimum':
        return ['cyber-progress--success'];
      case 'suboptimum':
        return ['cyber-progress--warning'];
      case 'even-less-good':
        return ['cyber-progress--danger'];
      default:
        return [];
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-meter': CyberMeter;
  }
}
