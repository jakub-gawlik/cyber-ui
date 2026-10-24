import { afterEach, describe, expect, it } from 'vitest';
import type { CyberSkeleton, CyberSpinner } from '../src/index.js';
import { cleanupFixtures, expectAccessible, fixture } from './helpers.js';

describe('<cyber-spinner>', () => {
  afterEach(cleanupFixtures);

  it('is a named status region with the variant on the skin', async () => {
    const el = fixture<CyberSpinner>(
      `<cyber-spinner label="Decrypting" variant="accent">Decrypting</cyber-spinner>`,
    );
    await el.updateComplete;
    const base = el.shadowRoot!.querySelector<HTMLElement>('[part="base"]')!;
    expect(base.getAttribute('role')).toBe('status');
    expect(base.getAttribute('aria-label')).toBe('Decrypting');
    expect(base.classList.contains('cyber-spinner--accent')).toBe(true);
    expect(el.shadowRoot!.querySelector('[part="ring"]')).not.toBeNull();
    await expectAccessible(el);
  });

  it('defaults to "Loading" and the primary color', async () => {
    const el = fixture<CyberSpinner>(`<cyber-spinner></cyber-spinner>`);
    await el.updateComplete;
    const base = el.shadowRoot!.querySelector<HTMLElement>('[part="base"]')!;
    expect(base.getAttribute('aria-label')).toBe('Loading');
    expect(base.className).toBe('cyber-spinner');
    await expectAccessible(el);
  });
});

describe('<cyber-skeleton>', () => {
  afterEach(cleanupFixtures);

  it('renders a hidden-from-AT block with the shape modifier', async () => {
    const el = fixture<CyberSkeleton>(
      `<cyber-skeleton shape="circle"></cyber-skeleton>`,
    );
    await el.updateComplete;
    const base = el.shadowRoot!.querySelector<HTMLElement>('[part="base"]')!;
    expect(base.getAttribute('aria-hidden')).toBe('true');
    expect(base.classList.contains('cyber-skeleton--circle')).toBe(true);
    el.shape = 'rect';
    await el.updateComplete;
    expect(base.className).toBe('cyber-skeleton');
    await expectAccessible(el);
  });
});
