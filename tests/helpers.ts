import '../src/index.js';

const containers: HTMLElement[] = [];

/** Mount markup into the document; the first element is returned. */
export function fixture<T extends Element>(html: string): T {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  containers.push(container);
  return container.firstElementChild as T;
}

/** Remove everything mounted via fixture(). Call from afterEach. */
export function cleanupFixtures() {
  for (const container of containers.splice(0)) container.remove();
}

/** Collect every `name` event fired on (or bubbling through) `target`. */
export function captureEvents(target: EventTarget, name: string): CustomEvent[] {
  const events: CustomEvent[] = [];
  target.addEventListener(name, (event) => events.push(event as CustomEvent));
  return events;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function keydown(target: EventTarget, key: string) {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, composed: true }),
  );
}
