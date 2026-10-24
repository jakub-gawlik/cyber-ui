import type { ReactiveController, ReactiveControllerHost } from 'lit';

export type DismissReason = 'escape' | 'outside';

export interface DismissOptions {
  isOpen: () => boolean;
  dismiss: (reason: DismissReason) => void;
}

/** Open overlays, oldest first — the last entry is the top-most. */
const openStack: DismissController[] = [];

/** True when `node` is `ancestor` or inside it, crossing shadow roots. */
function composedContains(ancestor: Node, node: Node | null): boolean {
  for (let n = node; n; n = n.parentNode ?? (n as ShadowRoot).host ?? null) {
    if (n === ancestor) return true;
  }
  return false;
}

/** The focused element, descending into shadow roots. */
function deepActiveElement(): Element | null {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

/**
 * One document-level listener for every controller, so a single Escape
 * closes exactly one overlay: the top-most open one the event came from,
 * else the one holding focus, else the top-most open one — unless the
 * event comes from an open <dialog> that doesn't contain it (the dialog
 * owns that Escape). The handled event is preventDefault()ed, so a
 * surrounding <dialog> doesn't also close; propagation is left alone.
 */
function onDocumentKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  const path = event.composedPath();
  // top-most first
  const open = openStack.filter((c) => c.isOpen()).reverse();
  // not :focus-within — engines don't propagate it to the host of a
  // focused element shown in a top-layer popover
  const active = deepActiveElement();
  let target =
    open.find((c) => path.includes(c.host)) ??
    open.find((c) => composedContains(c.host, active));
  if (!target) {
    const top = open[0];
    const dialog = path.find(
      (node): node is HTMLDialogElement =>
        node instanceof HTMLDialogElement && node.open,
    );
    if (top && (!dialog || composedContains(dialog, top.host))) target = top;
  }
  if (target) {
    event.preventDefault();
    target.dismiss('escape');
  }
}

function track(controller: DismissController, open: boolean) {
  const index = openStack.indexOf(controller);
  if (open && index === -1) {
    if (openStack.length === 0) {
      document.addEventListener('keydown', onDocumentKeyDown, true);
    }
    openStack.push(controller);
  } else if (!open && index !== -1) {
    openStack.splice(index, 1);
    if (openStack.length === 0) {
      document.removeEventListener('keydown', onDocumentKeyDown, true);
    }
  }
}

/**
 * Closes an open overlay on Escape or on pointerdown outside the host
 * element (shadow-aware via composedPath). Escape is scoped: see
 * onDocumentKeyDown. Open state is sampled after every host update, so
 * the most recently opened overlay is the top-most.
 */
export class DismissController implements ReactiveController {
  readonly host: ReactiveControllerHost & HTMLElement;

  constructor(
    host: ReactiveControllerHost & HTMLElement,
    private options: DismissOptions,
  ) {
    this.host = host;
    host.addController(this);
  }

  isOpen(): boolean {
    return this.options.isOpen();
  }

  dismiss(reason: DismissReason) {
    this.options.dismiss(reason);
  }

  hostConnected() {
    document.addEventListener('pointerdown', this.onPointerDown, true);
  }

  hostUpdated() {
    track(this, this.isOpen());
  }

  hostDisconnected() {
    document.removeEventListener('pointerdown', this.onPointerDown, true);
    track(this, false);
  }

  private onPointerDown = (event: PointerEvent) => {
    if (!this.isOpen()) return;
    if (!event.composedPath().includes(this.host)) this.dismiss('outside');
  };
}
