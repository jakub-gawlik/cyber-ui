/**
 * Listbox / menu typeahead: typing jumps to the next item whose label
 * starts with the typed characters. Repeating one character cycles
 * through the items starting with it; the buffer clears after a pause.
 */
export class Typeahead {
  private typed = '';
  private timer = 0;

  /**
   * Index of the item to move to for this keydown, or null when the key
   * isn't typeahead input or nothing matches.
   */
  match(
    event: KeyboardEvent,
    labels: string[],
    current: number,
  ): number | null {
    const { key } = event;
    if (key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) {
      return null;
    }
    // a leading space activates the focused item; don't swallow it
    if (key === ' ' && !this.typed) return null;
    this.typed += key.toLowerCase();
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => (this.typed = ''), 500);

    // repeating one character cycles through items starting with it;
    // otherwise keep matching the whole prefix from the current item
    const repeated = [...this.typed].every((c) => c === this.typed[0]);
    const prefix = repeated ? this.typed[0] : this.typed;
    const start = repeated ? current + 1 : Math.max(current, 0);
    for (let i = 0; i < labels.length; i++) {
      const index = (start + i) % labels.length;
      if (labels[index].trim().toLowerCase().startsWith(prefix)) return index;
    }
    return null;
  }

  dispose() {
    window.clearTimeout(this.timer);
    this.typed = '';
  }
}
