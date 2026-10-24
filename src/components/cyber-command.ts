import {
  LitElement,
  html,
  css,
  nothing,
  unsafeCSS,
  type PropertyValues,
} from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import commandStyles from '../styles/components/command.css?inline';

/**
 * <cyber-command-item> — one command of a <cyber-command>. Its text is the
 * label (what the filter matches, together with `keywords`); `value`
 * (defaults to the text) is what `cyber-select` reports.
 *
 * @slot - The command label.
 */
@customElement('cyber-command-item')
export class CyberCommandItem extends LitElement {
  static styles = css`
    :host {
      display: block;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  `;

  /** Reported value; when absent, the item's text is used. */
  @property({ reflect: true }) value?: string;

  /** Extra search terms the filter matches besides the label. */
  @property() keywords = '';

  /** Shortcut hint shown at the end of the row (display only). */
  @property() shortcut = '';

  /** Heading the item is listed under; items share a group by name. */
  @property() group = '';

  /** Listed but not selectable. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** The item's text. */
  get label(): string {
    return this.textContent?.trim() ?? '';
  }

  protected updated() {
    if (this.parentElement instanceof CyberCommand) {
      this.parentElement.requestUpdate();
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}

const itemValue = (item: CyberCommandItem) => item.value ?? item.label;

/** Every whitespace-separated token of `query` occurs in the haystack. */
function matches(query: string, item: CyberCommandItem): boolean {
  const haystack = `${item.label} ${item.keywords}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

const isMac = /Mac|iPhone|iPad/.test(
  typeof navigator === 'undefined' ? '' : navigator.platform,
);

/** `mod+k`, `ctrl+shift+p`, … → does this keydown match? */
function matchesHotkey(hotkey: string, event: KeyboardEvent): boolean {
  const parts = hotkey
    .toLowerCase()
    .split('+')
    .map((p) => p.trim());
  const key = parts.pop();
  if (!key || event.key.toLowerCase() !== key) return false;
  const want = {
    ctrl: parts.includes('ctrl') || (parts.includes('mod') && !isMac),
    meta: parts.includes('meta') || (parts.includes('mod') && isMac),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
  };
  return (
    event.ctrlKey === want.ctrl &&
    event.metaKey === want.meta &&
    event.shiftKey === want.shift &&
    event.altKey === want.alt
  );
}

interface Group {
  label: string;
  items: CyberCommandItem[];
}

/**
 * <cyber-command> — command palette: a modal search field over the
 * slotted <cyber-command-item>s, filtered as you type. Arrow keys move
 * the active command (wrapping), Home / End jump, Enter runs it (emits
 * `cyber-select` and closes), Escape or a backdrop click closes. Items
 * with the same `group` are listed under a heading; items without a group
 * come first.
 *
 * Built on a native `<dialog>` (top layer, focus trap). Follows the ARIA
 * combobox pattern: the input is a `role="combobox"` whose
 * `aria-activedescendant` points at the active `role="option"`. The
 * options live in the shadow root — each slotted item is assigned (manual
 * slot assignment) into its own option row, so the ARIA references never
 * cross the shadow boundary and filtering simply leaves non-matching items
 * unassigned.
 *
 * `hotkey` (e.g. `mod+k`; `mod` is ⌘ on Apple platforms and Ctrl
 * elsewhere) toggles the palette from anywhere in the page.
 *
 * @slot - <cyber-command-item> elements.
 * @slot empty - Shown when nothing matches (default: "No matching commands").
 * @csspart dialog - The native <dialog>.
 * @csspart search - The search row.
 * @csspart input - The search input (`role="combobox"`).
 * @csspart list - The `role="listbox"`.
 * @csspart group - A group heading.
 * @csspart option - An option row (`role="option"`).
 * @csspart shortcut - An option's shortcut hint.
 * @csspart empty - The empty state.
 * @csspart hints - The footer with key hints.
 * @fires {CustomEvent} cyber-open - The palette opened.
 * @fires {CustomEvent} cyber-close - The palette closed, by any path.
 * @fires {CustomEvent<{ item: CyberCommandItem; value: string }>} cyber-select -
 *   A command was chosen (Enter or click); the palette closes right after.
 *
 * @example
 * <cyber-command hotkey="mod+k" placeholder="Type a command…">
 *   <cyber-command-item value="scan" group="Ship" shortcut="S">Scan system</cyber-command-item>
 *   <cyber-command-item value="map" group="Navigation" keywords="galaxy">Open starmap</cyber-command-item>
 * </cyber-command>
 */
@customElement('cyber-command')
export class CyberCommand extends LitElement {
  /** @internal */
  static shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    // each item is assigned into its own role="option" row (see class docs)
    slotAssignment: 'manual',
  };

  static styles = [
    unsafeCSS(commandStyles),
    css`
      :host {
        display: contents;
      }

      [hidden] {
        display: none !important;
      }
    `,
  ];

  /** Whether the palette is shown. */
  @property({ type: Boolean, reflect: true }) open = false;

  /** Search field placeholder. */
  @property() placeholder = 'Type a command';

  /** Accessible name of the palette (default "Command palette"). */
  @property() label = 'Command palette';

  /** Keyboard shortcut that toggles the palette, e.g. `mod+k`. */
  @property() hotkey = '';

  /** Current filter text; cleared on open. */
  @property() query = '';

  @state() private items: CyberCommandItem[] = [];
  @state() private activeIndex = 0;

  @query('dialog') private dialog!: HTMLDialogElement;
  @query('input') private input!: HTMLInputElement;

  private others: Element[] = [];
  private observer = new MutationObserver(() => this.collect());

  /** Items matching `query`, in display order (grouped). */
  get visibleItems(): CyberCommandItem[] {
    return this.groups().flatMap((group) => group.items);
  }

  show() {
    this.open = true;
  }

  close() {
    this.open = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    this.collect();
    document.addEventListener('keydown', this.onDocumentKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.observer.disconnect();
    document.removeEventListener('keydown', this.onDocumentKeyDown);
  }

  private collect() {
    const children = [...this.children];
    this.items = children.filter(
      (el): el is CyberCommandItem => el instanceof CyberCommandItem,
    );
    this.others = children.filter((el) => !(el instanceof CyberCommandItem));
    this.requestUpdate();
  }

  private groups(): Group[] {
    const groups: Group[] = [];
    const byLabel = new Map<string, Group>();
    for (const item of this.items) {
      if (!matches(this.query, item)) continue;
      let group = byLabel.get(item.group);
      if (!group) {
        group = { label: item.group, items: [] };
        byLabel.set(item.group, group);
        // ungrouped items lead
        if (item.group) groups.push(group);
        else groups.unshift(group);
      }
      group.items.push(item);
    }
    return groups;
  }

  private emit(name: string, detail?: unknown) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true }),
    );
  }

  protected willUpdate(changed: PropertyValues<this>) {
    const changedKeys = changed as Map<string, unknown>;
    if (changed.has('open') && this.open) {
      this.query = '';
      this.activeIndex = 0;
    }
    // keep the active row on an enabled, visible item
    const visible = this.visibleItems;
    if (changed.has('query') || changedKeys.has('items')) {
      this.activeIndex = visible.findIndex((item) => !item.disabled);
    }
    if (this.activeIndex >= visible.length)
      this.activeIndex = visible.length - 1;
  }

  protected updated(changed: PropertyValues<this>) {
    // manual assignment: each visible item into its option row, `empty`
    // slot content into the empty state
    const slots = this.renderRoot.querySelectorAll<HTMLSlotElement>(
      '[role="option"] slot',
    );
    this.visibleItems.forEach((item, i) => slots[i]?.assign(item));
    this.renderRoot
      .querySelector<HTMLSlotElement>('slot[name="empty"]')
      ?.assign(...this.others.filter((el) => el.slot === 'empty'));

    if (changed.has('open')) {
      if (this.open && !this.dialog.open) {
        this.dialog.showModal();
        this.input.value = '';
        this.input.focus();
        this.emit('cyber-open');
      } else if (!this.open && this.dialog.open) {
        this.dialog.close();
      }
    }
    if (
      (changed as Map<string, unknown>).has('activeIndex') ||
      changed.has('query')
    ) {
      this.renderRoot
        .querySelector('[role="option"][aria-selected="true"]')
        ?.scrollIntoView?.({ block: 'nearest' });
    }
  }

  /** Native close event: fires for every close path, so cyber-close is
      emitted here once. */
  private onNativeClose = () => {
    this.open = false;
    this.emit('cyber-close');
  };

  private onDialogClick = (event: MouseEvent) => {
    if (event.target === this.dialog) this.close();
  };

  private onDocumentKeyDown = (event: KeyboardEvent) => {
    if (!this.hotkey || event.defaultPrevented) return;
    if (!matchesHotkey(this.hotkey, event)) return;
    event.preventDefault();
    if (this.open) this.close();
    else this.show();
  };

  private onInput = (event: Event) => {
    this.query = (event.target as HTMLInputElement).value;
  };

  private move(step: number) {
    const visible = this.visibleItems;
    const enabled = visible
      .map((item, i) => (item.disabled ? -1 : i))
      .filter((i) => i >= 0);
    if (!enabled.length) return;
    const at = enabled.indexOf(this.activeIndex);
    const next =
      step === Infinity
        ? enabled.length - 1
        : step === -Infinity
          ? 0
          : (at + step + enabled.length) % enabled.length;
    this.activeIndex = enabled[next];
  }

  private onInputKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        this.move(1);
        break;
      case 'ArrowUp':
        this.move(-1);
        break;
      case 'Home':
        this.move(-Infinity);
        break;
      case 'End':
        this.move(Infinity);
        break;
      case 'Enter': {
        const item = this.visibleItems[this.activeIndex];
        if (item) this.pick(item);
        break;
      }
      default:
        return;
    }
    event.preventDefault();
  };

  private pick(item: CyberCommandItem) {
    if (item.disabled) return;
    this.emit('cyber-select', { item, value: itemValue(item) });
    this.close();
  }

  private onOptionClick(item: CyberCommandItem) {
    this.pick(item);
  }

  private onOptionPointerMove(index: number) {
    if (this.activeIndex !== index) this.activeIndex = index;
  }

  render() {
    const groups = this.groups();
    const activeId = groups.length ? `option-${this.activeIndex}` : undefined;
    let index = 0;
    return html`
      <dialog
        class="cyber-command"
        part="dialog"
        aria-label=${this.label}
        @close=${this.onNativeClose}
        @click=${this.onDialogClick}
      >
        <div class="cyber-command__search" part="search">
          <span class="cyber-command__prompt" aria-hidden="true">&gt;</span>
          <input
            class="cyber-command__input"
            part="input"
            type="text"
            role="combobox"
            aria-label=${this.label}
            aria-expanded="true"
            aria-controls="list"
            aria-autocomplete="list"
            aria-activedescendant=${ifDefined(activeId)}
            autocomplete="off"
            spellcheck="false"
            placeholder=${this.placeholder}
            .value=${this.query}
            @input=${this.onInput}
            @keydown=${this.onInputKeyDown}
          />
        </div>
        <div
          id="list"
          class="cyber-command__list"
          part="list"
          role="listbox"
          aria-label=${this.label}
        >
          ${groups.map((group, g) => {
            const headingId = group.label ? `group-${g}` : undefined;
            const rows = group.items.map((item) => {
              const i = index++;
              return html`
                <div
                  id="option-${i}"
                  class="cyber-command__item"
                  part="option"
                  role="option"
                  aria-selected=${i === this.activeIndex ? 'true' : 'false'}
                  aria-disabled=${item.disabled ? 'true' : nothing}
                  @click=${() => this.onOptionClick(item)}
                  @pointermove=${() => this.onOptionPointerMove(i)}
                >
                  <slot></slot>
                  ${
                    item.shortcut
                      ? html`<kbd
                          class="cyber-command__shortcut"
                          part="shortcut"
                          >${item.shortcut}</kbd
                        >`
                      : nothing
                  }
                </div>
              `;
            });
            return headingId
              ? html`
                  <div role="group" aria-labelledby=${headingId}>
                    <div
                      id=${headingId}
                      class="cyber-command__group"
                      part="group"
                      role="presentation"
                    >
                      ${group.label}
                    </div>
                    ${rows}
                  </div>
                `
              : rows;
          })}
          <div
            class="cyber-command__empty"
            part="empty"
            ?hidden=${groups.length > 0}
          >
            <slot name="empty">No matching commands</slot>
          </div>
        </div>
        <div class="cyber-command__hints" part="hints">
          <span><kbd>↑↓</kbd>navigate</span>
          <span><kbd>↵</kbd>select</span>
          <span><kbd>esc</kbd>close</span>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-command': CyberCommand;
    'cyber-command-item': CyberCommandItem;
  }
}
