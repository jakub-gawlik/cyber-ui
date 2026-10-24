import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { slotHasContent } from './slots.js';
import progressStyles from '../../styles/components/progress.css?inline';

export type BarVariant =
  'primary' | 'accent' | 'warning' | 'danger' | 'success';

/**
 * Shared rendering for <cyber-progress> and <cyber-meter>: the
 * `.cyber-progress` label row + track + bar, with the fill driven by the
 * `--cyber-progress` custom property. Subclasses supply the role, ARIA
 * values and modifier classes.
 */
export abstract class BarElement extends LitElement {
  static styles = [
    unsafeCSS(progressStyles),
    css`
      :host {
        display: block;
      }

      [hidden] {
        display: none !important;
      }
    `,
  ];

  /** Label text (the `label` slot overrides it). */
  @property() label = '';

  @state() private hasLabelSlot = false;

  /** Current fill, 0–100. */
  abstract get percent(): number;

  protected get hasLabel(): boolean {
    return this.hasLabelSlot || !!this.label;
  }

  /** `role` of the track. */
  protected abstract trackRole: string;

  /** ARIA attributes for the track. */
  protected abstract aria(): Record<string, string | undefined>;

  /** Modifier classes on the root. */
  protected abstract modifiers(): string[];

  private onLabelSlotChange(event: Event) {
    this.hasLabelSlot = slotHasContent(event.target as HTMLSlotElement);
  }

  render() {
    const aria = this.aria();
    const percent = this.percent;
    const classes = ['cyber-progress', ...this.modifiers()].join(' ');
    return html`
      <div class=${classes} part="base" style="--cyber-progress: ${percent}%">
        <div
          class="cyber-progress__label"
          part="label"
          ?hidden=${!this.hasLabel}
        >
          <span id="label"
            ><slot name="label" @slotchange=${this.onLabelSlotChange}
              >${this.label}</slot
            ></span
          >
          <span part="value"
            ><slot name="value">${Math.round(percent)}%</slot></span
          >
        </div>
        <div
          class="cyber-progress__track"
          part="track"
          role=${this.trackRole}
          aria-labelledby=${this.hasLabel ? 'label' : nothing}
          aria-valuemin=${ifDefined(aria.valuemin)}
          aria-valuemax=${ifDefined(aria.valuemax)}
          aria-valuenow=${ifDefined(aria.valuenow)}
          aria-valuetext=${ifDefined(aria.valuetext)}
        >
          <div class="cyber-progress__bar" part="bar"></div>
        </div>
      </div>
    `;
  }
}

export const barVariantClass = (variant: BarVariant) =>
  variant === 'primary' ? [] : [`cyber-progress--${variant}`];

export const clampPercent = (value: number, min: number, max: number) =>
  max > min
    ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
    : 0;
