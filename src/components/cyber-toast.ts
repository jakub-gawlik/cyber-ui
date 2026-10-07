import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import toastStyles from '../styles/components/toast.css?inline';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  message: string;
  title?: string;
  variant?: ToastVariant;
  /** Auto-dismiss after this many ms; 0 keeps the toast until closed. */
  duration?: number;
}

interface ActiveToast extends Required<Omit<ToastOptions, 'title'>> {
  id: number;
  title: string;
  leaving: boolean;
}

let nextToastId = 0;

/**
 * <cyber-toaster> — fixed toast stack. Usually created on demand by the
 * `toast()` function; place one yourself to control position:
 * <cyber-toaster position="bottom-right"></cyber-toaster>
 * Positions: top-right (default), top-left, bottom-right, bottom-left.
 */
@customElement('cyber-toaster')
export class CyberToaster extends LitElement {
  static styles = [
    unsafeCSS(toastStyles),
    css`
      :host {
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        pointer-events: none;
      }

      :host([position='top-left']) {
        right: auto;
        left: 1rem;
      }

      :host([position='bottom-right']) {
        top: auto;
        bottom: 1rem;
        flex-direction: column-reverse;
      }

      :host([position='bottom-left']) {
        top: auto;
        bottom: 1rem;
        right: auto;
        left: 1rem;
        flex-direction: column-reverse;
      }

      .cyber-toast {
        pointer-events: auto;
      }
    `,
  ];

  @state() private toasts: ActiveToast[] = [];

  /** timer handle + expiry per toast, so hover can pause the countdown */
  private timers = new Map<number, { handle: number; expires: number; remaining: number }>();

  show(options: ToastOptions | string): number {
    const opts = typeof options === 'string' ? { message: options } : options;
    const id = ++nextToastId;
    this.toasts = [
      ...this.toasts,
      {
        id,
        message: opts.message,
        title: opts.title ?? '',
        variant: opts.variant ?? 'info',
        duration: opts.duration ?? 5000,
        leaving: false,
      },
    ];
    const duration = opts.duration ?? 5000;
    if (duration > 0) this.schedule(id, duration);
    return id;
  }

  dismiss(id: number) {
    this.clearTimer(id);
    const toast = this.toasts.find((t) => t.id === id);
    if (!toast || toast.leaving) return;
    this.toasts = this.toasts.map((t) =>
      t.id === id ? { ...t, leaving: true } : t,
    );
    // matches the cyber-toast-out animation; also covers reduced-motion
    window.setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    }, 200);
  }

  private schedule(id: number, ms: number) {
    const handle = window.setTimeout(() => this.dismiss(id), ms);
    this.timers.set(id, { handle, expires: Date.now() + ms, remaining: ms });
  }

  private clearTimer(id: number) {
    const timer = this.timers.get(id);
    if (timer) {
      window.clearTimeout(timer.handle);
      this.timers.delete(id);
    }
  }

  private pause(id: number) {
    const timer = this.timers.get(id);
    if (!timer) return;
    window.clearTimeout(timer.handle);
    timer.remaining = Math.max(timer.expires - Date.now(), 500);
  }

  private resume(id: number) {
    const timer = this.timers.get(id);
    if (!timer) return;
    this.schedule(id, timer.remaining);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    for (const { handle } of this.timers.values()) window.clearTimeout(handle);
    this.timers.clear();
  }

  render() {
    return html`
      ${this.toasts.map(
        (t) => html`
          <div
            class="cyber-toast cyber-toast--${t.variant}"
            role="status"
            ?data-leaving=${t.leaving}
            @mouseenter=${() => this.pause(t.id)}
            @mouseleave=${() => this.resume(t.id)}
          >
            <div class="cyber-toast__body">
              ${t.title
                ? html`<div class="cyber-toast__title">${t.title}</div>`
                : nothing}
              <div class="cyber-toast__message">${t.message}</div>
            </div>
            <button
              class="cyber-toast__close"
              aria-label="Dismiss"
              @click=${() => this.dismiss(t.id)}
            >
              &#x2715;
            </button>
          </div>
        `,
      )}
    `;
  }
}

/**
 * Imperative toast API. Creates a <cyber-toaster> in <body> on first use
 * (or reuses one you placed yourself). Returns the toast id.
 *
 * @example
 * import { toast } from 'cyber-ui';
 * toast('Jump complete');
 * toast('Hull integrity critical', { title: 'Alert', variant: 'danger' });
 */
export function toast(
  message: string | ToastOptions,
  options: Omit<ToastOptions, 'message'> = {},
): number {
  let toaster = document.querySelector('cyber-toaster');
  if (!toaster) {
    toaster = document.createElement('cyber-toaster') as CyberToaster;
    document.body.append(toaster);
  }
  const opts =
    typeof message === 'string' ? { message, ...options } : message;
  return toaster.show(opts);
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-toaster': CyberToaster;
  }
}
