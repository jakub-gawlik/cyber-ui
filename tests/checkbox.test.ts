import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { CyberCheckbox } from '../src/index.js';
import {
  captureEvents,
  cleanupFixtures,
  expectAccessible,
  fixture,
  formFixture,
  hasState,
  tabReachesNative,
} from './helpers.js';

const nativeOf = (el: CyberCheckbox) =>
  el.shadowRoot!.querySelector<HTMLInputElement>('input')!;

async function mounted(markup: string) {
  const { form, control } = formFixture<CyberCheckbox>(markup);
  await control.updateComplete;
  return { form, box: control };
}

describe('<cyber-checkbox>', () => {
  afterEach(cleanupFixtures);

  describe('value', () => {
    it('submits value (default "on") only while checked', async () => {
      const { form, box } = await mounted(
        `<cyber-checkbox name="shields">Shields</cyber-checkbox>`,
      );
      expect(box.checked).toBe(false);
      expect(new FormData(form).has('shields')).toBe(false);

      box.checked = true;
      await box.updateComplete;
      expect(new FormData(form).get('shields')).toBe('on');
      expect(nativeOf(box).checked).toBe(true);
      expect(hasState(box, 'checked')).toBe(true);

      box.value = 'raised';
      await box.updateComplete;
      expect(new FormData(form).get('shields')).toBe('raised');
    });

    it('updates form data and validity synchronously, like a native checkbox', async () => {
      const { form, box } = await mounted(
        `<cyber-checkbox name="s" required>Shields</cyber-checkbox>`,
      );
      box.checked = true; // no await
      expect(new FormData(form).get('s')).toBe('on');
      expect(box.validity.valid).toBe(true);
      expect(nativeOf(box).checked).toBe(true);
      expect(hasState(box, 'checked')).toBe(true);
      box.click();
      expect(new FormData(form).has('s')).toBe(false);
      expect(box.validity.valueMissing).toBe(true);
    });

    it('treats the checked attribute as the default', async () => {
      const { box } = await mounted(
        `<cyber-checkbox checked>Shields</cyber-checkbox>`,
      );
      expect(box.checked).toBe(true);
      expect(box.defaultChecked).toBe(true);

      box.checked = false;
      box.removeAttribute('checked'); // only the default changes now
      box.setAttribute('checked', '');
      await box.updateComplete;
      expect(box.checked).toBe(false);
    });

    it('toggles on click and on its label text, firing input and change', async () => {
      const { box } = await mounted(`<cyber-checkbox>Shields</cyber-checkbox>`);
      const inputs = captureEvents(box, 'input');
      const changes = captureEvents(box, 'change');

      await userEvent.click(nativeOf(box));
      expect(box.checked).toBe(true);
      await userEvent.click(box.shadowRoot!.querySelector('[part="label"]')!);
      expect(box.checked).toBe(false);
      expect(inputs).toHaveLength(2);
      expect(changes).toHaveLength(2);
      expect(changes[0].target).toBe(box);
    });

    it('toggles from a <label for> outside and from host.click()', async () => {
      const form = fixture<HTMLFormElement>(`
        <form><label for="cb">External</label><cyber-checkbox id="cb"></cyber-checkbox></form>
      `);
      const box = form.querySelector('cyber-checkbox')!;
      await box.updateComplete;

      await userEvent.click(form.querySelector('label')!);
      expect(box.checked).toBe(true);
      box.click();
      expect(box.checked).toBe(false);
      // and the outside label names the inner checkbox
      expect(nativeOf(box).getAttribute('aria-label')).toBe('External');
    });

    it('clears indeterminate when the user toggles it', async () => {
      const { box } = await mounted(
        `<cyber-checkbox indeterminate>All systems</cyber-checkbox>`,
      );
      expect(nativeOf(box).indeterminate).toBe(true);
      expect(hasState(box, 'indeterminate')).toBe(true);

      await userEvent.click(nativeOf(box));
      expect(box.indeterminate).toBe(false);
      expect(nativeOf(box).indeterminate).toBe(false);
      expect(hasState(box, 'indeterminate')).toBe(false);
      expect(box.checked).toBe(true);
    });

    it('cannot be toggled while disabled, and is left out of the form', async () => {
      const { form, box } = await mounted(
        `<cyber-checkbox name="s" checked disabled>Shields</cyber-checkbox>`,
      );
      box.click();
      expect(box.checked).toBe(true);
      expect(new FormData(form).has('s')).toBe(false);
    });
  });

  describe('validity', () => {
    it('required fails with valueMissing while unchecked', async () => {
      const { form, box } = await mounted(
        `<cyber-checkbox name="terms" required>Accept</cyber-checkbox>`,
      );
      expect(box.validity.valueMissing).toBe(true);
      expect(box.validationMessage).toBe(nativeOf(box).validationMessage);
      expect(form.checkValidity()).toBe(false);

      form.requestSubmit();
      expect(hasState(box, 'user-invalid')).toBe(true);

      await userEvent.click(nativeOf(box));
      expect(box.validity.valid).toBe(true);
      expect(hasState(box, 'user-invalid')).toBe(false);
    });

    it('supports setCustomValidity', async () => {
      const { box } = await mounted(`<cyber-checkbox>Accept</cyber-checkbox>`);
      box.setCustomValidity('Read the terms first');
      expect(box.checkValidity()).toBe(false);
      expect(box.validationMessage).toBe('Read the terms first');
    });
  });

  describe('form reset', () => {
    it('restores the checked attribute', async () => {
      const { form, box } = await mounted(
        `<cyber-checkbox name="s" checked>Shields</cyber-checkbox>`,
      );
      box.checked = false; // clicking is covered by its own tests

      form.reset();
      await box.updateComplete;
      expect(box.checked).toBe(true);
      expect(nativeOf(box).checked).toBe(true);
      expect(new FormData(form).get('s')).toBe('on');
    });

    it('restores state via formStateRestoreCallback', async () => {
      const { box } = await mounted(`<cyber-checkbox>Shields</cyber-checkbox>`);
      box.formStateRestoreCallback('checked');
      await box.updateComplete;
      expect(box.checked).toBe(true);
    });
  });

  describe('keyboard', () => {
    it('toggles with Space', async () => {
      const { box } = await mounted(`<cyber-checkbox>Shields</cyber-checkbox>`);
      box.focus();
      expect(box.shadowRoot!.activeElement).toBe(nativeOf(box));
      await userEvent.keyboard(' ');
      expect(box.checked).toBe(true);
      await userEvent.keyboard(' ');
      expect(box.checked).toBe(false);
    });

    it('is in the Tab order exactly when a native checkbox is', async () => {
      const native = await tabReachesNative('checkbox');
      const form = fixture<HTMLFormElement>(`
        <form><input data-from><cyber-checkbox>Shields</cyber-checkbox></form>
      `);
      const box = form.querySelector('cyber-checkbox')!;
      await box.updateComplete;
      form.querySelector<HTMLInputElement>('[data-from]')!.focus();
      await userEvent.keyboard('{Tab}');
      expect(box.shadowRoot!.activeElement === nativeOf(box)).toBe(native);
    });

    it('is skipped by Tab while disabled', async () => {
      const form = fixture<HTMLFormElement>(`
        <form><input data-a><cyber-checkbox disabled>S</cyber-checkbox><input data-b></form>
      `);
      await form.querySelector('cyber-checkbox')!.updateComplete;
      form.querySelector<HTMLInputElement>('[data-a]')!.focus();
      await userEvent.keyboard('{Tab}');
      expect(document.activeElement).toBe(form.querySelector('[data-b]'));
    });
  });

  it('has no axe violations, unchecked, checked and indeterminate', async () => {
    const { box } = await mounted(
      `<cyber-checkbox required>Shields</cyber-checkbox>`,
    );
    await expectAccessible(box);
    box.checked = true;
    await box.updateComplete;
    await expectAccessible(box);
    box.indeterminate = true;
    await box.updateComplete;
    await vi.waitFor(() => expectAccessible(box));
  });
});
