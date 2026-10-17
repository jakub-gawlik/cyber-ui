import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { CyberRadio, CyberRadioGroup } from '../src/index.js';
import {
  captureEvents,
  cleanupFixtures,
  expectAccessible,
  fixture,
  formFixture,
  hasState,
  tabReachesNative,
} from './helpers.js';

const markup = (attrs = '') => `
  <cyber-radio-group name="faction" label="Faction" ${attrs}>
    <cyber-radio value="union">Union</cyber-radio>
    <cyber-radio value="syndicate">Syndicate</cyber-radio>
    <cyber-radio value="drifters">Drifters</cyber-radio>
  </cyber-radio-group>
`;

const radiosOf = (group: CyberRadioGroup) => [
  ...group.shadowRoot!.querySelectorAll<HTMLInputElement>(
    'input[type="radio"]',
  ),
];
const focused = (group: CyberRadioGroup) => group.shadowRoot!.activeElement;

async function mounted(attrs = '') {
  const { form, control } = formFixture<CyberRadioGroup>(markup(attrs));
  await vi.waitFor(() => expect(radiosOf(control)).toHaveLength(3));
  return { form, group: control };
}

describe('<cyber-radio-group>', () => {
  afterEach(cleanupFixtures);

  it('renders one native radio per <cyber-radio>, labelled by its content', async () => {
    const { group } = await mounted();
    const radios = radiosOf(group);
    expect(radios.map((r) => r.value)).toEqual([
      'union',
      'syndicate',
      'drifters',
    ]);
    // the <cyber-radio> sits inside its radio's <label>
    const option = group.querySelector<CyberRadio>('cyber-radio')!;
    expect(option.assignedSlot?.closest('label')).toBe(radios[0].labels![0]);
    // one native group: they share a name
    expect(new Set(radios.map((r) => r.name)).size).toBe(1);
  });

  describe('value', () => {
    it('selects the value attribute and submits it', async () => {
      const { form, group } = await mounted('value="syndicate"');
      expect(group.value).toBe('syndicate');
      expect(radiosOf(group).map((r) => r.checked)).toEqual([
        false,
        true,
        false,
      ]);
      expect(new FormData(form).get('faction')).toBe('syndicate');
    });

    it('submits nothing until a radio is selected', async () => {
      const { form, group } = await mounted();
      expect(group.value).toBe('');
      expect(new FormData(form).has('faction')).toBe(false);
    });

    it('selects on click, firing input and change from the group', async () => {
      const { form, group } = await mounted();
      const inputs = captureEvents(group, 'input');
      const changes = captureEvents(group, 'change');

      await userEvent.click(group.querySelectorAll('cyber-radio')[2]);
      expect(group.value).toBe('drifters');
      expect(new FormData(form).get('faction')).toBe('drifters');
      expect(inputs).toHaveLength(1);
      expect(changes).toHaveLength(1);
      expect(changes[0].target).toBe(group);
    });

    it('applies a value property write synchronously', async () => {
      const { form, group } = await mounted();
      group.value = 'union';
      expect(radiosOf(group)[0].checked).toBe(true);
      expect(new FormData(form).get('faction')).toBe('union');
    });

    it('skips disabled radios and respects a disabled group', async () => {
      const { form, group } = await mounted();
      const [, syndicate] = group.querySelectorAll<CyberRadio>('cyber-radio');
      syndicate.disabled = true;
      await vi.waitFor(() => expect(radiosOf(group)[1].disabled).toBe(true));

      group.disabled = true;
      await group.updateComplete;
      expect(radiosOf(group).every((r) => r.disabled)).toBe(true);
      group.value = 'union';
      expect(new FormData(form).has('faction')).toBe(false);
    });

    it('picks up radios added later', async () => {
      const { group } = await mounted();
      const extra = document.createElement('cyber-radio');
      extra.value = 'void';
      extra.textContent = 'The Void';
      group.append(extra);
      await vi.waitFor(() => expect(radiosOf(group)).toHaveLength(4));
    });
  });

  describe('validity', () => {
    it('required fails with valueMissing until a radio is selected', async () => {
      const { form, group } = await mounted('required');
      expect(group.validity.valueMissing).toBe(true);
      expect(group.validationMessage).toBe(
        radiosOf(group)[0].validationMessage,
      );
      expect(form.checkValidity()).toBe(false);

      form.requestSubmit();
      expect(hasState(group, 'user-invalid')).toBe(true);
      const radiogroup = group.shadowRoot!.querySelector(
        '[role="radiogroup"]',
      )!;
      expect(radiogroup.getAttribute('aria-invalid')).toBe('true');
      expect(radiogroup.getAttribute('aria-required')).toBe('true');

      group.value = 'union';
      expect(group.validity.valid).toBe(true);
      expect(hasState(group, 'user-invalid')).toBe(false);
    });
  });

  describe('form reset', () => {
    it('restores the default selection', async () => {
      const { form, group } = await mounted('value="union"');
      // set directly: clicking is covered above, and a real click in setup
      // is occasionally dropped by Firefox under a loaded full run
      group.value = 'syndicate';

      form.reset();
      expect(group.value).toBe('union');
      expect(radiosOf(group).map((r) => r.checked)).toEqual([
        true,
        false,
        false,
      ]);
    });

    it('restores state via formStateRestoreCallback', async () => {
      const { group } = await mounted();
      group.formStateRestoreCallback('drifters');
      expect(group.value).toBe('drifters');
    });
  });

  describe('keyboard', () => {
    it('Tab lands on the selected radio (where Tab reaches native radios)', async () => {
      const native = await tabReachesNative('radio');
      const form = fixture<HTMLFormElement>(
        `<form><input data-from>${markup('value="syndicate"')}</form>`,
      );
      const group = form.querySelector('cyber-radio-group')!;
      await vi.waitFor(() => expect(radiosOf(group)).toHaveLength(3));
      form.querySelector<HTMLInputElement>('[data-from]')!.focus();

      await userEvent.keyboard('{Tab}');
      expect(focused(group) === radiosOf(group)[1]).toBe(native);
    });

    // (wrapping past the ends is engine behavior: WebKit doesn't wrap)
    it('arrows move and select', async () => {
      const { group } = await mounted('value="syndicate"');
      const changes = captureEvents(group, 'change');
      group.focus();
      expect(focused(group)).toBe(radiosOf(group)[1]);

      await userEvent.keyboard('{ArrowDown}');
      expect(group.value).toBe('drifters');
      expect(focused(group)).toBe(radiosOf(group)[2]);

      await userEvent.keyboard('{ArrowUp}{ArrowUp}');
      expect(group.value).toBe('union');
      expect(focused(group)).toBe(radiosOf(group)[0]);
      expect(changes).toHaveLength(3);
    });

    it('focus() goes to the selected radio, else the first enabled one', async () => {
      const { group } = await mounted('value="drifters"');
      group.focus();
      expect(focused(group)).toBe(radiosOf(group)[2]);

      const { group: none } = await mounted();
      none.querySelector<CyberRadio>('cyber-radio')!.disabled = true;
      await vi.waitFor(() => expect(radiosOf(none)[0].disabled).toBe(true));
      none.focus();
      expect(focused(none)).toBe(radiosOf(none)[1]);
    });
  });

  it('assigns label and help-text slot content despite manual slotting', async () => {
    const group = fixture<CyberRadioGroup>(`
      <cyber-radio-group>
        <strong slot="label">Allegiance</strong>
        <em slot="help-text">Choose wisely</em>
        <cyber-radio value="a">A</cyber-radio>
      </cyber-radio-group>
    `);
    await vi.waitFor(() =>
      expect(group.querySelector('strong')!.assignedSlot?.name).toBe('label'),
    );
    expect(group.querySelector('em')!.assignedSlot?.name).toBe('help-text');
  });

  it('has no axe violations', async () => {
    const { group } = await mounted('required help-text="Pick one"');
    await expectAccessible(group);
    group.value = 'union';
    await group.updateComplete;
    await expectAccessible(group);
  });
});
