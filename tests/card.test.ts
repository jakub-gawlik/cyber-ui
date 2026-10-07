import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CyberCard } from '../src/index.js';
import { cleanupFixtures, fixture } from './helpers.js';

const section = (card: CyberCard, part: string) =>
  card.shadowRoot!.querySelector(`[part="${part}"]`) as HTMLElement;

describe('<cyber-card>', () => {
  afterEach(cleanupFixtures);

  it('shows media, title and footer sections when slotted', async () => {
    const card = fixture<CyberCard>(`
      <cyber-card>
        <img slot="media" alt="" />
        <span slot="title">Signal Lost</span>
        <p>Body copy</p>
        <a slot="footer" href="#">Details</a>
      </cyber-card>
    `);
    await vi.waitFor(() => {
      expect(section(card, 'media').hidden).toBe(false);
      expect(section(card, 'title').hidden).toBe(false);
      expect(section(card, 'footer').hidden).toBe(false);
    });
  });

  it('collapses sections whose slots are empty', async () => {
    const card = fixture<CyberCard>(`<cyber-card><p>Body only</p></cyber-card>`);
    await card.updateComplete;
    expect(section(card, 'media').hidden).toBe(true);
    expect(section(card, 'title').hidden).toBe(true);
    expect(section(card, 'footer').hidden).toBe(true);
  });

  it('reveals a section when content is slotted in later', async () => {
    const card = fixture<CyberCard>(`<cyber-card><p>Body</p></cyber-card>`);
    await card.updateComplete;
    expect(section(card, 'footer').hidden).toBe(true);

    const link = document.createElement('a');
    link.slot = 'footer';
    link.textContent = 'Details';
    card.append(link);
    await vi.waitFor(() => expect(section(card, 'footer').hidden).toBe(false));
  });
});
