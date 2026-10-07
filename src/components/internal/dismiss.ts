import type { ReactiveController, ReactiveControllerHost } from 'lit';

export interface DismissOptions {
  isOpen: () => boolean;
  dismiss: () => void;
}

/**
 * Closes an open overlay on Escape or on pointerdown outside the host
 * element (shadow-aware via composedPath).
 */
export class DismissController implements ReactiveController {
  private host: ReactiveControllerHost & HTMLElement;

  constructor(
    host: ReactiveControllerHost & HTMLElement,
    private options: DismissOptions,
  ) {
    this.host = host;
    host.addController(this);
  }

  hostConnected() {
    document.addEventListener('pointerdown', this.onPointerDown, true);
    document.addEventListener('keydown', this.onKeyDown, true);
  }

  hostDisconnected() {
    document.removeEventListener('pointerdown', this.onPointerDown, true);
    document.removeEventListener('keydown', this.onKeyDown, true);
  }

  private onPointerDown = (event: PointerEvent) => {
    if (!this.options.isOpen()) return;
    if (!event.composedPath().includes(this.host)) this.options.dismiss();
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.options.isOpen()) return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.options.dismiss();
    }
  };
}
