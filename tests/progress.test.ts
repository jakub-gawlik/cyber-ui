import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CyberMeter, CyberProgress } from '../src/index.js';
import { cleanupFixtures, expectAccessible, fixture } from './helpers.js';

const trackOf = (el: Element) =>
  el.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!;
const baseOf = (el: Element) =>
  el.shadowRoot!.querySelector<HTMLElement>('[part="base"]')!;
const valueOf = (el: Element) =>
  el.shadowRoot!.querySelector<HTMLElement>('[part="value"]')!;

describe('<cyber-progress>', () => {
  afterEach(cleanupFixtures);

  it('exposes a labelled progressbar with the value as ARIA and as the fill', async () => {
    const el = fixture<CyberProgress>(
      `<cyber-progress label="Hull" value="72"></cyber-progress>`,
    );
    await el.updateComplete;
    const track = trackOf(el);
    expect(track.getAttribute('role')).toBe('progressbar');
    expect(track.getAttribute('aria-valuenow')).toBe('72');
    expect(track.getAttribute('aria-valuemin')).toBe('0');
    expect(track.getAttribute('aria-valuemax')).toBe('100');
    expect(track.getAttribute('aria-labelledby')).toBe('label');
    expect(el.percent).toBe(72);
    expect(baseOf(el).style.getPropertyValue('--cyber-progress')).toBe('72%');
    expect(valueOf(el).textContent).toContain('72%');
  });

  it('scales to `max`, clamps, and updates synchronously with the property', async () => {
    const el = fixture<CyberProgress>(
      `<cyber-progress label="Fuel" value="3" max="4"></cyber-progress>`,
    );
    await el.updateComplete;
    expect(el.percent).toBe(75);
    el.value = 9;
    expect(el.percent).toBe(100);
    await el.updateComplete;
    expect(trackOf(el).getAttribute('aria-valuenow')).toBe('9');
    expect(baseOf(el).style.getPropertyValue('--cyber-progress')).toBe('100%');
  });

  it('drops aria-valuenow and adds the sweeping modifier when indeterminate', async () => {
    const el = fixture<CyberProgress>(
      `<cyber-progress label="Decrypting" indeterminate></cyber-progress>`,
    );
    await el.updateComplete;
    expect(trackOf(el).hasAttribute('aria-valuenow')).toBe(false);
    expect(baseOf(el).classList.contains('cyber-progress--indeterminate')).toBe(
      true,
    );
  });

  it('maps variant / striped / segmented to the skin modifiers', async () => {
    const el = fixture<CyberProgress>(
      `<cyber-progress label="Shields" value="10" variant="danger" striped segmented></cyber-progress>`,
    );
    await el.updateComplete;
    const classes = baseOf(el).classList;
    expect(classes.contains('cyber-progress--danger')).toBe(true);
    expect(classes.contains('cyber-progress--striped')).toBe(true);
    expect(classes.contains('cyber-progress--segmented')).toBe(true);
    el.variant = 'primary';
    await el.updateComplete;
    expect(
      [...baseOf(el).classList].some((c) => /--(primary|danger)$/.test(c)),
    ).toBe(false);
  });

  it('hides the label row without a label and takes a custom readout', async () => {
    const bare = fixture<CyberProgress>(
      `<cyber-progress value="5"></cyber-progress>`,
    );
    await bare.updateComplete;
    expect(
      bare.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!.hidden,
    ).toBe(true);
    expect(trackOf(bare).hasAttribute('aria-labelledby')).toBe(false);

    const custom = fixture<CyberProgress>(`
      <cyber-progress value="3" max="5">
        <span slot="label">Crew</span>
        <span slot="value">3 / 5</span>
      </cyber-progress>
    `);
    await custom.updateComplete;
    const slot = valueOf(custom).querySelector<HTMLSlotElement>('slot')!;
    expect(slot.assignedElements()[0].textContent).toBe('3 / 5');
    await vi.waitFor(() =>
      expect(trackOf(custom).getAttribute('aria-labelledby')).toBe('label'),
    );
  });

  it('has no axe violations', async () => {
    const el = fixture<CyberProgress>(
      `<cyber-progress label="Hull" value="72"></cyber-progress>`,
    );
    await el.updateComplete;
    await expectAccessible(el);
    el.indeterminate = true;
    await el.updateComplete;
    await expectAccessible(el);
  });
});

describe('<cyber-meter>', () => {
  afterEach(cleanupFixtures);

  it('exposes a labelled meter with min / max / now', async () => {
    const el = fixture<CyberMeter>(
      `<cyber-meter label="Shields" value="35" min="10" max="60"></cyber-meter>`,
    );
    await el.updateComplete;
    const track = trackOf(el);
    expect(track.getAttribute('role')).toBe('meter');
    expect(track.getAttribute('aria-valuenow')).toBe('35');
    expect(track.getAttribute('aria-valuemin')).toBe('10');
    expect(track.getAttribute('aria-valuemax')).toBe('60');
    expect(el.percent).toBe(50);
    expect(el.state).toBeUndefined();
    expect(baseOf(el).className).toBe('cyber-progress');
  });

  it('colors by the native-meter regions relative to optimum', async () => {
    const el = fixture<CyberMeter>(
      `<cyber-meter label="Shields" value="80" low="30" high="70" optimum="100"></cyber-meter>`,
    );
    await el.updateComplete;
    expect(el.state).toBe('optimum');
    expect(baseOf(el).classList.contains('cyber-progress--success')).toBe(true);

    el.value = 50; // middle region, next to the optimum's
    await el.updateComplete;
    expect(el.state).toBe('suboptimum');
    expect(baseOf(el).classList.contains('cyber-progress--warning')).toBe(true);

    el.value = 10; // two regions away
    await el.updateComplete;
    expect(el.state).toBe('even-less-good');
    expect(baseOf(el).classList.contains('cyber-progress--danger')).toBe(true);

    // optimum in the middle: both ends are merely suboptimum
    el.optimum = 50;
    await el.updateComplete;
    expect(el.state).toBe('suboptimum');
    el.value = 50;
    await el.updateComplete;
    expect(el.state).toBe('optimum');
  });

  it('has no axe violations', async () => {
    const el = fixture<CyberMeter>(
      `<cyber-meter label="Shields" value="35" low="30" high="70"></cyber-meter>`,
    );
    await el.updateComplete;
    await expectAccessible(el);
  });
});
