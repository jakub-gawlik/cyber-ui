import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { CyberTextarea } from '../src/index.js';
import {
  captureEvents,
  cleanupFixtures,
  expectAccessible,
  fixture,
  formFixture,
  hasState,
} from './helpers.js';

const nativeOf = (el: CyberTextarea) =>
  el.shadowRoot!.querySelector<HTMLTextAreaElement>('textarea')!;

async function mounted(markup: string) {
  const { form, control } = formFixture<CyberTextarea>(markup);
  await control.updateComplete;
  return { form, area: control };
}

describe('<cyber-textarea>', () => {
  afterEach(cleanupFixtures);

  describe('value', () => {
    it('submits the value attribute as default and tracks typing', async () => {
      const { form, area } = await mounted(
        `<cyber-textarea name="log" label="Log" value="Day 1"></cyber-textarea>`,
      );
      expect(new FormData(form).get('log')).toBe('Day 1');
      const changes = captureEvents(area, 'change');

      await userEvent.type(nativeOf(area), '. Calm.');
      expect(area.value).toBe('Day 1. Calm.');
      expect(new FormData(form).get('log')).toBe('Day 1. Calm.');
      nativeOf(area).blur();
      await vi.waitFor(() => expect(changes).toHaveLength(1));
    });

    it('renders `rows`', async () => {
      const { area } = await mounted(
        `<cyber-textarea rows="7"></cyber-textarea>`,
      );
      expect(nativeOf(area).rows).toBe(7);
    });
  });

  describe('validity', () => {
    it('mirrors required and minlength', async () => {
      const { form, area } = await mounted(
        `<cyber-textarea name="log" label="Log" required minlength="5"></cyber-textarea>`,
      );
      expect(area.validity.valueMissing).toBe(true);
      expect(form.checkValidity()).toBe(false);

      await userEvent.type(nativeOf(area), 'abc');
      expect(area.validity.tooShort).toBe(true);
      await userEvent.type(nativeOf(area), 'de');
      expect(area.validity.valid).toBe(true);
    });

    it('shows user-invalid after a failed submit', async () => {
      const { form, area } = await mounted(
        `<cyber-textarea name="log" label="Log" required></cyber-textarea>`,
      );
      form.requestSubmit();
      expect(hasState(area, 'user-invalid')).toBe(true);
      expect(nativeOf(area).getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('form reset', () => {
    it('restores the default value', async () => {
      const { form, area } = await mounted(
        `<cyber-textarea name="log" value="Day 1"></cyber-textarea>`,
      );
      area.value = 'rewritten';
      form.reset();
      expect(area.value).toBe('Day 1');
      expect(nativeOf(area).value).toBe('Day 1');
    });

    it('follows a disabled fieldset', async () => {
      const form = fixture<HTMLFormElement>(
        `<form><fieldset disabled><cyber-textarea name="log" value="x"></cyber-textarea></fieldset></form>`,
      );
      const area = form.querySelector('cyber-textarea')!;
      await area.updateComplete;
      expect(nativeOf(area).disabled).toBe(true);
      expect(new FormData(form).has('log')).toBe(false);
    });
  });

  describe('keyboard', () => {
    it('inserts a newline on Enter instead of submitting', async () => {
      const { form, area } = await mounted(
        `<cyber-textarea name="log" label="Log"></cyber-textarea><button>Go</button>`,
      );
      const submits = captureEvents(form, 'submit');
      form.addEventListener('submit', (e) => e.preventDefault());
      await userEvent.type(nativeOf(area), 'one{Enter}two');
      expect(area.value).toBe('one\ntwo');
      expect(submits).toHaveLength(0);
    });
  });

  it('has no axe violations', async () => {
    const { area } = await mounted(
      `<cyber-textarea label="Log" help-text="Encrypted at rest"></cyber-textarea>`,
    );
    await expectAccessible(area);
  });
});
