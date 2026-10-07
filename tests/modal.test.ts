import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CyberModal } from '../src/index.js';
import { captureEvents, cleanupFixtures, fixture } from './helpers.js';

const dialogOf = (modal: CyberModal) =>
  modal.shadowRoot!.querySelector('dialog') as HTMLDialogElement;

describe('<cyber-modal>', () => {
  afterEach(cleanupFixtures);

  it('opens the native dialog via show() and the open property', async () => {
    const modal = fixture<CyberModal>(`<cyber-modal><p>Body</p></cyber-modal>`);
    await modal.updateComplete;
    expect(dialogOf(modal).open).toBe(false);

    modal.show();
    await modal.updateComplete;
    expect(dialogOf(modal).open).toBe(true);

    modal.close();
    await modal.updateComplete;
    expect(dialogOf(modal).open).toBe(false);
  });

  it('opens declaratively with the open attribute', async () => {
    const modal = fixture<CyberModal>(`<cyber-modal open><p>Body</p></cyber-modal>`);
    await modal.updateComplete;
    expect(dialogOf(modal).open).toBe(true);
  });

  it('emits cyber-close and syncs `open` on native close', async () => {
    const modal = fixture<CyberModal>(`<cyber-modal open><p>Body</p></cyber-modal>`);
    await modal.updateComplete;
    const closes = captureEvents(modal, 'cyber-close');

    dialogOf(modal).close();
    await vi.waitFor(() => expect(closes).toHaveLength(1));
    expect(modal.open).toBe(false);
  });

  it('closes on the shadow close button', async () => {
    const modal = fixture<CyberModal>(`<cyber-modal open><p>Body</p></cyber-modal>`);
    await modal.updateComplete;
    const closes = captureEvents(modal, 'cyber-close');

    const button = modal.shadowRoot!.querySelector<HTMLButtonElement>(
      '[part="close-button"]',
    )!;
    button.click();
    await vi.waitFor(() => expect(closes).toHaveLength(1));
    expect(dialogOf(modal).open).toBe(false);
  });

  it('light-dismisses on a backdrop click unless no-light-dismiss is set', async () => {
    const modal = fixture<CyberModal>(`<cyber-modal open><p>Body</p></cyber-modal>`);
    await modal.updateComplete;
    const closes = captureEvents(modal, 'cyber-close');
    // a click whose target is the <dialog> itself means the backdrop was hit
    dialogOf(modal).dispatchEvent(new MouseEvent('click'));
    await modal.updateComplete;
    expect(modal.open).toBe(false);
    await vi.waitFor(() => expect(closes).toHaveLength(1));

    const stubborn = fixture<CyberModal>(
      `<cyber-modal open no-light-dismiss><p>Body</p></cyber-modal>`,
    );
    await stubborn.updateComplete;
    dialogOf(stubborn).dispatchEvent(new MouseEvent('click'));
    await stubborn.updateComplete;
    expect(stubborn.open).toBe(true);
  });

  it('hides the footer until footer content is slotted', async () => {
    const modal = fixture<CyberModal>(`<cyber-modal><p>Body</p></cyber-modal>`);
    await modal.updateComplete;
    const footer = modal.shadowRoot!.querySelector<HTMLElement>('[part="footer"]')!;
    expect(footer.hidden).toBe(true);

    const action = document.createElement('button');
    action.slot = 'footer';
    action.textContent = 'Engage';
    modal.append(action);
    await vi.waitFor(() => expect(footer.hidden).toBe(false));
  });
});
