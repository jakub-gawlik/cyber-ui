import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CyberCommand, CyberCommandItem } from '../src/index.js';
import {
  captureEvents,
  cleanupFixtures,
  expectAccessible,
  fixture,
  keydown,
} from './helpers.js';

const markup = `
  <cyber-command label="Ship commands">
    <cyber-command-item value="scan" group="Ship" shortcut="S">Scan system</cyber-command-item>
    <cyber-command-item value="shields" group="Ship" disabled>Raise shields</cyber-command-item>
    <cyber-command-item value="map" group="Navigation" keywords="galaxy chart">Open starmap</cyber-command-item>
    <cyber-command-item>Abandon ship</cyber-command-item>
  </cyber-command>
`;

const dialogOf = (cmd: CyberCommand) =>
  cmd.shadowRoot!.querySelector<HTMLDialogElement>('dialog')!;
const inputOf = (cmd: CyberCommand) =>
  cmd.shadowRoot!.querySelector<HTMLInputElement>('input')!;
const optionsOf = (cmd: CyberCommand) => [
  ...cmd.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]'),
];
const activeOf = (cmd: CyberCommand) =>
  cmd.shadowRoot!.querySelector<HTMLElement>('[aria-selected="true"]');
const itemsOf = (cmd: CyberCommand) => [
  ...cmd.querySelectorAll<CyberCommandItem>('cyber-command-item'),
];
/** Light-DOM items rendered (assigned into an option), in display order. */
const shown = (cmd: CyberCommand) =>
  optionsOf(cmd).map((option) =>
    (option.querySelector('slot') as HTMLSlotElement)
      .assignedElements()[0]
      ?.textContent?.trim(),
  );

async function opened(html = markup): Promise<CyberCommand> {
  const cmd = fixture<CyberCommand>(html);
  await cmd.updateComplete;
  cmd.show();
  await cmd.updateComplete;
  await vi.waitFor(() =>
    expect(cmd.shadowRoot!.activeElement).toBe(inputOf(cmd)),
  );
  return cmd;
}

async function type(cmd: CyberCommand, text: string) {
  inputOf(cmd).value = text;
  inputOf(cmd).dispatchEvent(new Event('input', { bubbles: true }));
  await cmd.updateComplete;
}

describe('<cyber-command>', () => {
  afterEach(cleanupFixtures);

  it('opens as a modal dialog, focuses the search field, and emits cyber-open', async () => {
    const cmd = fixture<CyberCommand>(markup);
    await cmd.updateComplete;
    const opens = captureEvents(cmd, 'cyber-open');
    expect(dialogOf(cmd).open).toBe(false);

    cmd.show();
    await cmd.updateComplete;
    expect(dialogOf(cmd).open).toBe(true);
    expect(dialogOf(cmd).matches(':modal')).toBe(true);
    expect(opens).toHaveLength(1);
    await vi.waitFor(() =>
      expect(cmd.shadowRoot!.activeElement).toBe(inputOf(cmd)),
    );
  });

  it('lists ungrouped items first, then groups with headings, as options', async () => {
    const cmd = await opened();
    expect(shown(cmd)).toEqual([
      'Abandon ship',
      'Scan system',
      'Raise shields',
      'Open starmap',
    ]);
    const headings = [
      ...cmd.shadowRoot!.querySelectorAll('[part="group"]'),
    ].map((h) => h.textContent?.trim());
    expect(headings).toEqual(['Ship', 'Navigation']);
    expect(
      cmd.shadowRoot!.querySelector('[part="shortcut"]')?.textContent?.trim(),
    ).toBe('S');
    expect(optionsOf(cmd)[2].getAttribute('aria-disabled')).toBe('true');
  });

  it('filters on label and keywords as you type, and shows the empty state', async () => {
    const cmd = await opened();
    await type(cmd, 'galaxy');
    expect(shown(cmd)).toEqual(['Open starmap']);
    expect(cmd.query).toBe('galaxy');
    // non-matching items are left unassigned
    expect(itemsOf(cmd)[0].assignedSlot).toBeNull();
    expect(
      cmd.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!.hidden,
    ).toBe(true);

    await type(cmd, 'sc sys');
    expect(shown(cmd)).toEqual(['Scan system']);

    await type(cmd, 'xyz');
    expect(shown(cmd)).toEqual([]);
    expect(
      cmd.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!.hidden,
    ).toBe(false);
    expect(inputOf(cmd).hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('moves the active option with arrows (wrapping, skipping disabled) and Home / End', async () => {
    const cmd = await opened();
    const input = inputOf(cmd);
    const [abandon, scan, , map] = optionsOf(cmd);
    expect(activeOf(cmd)).toBe(abandon);
    expect(input.getAttribute('aria-activedescendant')).toBe(abandon.id);

    expect(keydown(input, 'ArrowDown').defaultPrevented).toBe(true);
    await cmd.updateComplete;
    expect(activeOf(cmd)).toBe(scan);

    keydown(input, 'ArrowDown'); // skips the disabled item
    await cmd.updateComplete;
    expect(activeOf(cmd)).toBe(map);
    expect(input.getAttribute('aria-activedescendant')).toBe(map.id);

    keydown(input, 'ArrowDown'); // wraps
    await cmd.updateComplete;
    expect(activeOf(cmd)).toBe(abandon);

    keydown(input, 'ArrowUp'); // wraps back
    await cmd.updateComplete;
    expect(activeOf(cmd)).toBe(map);

    keydown(input, 'Home');
    await cmd.updateComplete;
    expect(activeOf(cmd)).toBe(abandon);

    keydown(input, 'End');
    await cmd.updateComplete;
    expect(activeOf(cmd)).toBe(map);
  });

  it('resets the active option to the first match when the filter changes', async () => {
    const cmd = await opened();
    keydown(inputOf(cmd), 'End');
    await cmd.updateComplete;
    await type(cmd, 's');
    expect(shown(cmd)).toEqual([
      'Abandon ship',
      'Scan system',
      'Raise shields',
      'Open starmap',
    ]);
    expect(activeOf(cmd)).toBe(optionsOf(cmd)[0]);
  });

  it('Enter runs the active command: cyber-select with item + value, then closes', async () => {
    const cmd = await opened();
    const selects = captureEvents(cmd, 'cyber-select');
    const closes = captureEvents(cmd, 'cyber-close');
    await type(cmd, 'star');
    keydown(inputOf(cmd), 'Enter');
    await cmd.updateComplete;
    expect(selects).toHaveLength(1);
    expect(selects[0].detail.item).toBe(itemsOf(cmd)[2]);
    expect(selects[0].detail.value).toBe('map');
    await vi.waitFor(() => expect(closes).toHaveLength(1));
    expect(cmd.open).toBe(false);
    expect(dialogOf(cmd).open).toBe(false);
  });

  it('a click runs a command; the value defaults to the label; disabled items are inert', async () => {
    const cmd = await opened();
    const selects = captureEvents(cmd, 'cyber-select');
    optionsOf(cmd)[2].click(); // disabled
    await cmd.updateComplete;
    expect(selects).toHaveLength(0);
    expect(cmd.open).toBe(true);

    optionsOf(cmd)[0].click();
    await cmd.updateComplete;
    expect(selects).toHaveLength(1);
    expect(selects[0].detail.value).toBe('Abandon ship');
    expect(cmd.open).toBe(false);
  });

  it('closes on Escape and on a backdrop click, emitting cyber-close once', async () => {
    const { userEvent } = await import('vitest/browser');
    const cmd = await opened();
    const closes = captureEvents(cmd, 'cyber-close');
    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => expect(cmd.open).toBe(false));
    expect(closes).toHaveLength(1);

    cmd.show();
    await cmd.updateComplete;
    dialogOf(cmd).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(cmd.open).toBe(false);
    // the native close event (and so cyber-close) is queued as a task
    await vi.waitFor(() => expect(closes).toHaveLength(2));
  });

  it('clears the filter on reopen', async () => {
    const cmd = await opened();
    await type(cmd, 'star');
    cmd.close();
    await cmd.updateComplete;
    cmd.show();
    await cmd.updateComplete;
    expect(cmd.query).toBe('');
    expect(inputOf(cmd).value).toBe('');
    expect(shown(cmd)).toHaveLength(4);
  });

  it('toggles from the hotkey', async () => {
    const cmd = fixture<CyberCommand>(
      markup.replace(
        '<cyber-command ',
        '<cyber-command hotkey="ctrl+shift+k" ',
      ),
    );
    await cmd.updateComplete;
    const press = (init: KeyboardEventInit) =>
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          bubbles: true,
          cancelable: true,
          ...init,
        }),
      );
    press({ ctrlKey: true }); // missing shift
    await cmd.updateComplete;
    expect(cmd.open).toBe(false);

    press({ ctrlKey: true, shiftKey: true });
    await cmd.updateComplete;
    expect(cmd.open).toBe(true);

    press({ ctrlKey: true, shiftKey: true });
    await cmd.updateComplete;
    expect(cmd.open).toBe(false);
  });

  it('picks up items added later', async () => {
    const cmd = await opened();
    const item = document.createElement('cyber-command-item');
    item.textContent = 'Self-destruct';
    cmd.append(item);
    await vi.waitFor(() => expect(shown(cmd)).toContain('Self-destruct'));
  });

  it('has no axe violations, closed and open', async () => {
    const cmd = fixture<CyberCommand>(markup);
    await cmd.updateComplete;
    await expectAccessible(cmd);
    cmd.show();
    await cmd.updateComplete;
    expect(inputOf(cmd).getAttribute('role')).toBe('combobox');
    expect(inputOf(cmd).getAttribute('aria-controls')).toBe('list');
    await expectAccessible(cmd);
  });
});
