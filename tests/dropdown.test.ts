import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CyberDropdown } from '../src/index.js';
import { captureEvents, cleanupFixtures, fixture, keydown } from './helpers.js';

const markup = `
  <cyber-dropdown>
    <button slot="trigger">Actions</button>
    <button role="menuitem">Scan system</button>
    <button role="menuitem">Open starmap</button>
    <button role="menuitem">Abandon ship</button>
  </cyber-dropdown>
`;

const menuOf = (dd: CyberDropdown) =>
  dd.shadowRoot!.querySelector<HTMLElement>('[part="menu"]')!;
const itemsOf = (dd: CyberDropdown) =>
  [...dd.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
const triggerOf = (dd: CyberDropdown) =>
  dd.querySelector<HTMLButtonElement>('[slot="trigger"]')!;

async function opened(): Promise<CyberDropdown> {
  const dd = fixture<CyberDropdown>(markup);
  await dd.updateComplete;
  triggerOf(dd).click();
  await vi.waitFor(() => expect(document.activeElement).toBe(itemsOf(dd)[0]));
  return dd;
}

describe('<cyber-dropdown>', () => {
  afterEach(cleanupFixtures);

  it('opens from the trigger, emits cyber-open, and focuses the first item', async () => {
    const dd = fixture<CyberDropdown>(markup);
    await dd.updateComplete;
    const opens = captureEvents(dd, 'cyber-open');
    expect(menuOf(dd).hidden).toBe(true);

    triggerOf(dd).click();
    await dd.updateComplete;
    expect(dd.open).toBe(true);
    expect(menuOf(dd).hidden).toBe(false);
    expect(opens).toHaveLength(1);
    await vi.waitFor(() => expect(document.activeElement).toBe(itemsOf(dd)[0]));
  });

  it('selecting an item emits cyber-select with the item and closes', async () => {
    const dd = await opened();
    const selects = captureEvents(dd, 'cyber-select');
    const closes = captureEvents(dd, 'cyber-close');

    itemsOf(dd)[1].click();
    await dd.updateComplete;
    expect(selects).toHaveLength(1);
    expect(selects[0].detail.item).toBe(itemsOf(dd)[1]);
    expect(closes).toHaveLength(1);
    expect(dd.open).toBe(false);
  });

  it('closes on Escape and on pointerdown outside', async () => {
    const dd = await opened();
    keydown(document.body, 'Escape');
    await dd.updateComplete;
    expect(dd.open).toBe(false);

    triggerOf(dd).click();
    await dd.updateComplete;
    expect(dd.open).toBe(true);

    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true }),
    );
    await dd.updateComplete;
    expect(dd.open).toBe(false);
  });

  it('moves focus with arrow keys, wrapping, and honors Home/End', async () => {
    const dd = await opened();
    const items = itemsOf(dd);

    keydown(items[0], 'ArrowDown');
    expect(document.activeElement).toBe(items[1]);

    keydown(items[1], 'End');
    expect(document.activeElement).toBe(items[2]);

    keydown(items[2], 'ArrowDown'); // wraps
    expect(document.activeElement).toBe(items[0]);

    keydown(items[0], 'ArrowUp'); // wraps back
    expect(document.activeElement).toBe(items[2]);

    keydown(items[2], 'Home');
    expect(document.activeElement).toBe(items[0]);
  });

  it('skips aria-disabled items in keyboard order', async () => {
    const dd = fixture<CyberDropdown>(`
      <cyber-dropdown>
        <button slot="trigger">Actions</button>
        <button role="menuitem">First</button>
        <button role="menuitem" aria-disabled="true">Locked</button>
        <button role="menuitem">Last</button>
      </cyber-dropdown>
    `);
    await dd.updateComplete;
    triggerOf(dd).click();
    const [first, , last] = itemsOf(dd);
    await vi.waitFor(() => expect(document.activeElement).toBe(first));

    keydown(first, 'ArrowDown');
    expect(document.activeElement).toBe(last);
  });
});
