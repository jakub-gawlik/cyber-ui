import { afterEach, describe, expect, it } from 'vitest';
import type { CyberAccordion, CyberAccordionItem } from '../src/index.js';
import { captureEvents, cleanupFixtures, fixture } from './helpers.js';

const itemsOf = (acc: CyberAccordion) =>
  [...acc.querySelectorAll<CyberAccordionItem>('cyber-accordion-item')];
const triggerOf = (item: CyberAccordionItem) =>
  item.shadowRoot!.querySelector<HTMLButtonElement>('[part="trigger"]')!;

describe('<cyber-accordion>', () => {
  afterEach(cleanupFixtures);

  it('toggles an item from its trigger and emits cyber-toggle', async () => {
    const acc = fixture<CyberAccordion>(`
      <cyber-accordion>
        <cyber-accordion-item heading="Propulsion"><p>FTL</p></cyber-accordion-item>
      </cyber-accordion>
    `);
    const [item] = itemsOf(acc);
    await item.updateComplete;
    const toggles = captureEvents(acc, 'cyber-toggle');

    triggerOf(item).click();
    await item.updateComplete;
    expect(item.open).toBe(true);
    expect(toggles[0].detail).toEqual({ open: true });
    expect(triggerOf(item).getAttribute('aria-expanded')).toBe('true');

    triggerOf(item).click();
    await item.updateComplete;
    expect(item.open).toBe(false);
    expect(toggles[1].detail).toEqual({ open: false });
  });

  it('allows several items open at once by default', async () => {
    const acc = fixture<CyberAccordion>(`
      <cyber-accordion>
        <cyber-accordion-item heading="A" open><p>a</p></cyber-accordion-item>
        <cyber-accordion-item heading="B"><p>b</p></cyber-accordion-item>
      </cyber-accordion>
    `);
    const [a, b] = itemsOf(acc);
    await b.updateComplete;

    triggerOf(b).click();
    await b.updateComplete;
    expect(a.open).toBe(true);
    expect(b.open).toBe(true);
  });

  it('closes the other items in single mode', async () => {
    const acc = fixture<CyberAccordion>(`
      <cyber-accordion single>
        <cyber-accordion-item heading="A" open><p>a</p></cyber-accordion-item>
        <cyber-accordion-item heading="B"><p>b</p></cyber-accordion-item>
        <cyber-accordion-item heading="C"><p>c</p></cyber-accordion-item>
      </cyber-accordion>
    `);
    const [a, b, c] = itemsOf(acc);
    await b.updateComplete;

    triggerOf(b).click();
    await b.updateComplete;
    expect([a.open, b.open, c.open]).toEqual([false, true, false]);

    // closing the open item in single mode leaves everything closed
    triggerOf(b).click();
    await b.updateComplete;
    expect([a.open, b.open, c.open]).toEqual([false, false, false]);
  });
});
