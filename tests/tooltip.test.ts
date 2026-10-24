import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CyberTooltip } from '../src/index.js';
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
  <cyber-tooltip content="Jump drive offline" delay="0">
    <button>Jump</button>
  </cyber-tooltip>
`;

const bubbleOf = (tt: CyberTooltip) =>
  tt.shadowRoot!.querySelector<HTMLElement>('[part="bubble"]')!;
const triggerOf = (tt: CyberTooltip) => tt.querySelector('button')!;
const pointer = (target: EventTarget, type: string) =>
  target.dispatchEvent(new PointerEvent(type, { bubbles: false }));

describe('<cyber-tooltip>', () => {
  afterEach(() => {
    cleanupFixtures();
    setAnchoringMode('auto');
  });

  it('shows on focus and hides on blur, emitting cyber-open / cyber-close', async () => {
    const tt = fixture<CyberTooltip>(markup);
    await tt.updateComplete;
    const opens = captureEvents(tt, 'cyber-open');
    const closes = captureEvents(tt, 'cyber-close');
    expect(bubbleOf(tt).hidden).toBe(true);

    triggerOf(tt).focus();
    await tt.updateComplete;
    expect(tt.open).toBe(true);
    expect(bubbleOf(tt).hidden).toBe(false);
    expect(bubbleOf(tt).textContent).toContain('Jump drive offline');
    expect(opens).toHaveLength(1);

    triggerOf(tt).blur();
    await tt.updateComplete;
    expect(tt.open).toBe(false);
    expect(closes).toHaveLength(1);
  });

  it('shows on pointerenter and hides on pointerleave', async () => {
    const tt = fixture<CyberTooltip>(markup);
    await tt.updateComplete;
    pointer(tt, 'pointerenter');
    await tt.updateComplete;
    expect(tt.open).toBe(true);
    pointer(tt, 'pointerleave');
    await tt.updateComplete;
    expect(tt.open).toBe(false);
  });

  it('waits `delay` ms before showing, and cancels when the pointer leaves', async () => {
    const tt = fixture<CyberTooltip>(
      `<cyber-tooltip content="Later" delay="80"><button>Go</button></cyber-tooltip>`,
    );
    await tt.updateComplete;
    pointer(tt, 'pointerenter');
    await sleep(20);
    expect(tt.open).toBe(false);
    pointer(tt, 'pointerleave');
    await sleep(120);
    expect(tt.open).toBe(false);

    pointer(tt, 'pointerenter');
    await vi.waitFor(() => expect(tt.open).toBe(true));
  });

  it('honors the trigger list', async () => {
    const tt = fixture<CyberTooltip>(
      `<cyber-tooltip content="Manual" trigger="manual" delay="0"><button>Go</button></cyber-tooltip>`,
    );
    await tt.updateComplete;
    pointer(tt, 'pointerenter');
    triggerOf(tt).focus();
    await tt.updateComplete;
    expect(tt.open).toBe(false);

    tt.show();
    await tt.updateComplete;
    expect(bubbleOf(tt).hidden).toBe(false);
    tt.hide();
    await tt.updateComplete;
    expect(bubbleOf(tt).hidden).toBe(true);

    const focusOnly = fixture<CyberTooltip>(
      `<cyber-tooltip content="Focus" trigger="focus" delay="0"><button>Go</button></cyber-tooltip>`,
    );
    await focusOnly.updateComplete;
    pointer(focusOnly, 'pointerenter');
    await focusOnly.updateComplete;
    expect(focusOnly.open).toBe(false);
    triggerOf(focusOnly).focus();
    await focusOnly.updateComplete;
    expect(focusOnly.open).toBe(true);
  });

  it('hides on Escape and on a pointerdown outside', async () => {
    const tt = fixture<CyberTooltip>(markup);
    await tt.updateComplete;
    tt.show();
    await tt.updateComplete;

    expect(keydown(triggerOf(tt), 'Escape').defaultPrevented).toBe(true);
    await tt.updateComplete;
    expect(tt.open).toBe(false);

    tt.show();
    await tt.updateComplete;
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true }),
    );
    await tt.updateComplete;
    expect(tt.open).toBe(false);
  });

  it('prefers slotted content over the attribute', async () => {
    const tt = fixture<CyberTooltip>(`
      <cyber-tooltip content="plain" delay="0">
        <button>Go</button>
        <span slot="content"><b>Rich</b> text</span>
      </cyber-tooltip>
    `);
    await tt.updateComplete;
    tt.show();
    await tt.updateComplete;
    const slot = bubbleOf(tt).querySelector<HTMLSlotElement>(
      'slot[name="content"]',
    )!;
    expect(slot.assignedElements()).toHaveLength(1);
    expect(slot.assignedElements()[0].textContent).toBe('Rich text');
  });

  describe('positioning', () => {
    it.skipIf(!usesAnchoredPopovers())(
      'renders the bubble as a top-layer popover anchored by CSS',
      async () => {
        const tt = fixture<HTMLElement>(
          `<div style="position: fixed; top: 200px; left: 200px">${markup}</div>`,
        ).querySelector<CyberTooltip>('cyber-tooltip')!;
        await tt.updateComplete;
        tt.show();
        await tt.updateComplete;
        const bubble = bubbleOf(tt);
        expect(bubble.getAttribute('popover')).toBe('manual');
        expect(bubble.matches(':popover-open')).toBe(true);
        expect(bubble.dataset.placement).toBe('top');
        expect(
          getComputedStyle(bubble).getPropertyValue('position-anchor'),
        ).toBe('--cyber-anchor');

        // above the trigger
        const anchor = triggerOf(tt).getBoundingClientRect();
        expect(bubble.getBoundingClientRect().bottom).toBeLessThanOrEqual(
          anchor.top,
        );

        tt.hide();
        await tt.updateComplete;
        expect(bubble.matches(':popover-open')).toBe(false);
      },
    );

    it.skipIf(!usesAnchoredPopovers())(
      'flips below by CSS when there is no room above',
      async () => {
        const tt = fixture<HTMLElement>(
          `<div style="position: fixed; top: 0; left: 200px">${markup}</div>`,
        ).querySelector<CyberTooltip>('cyber-tooltip')!;
        await tt.updateComplete;
        tt.show();
        await tt.updateComplete;
        expect(bubbleOf(tt).getBoundingClientRect().top).toBeGreaterThanOrEqual(
          triggerOf(tt).getBoundingClientRect().bottom,
        );
      },
    );

    it('falls back to absolute positioning and flips when out of room', async () => {
      setAnchoringMode('legacy');
      const tt = fixture<CyberTooltip>(
        `<div style="position: fixed; top: 0; left: 0">${markup}</div>`,
      ).querySelector<CyberTooltip>('cyber-tooltip')!;
      await tt.updateComplete;
      tt.show();
      await tt.updateComplete;
      const bubble = bubbleOf(tt);
      expect(bubble.hasAttribute('popover')).toBe(false);
      expect(getComputedStyle(bubble).position).toBe('absolute');
      // no room above the trigger at the top of the viewport → below
      expect(bubble.dataset.placement).toBe('bottom');
      expect(bubble.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        triggerOf(tt).getBoundingClientRect().bottom,
      );
    });

    it('keeps the requested placement when there is room', async () => {
      setAnchoringMode('legacy');
      const tt = fixture<CyberTooltip>(
        `<div style="position: fixed; top: 200px; left: 200px">
          <cyber-tooltip content="Side" placement="right" delay="0"><button>Go</button></cyber-tooltip>
        </div>`,
      ).querySelector<CyberTooltip>('cyber-tooltip')!;
      await tt.updateComplete;
      tt.show();
      await tt.updateComplete;
      expect(bubbleOf(tt).dataset.placement).toBe('right');
      expect(bubbleOf(tt).getBoundingClientRect().left).toBeGreaterThanOrEqual(
        triggerOf(tt).getBoundingClientRect().right,
      );
    });
  });

  it('is a role="tooltip" live region with no axe violations', async () => {
    const tt = fixture<CyberTooltip>(markup);
    await tt.updateComplete;
    expect(bubbleOf(tt).getAttribute('role')).toBe('tooltip');
    expect(bubbleOf(tt).getAttribute('aria-live')).toBe('polite');
    await expectAccessible(tt);
    tt.show();
    await tt.updateComplete;
    await expectAccessible(tt);
  });
});
