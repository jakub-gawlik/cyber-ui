import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CyberTabs, CyberTabPanel } from '../src/index.js';
import { captureEvents, cleanupFixtures, fixture, keydown } from './helpers.js';

const markup = `
  <cyber-tabs>
    <cyber-tab-panel label="Overview"><p>one</p></cyber-tab-panel>
    <cyber-tab-panel label="Fleet"><p>two</p></cyber-tab-panel>
    <cyber-tab-panel label="Research"><p>three</p></cyber-tab-panel>
  </cyber-tabs>
`;

const buttons = (tabs: CyberTabs) =>
  [...tabs.shadowRoot!.querySelectorAll<HTMLButtonElement>('.cyber-tab')];
const panels = (tabs: CyberTabs) =>
  [...tabs.querySelectorAll<CyberTabPanel>('cyber-tab-panel')];

async function mounted(): Promise<CyberTabs> {
  const tabs = fixture<CyberTabs>(markup);
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
});
