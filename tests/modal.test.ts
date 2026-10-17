import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CyberModal } from '../src/index.js';
import {
  captureEvents,
  cleanupFixtures,
  expectAccessible,
  fixture,
} from './helpers.js';

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
    const modal = fixture<CyberModal>(
      `<cyber-modal open><p>Body</p></cyber-modal>`,
    );
    await modal.updateComplete;
    expect(dialogOf(modal).open).toBe(true);
  });

  it('emits cyber-close and syncs `open` on native close', async () => {
    const modal = fixture<CyberModal>(
      `<cyber-modal open><p>Body</p></cyber-modal>`,
    );
    await modal.updateComplete;
    const closes = captureEvents(modal, 'cyber-close');

    dialogOf(modal).close();
    await vi.waitFor(() => expect(closes).toHaveLength(1));
    expect(modal.open).toBe(false);
  });

  it('closes on the shadow close button', async () => {
    const modal = fixture<CyberModal>(
      `<cyber-modal open><p>Body</p></cyber-modal>`,
    );
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
    const modal = fixture<CyberModal>(
      `<cyber-modal open><p>Body</p></cyber-modal>`,
    );
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
    const footer =
      modal.shadowRoot!.querySelector<HTMLElement>('[part="footer"]')!;
    expect(footer.hidden).toBe(true);

    const action = document.createElement('button');
    action.slot = 'footer';
    action.textContent = 'Engage';
    modal.append(action);
    await vi.waitFor(() => expect(footer.hidden).toBe(false));
  });

  it('emits cyber-open on every open, by any path', async () => {
    const modal = fixture<CyberModal>(`<cyber-modal><p>Body</p></cyber-modal>`);
    await modal.updateComplete;
    const opens = captureEvents(modal, 'cyber-open');

    modal.show();
    await modal.updateComplete;
    expect(opens).toHaveLength(1);

    modal.show(); // already open: nothing new
    await modal.updateComplete;
    expect(opens).toHaveLength(1);

    modal.close();
    await modal.updateComplete;
    modal.setAttribute('open', '');
    await modal.updateComplete;
    expect(opens).toHaveLength(2);
    expect(opens[0].bubbles && opens[0].composed).toBe(true);
  });

  it('emits cyber-open when opened declaratively', async () => {
    const opens = captureEvents(document, 'cyber-open');
    const modal = fixture<CyberModal>(
      `<cyber-modal open><p>Body</p></cyber-modal>`,
    );
    await modal.updateComplete;
    expect(opens).toHaveLength(1);
    expect(opens[0].target).toBe(modal);
  });

  describe('returnValue', () => {
    it('close(value) sets returnValue and reports it in cyber-close', async () => {
      const modal = fixture<CyberModal>(
        `<cyber-modal open><p>Body</p></cyber-modal>`,
      );
      await modal.updateComplete;
      const closes = captureEvents(modal, 'cyber-close');

      modal.close('engage');
      await vi.waitFor(() => expect(closes).toHaveLength(1));
      expect(modal.returnValue).toBe('engage');
      expect(dialogOf(modal).returnValue).toBe('engage');
      expect(closes[0].detail).toEqual({ returnValue: 'engage' });
    });

    it('a slotted <form method="dialog"> closes with the submitter value', async () => {
      const modal = fixture<CyberModal>(`
        <cyber-modal open>
          <p>Hostile fleet detected.</p>
          <form slot="footer" method="dialog">
            <button value="retreat">Retreat</button>
            <button value="engage">Engage</button>
          </form>
        </cyber-modal>
      `);
      await modal.updateComplete;
      const closes = captureEvents(modal, 'cyber-close');

      modal.querySelector<HTMLButtonElement>('button[value="engage"]')!.click();
      await vi.waitFor(() => expect(closes).toHaveLength(1));
      expect(modal.open).toBe(false);
      expect(dialogOf(modal).open).toBe(false);
      expect(modal.returnValue).toBe('engage');
      expect(closes[0].detail).toEqual({ returnValue: 'engage' });
    });

    it('honors formmethod="dialog" on the submitter and ignores ordinary forms', async () => {
      const modal = fixture<CyberModal>(`
        <cyber-modal open>
          <form action="javascript:void 0">
            <button class="plain">Plain</button>
            <button class="dlg" formmethod="dialog" value="ok">OK</button>
          </form>
        </cyber-modal>
      `);
      await modal.updateComplete;
      const closes = captureEvents(modal, 'cyber-close');

      modal.querySelector<HTMLButtonElement>('.plain')!.click();
      await modal.updateComplete;
      expect(modal.open).toBe(true);

      modal.querySelector<HTMLButtonElement>('.dlg')!.click();
      await vi.waitFor(() => expect(closes).toHaveLength(1));
      expect(modal.returnValue).toBe('ok');
    });

    it("resets to '' on reopen, so a plain dismissal reports ''", async () => {
      const modal = fixture<CyberModal>(
        `<cyber-modal open><p>Body</p></cyber-modal>`,
      );
      await modal.updateComplete;
      const closes = captureEvents(modal, 'cyber-close');
      modal.close('engage');
      await vi.waitFor(() => expect(closes).toHaveLength(1));

      modal.show();
      await modal.updateComplete;
      expect(modal.returnValue).toBe('');

      modal
        .shadowRoot!.querySelector<HTMLButtonElement>('[part="close-button"]')!
        .click();
      await vi.waitFor(() => expect(closes).toHaveLength(2));
      expect(closes[1].detail).toEqual({ returnValue: '' });
    });
  });

  it('has no axe violations while open', async () => {
    const modal = fixture<CyberModal>(`
      <cyber-modal open>
        <span slot="title">Incoming Transmission</span>
        <p>Hostile fleet detected on the outer rim.</p>
        <button slot="footer">Engage</button>
      </cyber-modal>
    `);
    await modal.updateComplete;
    await expectAccessible(modal);
  });
});
