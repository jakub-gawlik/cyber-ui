// React 19 JSX typings generated from the manifest (@jgawlik/cyber-ui/react).
import type {} from '@jgawlik/cyber-ui/react';

export const ok = (
  <>
    <cyber-modal
      open
      no-light-dismiss
      oncyber-close={(event) => event.detail.returnValue.toUpperCase()}
    >
      <span slot="title">Incoming Transmission</span>
    </cyber-modal>
    <cyber-tabs
      selected={1}
      orientation="vertical"
      activation="manual"
      className="wide"
      oncyber-tab-change={(event) => event.detail.index.toFixed()}
    >
      <cyber-tab-panel label="Fleet" />
    </cyber-tabs>
    <cyber-dropdown oncyber-select={(event) => event.detail.item.focus()} />
    <cyber-toaster
      position="bottom-left"
      oncyber-toast-dismiss={(event) => event.detail.reason === 'timeout'}
    />
    <cyber-card
      ref={(card) => {
        card?.shadowRoot?.querySelector('[part="card"]');
      }}
    />
  </>
);

// @ts-expect-error — `open` is a boolean
export const badProp = <cyber-modal open="yes" />;
// @ts-expect-error — not an orientation
export const badUnion = <cyber-tabs orientation="diagonal" />;
// @ts-expect-error — detail has no `index`
export const badDetail = <cyber-modal oncyber-close={(e) => e.detail.index} />;
// @ts-expect-error — not a position
export const badAttr = <cyber-toaster position="center" />;
