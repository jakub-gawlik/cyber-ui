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

// @ts-expect-error — `open` is a boolean
export const badProp: Props<'cyber-modal'> = { open: 'yes' };
// @ts-expect-error — not an activation mode
export const badUnion: Props<'cyber-tabs'> = { activation: 'eager' };
