// Vue 3 GlobalComponents typings generated from the manifest
// (@jgawlik/cyber-ui/vue).
import type { GlobalComponents } from 'vue';
import type {} from '@jgawlik/cyber-ui/vue';

type Props<Tag extends keyof GlobalComponents> = InstanceType<
  GlobalComponents[Tag]
>['$props'];

export const modal: Props<'cyber-modal'> = {
  open: true,
  noLightDismiss: true,
  onCyberClose: (event) => event.detail.returnValue.toUpperCase(),
};
export const tabs: Props<'cyber-tabs'> = {
  orientation: 'vertical',
  onCyberTabChange: (event) => event.detail.label.trim(),
};

export const input: Props<'cyber-input'> = {
  name: 'callsign',
  required: true,
  onInput: (event) => event.type,
  onChange: (event) => event.type,
};
export const slider: Props<'cyber-slider'> = { value: 60, min: 0, max: 100 };
export const tooltip: Props<'cyber-tooltip'> = {
  content: 'Jump drive offline',
  placement: 'bottom-start',
  delay: 0,
};
export const progress: Props<'cyber-progress'> = {
  value: 72,
  indeterminate: false,
  variant: 'success',
};
export const command: Props<'cyber-command'> = {
  hotkey: 'mod+k',
  onCyberSelect: (event) => event.detail.value.trim(),
};

// @ts-expect-error — the slider's value is a number
export const badSlider: Props<'cyber-slider'> = { value: '60' };
// @ts-expect-error — `open` is a boolean
export const badProp: Props<'cyber-modal'> = { open: 'yes' };
// @ts-expect-error — not an activation mode
export const badUnion: Props<'cyber-tabs'> = { activation: 'eager' };
// @ts-expect-error — not a placement
export const badPlacement: Props<'cyber-popover'> = { placement: 'center' };
