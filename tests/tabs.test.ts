import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { CyberTabs, CyberTabPanel } from '../src/index.js';
import {
  captureEvents,
  cleanupFixtures,
  expectAccessible,
  fixture,
  keydown,
} from './helpers.js';

const markup = `
  <cyber-tabs>
    <cyber-tab-panel label="Overview"><p>one</p></cyber-tab-panel>
    <cyber-tab-panel label="Fleet"><p>two</p></cyber-tab-panel>
    <cyber-tab-panel label="Research"><p>three</p></cyber-tab-panel>
  </cyber-tabs>
`;

const buttons = (tabs: CyberTabs) => [
  ...tabs.shadowRoot!.querySelectorAll<HTMLButtonElement>('.cyber-tab'),
];
const panels = (tabs: CyberTabs) => [
  ...tabs.querySelectorAll<CyberTabPanel>('cyber-tab-panel'),
];

const regions = (tabs: CyberTabs) => [
  ...tabs.shadowRoot!.querySelectorAll<HTMLElement>('[role="tabpanel"]'),
];
const focusedTab = (tabs: CyberTabs) => tabs.shadowRoot!.activeElement;

async function mounted(html = markup): Promise<CyberTabs> {
  const tabs = fixture<CyberTabs>(html);
  await vi.waitFor(() => expect(buttons(tabs)).toHaveLength(3));
  return tabs;
}

describe('<cyber-tabs>', () => {
  afterEach(cleanupFixtures);

  it('renders one tab per panel and shows only the selected panel', async () => {
    const tabs = await mounted();
    expect(buttons(tabs).map((b) => b.textContent!.trim())).toEqual([
      'Overview',
      'Fleet',
      'Research',
    ]);
    expect(panels(tabs).map((p) => p.hidden)).toEqual([false, true, true]);
    expect(buttons(tabs)[0].getAttribute('aria-selected')).toBe('true');
  });

  it('switches on click and emits cyber-tab-change', async () => {
    const tabs = await mounted();
    const changes = captureEvents(tabs, 'cyber-tab-change');

    buttons(tabs)[1].click();
    await tabs.updateComplete;
    expect(tabs.selected).toBe(1);
    expect(panels(tabs).map((p) => p.hidden)).toEqual([true, false, true]);
    expect(changes).toHaveLength(1);
    expect(changes[0].detail).toEqual({ index: 1, label: 'Fleet' });

    // re-clicking the active tab emits nothing
    buttons(tabs)[1].click();
    await tabs.updateComplete;
    expect(changes).toHaveLength(1);
  });

  it('syncs panels when `selected` is set programmatically', async () => {
    const tabs = await mounted();
    tabs.selected = 2;
    await tabs.updateComplete;
    expect(panels(tabs).map((p) => p.hidden)).toEqual([true, true, false]);
  });

  it('supports arrow / Home / End keyboard navigation with wrap-around', async () => {
    const tabs = await mounted();

    keydown(buttons(tabs)[0], 'ArrowRight');
    await tabs.updateComplete;
    expect(tabs.selected).toBe(1);

    keydown(buttons(tabs)[1], 'End');
    await tabs.updateComplete;
    expect(tabs.selected).toBe(2);

    keydown(buttons(tabs)[2], 'ArrowRight'); // wraps
    await tabs.updateComplete;
    expect(tabs.selected).toBe(0);

    keydown(buttons(tabs)[0], 'ArrowLeft'); // wraps back
    await tabs.updateComplete;
    expect(tabs.selected).toBe(2);

    keydown(buttons(tabs)[2], 'Home');
    await tabs.updateComplete;
    expect(tabs.selected).toBe(0);
  });

  it('keeps a roving tabindex: only the active tab is focusable', async () => {
    const tabs = await mounted();
    buttons(tabs)[2].click();
    await tabs.updateComplete;
    expect(buttons(tabs).map((b) => b.tabIndex)).toEqual([-1, -1, 0]);
  });

  it('wires tabs and panel regions with generated ids', async () => {
    const tabs = await mounted();
    const root = tabs.shadowRoot!;
    buttons(tabs).forEach((tab, i) => {
      expect(tab.id).not.toBe('');
      const region = root.getElementById(tab.getAttribute('aria-controls')!)!;
      expect(region.getAttribute('role')).toBe('tabpanel');
      expect(region.getAttribute('aria-labelledby')).toBe(tab.id);
      // the light-DOM panel is rendered inside its region
      expect(panels(tabs)[i].assignedSlot?.parentElement).toBe(region);
    });
    expect(regions(tabs).map((r) => r.hidden)).toEqual([false, true, true]);
    // the panel element itself no longer carries the tabpanel role
    expect(panels(tabs)[0].hasAttribute('role')).toBe(false);
  });

  it('generates ids that are unique per instance', async () => {
    const a = await mounted();
    const b = await mounted();
    expect(buttons(a)[0].id).not.toBe(buttons(b)[0].id);
  });

  it('picks up panels added later', async () => {
    const tabs = await mounted();
    const panel = document.createElement('cyber-tab-panel');
    panel.label = 'Diplomacy';
    tabs.append(panel);
    await vi.waitFor(() => expect(buttons(tabs)).toHaveLength(4));
    expect(buttons(tabs)[3].textContent!.trim()).toBe('Diplomacy');
    expect(panel.hidden).toBe(true);
  });

  it('updates the tab text when a panel label changes', async () => {
    const tabs = await mounted();
    panels(tabs)[1].label = 'Armada';
    await vi.waitFor(() =>
      expect(buttons(tabs)[1].textContent!.trim()).toBe('Armada'),
    );
  });

  describe('selected clamping', () => {
    it('clamps an out-of-range initial attribute', async () => {
      const tabs = await mounted(
        markup.replace('<cyber-tabs>', '<cyber-tabs selected="7">'),
      );
      await tabs.updateComplete;
      expect(tabs.selected).toBe(2);
      expect(tabs.getAttribute('selected')).toBe('2');
      expect(panels(tabs).map((p) => p.hidden)).toEqual([true, true, false]);
    });

    it('clamps programmatic values without emitting cyber-tab-change', async () => {
      const tabs = await mounted();
      const changes = captureEvents(tabs, 'cyber-tab-change');

      tabs.selected = 10;
      await tabs.updateComplete;
      expect(tabs.selected).toBe(2);

      tabs.selected = -3;
      await tabs.updateComplete;
      expect(tabs.selected).toBe(0);

      tabs.selected = Number.NaN;
      await tabs.updateComplete;
      expect(tabs.selected).toBe(0);
      expect(changes).toHaveLength(0);
    });

    it('re-clamps when the selected panel is removed', async () => {
      const tabs = await mounted();
      tabs.selected = 2;
      await tabs.updateComplete;
      panels(tabs)[2].remove();
      await vi.waitFor(() => expect(buttons(tabs)).toHaveLength(2));
      expect(tabs.selected).toBe(1);
      expect(panels(tabs)[1].hidden).toBe(false);
    });
  });

  describe('orientation="vertical"', () => {
    const vertical = markup.replace(
      '<cyber-tabs>',
      '<cyber-tabs orientation="vertical">',
    );

    it('marks the tablist vertical and applies the vertical layout', async () => {
      const tabs = await mounted(vertical);
      const list = tabs.shadowRoot!.querySelector('[role="tablist"]')!;
      expect(list.getAttribute('aria-orientation')).toBe('vertical');
      const base = tabs.shadowRoot!.querySelector('[part="base"]')!;
      expect(base.classList.contains('cyber-tabs--vertical')).toBe(true);
      expect(getComputedStyle(list).flexDirection).toBe('column');
    });

    it('navigates with ArrowUp / ArrowDown and ignores ArrowLeft / ArrowRight', async () => {
      const tabs = await mounted(vertical);

      keydown(buttons(tabs)[0], 'ArrowDown');
      await tabs.updateComplete;
      expect(tabs.selected).toBe(1);

      keydown(buttons(tabs)[1], 'ArrowRight');
      await tabs.updateComplete;
      expect(tabs.selected).toBe(1);

      keydown(buttons(tabs)[1], 'ArrowUp');
      await tabs.updateComplete;
      expect(tabs.selected).toBe(0);

      keydown(buttons(tabs)[0], 'ArrowUp'); // wraps
      await tabs.updateComplete;
      expect(tabs.selected).toBe(2);
    });

    it('defaults to a horizontal tablist', async () => {
      const tabs = await mounted();
      const list = tabs.shadowRoot!.querySelector('[role="tablist"]')!;
      expect(list.getAttribute('aria-orientation')).toBe('horizontal');
      keydown(buttons(tabs)[0], 'ArrowDown');
      await tabs.updateComplete;
      expect(tabs.selected).toBe(0);
    });
  });

  describe('activation="manual"', () => {
    const manual = markup.replace(
      '<cyber-tabs>',
      '<cyber-tabs activation="manual">',
    );

    it('moves focus and the roving tabindex with arrows without selecting', async () => {
      const tabs = await mounted(manual);
      const changes = captureEvents(tabs, 'cyber-tab-change');
      buttons(tabs)[0].focus();

      keydown(buttons(tabs)[0], 'ArrowRight');
      await tabs.updateComplete;
      expect(focusedTab(tabs)).toBe(buttons(tabs)[1]);
      expect(buttons(tabs).map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
      expect(tabs.selected).toBe(0);
      expect(panels(tabs).map((p) => p.hidden)).toEqual([false, true, true]);

      keydown(buttons(tabs)[1], 'End');
      await tabs.updateComplete;
      expect(focusedTab(tabs)).toBe(buttons(tabs)[2]);
      expect(tabs.selected).toBe(0);
      expect(changes).toHaveLength(0);
    });

    it('selects the focused tab on Enter / Space', async () => {
      const tabs = await mounted(manual);
      const changes = captureEvents(tabs, 'cyber-tab-change');
      buttons(tabs)[0].focus();
      keydown(buttons(tabs)[0], 'ArrowRight');
      await tabs.updateComplete;

      await userEvent.keyboard('{Enter}');
      await tabs.updateComplete;
      expect(tabs.selected).toBe(1);
      expect(changes[0].detail).toEqual({ index: 1, label: 'Fleet' });

      keydown(buttons(tabs)[1], 'ArrowRight');
      await tabs.updateComplete;
      await userEvent.keyboard(' ');
      await tabs.updateComplete;
      expect(tabs.selected).toBe(2);
    });

    it('resets the roving tabindex to the selected tab when focus leaves', async () => {
      const tabs = await mounted(manual);
      const outside = fixture<HTMLButtonElement>(`<button>outside</button>`);
      buttons(tabs)[0].focus();
      keydown(buttons(tabs)[0], 'ArrowRight');
      await tabs.updateComplete;
      expect(buttons(tabs)[1].tabIndex).toBe(0);

      outside.focus();
      await tabs.updateComplete;
      expect(buttons(tabs).map((b) => b.tabIndex)).toEqual([0, -1, -1]);
    });
  });

  it('has no axe violations, horizontal or vertical', async () => {
    const tabs = await mounted();
    await expectAccessible(tabs);

    tabs.orientation = 'vertical';
    await tabs.updateComplete;
    await expectAccessible(tabs);
  });
});
