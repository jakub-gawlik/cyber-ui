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
    <cyber-dropdown
      placement="top-end"
      oncyber-select={(event) => event.detail.item.focus()}
    />
    <cyber-tooltip content="Jump drive offline" placement="right" delay={0}>
      <button>Jump</button>
    </cyber-tooltip>
    <cyber-popover label="Filters" open oncyber-close={(event) => event.type}>
      <button slot="trigger">Filters</button>
    </cyber-popover>
    <cyber-progress
      label="Hull"
      value={72}
      max={100}
      variant="danger"
      striped
    />
    <cyber-meter label="Shields" value={35} low={30} high={70} optimum={100} />
    <cyber-spinner label="Decrypting" variant="accent" />
    <cyber-skeleton shape="text" />
    <cyber-command
      hotkey="mod+k"
      oncyber-select={(event) => event.detail.value.toUpperCase()}
    >
      <cyber-command-item
        value="scan"
        group="Ship"
        shortcut="S"
        keywords="probe"
      >
        Scan system
      </cyber-command-item>
    </cyber-command>
    <cyber-toaster
      position="bottom-left"
      oncyber-toast-dismiss={(event) => event.detail.reason === 'timeout'}
    />
    <form>
      <cyber-input
        name="callsign"
        label="Callsign"
        type="email"
        required
        minlength={3}
        help-text="Visible to allies"
        oninput={(event) => event.target}
        onchange={(event) => event.type}
      />
      <cyber-textarea name="log" rows={6} value="Day 1" />
      <cyber-checkbox name="shields" checked indeterminate>
        Shields
      </cyber-checkbox>
      <cyber-switch name="cloak" defaultChecked />
      <cyber-radio-group name="faction" value="union" orientation="horizontal">
        <cyber-radio value="union">Union</cyber-radio>
      </cyber-radio-group>
      <cyber-slider name="power" min={0} max={100} step={5} value={60} />
      <cyber-select name="sector" placeholder="Choose" open={false}>
        <cyber-option value="kepler">Kepler</cyber-option>
      </cyber-select>
    </form>
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
// @ts-expect-error — not a placement
export const badPlacement = <cyber-tooltip placement="center" />;
// @ts-expect-error — not a bar variant
export const badVariant = <cyber-progress variant="plasma" />;
// @ts-expect-error — not a shape
export const badShape = <cyber-skeleton shape="blob" />;
// @ts-expect-error — not an input type
export const badType = <cyber-input type="color" />;
// @ts-expect-error — the slider's value is a number
export const badSlider = <cyber-slider value="60" />;
// @ts-expect-error — validity is read-only, so it isn't a prop
export const badReadonly = <cyber-select validity={undefined} />;
