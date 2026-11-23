import type { ComponentType } from 'react';

type DemoModule = Record<string, ComponentType>;

/** The demo files of the React Native pages, loaded when a page shows one of their examples. */
export const demoModules: Record<string, () => Promise<DemoModule>> = {
  button: () => import('./ButtonDemos'),
  switch: () => import('./SwitchDemos'),
  dialog: () => import('./DialogDemos'),
  'action-sheet': () => import('./ActionSheetDemos'),
  'bottom-sheet': () => import('./BottomSheetDemos'),
  menu: () => import('./MenuDemos'),
  toast: () => import('./ToastDemos'),
  toolbar: () => import('./ToolbarDemos'),
  'tab-bar': () => import('./TabBarDemos'),
  checkbox: () => import('./CheckboxDemos'),
  'radio-group': () => import('./RadioGroupDemos'),
  input: () => import('./InputDemos'),
  'otp-input': () => import('./OTPInputDemos'),
  select: () => import('./SelectDemos'),
  'segmented-control': () => import('./SegmentedControlDemos'),
  slider: () => import('./SliderDemos'),
  chip: () => import('./ChipDemos'),
  avatar: () => import('./AvatarDemos'),
  badge: () => import('./BadgeDemos'),
  card: () => import('./CardDemos'),
  list: () => import('./ListDemos'),
  skeleton: () => import('./SkeletonDemos'),
  'empty-message': () => import('./EmptyMessageDemos'),
  'page-control': () => import('./PageControlDemos'),
  text: () => import('./TextDemos'),
};
