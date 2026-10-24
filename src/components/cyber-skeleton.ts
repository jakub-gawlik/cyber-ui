import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import skeletonStyles from '../styles/components/skeleton.css?inline';

export type SkeletonShape = 'rect' | 'text' | 'circle';

/**
 * <cyber-skeleton> — loading placeholder with a shimmer sweep, hidden
 * from assistive tech (put `aria-busy="true"` on the region it stands in
 * for). Set the width on the host; the height comes from
 * `--cyber-skeleton-height` (rect / text) or `--cyber-skeleton-size`
 * (circle).
 *
 * @csspart base - The `.cyber-skeleton` block.
 *
 * @example
 * <div aria-busy="true">
 *   <cyber-skeleton shape="text"></cyber-skeleton>
 *   <cyber-skeleton shape="text"></cyber-skeleton>
 *   <cyber-skeleton shape="circle"></cyber-skeleton>
 * </div>
 */
@customElement('cyber-skeleton')
export class CyberSkeleton extends LitElement {
  static styles = [
    unsafeCSS(skeletonStyles),
    css`
      :host {
        display: block;
      }

      :host([shape='circle']) {
        display: inline-block;
      }
    `,
  ];

  /** `rect` (default), `text` or `circle`. */
  @property({ reflect: true }) shape: SkeletonShape = 'rect';

  render() {
    const shape = this.shape === 'rect' ? '' : ` cyber-skeleton--${this.shape}`;
    return html`<div
      class="cyber-skeleton${shape}"
      part="base"
      aria-hidden="true"
    ></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-skeleton': CyberSkeleton;
  }
}
