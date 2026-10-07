import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast, type CyberToaster } from '../src/index.js';
import { sleep } from './helpers.js';

const toasterEl = () => document.querySelector<CyberToaster>('cyber-toaster');
const rendered = () =>
  [...(toasterEl()?.shadowRoot!.querySelectorAll('.cyber-toast') ?? [])];

describe('toast() / <cyber-toaster>', () => {
  afterEach(() => toasterEl()?.remove());

  it('creates a toaster in <body> on first use and renders the message', async () => {
    expect(toasterEl()).toBeNull();
    toast('Jump complete');
    expect(toasterEl()).not.toBeNull();
    await vi.waitFor(() => {
      expect(rendered()).toHaveLength(1);
      expect(rendered()[0].textContent).toContain('Jump complete');
    });
  });

  it('reuses an existing toaster instead of creating a second one', async () => {
    const own = document.createElement('cyber-toaster');
    document.body.append(own);
    toast('one');
    toast('two');
    expect(document.querySelectorAll('cyber-toaster')).toHaveLength(1);
    await vi.waitFor(() => expect(rendered()).toHaveLength(2));
  });

  it('applies the variant class and renders the title', async () => {
    toast('Hull integrity critical', { title: 'Alert', variant: 'danger' });
    await vi.waitFor(() => {
      const [el] = rendered();
      expect(el.classList.contains('cyber-toast--danger')).toBe(true);
      expect(el.textContent).toContain('Alert');
    });
  });

  it('auto-dismisses after `duration`, but keeps duration 0 toasts', async () => {
    toast('ephemeral', { duration: 60 });
    toast('sticky', { duration: 0 });
    await vi.waitFor(() => expect(rendered()).toHaveLength(2));

    // 60 ms timer + 200 ms leave animation
    await vi.waitFor(() => expect(rendered()).toHaveLength(1), { timeout: 2000 });
    expect(rendered()[0].textContent).toContain('sticky');

    await sleep(300); // a sticky toast survives well past any timer
    expect(rendered()).toHaveLength(1);
  });

  it('dismisses from the close button', async () => {
    toast('closable', { duration: 0 });
    await vi.waitFor(() => expect(rendered()).toHaveLength(1));

    rendered()[0]
      .querySelector<HTMLButtonElement>('.cyber-toast__close')!
      .click();
    await vi.waitFor(() => expect(rendered()).toHaveLength(0));
  });

  it('dismiss(id) removes the matching toast', async () => {
    const id = toast('first', { duration: 0 });
    toast('second', { duration: 0 });
    await vi.waitFor(() => expect(rendered()).toHaveLength(2));

    toasterEl()!.dismiss(id);
    await vi.waitFor(() => {
      expect(rendered()).toHaveLength(1);
      expect(rendered()[0].textContent).toContain('second');
    });
  });

  it('pauses the auto-dismiss countdown while hovered', async () => {
    toast('hover me', { duration: 120 });
    await vi.waitFor(() => expect(rendered()).toHaveLength(1));

    rendered()[0].dispatchEvent(new MouseEvent('mouseenter'));
    await sleep(400); // far past the original 120 ms timer
    expect(rendered()).toHaveLength(1);

    rendered()[0].dispatchEvent(new MouseEvent('mouseleave'));
    await vi.waitFor(() => expect(rendered()).toHaveLength(0), { timeout: 2000 });
  });
});
