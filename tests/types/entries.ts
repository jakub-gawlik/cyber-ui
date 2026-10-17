// Per-component entry points resolve with types, and match the all-in-one.
import { CyberModal } from '@jgawlik/cyber-ui/modal';
import { CyberTabs, type TabsOrientation } from '@jgawlik/cyber-ui/tabs';
import { toast, type ToastOptions } from '@jgawlik/cyber-ui/toast';
import { CyberCard } from '@jgawlik/cyber-ui/card';
import { CyberDropdown } from '@jgawlik/cyber-ui/dropdown';
import { CyberAccordion } from '@jgawlik/cyber-ui/accordion';
import { CyberInput, type InputType } from '@jgawlik/cyber-ui/input';
import { CyberTextarea } from '@jgawlik/cyber-ui/textarea';
import { CyberCheckbox } from '@jgawlik/cyber-ui/checkbox';
import { CyberSwitch } from '@jgawlik/cyber-ui/switch';
import { CyberRadioGroup, CyberRadio } from '@jgawlik/cyber-ui/radio-group';
import { CyberSlider } from '@jgawlik/cyber-ui/slider';
import { CyberSelect, CyberOption } from '@jgawlik/cyber-ui/select';
import * as all from '@jgawlik/cyber-ui';

export const same: [typeof CyberModal, typeof CyberTabs, typeof CyberCard] = [
  all.CyberModal,
  all.CyberTabs,
  all.CyberCard,
];
export const classes = [CyberDropdown, CyberAccordion];
export const formClasses = [
  CyberTextarea,
  CyberCheckbox,
  CyberSwitch,
  CyberRadioGroup,
  CyberRadio,
  CyberSlider,
  CyberOption,
];
export const inputType: InputType = 'email';

// form-associated API, typed like native controls
declare const input: CyberInput;
export const valid: boolean = input.checkValidity();
export const owner: HTMLFormElement | null = input.form;
export const flags: ValidityState = input.validity;
declare const select: CyberSelect;
export const picked: CyberOption | undefined = select.selectedOption;
// @ts-expect-error — validity is read-only
input.validity = flags;
// @ts-expect-error — the slider's value is a number
document.querySelector('cyber-slider')!.value = '50';
export const orientation: TabsOrientation = 'vertical';
export const options: ToastOptions = { message: 'Jump complete' };
export const id: number = toast(options);

// the tag map is augmented by each entry, so querySelector stays typed
export const modal: CyberModal | null = document.querySelector('cyber-modal');

// @ts-expect-error — no such entry point
import type {} from '@jgawlik/cyber-ui/nope';
