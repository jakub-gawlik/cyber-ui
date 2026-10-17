// Per-component entry points resolve with types, and match the all-in-one.
import { CyberModal } from '@jgawlik/cyber-ui/modal';
import { CyberTabs, type TabsOrientation } from '@jgawlik/cyber-ui/tabs';
import { toast, type ToastOptions } from '@jgawlik/cyber-ui/toast';
import { CyberCard } from '@jgawlik/cyber-ui/card';
import { CyberDropdown } from '@jgawlik/cyber-ui/dropdown';
import { CyberAccordion } from '@jgawlik/cyber-ui/accordion';
import * as all from '@jgawlik/cyber-ui';

export const same: [typeof CyberModal, typeof CyberTabs, typeof CyberCard] = [
  all.CyberModal,
  all.CyberTabs,
  all.CyberCard,
];
export const classes = [CyberDropdown, CyberAccordion];
export const orientation: TabsOrientation = 'vertical';
export const options: ToastOptions = { message: 'Jump complete' };
export const id: number = toast(options);

// the tag map is augmented by each entry, so querySelector stays typed
export const modal: CyberModal | null = document.querySelector('cyber-modal');

// @ts-expect-error — no such entry point
import type {} from '@jgawlik/cyber-ui/nope';
