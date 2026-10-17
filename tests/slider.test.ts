import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { CyberSlider } from '../src/index.js';
import { sanitizeRange } from '../src/components/cyber-slider.js';
import {
  captureEvents,
  cleanupFixtures,
  expectAccessible,
  fixture,
  formFixture,
  hasState,
} from './helpers.js';

const nativeOf = (el: CyberSlider) =>
  el.shadowRoot!.querySelector<HTMLInputElement>('input')!;
const readout = (el: CyberSlider) =>
  el.shadowRoot!.querySelector('[part="value"]')!.textContent!.trim();

async function mounted(attrs = '') {
  const { form, control } = formFixture<CyberSlider>(
    `<cyber-slider name="power" label="Power" ${attrs}></cyber-slider>`,
  );
  await control.updateComplete;
  return { form, slider: control };
}

describe('<cyber-slider>', () => {
  afterEach(cleanupFixtures);

  describe('value', () => {
    it('defaults to the midpoint like a native range, and submits it', async () => {
      const { form, slider } = await mounted();
      expect(slider.value).toBe(50);
      expect(new FormData(form).get('power')).toBe('50');
      expect(readout(slider)).toBe('50');
    });

    it('sanitizes exactly like the native control', () => {
      const cases: [
        value: number | undefined,
        min: number,
        max: number,
        step: number,
      ][] = [
        [150, 0, 100, 1],
        [-5, 0, 100, 1],
        [33, 0, 100, 10],
        [35, 0, 100, 10],
        [97, 0, 100, 7],
        [0.35, 0, 1, 0.1],
        [undefined, 0, 9, 2],
        [undefined, 10, 5, 1],
        [3, 1, 11, 3],
      ];
      for (const [value, min, max, step] of cases) {
        // parse it, so all attributes exist before the value is computed
        // (setting them one by one sanitizes against intermediate ranges)
        const host = document.createElement('div');
        const valueAttr = value === undefined ? '' : `value="${value}"`;
        host.innerHTML = `<input type="range" min="${min}" max="${max}" step="${step}" ${valueAttr}>`;
        const native = host.querySelector('input')!;
        expect(
          sanitizeRange(value, min, max, step),
          JSON.stringify({ value, min, max, step }),
        ).toBe(Number(native.value));
      }
    });

    it('applies min/max/step to the value attribute and property writes', async () => {
      const { form, slider } = await mounted(
        'min="0" max="10" step="2" value="7"',
      );
      expect(slider.value).toBe(8);
      slider.value = 99; // no await: form data is current immediately
      expect(slider.value).toBe(10);
      expect(new FormData(form).get('power')).toBe('10');
      expect(nativeOf(slider).value).toBe('10');
    });

    it('fires input while changing and change from the host', async () => {
      const { slider } = await mounted('value="10"');
      const inputs = captureEvents(slider, 'input');
      const changes = captureEvents(slider, 'change');
      nativeOf(slider).focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(slider.value).toBe(11);
      expect(inputs.length).toBeGreaterThanOrEqual(1);
      expect(changes).toHaveLength(1);
      expect(changes[0].target).toBe(slider);
      expect(readout(slider)).toBe('11');
    });

    it('reflects the value in the track fill', async () => {
      const { slider } = await mounted('min="0" max="200" value="50"');
      expect(
        nativeOf(slider).style.getPropertyValue('--cyber-slider-fill'),
      ).toBe('25%');
    });
  });

  describe('validity', () => {
    it('is always valid (a range input has no failing constraints)', async () => {
      const { slider } = await mounted('required');
      expect(slider.validity.valid).toBe(true);
      expect(hasState(slider, 'invalid')).toBe(false);
    });

    it('supports setCustomValidity', async () => {
      const { form, slider } = await mounted();
      slider.setCustomValidity('Too much power');
      expect(form.checkValidity()).toBe(false);
      expect(slider.validationMessage).toBe('Too much power');
      expect(hasState(slider, 'invalid')).toBe(true);
    });
  });

  describe('form reset', () => {
    it('restores the default value', async () => {
      const { form, slider } = await mounted('value="20"');
      slider.value = 80;
      form.reset();
      expect(slider.value).toBe(20);
      expect(nativeOf(slider).value).toBe('20');
    });

    it('restores state via formStateRestoreCallback', async () => {
      const { slider } = await mounted();
      slider.formStateRestoreCallback('70');
      expect(slider.value).toBe(70);
    });

    it('follows a disabled fieldset', async () => {
      const form = fixture<HTMLFormElement>(
        `<form><fieldset disabled><cyber-slider name="p"></cyber-slider></fieldset></form>`,
      );
      const slider = form.querySelector('cyber-slider')!;
      await slider.updateComplete;
      expect(nativeOf(slider).disabled).toBe(true);
      expect(new FormData(form).has('p')).toBe(false);
    });
  });

  describe('keyboard', () => {
    it('steps with arrows and jumps with Home / End', async () => {
      const { slider } = await mounted('min="0" max="50" step="5" value="20"');
      slider.focus();
      expect(slider.shadowRoot!.activeElement).toBe(nativeOf(slider));

      await userEvent.keyboard('{ArrowRight}');
      expect(slider.value).toBe(25);
      await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
      expect(slider.value).toBe(15);
      await userEvent.keyboard('{End}');
      expect(slider.value).toBe(50);
      await userEvent.keyboard('{Home}');
      expect(slider.value).toBe(0);
    });
  });

  it('has no axe violations', async () => {
    const { slider } = await mounted('help-text="Diverted from engines"');
    await expectAccessible(slider);
  });
});
