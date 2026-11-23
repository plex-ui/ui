import { useId, useState, type ReactNode } from "react"
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Glass } from "../../internal/Glass"
import { useRipple } from "../../internal/ripple"
import { useKeyboardHeight } from "../../internal/keyboard"
import { androidDialogMotion, canTransformGlass, glassOpacity, iosDim, Overlay, ANDROID_DIALOG, ANDROID_DIM } from "../../internal/Overlay"
import { withAlpha, dangerText } from "../../theme/material"
import { ThemeProvider, useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { Text } from "../Text/Text"

export type DialogAction = {
  label: string
  onPress?: () => void
  /** `cancel` stands first of two side by side on iOS (a stack keeps the order written, as the web); `destructive` in red. */
  variant?: "default" | "cancel" | "destructive"
  /** The preferred action: semibold on the accent with a white label on iOS (UIAlertController `preferredAction`); on Android it stands last, at the end. */
  preferred?: boolean
  disabled?: boolean
  /** Keep the dialog open after the action. @default false */
  keepOpen?: boolean
  testID?: string
}

export type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  /** The message under the title. */
  description?: ReactNode
  /** The actions; two stand side by side on iOS, three or more stack. */
  actions?: DialogAction[]
  /** Content between the text and the actions, as a text field. */
  children?: ReactNode
  /** `stacked` stacks two actions too; `inline` keeps more in a row. @default by count, as the web */
  mobileLayout?: "inline" | "stacked"
  /** A tap outside, Android's back and Escape close it: Android's dialogs do, an iOS alert does not. @default Android true, iOS false */
  dismissible?: boolean
  testID?: string
}

/**
 * A dialog that asks for a decision: on iOS the alert of iOS 26 (UIAlertController `.alert`: 320 wide, glass, radius
 * 34, capsule actions 48 tall, `--dialog-alert-*`, Dialog.module.css), on Android a flat alert (at most 356 wide,
 * radius 21, a Medium 20 title over 16 text, text buttons in the accent at the end, Android's dialog animation). The
 * web Dialog's `mobileVariant="alert"` as one call; a sheet is `BottomSheet`.
 */
export function Dialog({ open, onOpenChange, title, description, actions = [], children, mobileLayout, dismissible, testID }: DialogProps) {
  const theme = useTheme()
  const close = () => onOpenChange(false)
  const run = (action: DialogAction) => {
    // A closing dialog runs nothing: a second tap while it fades does not repeat the action
    if (action.disabled || !open) return
    action.onPress?.()
    if (!action.keepOpen) close()
  }
  const scrim = iosDim(theme)
  const insets = useSafeAreaInsets()
  // Android's modal window draws edge to edge and does not resize for the keyboard: the dialog rises by its height
  // (the Android look rises in its own frame)
  const keyboard = useKeyboardHeight(open && Platform.OS === "android" && !theme.isAndroid)
  // Centred in the whole screen, as the web's alert (16 from the edges of the viewport): the larger inset on both
  // sides, so the status bar and the home indicator do not move it off the middle
  const edge = Math.max(insets.top, insets.bottom) + 16
  const ids = { title: useId(), description: useId() }
  // The web names the alert dialog by its title and describes it by its message; a phone keeps the modal view
  const a11y =
    Platform.OS === "web"
      ? { role: "alertdialog" as const, "aria-modal": true, "aria-labelledby": ids.title, "aria-describedby": description != null ? ids.description : undefined }
      : { accessibilityRole: "alert" as const, accessibilityViewIsModal: true }
  if (theme.isAndroid) {
    return (
      <AndroidFrame open={open} onClose={close} dismissible={dismissible ?? true} a11y={a11y} testID={testID}>
        <AndroidDialog theme={theme} title={title} description={description} actions={actions} run={run} ids={ids}>
          {children}
        </AndroidDialog>
      </AndroidFrame>
    )
  }
  // With reduced motion it fades in place (Dialog.module.css): no scale
  const scale = !theme.reducedMotion && canTransformGlass
  return (
    <Overlay open={open} onDismiss={close} scrim={scrim} dismissible={dismissible ?? false} motion="dialog" testID={testID}>
      {(progress, opening, focus) => (
        // The dialog rises over the keyboard, and its text scrolls when the screen is short
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          pointerEvents="box-none"
          style={[styles.center, { paddingTop: edge, paddingBottom: edge + keyboard }]}
        >
          <Animated.View
            {...a11y}
            // On the web the alert itself takes the first focus: not its field (a phone's keyboard) nor a ringed button
            tabIndex={focus.tabIndex}
            onBlur={focus.onBlur}
            style={[
              {
                flexShrink: 1,
                opacity: glassOpacity(progress, opening),
                transform: scale ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1.1, 1] }) }] : undefined,
              },
              focus.style,
            ]}
          >
            <IOSAlert theme={theme} title={title} description={description} actions={actions} run={run} ids={ids} layout={mobileLayout}>
              {children}
            </IOSAlert>
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </Overlay>
  )
}

type FrameProps = {
  open: boolean
  onClose: () => void
  dismissible: boolean
  /** The role and names of the dialog's element. */
  a11y: Record<string, unknown>
  testID?: string
  children: ReactNode
}

/**
 * The window of an Android dialog: centred over a 50% dim, rising over the keyboard, and moving as Android's dialog
 * animation (Animation.Dialog, which the alert keeps as it is): the scale 0.9 to 1 over 220ms on a decelerate quint
 * and the fade over 150ms on a decelerate cubic, the same curves both ways. The dim fades on its own, at an even
 * pace over 110ms both ways (the window's dim). With reduced motion it only fades, with the dim.
 */
function AndroidFrame({ open, onClose, dismissible, a11y, testID, children }: FrameProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  // Android's modal window draws edge to edge and does not resize for the keyboard: the dialog rises by its height
  const keyboard = useKeyboardHeight(open && Platform.OS === "android")
  const edge = Math.max(insets.top, insets.bottom) + 16
  const reduced = theme.reducedMotion
  return (
    <Overlay
      open={open}
      onDismiss={onClose}
      scrim={ANDROID_DIM.dialog}
      dismissible={dismissible}
      motion="dialog"
      scrimOpacity={reduced ? undefined : androidDim}
      testID={testID}
    >
      {(progress, opening, focus) => {
        const motion = reduced ? null : androidDialogMotion(progress, opening)
        return (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            pointerEvents="box-none"
            style={[styles.center, { paddingTop: edge, paddingBottom: edge + keyboard }]}
          >
            <Animated.View
              {...a11y}
              tabIndex={focus.tabIndex}
              onBlur={focus.onBlur}
              style={[{ flexShrink: 1, opacity: motion ? motion.opacity : progress, transform: motion ? [{ scale: motion.scale }] : undefined }, focus.style]}
            >
              {children}
            </Animated.View>
          </KeyboardAvoidingView>
        )
      }}
    </Overlay>
  )
}

/** The share of the dialog animation's even 220ms the dim takes, from its start: 110ms. */
const DIM_END = 110 / ANDROID_DIALOG.scale

/** The dim of an Android dialog from the overlay's even progress: in over the first 110ms, out over the first 110 of the exit. */
function androidDim(progress: Animated.Value, opening: boolean) {
  return opening
    ? progress.interpolate({ inputRange: [0, DIM_END], outputRange: [0, 1], extrapolate: "clamp" })
    : progress.interpolate({ inputRange: [1 - DIM_END, 1], outputRange: [0, 1], extrapolate: "clamp" })
}

export type ChoiceDialogProps = {
  open: boolean
  onClose: () => void
  /** The setting's name, over the rows. */
  title?: ReactNode
  /** The button that closes the dialog with no change (the one button of a single choice). */
  cancelLabel: string
  /** A multiple choice's button after Cancel, which applies the rows checked (`onOk`) and closes the dialog. */
  okLabel?: string
  onOk?: () => void
  /** The rows, across the dialog's whole width; they scroll under the title when the screen is short. */
  children: ReactNode
  /** Props for the element that holds the rows (its role and name). */
  listProps?: Record<string, unknown>
  testID?: string
}

/**
 * Android's choice alert: the dialog's panel, its title and rows across its width; one Cancel button for a single
 * choice (a row picks and closes), Cancel and OK at the end, 8 apart, for a multiple one (the rows check, OK applies).
 * Select's picker on Android; not part of the public API.
 */
export function ChoiceDialog({ open, onClose, title, cancelLabel, okLabel, onOk, children, listProps, testID }: ChoiceDialogProps) {
  const theme = useTheme()
  const ids = { title: useId(), description: useId() }
  const a11y =
    Platform.OS === "web"
      ? { role: "dialog" as const, "aria-modal": true, "aria-labelledby": title != null ? ids.title : undefined }
      : { accessibilityViewIsModal: true }
  const run = (action: DialogAction) => {
    if (!open) return
    action.onPress?.()
    onClose()
  }
  return (
    <AndroidFrame open={open} onClose={onClose} dismissible a11y={a11y} testID={testID}>
      <AndroidDialog
        theme={theme}
        title={title}
        actions={
          okLabel != null
            ? [
                { label: cancelLabel, variant: "cancel", testID: testID ? `${testID}-cancel` : undefined },
                { label: okLabel, preferred: true, onPress: onOk, testID: testID ? `${testID}-ok` : undefined },
              ]
            : [{ label: cancelLabel, testID: testID ? `${testID}-cancel` : undefined }]
        }
        run={run}
        ids={ids}
        list={<View {...listProps}>{children}</View>}
      />
    </AndroidFrame>
  )
}

type PanelProps = {
  theme: Theme
  title: ReactNode
  description?: ReactNode
  actions: DialogAction[]
  run: (action: DialogAction) => void
  /** The ids of the title and the message, which the web's dialog points at. */
  ids: { title: string; description: string }
  children?: ReactNode
}

type AndroidPanelProps = Omit<PanelProps, "title"> & {
  title?: ReactNode
  /** Rows across the panel's width under the title, in place of the text (an Android dialog with a list of rows). */
  list?: ReactNode
}

function IOSAlert({ theme, title, description, actions, run, ids, layout, children }: PanelProps & { layout?: "inline" | "stacked" }) {
  const { width: screen } = useWindowDimensions()
  const width = Math.min(theme.length("--dialog-alert-width", 320), screen - 32)
  const radius = theme.length("--dialog-alert-radius", 34)
  const inline = layout === "inline" || (layout !== "stacked" && actions.length <= 2)
  // The cancel action stands first of two side by side, as UIAlertController; a stack keeps the order written, as the
  // web's alert footer does. Each keeps its place in `actions` as its key, since two actions may share a label
  const indexed = actions.map((action, index) => ({ action, index }))
  const cancel = indexed.filter(({ action }) => action.variant === "cancel")
  const others = indexed.filter(({ action }) => action.variant !== "cancel")
  const ordered = inline ? [...cancel, ...others] : indexed
  const gap = theme.length("--dialog-alert-action-gap", 8)
  const type = { fontSize: theme.length("--dialog-mobile-type-size", 17), lineHeight: theme.length("--dialog-mobile-type-leading", 22) }
  return (
    <Glass radius={radius} elevation="raised" fillToken="--dialog-alert-background" style={{ width, flexShrink: 1, padding: theme.length("--dialog-alert-padding", 16), gap: 10 }}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ gap: 10 }} bounces={false}>
        {/* The text 31 from the sides: 16 of padding and 15 of the header's own */}
        <View style={{ paddingTop: 5, paddingHorizontal: 15, paddingBottom: 5.5, gap: 5.67 }}>
          <Text nativeID={ids.title} weight="semibold" style={[type, { textAlign: description == null ? "center" : "auto" }]} accessibilityRole="header">
            {title}
          </Text>
          {description != null ? (
            <Text nativeID={ids.description} color={theme.color("--dialog-alert-message-color")} style={{ fontSize: 15, lineHeight: 20 }}>
              {description}
            </Text>
          ) : null}
        </View>
        {children != null ? (
          // A field fills the alert as its actions do: the largest control size is the alert's 48 there
          // (Dialog.module.css sets --control-size-3xl to --dialog-alert-field-height in the alert's body)
          <ThemeProvider brand={{ tokens: { "--control-size-3xl": `${theme.length("--dialog-alert-field-height", 48)}px` } }}>
            <View style={{ paddingBottom: 10, marginHorizontal: -1 }}>{children}</View>
          </ThemeProvider>
        ) : null}
      </ScrollView>
      {ordered.length ? (
        <View style={[{ gap, marginTop: children != null ? 0 : 4 }, inline ? styles.row : null]}>
          {ordered.map(({ action, index }) => (
            <IOSAction key={index} theme={theme} action={action} run={run} type={type} grow={inline} />
          ))}
        </View>
      ) : null}
    </Glass>
  )
}

function IOSAction({ theme, action, run, type, grow }: { theme: Theme; action: DialogAction; run: (action: DialogAction) => void; type: { fontSize: number; lineHeight: number }; grow: boolean }) {
  // The preferred action is the accent with a white label, its sheen and edge, as a bar's prominent button
  // (Dialog.module.css: an alert's solid footer action takes the --toolbar-prominent tokens); disabled, the phone's
  // disabled fill (Button.module.css). A destructive one keeps the alert's fill and its red label
  const accent = action.preferred && action.variant !== "destructive"
  const height = theme.length("--dialog-alert-action-height", 48)
  const [measured, setMeasured] = useState(height)
  const fill = accent
    ? action.disabled
      ? theme.color("--button-mobile-disabled-background", theme.color("--color-background-disabled"))
      : theme.color("--toolbar-prominent-background")
    : theme.color("--dialog-alert-fill")
  const text = action.disabled
    ? theme.color("--mobile-label-tertiary")
    : action.variant === "destructive"
      ? theme.color("--color-text-danger")
      : accent
        ? theme.color("--toolbar-prominent-color")
        : theme.colors.text
  const lit = accent && !action.disabled
  const shadow = lit ? theme.token("--toolbar-prominent-shadow") : undefined
  const sheen = lit ? sheenOf(theme, measured) : undefined
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!action.disabled }}
      disabled={action.disabled}
      onPress={() => run(action)}
      onLayout={lit ? (event) => setMeasured(event.nativeEvent.layout.height) : undefined}
      testID={action.testID}
      style={({ pressed }) => [
        styles.iosAction,
        {
          minHeight: height,
          borderRadius: height / 2,
          backgroundColor: lit && pressed ? theme.color("--toolbar-prominent-background-active") : fill,
          opacity: pressed && !lit ? 0.7 : 1,
          boxShadow: typeof shadow === "string" ? shadow : undefined,
        },
        grow ? styles.grow : null,
      ]}
    >
      {sheen ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: height / 2, backgroundImage: sheen }]} /> : null}
      <Text color={text} weight={action.preferred ? "semibold" : "medium"} style={[type, styles.centered]}>
        {action.label}
      </Text>
    </Pressable>
  )
}

/**
 * `--toolbar-prominent-sheen`, lighter along the top and the bottom edge, for a face of a known height: its
 * `calc(100% - 8px)` stop in pixels, since React Native's gradients take no calc().
 */
function sheenOf(theme: Theme, height: number) {
  const value = theme.token("--toolbar-prominent-sheen")
  if (typeof value !== "string" || !value.includes("gradient")) return undefined
  return value.replace(/calc\(\s*100%\s*-\s*([\d.]+)px\s*\)/g, (_, px: string) => `${Math.max(0, height - Number(px))}px`)
}

function AndroidDialog({ theme, title, description, actions, run, ids, children, list }: AndroidPanelProps) {
  const m = theme.material
  const { width: screen } = useWindowDimensions()
  // Android's alert: 48 from the screen's sides, at most 356 wide
  const width = Math.min(screen - 48, 356)
  // The positive action: the preferred one, else the last that is not a cancel. The row reads the neutral actions at
  // the start, a space, then the negative and the positive at the end; stacked, the positive comes first
  const positive = actions.find((action) => action.preferred) ?? [...actions].reverse().find((action) => action.variant !== "cancel")
  const negative = actions.filter((action) => action !== positive && action.variant === "cancel")
  const neutral = actions.filter((action) => action !== positive && action.variant !== "cancel")
  const bar = [...neutral, ...negative, ...(positive ? [positive] : [])]
  // Each button's own width, measured in either layout (their content's, never stretched), and the row's: they stack
  // when they do not fit side by side
  const [room, setRoom] = useState(0)
  const [widths, setWidths] = useState<number[]>([])
  const measured = bar.every((_, index) => widths[index] != null)
  const needed = bar.reduce((sum, _, index) => sum + (widths[index] ?? 0), 0) + GAP * Math.max(0, bar.length - 1)
  const stacked = room > 0 && measured && needed > room + 0.5
  const order = stacked ? [...bar.keys()].reverse() : [...bar.keys()]
  const button = (index: number) => {
    const action = bar[index]
    return (
      <AndroidDialogButton
        key={actions.indexOf(action)}
        theme={theme}
        action={action}
        run={run}
        onWidth={(next) => setWidths((current) => (current[index] === next ? current : Object.assign([...current], { [index]: next })))}
      />
    )
  }
  return (
    <View style={[styles.android, { width, backgroundColor: androidDialogBackground(theme) }]}>
      {list != null ? (
        // A list: the title stays, 14 over the rows, and the rows scroll under it (AlertDialog with a custom view)
        <>
          {title != null ? (
            <Text nativeID={ids.title} color={m.onSurface} accessibilityRole="header" style={[styles.androidTitle, styles.androidListTitle, theme.font("medium")]}>
              {title}
            </Text>
          ) : null}
          <ScrollView style={styles.scroll} contentContainerStyle={title != null ? null : styles.androidListTop} bounces={false}>
            {list}
          </ScrollView>
        </>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.androidText} bounces={false}>
          <Text nativeID={ids.title} color={m.onSurface} accessibilityRole="header" style={[styles.androidTitle, theme.font("medium")]}>
            {title}
          </Text>
          {description != null ? (
            <Text nativeID={ids.description} color={m.onSurface} style={styles.androidMessage}>
              {description}
            </Text>
          ) : null}
          {children != null ? <View style={styles.androidContent}>{children}</View> : null}
        </ScrollView>
      )}
      {bar.length ? (
        <View onLayout={(event) => setRoom(event.nativeEvent.layout.width - 16)} style={stacked ? styles.androidStack : styles.androidActions}>
          {order.map((index) =>
            // The neutral actions at the start, a space, then the negative and the positive
            !stacked && index === neutral.length && neutral.length ? [<View key="space" style={styles.grow} />, button(index)] : button(index),
          )}
        </View>
      ) : null}
    </View>
  )
}

/**
 * Android's dialog button: Medium 16 in the accent, red for a destructive one, half faded when disabled; its press the
 * ripple of the label's color at 10% from the touch point, clipped to its 20dp pill (the platform's on a device).
 */
function AndroidDialogButton({ theme, action, run, onWidth }: { theme: Theme; action: DialogAction; run: (action: DialogAction) => void; onWidth: (width: number) => void }) {
  const color = action.variant === "destructive" ? dangerText(theme) : theme.material.primary
  const press = withAlpha(color, 0.1)
  const nativeRipple = Platform.OS === "android"
  const ripple = useRipple(press, !nativeRipple, theme.reducedMotion)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!action.disabled }}
      disabled={action.disabled}
      onPress={() => run(action)}
      onPressIn={nativeRipple ? undefined : ripple.start}
      onPressOut={nativeRipple ? undefined : ripple.end}
      android_ripple={nativeRipple ? { color: press, foreground: true } : undefined}
      onLayout={(event) => onWidth(event.nativeEvent.layout.width)}
      testID={action.testID}
      style={[styles.androidButton, { opacity: action.disabled ? 0.5 : 1 }]}
    >
      {ripple.layer}
      <Text color={color} style={[styles.androidLabel, { ...theme.font("medium") }]}>
        {action.label}
      </Text>
    </Pressable>
  )
}

/** The space between dialog buttons, in a row and stacked. */
const GAP = 8

/** The background of an Android dialog: white, a dark gray in dark mode. */
export const androidDialogBackground = (theme: Theme) => (theme.scheme === "dark" ? theme.material.surfaceContainer : theme.material.surfaceContainerLowest)

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  row: { flexDirection: "row" },
  grow: { flex: 1, flexBasis: 0 },
  centered: { textAlign: "center" },
  iosAction: { alignItems: "center", justifyContent: "center", paddingVertical: 13, paddingHorizontal: 16, borderCurve: "continuous" },
  // Android's alert: 21dp corners (the catalog's); the text 24 in. Measured on the reference's alerts: the title's
  // baseline 40 under the top, the message's first 33 under it in lines 18.75 apart (16sp Roboto's), its last 59
  // over the buttons' (Roboto's font padding sets these 2 to 3 lower than the layout's 19, 10 and 20 would)
  android: { flexShrink: 1, borderRadius: 21, overflow: "hidden" },
  androidText: { paddingHorizontal: 24, paddingTop: 21, paddingBottom: 21, gap: 13 },
  androidTitle: { fontSize: 20, lineHeight: 24 },
  // Over a list the title keeps its 24 at the sides, its line 21 under the panel's top (its capitals 25 under it and
  // its baseline 40, as the reference's) and 11 over the rows, which start 56 under the top (the first radio at 71), as
  // the web's
  androidListTitle: { paddingHorizontal: 24, paddingTop: 21, paddingBottom: 11 },
  // A list with no title starts 8 under the panel's top
  androidListTop: { paddingTop: 8 },
  androidMessage: { fontSize: 16, lineHeight: 18.75 },
  androidContent: { marginTop: 6 },
  // The button row: 56 tall (8 over and under its 40dp buttons, measured on the reference's alerts), 8 in from the sides
  androidActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: GAP, paddingHorizontal: 8, paddingVertical: 8 },
  // Stacked: 8 over and under the 40dp buttons (two make 96)
  androidStack: { alignItems: "flex-end", paddingHorizontal: 8, paddingVertical: 8 },
  // Android's dialog button: 40 tall, at least 64 wide, 12 at the sides; at least 40, so a larger font grows it
  androidButton: {
    minHeight: 40,
    minWidth: 64,
    maxWidth: "100%",
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  androidLabel: { fontSize: 16, lineHeight: 20, textAlign: "center" },
})
