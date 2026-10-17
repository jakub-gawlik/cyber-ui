import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { CyberInput } from '../src/index.js';
import {
  captureEvents,
  cleanupFixtures,
  expectAccessible,
  fixture,
  formFixture,
  hasState,
} from './helpers.js';

const nativeOf = (el: CyberInput) =>
  el.shadowRoot!.querySelector<HTMLInputElement>('input')!;

async function mounted(markup: string) {
  const { form, control } = formFixture<CyberInput>(markup);
  await control.updateComplete;
  return { form, input: control };
}

describe('<cyber-input>', () => {
  afterEach(cleanupFixtures);

  describe('value', () => {
    it('submits the value attribute as the default value', async () => {
      const { form, input } = await mounted(
        `<cyber-input name="callsign" value="Aurora"></cyber-input>`,
      );
      expect(input.value).toBe('Aurora');
      expect(input.defaultValue).toBe('Aurora');
      expect(nativeOf(input).value).toBe('Aurora');
      expect(new FormData(form).get('callsign')).toBe('Aurora');
    });

    it('tracks typing, firing input (composed) and change from the host', async () => {
      const { form, input } = await mounted(
        `<cyber-input name="callsign" label="Callsign"></cyber-input>`,
      );
      const inputs = captureEvents(input, 'input');
      const changes = captureEvents(input, 'change');

      await userEvent.type(nativeOf(input), 'Nova');
      expect(input.value).toBe('Nova');
      expect(new FormData(form).get('callsign')).toBe('Nova');
      expect(inputs.length).toBe(4);
      expect(inputs[0].target).toBe(input);

      nativeOf(input).blur(); // commits the change
      await vi.waitFor(() => expect(changes).toHaveLength(1));
      expect(changes[0].target).toBe(input);
    });

    it('updates form data and validity synchronously, like a native input', async () => {
      const { form, input } = await mounted(
        `<cyber-input name="c" label="Callsign" required></cyber-input>`,
      );
      input.value = 'Nova'; // no await
      expect(new FormData(form).get('c')).toBe('Nova');
      expect(input.validity.valid).toBe(true);
      expect(nativeOf(input).value).toBe('Nova');
      form.reset();
      expect(input.value).toBe('');
      expect(input.validity.valueMissing).toBe(true);
    });

    it('a property write detaches the value from the attribute', async () => {
      const { input } = await mounted(`<cyber-input value="a"></cyber-input>`);
      input.value = 'b';
      await input.updateComplete;
      expect(nativeOf(input).value).toBe('b');

      input.setAttribute('value', 'c'); // only the default changes now
      await input.updateComplete;
      expect(input.value).toBe('b');
      expect(input.defaultValue).toBe('c');
    });

    it('omits a disabled control from the form data', async () => {
      const { form, input } = await mounted(
        `<cyber-input name="callsign" value="x" disabled></cyber-input>`,
      );
      expect(nativeOf(input).disabled).toBe(true);
      expect(new FormData(form).has('callsign')).toBe(false);
    });

    it('is disabled by a disabled ancestor fieldset', async () => {
      const form = fixture<HTMLFormElement>(
        `<form><fieldset disabled><cyber-input name="c" value="x"></cyber-input></fieldset></form>`,
      );
      const input = form.querySelector('cyber-input')!;
      await input.updateComplete;
      expect(nativeOf(input).disabled).toBe(true);
      expect(input.matches(':disabled')).toBe(true);
      expect(new FormData(form).has('c')).toBe(false);

      form.querySelector('fieldset')!.disabled = false;
      await vi.waitFor(() => expect(nativeOf(input).disabled).toBe(false));
    });
  });

  describe('validity', () => {
    it('mirrors required as valueMissing with the native message', async () => {
      const { form, input } = await mounted(
        `<cyber-input name="c" label="Callsign" required></cyber-input>`,
      );
      expect(input.validity.valueMissing).toBe(true);
      expect(input.validationMessage).toBe(nativeOf(input).validationMessage);
      expect(input.validationMessage).not.toBe('');
      expect(form.checkValidity()).toBe(false);
      expect(hasState(input, 'invalid')).toBe(true);

      await userEvent.type(nativeOf(input), 'x');
      expect(input.validity.valid).toBe(true);
      expect(form.checkValidity()).toBe(true);
      expect(hasState(input, 'invalid')).toBe(false);
    });

    it('mirrors type, pattern and minlength constraints', async () => {
      const { input } = await mounted(
        `<cyber-input type="email" label="Email"></cyber-input>`,
      );
      await userEvent.type(nativeOf(input), 'not-an-email');
      expect(input.validity.typeMismatch).toBe(true);

      const { input: coded } = await mounted(
        `<cyber-input pattern="[A-Z]{3}" label="Code"></cyber-input>`,
      );
      await userEvent.type(nativeOf(coded), 'abc');
      expect(coded.validity.patternMismatch).toBe(true);

      const { input: short } = await mounted(
        `<cyber-input minlength="4" label="Name"></cyber-input>`,
      );
      await userEvent.type(nativeOf(short), 'ab'); // tooShort needs user edits
      expect(short.validity.tooShort).toBe(true);
    });

    it('supports setCustomValidity', async () => {
      const { input } = await mounted(
        `<cyber-input label="Callsign"></cyber-input>`,
      );
      input.setCustomValidity('Callsign taken');
      expect(input.validity.customError).toBe(true);
      expect(input.validationMessage).toBe('Callsign taken');
      expect(input.checkValidity()).toBe(false);

      input.setCustomValidity('');
      expect(input.validity.valid).toBe(true);
    });

    it('shows user-invalid only after interaction or a failed submit', async () => {
      const { form, input } = await mounted(
        `<cyber-input name="c" label="Callsign" required></cyber-input>`,
      );
      expect(hasState(input, 'user-invalid')).toBe(false);
      expect(nativeOf(input).hasAttribute('aria-invalid')).toBe(false);

      form.requestSubmit(); // invalid → submission blocked, `invalid` fires
      expect(hasState(input, 'user-invalid')).toBe(true);
      expect(nativeOf(input).getAttribute('aria-invalid')).toBe('true');

      await userEvent.type(nativeOf(input), 'x');
      expect(hasState(input, 'user-invalid')).toBe(false);
    });
  });

  describe('form reset', () => {
    it('restores the default value and clears user-invalid', async () => {
      const { form, input } = await mounted(
        `<cyber-input name="c" label="Callsign" value="Aurora" required></cyber-input>`,
      );
      await userEvent.clear(nativeOf(input));
      nativeOf(input).blur();
      await vi.waitFor(() =>
        expect(hasState(input, 'user-invalid')).toBe(true),
      );

      form.reset();
      await input.updateComplete;
      expect(input.value).toBe('Aurora');
      expect(nativeOf(input).value).toBe('Aurora');
      expect(hasState(input, 'user-invalid')).toBe(false);
      expect(new FormData(form).get('c')).toBe('Aurora');
    });

    it('restores state via formStateRestoreCallback', async () => {
      const { form, input } = await mounted(
        `<cyber-input name="c"></cyber-input>`,
      );
      input.formStateRestoreCallback('restored');
      await input.updateComplete;
      expect(input.value).toBe('restored');
      expect(new FormData(form).get('c')).toBe('restored');
    });
  });

  describe('keyboard and focus', () => {
    it('delegates focus to the native input, from the host and from a <label for>', async () => {
      const form = fixture<HTMLFormElement>(`
        <form><label for="cs">Callsign</label><cyber-input id="cs"></cyber-input></form>
      `);
      const input = form.querySelector('cyber-input')!;
      await input.updateComplete;

      input.focus();
      expect(input.shadowRoot!.activeElement).toBe(nativeOf(input));
      nativeOf(input).blur();

      await userEvent.click(form.querySelector('label')!);
      expect(input.shadowRoot!.activeElement).toBe(nativeOf(input));
    });

    it('names the native input from the label attribute, else <label for>', async () => {
      const { input } = await mounted(
        `<cyber-input label="Callsign"></cyber-input>`,
      );
      const label = input.shadowRoot!.querySelector('label')!;
      expect(label.htmlFor).toBe('control');
      expect(nativeOf(input).labels![0]).toBe(label);

      const form = fixture<HTMLFormElement>(`
        <form><label for="x">Sector</label><cyber-input id="x"></cyber-input></form>
      `);
      const external = form.querySelector('cyber-input')!;
      await external.updateComplete;
      expect(nativeOf(external).getAttribute('aria-label')).toBe('Sector');
    });

    it('submits the form on Enter, like a native input', async () => {
      const { form, input } = await mounted(
        `<cyber-input name="c" value="x"></cyber-input><button>Go</button>`,
      );
      const submits = captureEvents(form, 'submit');
      form.addEventListener('submit', (e) => e.preventDefault());
      nativeOf(input).focus();
      await userEvent.keyboard('{Enter}');
      expect(submits).toHaveLength(1);
    });
  });

  it('has no axe violations', async () => {
    const { input } = await mounted(
      `<cyber-input label="Callsign" help-text="Visible to allies" required></cyber-input>`,
    );
    await expectAccessible(input);
  });
});
