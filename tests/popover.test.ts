import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CyberPopover } from '../src/index.js';
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
} from './helpers.js';

const markup = `
  <cyber-popover label="Filters">
    <button slot="trigger">Filters</button>
    <span slot="title">Filters</span>
    <label><input type="checkbox"> Hostile only</label>
    <button class="apply">Apply</button>
  </cyber-popover>
`;

const panelOf = (po: CyberPopover) =>
  po.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!;
const triggerOf = (po: CyberPopover) =>
  po.querySelector<HTMLButtonElement>('[slot="trigger"]')!;

async function opened(html = markup): Promise<CyberPopover> {
  const po = fixture<CyberPopover>(html);
  await po.updateComplete;
  triggerOf(po).click();
  await vi.waitFor(() =>
    expect(po.shadowRoot!.activeElement).toBe(panelOf(po)),
  );
  return po;
}

describe('<cyber-popover>', () => {
  afterEach(() => {
    cleanupFixtures();
    setAnchoringMode('auto');
  });

  it('toggles from the trigger, emits cyber-open / cyber-close, and focuses the panel', async () => {
    const po = fixture<CyberPopover>(markup);
    await po.updateComplete;
    const opens = captureEvents(po, 'cyber-open');
    const closes = captureEvents(po, 'cyber-close');
    expect(panelOf(po).hidden).toBe(true);

    triggerOf(po).click();
    await po.updateComplete;
    expect(po.open).toBe(true);
    expect(panelOf(po).hidden).toBe(false);
    expect(opens).toHaveLength(1);
    await vi.waitFor(() =>
      expect(po.shadowRoot!.activeElement).toBe(panelOf(po)),
    );

    triggerOf(po).click();
    await po.updateComplete;
    expect(po.open).toBe(false);
    expect(closes).toHaveLength(1);
  });

  it('puts aria-haspopup="dialog" and a live aria-expanded on the trigger', async () => {
    const po = fixture<CyberPopover>(markup);
    await vi.waitFor(() =>
      expect(triggerOf(po).getAttribute('aria-haspopup')).toBe('dialog'),
    );
    expect(triggerOf(po).getAttribute('aria-expanded')).toBe('false');
    po.show();
    await po.updateComplete;
    expect(triggerOf(po).getAttribute('aria-expanded')).toBe('true');
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const po = await opened();
    const event = keydown(po.querySelector('.apply')!, 'Escape');
    await po.updateComplete;
    expect(event.defaultPrevented).toBe(true);
    expect(po.open).toBe(false);
    expect(document.activeElement).toBe(triggerOf(po));
  });

  it('closes on a pointerdown outside without pulling focus back', async () => {
    const po = await opened();
    const outside = fixture<HTMLButtonElement>(`<button>elsewhere</button>`);
    outside.focus();
    outside.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true }),
    );
    await po.updateComplete;
    expect(po.open).toBe(false);
    expect(document.activeElement).toBe(outside);
  });

  it('closes when focus leaves it, but not when focus moves inside or nowhere', async () => {
    const po = await opened();
    po.querySelector<HTMLButtonElement>('.apply')!.focus();
    await po.updateComplete;
    expect(po.open).toBe(true);

    // a click on non-focusable content blurs to nothing
    panelOf(po).dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        composed: true,
        relatedTarget: null,
      }),
    );
    await po.updateComplete;
    expect(po.open).toBe(true);

    const outside = fixture<HTMLButtonElement>(`<button>elsewhere</button>`);
    outside.focus();
    await po.updateComplete;
    expect(po.open).toBe(false);
  });

  it('names the dialog from `label`, else from the title slot, and collapses an empty title', async () => {
    const po = fixture<CyberPopover>(markup);
    await po.updateComplete;
    expect(panelOf(po).getAttribute('role')).toBe('dialog');
    expect(panelOf(po).getAttribute('aria-label')).toBe('Filters');
    await vi.waitFor(() =>
      expect(
        po.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!.hidden,
      ).toBe(false),
    );

    const titled = fixture<CyberPopover>(`
      <cyber-popover>
        <button slot="trigger">More</button>
        <span slot="title">Details</span>
        <p>Body</p>
      </cyber-popover>
    `);
    await titled.updateComplete;
    await vi.waitFor(() =>
      expect(panelOf(titled).getAttribute('aria-labelledby')).toBe('title'),
    );

    const bare = fixture<CyberPopover>(`
      <cyber-popover>
        <button slot="trigger">More</button>
        <p>Body</p>
      </cyber-popover>
    `);
    await bare.updateComplete;
    expect(
      bare.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!.hidden,
    ).toBe(true);
  });

  describe('positioning', () => {
    it.skipIf(!usesAnchoredPopovers())(
      'renders the panel as a top-layer popover below the trigger',
      async () => {
        const po = await opened();
        const panel = panelOf(po);
        expect(panel.getAttribute('popover')).toBe('manual');
        expect(panel.matches(':popover-open')).toBe(true);
        expect(panel.dataset.placement).toBe('bottom');
        expect(panel.getBoundingClientRect().top).toBeGreaterThanOrEqual(
          triggerOf(po).getBoundingClientRect().bottom,
        );
      },
    );

    it('falls back to absolute positioning and flips above when out of room', async () => {
      setAnchoringMode('legacy');
      const po = fixture<HTMLElement>(
        `<div style="position: fixed; bottom: 0; left: 0">${markup}</div>`,
      ).querySelector<CyberPopover>('cyber-popover')!;
      await po.updateComplete;
      po.show();
      await po.updateComplete;
      const panel = panelOf(po);
      expect(panel.hasAttribute('popover')).toBe(false);
      expect(getComputedStyle(panel).position).toBe('absolute');
      expect(panel.dataset.placement).toBe('top');
      expect(panel.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        triggerOf(po).getBoundingClientRect().top,
      );
    });
  });

  it('has no axe violations, closed or open', async () => {
    const po = fixture<CyberPopover>(markup);
    await vi.waitFor(() =>
      expect(triggerOf(po).getAttribute('aria-haspopup')).toBe('dialog'),
    );
    await expectAccessible(po);
    po.show();
    await po.updateComplete;
    await expectAccessible(po);
  });
});
