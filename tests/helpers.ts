import axe from 'axe-core';
import { expect } from 'vitest';
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
export function captureEvents(
  target: EventTarget,
  name: string,
): CustomEvent[] {
  const events: CustomEvent[] = [];
  target.addEventListener(name, (event) => events.push(event as CustomEvent));
  return events;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Dispatch a cancelable keydown; returns it so callers can check defaultPrevented. */
export function keydown(target: EventTarget, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

/**
 * Assert axe-core finds no WCAG 2.x A/AA violations in `context` (shadow
 * roots included). color-contrast is off: tests render without a themed
 * page background, so contrast results would be meaningless here.
 */
export async function expectAccessible(context: Element = document.body) {
  const results = await axe.run(context, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
    },
    rules: { 'color-contrast': { enabled: false } },
  });
  const summary = results.violations.map(
    (v) =>
      `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
  );
  expect(summary).toEqual([]);
}

/** Mount `inner` inside a <form> and return both. */
export function formFixture<T extends Element>(
  inner: string,
): { form: HTMLFormElement; control: T } {
  const form = fixture<HTMLFormElement>(`<form>${inner}</form>`);
  return { form, control: form.firstElementChild as T };
}

/**
 * Whether Tab reaches a native `<input type=…>` in this engine. Safari's
 * default (and Playwright's WebKit) tabs only to text fields, skipping
 * checkboxes and radios, so keyboard tests assert parity with native.
 */
export async function tabReachesNative(type: string): Promise<boolean> {
  const { userEvent } = await import('vitest/browser');
  const host = fixture<HTMLDivElement>(
    `<div><input data-from><input data-to type="${type}"></div>`,
  );
  host.querySelector<HTMLInputElement>('[data-from]')!.focus();
  await userEvent.keyboard('{Tab}');
  const reached = document.activeElement === host.querySelector('[data-to]');
  host.remove();
  return reached;
}

/** `:state(name)` support check + match, so failures read clearly. */
export function hasState(el: Element, name: string): boolean {
  return el.matches(`:state(${name})`);
}
