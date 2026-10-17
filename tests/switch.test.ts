import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { CyberSwitch } from '../src/index.js';
import {
  captureEvents,
  cleanupFixtures,
  expectAccessible,
  fixture,
  formFixture,
  hasState,
} from './helpers.js';

const nativeOf = (el: CyberSwitch) =>
  el.shadowRoot!.querySelector<HTMLInputElement>('input')!;

async function mounted(markup: string) {
  const { form, control } = formFixture<CyberSwitch>(markup);
  await control.updateComplete;
  return { form, sw: control };
}

describe('<cyber-switch>', () => {
  afterEach(cleanupFixtures);

  it('renders a native checkbox with role="switch"', async () => {
    const { sw } = await mounted(`<cyber-switch>Cloak</cyber-switch>`);
    expect(nativeOf(sw).type).toBe('checkbox');
    expect(nativeOf(sw).getAttribute('role')).toBe('switch');
  });

  describe('value', () => {
    it('submits value only while on and exposes :state(checked)', async () => {
      const { form, sw } = await mounted(
        `<cyber-switch name="cloak" value="engaged">Cloak</cyber-switch>`,
      );
      expect(new FormData(form).has('cloak')).toBe(false);
      expect(hasState(sw, 'checked')).toBe(false);

      await userEvent.click(nativeOf(sw));
      expect(sw.checked).toBe(true);
      expect(new FormData(form).get('cloak')).toBe('engaged');
      expect(hasState(sw, 'checked')).toBe(true);
    });

    it('toggle() flips it and fires input and change', async () => {
      const { sw } = await mounted(`<cyber-switch>Cloak</cyber-switch>`);
      const inputs = captureEvents(sw, 'input');
      const changes = captureEvents(sw, 'change');
      sw.toggle();
      expect(sw.checked).toBe(true);
      expect([inputs.length, changes.length]).toEqual([1, 1]);
    });
  });

  describe('validity', () => {
    it('required fails while off', async () => {
      const { form, sw } = await mounted(
        `<cyber-switch name="c" required>Cloak</cyber-switch>`,
      );
      expect(sw.validity.valueMissing).toBe(true);
      expect(form.checkValidity()).toBe(false);
      sw.toggle();
      expect(form.checkValidity()).toBe(true);
    });
  });

  describe('form reset', () => {
    it('restores the checked attribute', async () => {
      const { form, sw } = await mounted(
        `<cyber-switch name="c" checked>Cloak</cyber-switch>`,
      );
      sw.toggle();
      expect(sw.checked).toBe(false);
      form.reset();
      await sw.updateComplete;
      expect(sw.checked).toBe(true);
      expect(nativeOf(sw).checked).toBe(true);
    });

    it('follows a disabled fieldset', async () => {
      const form = fixture<HTMLFormElement>(
        `<form><fieldset disabled><cyber-switch name="c" checked>Cloak</cyber-switch></fieldset></form>`,
      );
      const sw = form.querySelector('cyber-switch')!;
      await sw.updateComplete;
      expect(nativeOf(sw).disabled).toBe(true);
      sw.toggle();
      expect(sw.checked).toBe(true);
      expect(new FormData(form).has('c')).toBe(false);
    });
  });

  describe('keyboard', () => {
    it('toggles with Space', async () => {
      const { sw } = await mounted(`<cyber-switch>Cloak</cyber-switch>`);
      sw.focus();
      expect(sw.shadowRoot!.activeElement).toBe(nativeOf(sw));
      await userEvent.keyboard(' ');
      expect(sw.checked).toBe(true);
    });
  });

  it('has no axe violations, off and on', async () => {
    const { sw } = await mounted(`<cyber-switch>Cloak</cyber-switch>`);
    await expectAccessible(sw);
    sw.toggle();
    await sw.updateComplete;
    await expectAccessible(sw);
  });
});
