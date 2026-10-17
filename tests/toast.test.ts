import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast, type CyberToaster } from '../src/index.js';
import { captureEvents, expectAccessible, sleep } from './helpers.js';

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

  it('announces danger / warning with role="alert", info / success with role="status"', async () => {
    toast('a', { variant: 'danger' });
    toast('b', { variant: 'warning' });
    toast('c', { variant: 'info' });
    toast('d', { variant: 'success' });
    toast('e');
    await vi.waitFor(() => expect(rendered()).toHaveLength(5));
    expect(rendered().map((el) => el.getAttribute('role'))).toEqual([
      'alert',
      'alert',
      'status',
      'status',
      'status',
    ]);
  });

  it('renders an action button that runs onClick and dismisses the toast', async () => {
    const onClick = vi.fn();
    const id = toast('Cargo jettisoned', {
      duration: 0,
      action: { label: 'Undo', onClick },
    });
    await vi.waitFor(() => expect(rendered()).toHaveLength(1));
    const dismissals = captureEvents(toasterEl()!, 'cyber-toast-dismiss');

    const action = rendered()[0].querySelector<HTMLButtonElement>('.cyber-toast__action')!;
    expect(action.textContent!.trim()).toBe('Undo');
    action.click();
    expect(onClick).toHaveBeenCalledWith(id);
    expect(dismissals.map((e) => e.detail)).toEqual([{ id, reason: 'action' }]);
    await vi.waitFor(() => expect(rendered()).toHaveLength(0));
  });

  it('renders no action button by default', async () => {
    toast('plain', { duration: 0 });
    await vi.waitFor(() => expect(rendered()).toHaveLength(1));
    expect(rendered()[0].querySelector('.cyber-toast__action')).toBeNull();
  });

  describe('cyber-toast-dismiss', () => {
    async function withToaster() {
      const toaster = document.createElement('cyber-toaster');
      document.body.append(toaster);
      return { toaster, dismissals: captureEvents(document, 'cyber-toast-dismiss') };
    }

    it('reports reason "close" from the close button, once', async () => {
      const { dismissals } = await withToaster();
      const id = toast('closable', { duration: 0 });
      await vi.waitFor(() => expect(rendered()).toHaveLength(1));
      const close = rendered()[0].querySelector<HTMLButtonElement>('.cyber-toast__close')!;
      close.click();
      close.click(); // already leaving: no second event
      expect(dismissals.map((e) => e.detail)).toEqual([{ id, reason: 'close' }]);
    });

    it('reports reason "api" from dismiss(id) and "timeout" from the timer', async () => {
      const { toaster, dismissals } = await withToaster();
      const manual = toast('manual', { duration: 0 });
      const timed = toast('timed', { duration: 50 });
      toaster.dismiss(manual);
      await vi.waitFor(() => expect(dismissals).toHaveLength(2), { timeout: 2000 });
      expect(dismissals.map((e) => e.detail)).toEqual([
        { id: manual, reason: 'api' },
        { id: timed, reason: 'timeout' },
      ]);
      // bubbles + composed, like every cyber-* event
      expect(dismissals[0].bubbles && dismissals[0].composed).toBe(true);
    });
  });

  it('has no axe violations', async () => {
    toast('Jump complete', { duration: 0 });
    toast('Hull breach', {
      title: 'Alert',
      variant: 'danger',
      duration: 0,
      action: { label: 'Seal' },
    });
    await vi.waitFor(() => expect(rendered()).toHaveLength(2));
    await expectAccessible(toasterEl()!);
  });
});
