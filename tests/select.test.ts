import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { CyberOption, CyberSelect } from '../src/index.js';
import {
  setAnchoringMode,
  usesAnchoredPopovers,
} from '../src/components/internal/anchor.js';
import {
  captureEvents,
  cleanupFixtures,
  expectAccessible,
  fixture,
  formFixture,
  hasState,
  keydown,
} from './helpers.js';

const options = `
  <cyber-option value="kepler">Kepler Belt</cyber-option>
  <cyber-option value="orion">Orion Reach</cyber-option>
  <cyber-option value="vega" disabled>Vega Expanse</cyber-option>
  <cyber-option value="sol">Sol Prime</cyber-option>
`;
const markup = (attrs = '') =>
  `<cyber-select name="sector" label="Sector" ${attrs}>${options}</cyber-select>`;

const triggerOf = (el: CyberSelect) =>
  el.shadowRoot!.querySelector<HTMLElement>('[role="combobox"]')!;
const listboxOf = (el: CyberSelect) =>
  el.shadowRoot!.querySelector<HTMLElement>('[role="listbox"]')!;
const optionsOf = (el: CyberSelect) => [
  ...el.querySelectorAll<CyberOption>('cyber-option'),
];
const shown = (el: CyberSelect) => triggerOf(el).textContent!.trim();

async function mounted(attrs = '') {
  const { form, control } = formFixture<CyberSelect>(markup(attrs));
  await control.updateComplete;
  return { form, select: control };
}

async function opened(attrs = '') {
  const { form, select } = await mounted(attrs);
  triggerOf(select).focus();
  await userEvent.keyboard('{ArrowDown}');
  await vi.waitFor(() => expect(select.open).toBe(true));
  return { form, select };
}

describe('<cyber-select>', () => {
  afterEach(() => {
    cleanupFixtures();
    setAnchoringMode('auto');
  });

  describe('value', () => {
    it('defaults to the first enabled option, like a native select', async () => {
      const { form, select } = await mounted();
      expect(select.value).toBe('kepler');
      expect(shown(select)).toBe('Kepler Belt');
      expect(new FormData(form).get('sector')).toBe('kepler');
    });

    it('selects the value attribute', async () => {
      const { form, select } = await mounted('value="sol"');
      expect(select.selectedOption).toBe(optionsOf(select)[3]);
      expect(shown(select)).toBe('Sol Prime');
      expect(optionsOf(select)[3].getAttribute('aria-selected')).toBe('true');
      expect(new FormData(form).get('sector')).toBe('sol');
    });

    it('starts empty with a placeholder', async () => {
      const { form, select } = await mounted('placeholder="Choose a sector"');
      expect(select.value).toBe('');
      expect(shown(select)).toBe('Choose a sector');
      expect(new FormData(form).has('sector')).toBe(false);
    });

    it("falls back to an option's text when it has no value", async () => {
      const select = fixture<CyberSelect>(`
        <cyber-select><cyber-option>Alpha</cyber-option><cyber-option>Beta</cyber-option></cyber-select>
      `);
      await select.updateComplete;
      expect(select.value).toBe('Alpha');
      select.value = 'Beta';
      expect(select.selectedOption).toBe(optionsOf(select)[1]);
    });

    it('picks on click, firing input and change only for a new value', async () => {
      const { form, select } = await mounted();
      const inputs = captureEvents(select, 'input');
      const changes = captureEvents(select, 'change');

      await userEvent.click(triggerOf(select));
      expect(select.open).toBe(true);
      await userEvent.click(optionsOf(select)[1]);
      expect(select.value).toBe('orion');
      expect(select.open).toBe(false);
      expect(new FormData(form).get('sector')).toBe('orion');
      expect([inputs.length, changes.length]).toEqual([1, 1]);
      expect(changes[0].target).toBe(select);

      await userEvent.click(triggerOf(select));
      await userEvent.click(optionsOf(select)[1]); // same value again
      expect([inputs.length, changes.length]).toEqual([1, 1]);
    });

    it('ignores disabled options', async () => {
      const { select } = await mounted();
      await userEvent.click(triggerOf(select));
      optionsOf(select)[2].click();
      expect(select.value).toBe('kepler');
    });

    it('applies property writes synchronously', async () => {
      const { form, select } = await mounted();
      select.value = 'sol';
      expect(new FormData(form).get('sector')).toBe('sol');
      expect(optionsOf(select)[3].getAttribute('aria-selected')).toBe('true');
    });

    it('updates the shown label when options change', async () => {
      const { select } = await mounted('value="sol"');
      optionsOf(select)[3].textContent = 'Sol Station';
      await vi.waitFor(() => expect(shown(select)).toBe('Sol Station'));
    });
  });

  describe('validity', () => {
    it("required + placeholder fails with the browser's valueMissing message", async () => {
      const { form, select } = await mounted('required placeholder="Choose"');
      expect(select.validity.valueMissing).toBe(true);
      const native = document.createElement('select');
      native.required = true;
      expect(select.validationMessage).toBe(native.validationMessage);
      expect(select.validationMessage).not.toBe('');
      expect(form.checkValidity()).toBe(false);

      form.requestSubmit();
      expect(hasState(select, 'user-invalid')).toBe(true);
      expect(triggerOf(select).getAttribute('aria-invalid')).toBe('true');

      select.value = 'orion';
      expect(select.validity.valid).toBe(true);
      expect(hasState(select, 'user-invalid')).toBe(false);
    });

    it('supports setCustomValidity', async () => {
      const { select } = await mounted();
      select.setCustomValidity('Sector closed');
      expect(select.checkValidity()).toBe(false);
      expect(select.validationMessage).toBe('Sector closed');
    });
  });

  describe('form reset', () => {
    it('restores the default selection', async () => {
      const { form, select } = await mounted('value="orion"');
      select.value = 'sol';
      form.reset();
      expect(select.value).toBe('orion');
      expect(shown(select)).toBe('Orion Reach');
    });

    it('restores state via formStateRestoreCallback', async () => {
      const { select } = await mounted();
      select.formStateRestoreCallback('sol');
      expect(select.value).toBe('sol');
    });

    it('cannot be opened or focused while disabled, nor by a disabled fieldset', async () => {
      const { form, select } = await mounted('disabled');
      expect(triggerOf(select).hasAttribute('tabindex')).toBe(false);
      expect(triggerOf(select).getAttribute('aria-disabled')).toBe('true');
      select.show();
      expect(select.open).toBe(false);
      expect(new FormData(form).has('sector')).toBe(false);

      const fs = fixture<HTMLFormElement>(
        `<form><fieldset disabled>${markup()}</fieldset></form>`,
      );
      const inner = fs.querySelector('cyber-select')!;
      await inner.updateComplete;
      await userEvent.click(triggerOf(inner), { force: true });
      expect(inner.open).toBe(false);
    });
  });

  describe('keyboard', () => {
    it('opens with ArrowDown on the selected option', async () => {
      const { select } = await opened('value="orion"');
      await vi.waitFor(() =>
        expect(document.activeElement).toBe(optionsOf(select)[1]),
      );
      expect(triggerOf(select).getAttribute('aria-expanded')).toBe('true');
      expect(hasState(select, 'open')).toBe(true);
    });

    it('opens with Enter / Space, and Home / End on the first / last option', async () => {
      const { select } = await mounted();
      for (const key of ['{Enter}', ' ']) {
        triggerOf(select).focus();
        await userEvent.keyboard(key);
        await vi.waitFor(() => expect(select.open).toBe(true));
        select.hide();
        await select.updateComplete;
      }
      triggerOf(select).focus();
      await userEvent.keyboard('{End}');
      await vi.waitFor(() =>
        expect(document.activeElement).toBe(optionsOf(select)[3]),
      );
      select.hide(true);
      await userEvent.keyboard('{Home}');
      await vi.waitFor(() =>
        expect(document.activeElement).toBe(optionsOf(select)[0]),
      );
    });

    it('moves with arrows (no wrap, skipping disabled) and selects with Enter', async () => {
      const { select } = await opened();
      const [kepler, orion, , sol] = optionsOf(select);
      await vi.waitFor(() => expect(document.activeElement).toBe(kepler));

      await userEvent.keyboard('{ArrowUp}'); // already first: stays
      expect(document.activeElement).toBe(kepler);
      await userEvent.keyboard('{ArrowDown}{ArrowDown}'); // skips disabled Vega
      expect(document.activeElement).toBe(sol);
      await userEvent.keyboard('{ArrowDown}'); // last: stays
      expect(document.activeElement).toBe(sol);
      await userEvent.keyboard('{ArrowUp}');
      expect(document.activeElement).toBe(orion);

      await userEvent.keyboard('{Enter}');
      expect(select.value).toBe('orion');
      expect(select.open).toBe(false);
      expect(select.shadowRoot!.activeElement).toBe(triggerOf(select));
    });

    it('selects the focused option with Space', async () => {
      const { select } = await opened();
      await userEvent.keyboard('{End} ');
      expect(select.value).toBe('sol');
      expect(select.open).toBe(false);
    });

    it('closes on Escape without changing the value, returning focus', async () => {
      const { select } = await opened();
      await userEvent.keyboard('{ArrowDown}{Escape}');
      expect(select.open).toBe(false);
      expect(select.value).toBe('kepler');
      expect(select.shadowRoot!.activeElement).toBe(triggerOf(select));
    });

    it('closes on Tab and on an outside pointerdown', async () => {
      const { select } = await opened();
      keydown(document.activeElement!, 'Tab');
      await select.updateComplete;
      expect(select.open).toBe(false);

      select.show();
      await select.updateComplete;
      document.body.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, composed: true }),
      );
      await select.updateComplete;
      expect(select.open).toBe(false);
    });

    it('typeahead selects directly while closed and jumps while open', async () => {
      const { select } = await mounted();
      const changes = captureEvents(select, 'change');
      triggerOf(select).focus();
      await userEvent.keyboard('s');
      expect(select.value).toBe('sol');
      expect(select.open).toBe(false);
      expect(changes).toHaveLength(1);

      select.show();
      await vi.waitFor(() =>
        expect(document.activeElement).toBe(optionsOf(select)[3]),
      );
      await new Promise((r) => setTimeout(r, 600)); // typeahead buffer clears
      await userEvent.keyboard('o');
      expect(document.activeElement).toBe(optionsOf(select)[1]);
      expect(select.value).toBe('sol'); // only moved focus
    });

    it('focuses the trigger from its label and from a <label for>', async () => {
      const { select } = await mounted();
      await userEvent.click(
        select.shadowRoot!.querySelector('[part="label"]')!,
      );
      expect(select.shadowRoot!.activeElement).toBe(triggerOf(select));

      const form = fixture<HTMLFormElement>(
        `<form><label for="s">Route</label><cyber-select id="s">${options}</cyber-select></form>`,
      );
      const external = form.querySelector('cyber-select')!;
      await external.updateComplete;
      // label.click(): runs the label's activation (click forwarded to the
      // host, which focuses itself). A real Playwright mouse click here is
      // dropped by Firefox late in this file; it never reaches the <label>.
      form.querySelector('label')!.click();
      expect(external.shadowRoot!.activeElement).toBe(triggerOf(external));
      expect(triggerOf(external).getAttribute('aria-label')).toBe('Route');
    });
  });

  it('wires combobox → listbox ARIA', async () => {
    const { select } = await mounted();
    const trigger = triggerOf(select);
    expect(trigger.getAttribute('aria-controls')).toBe(listboxOf(select).id);
    expect(trigger.getAttribute('aria-labelledby')).toBe('label');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(
      optionsOf(select).every((o) => o.getAttribute('role') === 'option'),
    ).toBe(true);
    expect(optionsOf(select)[2].getAttribute('aria-disabled')).toBe('true');
  });

  describe('positioning', () => {
    it.skipIf(!usesAnchoredPopovers())(
      'renders the listbox as a top-layer popover as wide as the trigger',
      async () => {
        const { select } = await opened();
        const listbox = listboxOf(select);
        expect(listbox.getAttribute('popover')).toBe('manual');
        expect(listbox.matches(':popover-open')).toBe(true);
        const trigger = triggerOf(select).getBoundingClientRect();
        const rect = listbox.getBoundingClientRect();
        expect(rect.top).toBeGreaterThanOrEqual(trigger.bottom);
        expect(Math.round(rect.width)).toBe(Math.round(trigger.width));
        expect(Math.round(rect.left)).toBe(Math.round(trigger.left));
      },
    );

    it('falls back to absolute positioning and flips above when out of room', async () => {
      setAnchoringMode('legacy');
      const select = fixture<HTMLElement>(
        `<div style="position: fixed; bottom: 0; left: 0; width: 240px">${markup()}</div>`,
      ).querySelector<CyberSelect>('cyber-select')!;
      await select.updateComplete;
      select.show();
      await select.updateComplete;
      const listbox = listboxOf(select);
      expect(listbox.hasAttribute('popover')).toBe(false);
      expect(getComputedStyle(listbox).position).toBe('absolute');
      expect(listbox.dataset.placement).toBe('top-start');
      const trigger = triggerOf(select).getBoundingClientRect();
      const rect = listbox.getBoundingClientRect();
      expect(rect.bottom).toBeLessThanOrEqual(trigger.top);
      expect(Math.round(rect.width)).toBe(Math.round(trigger.width));
    });
  });

  it('has no axe violations, closed and open', async () => {
    const { select } = await mounted('required help-text="Where to jump"');
    await expectAccessible(select);
    select.show();
    await select.updateComplete;
    await expectAccessible(select);
  });
});
