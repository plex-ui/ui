# @plexui/react-native

Plex UI components for React Native and Expo. One set of components draws the iOS 26 look (the phone layer of
Plex UI: native sizes, glass) or Material 3 on Android, from the same design tokens as the web (`@plexui/styles`).

## Install

```bash
npx expo install @plexui/react-native react-native-svg react-native-safe-area-context
# optional: native glass on iOS 26, a blur elsewhere
npx expo install expo-glass-effect expo-blur
```

The docs, with a live example of every component: https://plexui.com/react-native/components

## Use

```tsx
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular"
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium"
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold"
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold"
import { Button, IconButton, Text, ThemeProvider, interFonts } from "@plexui/react-native"
import { Plus, Search } from "@plexui/react-native/icons"
import { useFonts } from "expo-font"

export default function App() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold })
  if (!loaded) return null
  return (
    <ThemeProvider fonts={interFonts}>
      <Text variant="title2">Hello</Text>
      <Button onPress={() => {}}>
        <Plus />
        New
      </Button>
      <IconButton icon={<Search />} accessibilityLabel="Search" />
    </ThemeProvider>
  )
}
```

`ThemeProvider` props:

- `scheme`: `"system"` (default), `"light"` or `"dark"`.
- `platform`: `"ios"` or `"android"`. Defaults to the device; a browser draws iOS.
- `selectionColor`: the on color of every Switch, Checkbox and RadioGroup that sets none of its own. `"primary"`
  (default) is the Plex primary, the ink, as on the web; `"accent"` is each platform's own: on iOS a switch turns the
  system green and a checkbox or a checkmark the accent, the iOS tint; on Android all of them take the accent.
- `brand`: a product's colors, tokens, fonts and radii over Plex UI:

```tsx
<ThemeProvider
  brand={{
    colors: { accent: "#7c3aed" },
    tokens: { "--color-background-primary-solid": "var(--color-accent)" },
    radius: { lg: 12 },
  }}
>
```

A nested `ThemeProvider` keeps its parent's brand and lays its own over it; `brand={null}` draws its subtree in Plex
UI's own colors and radii (a stand-in for a system prompt, which is in the system's colors, never the app's).

`useTheme()` gives any token resolved for the current scheme: `theme.color("--color-text")`,
`theme.length("--button-size-md")`, and Material 3 roles on `theme.material`.

## Components

- `Text`, `Heading`, icons (`@plexui/react-native/icons`, `/icons/lucide`, `/icons/tabler`, `/icons/hugeicons`)
- `Button`, `IconButton`, `NavigationButton` (back, close, confirm)
- `Toolbar` with `Toolbar.Leading`, `.Title`, `.Content`, `.Group`, `.Trailing`, `.Row`: an iOS 26 bar or a
  Material 3 top app bar (`placement="bottom"`: a bottom toolbar or Material's docked toolbar)
- `TabBar` with `TabBar.Item`: the iOS 26 glass tab bar (search and prominent tabs, badges, minimized, accessory) or
  Material 3's navigation bar; `useTabBarMinimize()` minimizes it on scroll
- `SegmentedControl` with `SegmentedControl.Tab`: the iOS segmented control (small plain, large glass) or Material 3's
  connected button group

```tsx
const [tab, setTab] = useState("home")
const minimize = useTabBarMinimize()

<ScrollView onScroll={minimize.onScroll} scrollEventThrottle={16}>…</ScrollView>
<TabBar value={tab} onValueChange={setTab} minimized={minimize.minimized} onMinimizedChange={minimize.onMinimizedChange}>
  <TabBar.Item value="home" label="Home" icon={<Home />} />
  <TabBar.Item value="chats" label="Chats" icon={<Chats />} badge={3} />
</TabBar>
```

### Forms and overlays

- `Switch`, `Checkbox` (`checked` may be `"indeterminate"`), `RadioGroup` + `RadioGroup.Item`: iOS 26 switch, circle
  checkbox and list checkmark; Material 3 switch, checkbox and radio button.
- `Input` and `TextField` (`label`, `description`, `errorMessage`): a 44pt iOS field; Material's outlined (`outline`)
  or filled (`soft`) text field with its floating label.
- `OTPInput` (`length`, `value`, `onChange`, `onComplete`, `grouping`, `invalid`, `errorMessage`): a one-time code,
  one digit per cell, autofilled from the keyboard; the web's phone cells on iOS, outlined code boxes on Android.
- `Field` (`label`, `description`, `errorMessage`, `required`, `hideLabel`, `orientation`, `row`) and `FieldError`: a
  label, help and an error around a control, on its own or as a row of a `List` (`columns`, `headerProminence`,
  `action`; a ghost `Button` among the rows is an action row), as the cells of an iOS form.
- `Textarea` (`rows`, `autoResize`, `maxRows`, `autoSelect`), `FloatingLabelInput` (`label`, `type`, `revealable`,
  `multiline`, `labelPlacement`): several lines; a label floating onto the Android outline, a cell named by its
  placeholder on iOS.
- `InputGroup` with `.Input`, `.Textarea`, `.Addon` (`align`), `.Button`, `.Text`: a field with a prefix, a unit, a
  menu or a button; `TagInput` (`value`, `onChange`, `validator`, `maxTags`, `delimiters`): typed words as tags.
- `Select` (`options`, `value`, `onChange(option)`): the field and a menu with a checkmark at the chosen option.
- `Menu` (`Trigger`, `Content`, `Item`, `Separator`, `Label`): iOS 26 glass menu; Material 3 dropdown menu.
- `Dialog` (`title`, `description`, `actions`): the iOS 26 alert; Material 3's basic dialog.
- `BottomSheet`, `ActionSheet` (React Native only): sheets from the bottom edge, dragged down to close.
- `toast()` and `<Toaster />`, as sonner on the web: iOS glass banners from the top; Material's snackbar.

```tsx
<Dialog
  open={open}
  onOpenChange={setOpen}
  title="Delete this photo?"
  description="It will be removed from all your devices."
  actions={[{ label: "Cancel", variant: "cancel" }, { label: "Delete", variant: "destructive", onPress: remove }]}
/>

toast.success("Payment sent", { description: "$24.00 to Jane", action: { label: "Undo", onClick: undo } })
```

### Content

- `Avatar` (`name`, `imageUrl`, `Icon`, `overflowCount`, `color`, `variant`), `AvatarGroup`: an initial, a symbol or
  `+N` on a soft or solid fill, a picture over it.
- `Badge` (`color`, `variant` soft/solid/outline, `size`, `pill`, `onRemove`) and `Chip` (filter: `selected`,
  `onSelectedChange`; action: `onPress`; input: `onRemove`): iOS capsules; Material 3 chips.
- `Card` with `Card.Header`, `.Title`, `.Description`, `.Content`, `.Footer`, `.Action` and `Card.Media` (a picture
  to the card's edges, with a `title` and `description` over it): a section of an iOS inset grouped list; Material's
  outlined and filled cards.
- `List` (`header`, `footer`) with `ListItem` (`label`, `description`, `leading`, `leadingColor`, `value`, `trailing`,
  `onPress`): an iOS 26 inset grouped section (the Settings look); a Material 3 list.
- `Skeleton`, `EmptyMessage` (also `EmptyState`) with `.Icon`, `.Title`, `.Description`, `.ActionRow`.
- `Slider` (`label`, `value`, `onChange`, `min`, `max`, `step`, `unit`, `marks`, `resetValue`; `range` with a value
  for each thumb; `orientation="vertical"`): the iOS 26 slider; Material 3's Slider, RangeSlider and VerticalSlider.
- `PageControl` (`count`, `value`, `onChange`): the iOS page dots, tapped or scrubbed.
- `Separator` (`orientation`, `decorative`) and `TextLink` (`href`, `primary`, `underline`, `onPress`), a link inside
  a `Text`.

### Progress

- `Progress` (`value`, `max`, `segments`, `size`, `color`; `value={null}` sweeps): the iOS progress view; Material 3's
  linear progress indicator.
- `ProgressSteps` with `.Step` (`icon`), `.Title` (`visuallyHidden`), `.Description` (`current`, `orientation`, `size`,
  `color`, `connectorStyle`; `variant="minimal"` with `total`): the steps of a flow, a check once completed.
- `Stepper` (`value`, `onChange`, `min`, `max`, `step`, `wrap`, `autoRepeat`, `showValue`, `onRemove`): UIStepper's
  two segments, or a cart's quantity with a trash can at one; adjustable for screen readers.
- `LoadingIndicator` (`size`, `color`, `duration`), `CircularProgress` (`progress`, `done`, `maxDuration`),
  `LoadingDots`: the iOS spinner and Material 3's circular indicator, a progress ring, three pulsing dots.
- `ShimmerText` and `ShimmerableText` (`shimmer`): a highlight sweeping across a label; `RollingNumber` (`value`,
  `format`, `locales`): each changed digit rolls to the new value. All of them stand still with reduced motion.

### Messages

- `Alert` (`color`, `variant`, `title`, `description`, `actions`, `mobileActions`, `indicator`, `onDismiss`, `banner`):
  an inline message in the shape of an iOS tip, its actions as capsules.
- `Tip` (`title`, `description`, `icon`, `actions`, `mobileActions`, `onClose`, `arrowEdge`) and `Tip.Popover`: TipKit's
  inline and popover tips; on Android a card with Material 3's rich tooltip layout.
- `Popover` with `Popover.Trigger`, `.Content` and `usePopoverController()`: the compact glass panel of an iPhone
  popover; a popup on Android.
- `Tooltip` (`content`, `compact`, `side`, `forceOpen`) with `Tooltip.TriggerDecorator`, and `CopyTooltip`
  (`copyValue`): shown on a long press; Material 3's plain and rich tooltips on Android.

```tsx
<List header="General" footer="Notifications show on the lock screen.">
  <ListItem label="Notifications" leading={<Bell />} leadingColor="#ff3b30" value="On" onPress={openNotifications} />
  <ListItem label="Dark mode" trailing={<Switch checked={dark} onCheckedChange={setDark} accessibilityLabel="Dark mode" />} />
</List>

<Card onPress={openTrip}>
  <Card.Media source={photo} aspectRatio={4 / 3} title="Sunset over the hills" description="Saved yesterday" />
</Card>
```

## Peers

`react`, `react-native`, `react-native-svg`, `react-native-safe-area-context`. Optional: `expo-glass-effect` (native
Liquid Glass on iOS 26) and `expo-blur` (blur under the glass on earlier iOS).

## Develop

```bash
npm run build:icons          # generate the icon modules (gitignored)
npm run typecheck
npm run lint
npm test                     # typecheck, lint and the Playwright tests of the example's web build
```

The example app (`example/`) shows every component in every state, with iOS / Android, light / dark and a brand
theme. `npm run web --prefix example` opens it in a browser; `npm run ios` / `npm run android` on a simulator.

A link opens any state of the example, which lets a script take screenshots of a device without a finger: in a
browser the fragment (`#platform=android&scheme=dark&screen=lists&scroll=1200`), on a device the query of a deep link
through Expo Go (`xcrun simctl openurl booted "exp://127.0.0.1:8081/--/?platform=ios&screen=lists&scroll=1200"`, or
`adb shell am start -a android.intent.action.VIEW -d "exp://10.0.2.2:8081/--/?platform=android&screen=lists"`).
`scroll` is how far down the screen to open; on the Overlays screen `open` shows an overlay (`dialog`,
`dialog-three`, `dialog-field`, `sheet`, `actions`, `menu`, `toast`, `toast-success`, `toast-action`, `toast-close`). The browser's
address keeps both until a control of the gallery changes.

`npm run typecheck` and `npm test` regenerate the icon modules; a running Metro can lose track of them while they are
rewritten (an icon "could not be found"): restart it.
