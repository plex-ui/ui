// Backward-compatible alias of Tabs, as in packages/ui/src/components/SegmentedControl.
// React's `SegmentedControl.Option` / `SegmentedControl.Tab` are flat exports here.
export {
  Tabs as SegmentedControl,
  TabsTab as SegmentedControlOption,
  TabsTab as SegmentedControlTab,
  type SizeVariant,
  type TabsBadgeProp as SegmentedControlBadgeProp,
  type TabProps as SegmentedControlOptionProps,
  type TabsProps as SegmentedControlProps,
} from "../Tabs/index.js"
