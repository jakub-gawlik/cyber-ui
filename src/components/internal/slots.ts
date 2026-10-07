/** True when a slot has any assigned element or non-whitespace text. */
export function slotHasContent(slot: HTMLSlotElement): boolean {
  return slot
    .assignedNodes({ flatten: true })
    .some(
      (node) =>
        node.nodeType === Node.ELEMENT_NODE ||
        (node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim()),
    );
}
