import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CyberDropdown } from '../src/index.js';
import {
  setAnchoringMode,
  usesAnchoredPopovers,
} from '../src/components/internal/anchor.js';
import {
  captureEvents,
  cleanupFixtures,
  expectAccessible,
  fixture,
  keydown,
  sleep,
} from './helpers.js';

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
const itemsOf = (dd: CyberDropdown) => [
  ...dd.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
];
const triggerOf = (dd: CyberDropdown) =>
  dd.querySelector<HTMLButtonElement>('[slot="trigger"]')!;

async function opened(html = markup): Promise<CyberDropdown> {
  const mounted = fixture<HTMLElement>(html);
  const dd =
    mounted instanceof HTMLElement && mounted.matches('cyber-dropdown')
      ? (mounted as CyberDropdown)
      : mounted.querySelector<CyberDropdown>('cyber-dropdown')!;
  await dd.updateComplete;
  triggerOf(dd).click();
  await vi.waitFor(() => expect(document.activeElement).toBe(itemsOf(dd)[0]));
  return dd;
}

describe('<cyber-dropdown>', () => {
  afterEach(() => {
    cleanupFixtures();
    setAnchoringMode('auto');
  });

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

  describe('trigger ARIA', () => {
    it('puts aria-haspopup and a live aria-expanded on the slotted trigger', async () => {
      const dd = fixture<CyberDropdown>(markup);
      await vi.waitFor(() =>
        expect(triggerOf(dd).getAttribute('aria-haspopup')).toBe('menu'),
      );
      expect(triggerOf(dd).getAttribute('aria-expanded')).toBe('false');

      triggerOf(dd).click();
      await dd.updateComplete;
      expect(triggerOf(dd).getAttribute('aria-expanded')).toBe('true');

      dd.hide();
      await dd.updateComplete;
      expect(triggerOf(dd).getAttribute('aria-expanded')).toBe('false');
    });

    it('moves the attributes to a replacement trigger', async () => {
      const dd = fixture<CyberDropdown>(markup);
      const old = triggerOf(dd);
      await vi.waitFor(() =>
        expect(old.getAttribute('aria-haspopup')).toBe('menu'),
      );

      const replacement = document.createElement('button');
      replacement.slot = 'trigger';
      replacement.textContent = 'More';
      old.replaceWith(replacement);
      await vi.waitFor(() =>
        expect(replacement.getAttribute('aria-haspopup')).toBe('menu'),
      );
      expect(replacement.getAttribute('aria-expanded')).toBe('false');
      expect(old.hasAttribute('aria-haspopup')).toBe(false);
      expect(old.hasAttribute('aria-expanded')).toBe(false);
    });
  });

  describe('focus return', () => {
    it('returns focus to the trigger on Escape', async () => {
      const dd = await opened();
      keydown(itemsOf(dd)[1], 'Escape');
      await dd.updateComplete;
      expect(dd.open).toBe(false);
      expect(document.activeElement).toBe(triggerOf(dd));
    });

    it('returns focus to the trigger on select', async () => {
      const dd = await opened();
      itemsOf(dd)[2].click();
      await dd.updateComplete;
      expect(document.activeElement).toBe(triggerOf(dd));
    });

    it('does not pull focus back on an outside pointerdown', async () => {
      const dd = await opened();
      const outside = fixture<HTMLButtonElement>(`<button>elsewhere</button>`);
      outside.focus();
      outside.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, composed: true }),
      );
      await dd.updateComplete;
      expect(dd.open).toBe(false);
      expect(document.activeElement).toBe(outside);
    });
  });

  describe('typeahead', () => {
    const crew = `
      <cyber-dropdown>
        <button slot="trigger">Crew</button>
        <button role="menuitem">Scan</button>
        <button role="menuitem">Salvage</button>
        <button role="menuitem">Open hatch</button>
        <button role="menuitem">Shields</button>
      </cyber-dropdown>
    `;

    it('jumps to the next item starting with the typed character', async () => {
      const dd = await opened(crew);
      const items = itemsOf(dd);

      expect(keydown(items[0], 'o').defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(items[2]);
    });

    it('cycles through items when the same character repeats', async () => {
      const dd = await opened(crew);
      const items = itemsOf(dd);

      keydown(items[0], 's');
      expect(document.activeElement).toBe(items[1]);
      keydown(items[1], 's');
      expect(document.activeElement).toBe(items[3]);
      keydown(items[3], 's'); // wraps
      expect(document.activeElement).toBe(items[0]);
    });

    it('matches a multi-character prefix and resets after a pause', async () => {
      const dd = await opened(crew);
      const items = itemsOf(dd);

      keydown(items[0], 's');
      keydown(document.activeElement!, 'h');
      expect(document.activeElement).toBe(items[3]);

      await sleep(600); // buffer cleared
      keydown(items[3], 'o');
      expect(document.activeElement).toBe(items[2]);
    });

    it('leaves focus alone on no match and lets a leading space through', async () => {
      const dd = await opened(crew);
      const items = itemsOf(dd);

      expect(keydown(items[0], 'x').defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(items[0]);

      await sleep(600);
      expect(keydown(items[0], ' ').defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(items[0]);
    });

    it('skips aria-disabled items', async () => {
      const dd = await opened(`
        <cyber-dropdown>
          <button slot="trigger">Crew</button>
          <button role="menuitem">Alpha</button>
          <button role="menuitem" aria-disabled="true">Bravo</button>
          <button role="menuitem">Beta</button>
        </cyber-dropdown>
      `);
      const items = itemsOf(dd);
      keydown(items[0], 'b');
      expect(document.activeElement).toBe(items[2]);
    });
  });

  describe('scoped Escape', () => {
    const pair = () => {
      const [a, b] = fixture<HTMLElement>(`
        <div>${markup}${markup}</div>
      `).querySelectorAll<CyberDropdown>('cyber-dropdown');
      return [a, b] as const;
    };

    async function openBoth() {
      const [a, b] = pair();
      await Promise.all([a.updateComplete, b.updateComplete]);
      triggerOf(a).click();
      await a.updateComplete;
      triggerOf(b).click(); // synthetic click: no pointerdown, so `a` stays open
      await vi.waitFor(() =>
        expect(document.activeElement).toBe(itemsOf(b)[0]),
      );
      expect(a.open).toBe(true);
      return [a, b] as const;
    }

    it('closes only the top-most overlay when Escape comes from elsewhere', async () => {
      const [a, b] = await openBoth();
      (document.activeElement as HTMLElement).blur();

      keydown(document.body, 'Escape');
      await b.updateComplete;
      expect([a.open, b.open]).toEqual([true, false]);

      keydown(document.body, 'Escape');
      await a.updateComplete;
      expect(a.open).toBe(false);
    });

    it('closes the overlay the Escape came from, even if it is not on top', async () => {
      const [a, b] = await openBoth();
      keydown(itemsOf(a)[0], 'Escape');
      await a.updateComplete;
      expect([a.open, b.open]).toEqual([false, true]);
    });

    it('closes the overlay holding focus before the top-most one', async () => {
      const [a, b] = await openBoth();
      itemsOf(a)[1].focus();
      keydown(document.body, 'Escape');
      await a.updateComplete;
      expect([a.open, b.open]).toEqual([false, true]);
    });

    it('prevents default but no longer stops propagation', async () => {
      const dd = await opened();
      const seen: KeyboardEvent[] = [];
      const listener = (e: KeyboardEvent) => seen.push(e);
      document.addEventListener('keydown', listener);
      try {
        const event = keydown(itemsOf(dd)[0], 'Escape');
        expect(event.defaultPrevented).toBe(true);
        expect(seen).toEqual([event]);
      } finally {
        document.removeEventListener('keydown', listener);
      }
    });

    it('ignores Escape while closed', async () => {
      const dd = fixture<CyberDropdown>(markup);
      await dd.updateComplete;
      expect(keydown(document.body, 'Escape').defaultPrevented).toBe(false);
    });

    it('leaves Escape to an open <dialog> that does not contain the dropdown', async () => {
      const dd = await opened();
      const dialog = fixture<HTMLDialogElement>(
        `<dialog><button>inside</button></dialog>`,
      );
      dialog.showModal();
      try {
        const event = keydown(dialog.querySelector('button')!, 'Escape');
        await dd.updateComplete;
        expect(dd.open).toBe(true);
        expect(event.defaultPrevented).toBe(false);
      } finally {
        dialog.close();
      }
    });

    it('still closes a dropdown nested inside an open <dialog>', async () => {
      const dialog = fixture<HTMLDialogElement>(`<dialog>${markup}</dialog>`);
      dialog.showModal();
      try {
        const dd = dialog.querySelector('cyber-dropdown')!;
        await dd.updateComplete;
        triggerOf(dd).click();
        await vi.waitFor(() =>
          expect(document.activeElement).toBe(itemsOf(dd)[0]),
        );

        const event = keydown(itemsOf(dd)[0], 'Escape');
        await dd.updateComplete;
        expect(dd.open).toBe(false);
        // prevented, so the surrounding dialog doesn't close as well
        expect(event.defaultPrevented).toBe(true);
      } finally {
        dialog.close();
      }
    });
  });

  describe('positioning', () => {
    it.skipIf(!usesAnchoredPopovers())(
      'renders the menu as a top-layer popover anchored below the trigger',
      async () => {
        const dd = await opened();
        const menu = menuOf(dd);
        expect(menu.getAttribute('popover')).toBe('manual');
        expect(menu.matches(':popover-open')).toBe(true);
        expect(menu.dataset.placement).toBe('bottom-start');
        const trigger = triggerOf(dd).getBoundingClientRect();
        const rect = menu.getBoundingClientRect();
        expect(rect.top).toBeGreaterThanOrEqual(trigger.bottom);
        expect(Math.round(rect.left)).toBe(Math.round(trigger.left));

        dd.hide();
        await dd.updateComplete;
        expect(menu.matches(':popover-open')).toBe(false);
      },
    );

    it.skipIf(!usesAnchoredPopovers())(
      'escapes an overflow: hidden ancestor in the top layer',
      async () => {
        const dd = await opened(
          `<div style="overflow: hidden; height: 20px">${markup}</div>`,
        );
        const rect = menuOf(dd).getBoundingClientRect();
        expect(rect.height).toBeGreaterThan(0);
        // the clipped wrapper is 20px tall; the menu is laid out beyond it
        expect(rect.bottom).toBeGreaterThan(20);
      },
    );

    it('falls back to absolute positioning and flips above when out of room', async () => {
      setAnchoringMode('legacy');
      const dd = await opened(
        `<div style="position: fixed; bottom: 0; left: 0">${markup}</div>`,
      );
      const menu = menuOf(dd);
      expect(menu.hasAttribute('popover')).toBe(false);
      expect(getComputedStyle(menu).position).toBe('absolute');
      expect(menu.dataset.placement).toBe('top-start');
      expect(menu.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        triggerOf(dd).getBoundingClientRect().top,
      );
    });

    it('honors `placement`', async () => {
      setAnchoringMode('legacy');
      const dd = await opened(
        `<div style="position: fixed; top: 200px; left: 0">${markup.replace(
          '<cyber-dropdown>',
          '<cyber-dropdown placement="bottom-end">',
        )}</div>`,
      );
      expect(menuOf(dd).dataset.placement).toBe('bottom-end');
      expect(Math.round(menuOf(dd).getBoundingClientRect().right)).toBe(
        Math.round(triggerOf(dd).getBoundingClientRect().right),
      );
    });
  });

  it('has no axe violations, closed or open', async () => {
    const dd = fixture<CyberDropdown>(markup);
    await vi.waitFor(() =>
      expect(triggerOf(dd).getAttribute('aria-haspopup')).toBe('menu'),
    );
    await expectAccessible(dd);

    triggerOf(dd).click();
    await dd.updateComplete;
    await expectAccessible(dd);
  });
});
