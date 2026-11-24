import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react"
import { Animated, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { FloatingPanel } from "../../internal/FloatingPanel"
import { Glass } from "../../internal/Glass"
import { glassOpacity, iosDim, Overlay } from "../../internal/Overlay"
import { dangerText } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { BottomSheetBase } from "../BottomSheet/BottomSheet"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { measure, type MenuAnchor, type Measurable } from "../Menu/Menu"
import { Text } from "../Text/Text"

export type ActionSheetAction = {
  label: string
  onPress?: () => void
  /** A symbol before the label; Android's list shows it, iOS leaves it out as UIAlertController does. */
  icon?: ReactNode
  destructive?: boolean
  disabled?: boolean
  testID?: string
}

export type ActionSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: ReactNode
  message?: ReactNode
  actions: ActionSheetAction[]
  /** The cancel action of iOS, the last of the panel. Android closes the sheet with a tap outside or Back. @default "Cancel" */
  cancelLabel?: string
  /**
   * The control the sheet opens from (a ref to a Button, a Pressable, a View). On iOS 26 the sheet then stands at it
   * as a glass panel, over or under it, with no Cancel: a tap anywhere else closes it (an iPhone's action sheet with a
   * `sourceItem`, WWDC25 "Build a UIKit app with the new design"). Android keeps its sheet from the bottom.
   */
  source?: RefObject<unknown>
  testID?: string
}

/**
 * A choice of actions (React Native only: the web has a Menu, a Popover or an alert Dialog). iOS 26 draws
 * UIAlertController's `.actionSheet` on an iPhone: with a `source`, a glass panel at that control (as the web's
 * Popover "Confirmation"), its 48pt capsule actions under the title and message, no Cancel, closed by a tap outside;
 * with no source, the same panel in the middle of the screen, Cancel its last capsule (as the web's alert Dialog with a
 * stacked footer). Android a menu sheet (its items: 48dp rows of Regular 16, the icon in a 56dp slot in the ink, gray
 * at night, the text 16 in with no icons, a gray title of 16 over them).
 */
export function ActionSheet({ open, onOpenChange, title, message, actions, cancelLabel = "Cancel", source, testID }: ActionSheetProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { height: screen } = useWindowDimensions()
  const close = () => onOpenChange(false)
  const run = (action: ActionSheetAction) => {
    // A closing sheet runs nothing: a second tap while it leaves does not repeat the action
    if (action.disabled || !open) return
    action.onPress?.()
    close()
  }
  // Android: an item's tap takes the sheet away faster (180ms on its ease-out, Back and a tap outside keep the sheet's
  // 250) and runs the item once the sheet has gone. An item still waiting when the sheet opens again or goes with its
  // screen runs then, so a tap is never lost
  const picked = useRef<ActionSheetAction | null>(null)
  const [quick, setQuick] = useState(false)
  if (open && quick) setQuick(false)
  const runPicked = useCallback(() => {
    const action = picked.current
    picked.current = null
    action?.onPress?.()
  }, [])
  useEffect(() => {
    if (open) runPicked()
  }, [open, runPicked])
  useEffect(() => runPicked, [runPicked])
  const pick = (action: ActionSheetAction) => {
    if (action.disabled || !open || picked.current) return
    picked.current = action
    setQuick(true)
    close()
  }
  const ids = { title: useId(), message: useId() }
  // The source's place, measured as the sheet opens (and again when the window turns)
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null)
  // A source that measures to nothing (no view yet, or one with no size): the sheet stands in the middle instead
  const [unplaced, setUnplaced] = useState(false)
  const { width: windowWidth } = useWindowDimensions()
  const sourced = !theme.isAndroid && source != null && !unplaced
  useEffect(() => {
    if (theme.isAndroid || source == null) return
    // Closed, the next opening tries its source again
    if (!open) {
      setUnplaced(false)
      return
    }
    let live = true
    // A new opening measures again: the panel never shows at the source's last place first
    setAnchor(null)
    // A frame at a time: a sheet open as its screen appears waits for its source's layout, up to 120 frames (2s), then
    // stands in the middle
    let frame = 0
    const attempt = (left: number) => {
      frame = requestAnimationFrame(() =>
        measure(source.current as Measurable | null, (box) => {
          if (!live) return
          const placed = box.width > 0 || box.height > 0
          if (!placed && left > 0) return attempt(left - 1)
          setAnchor(placed ? box : null)
          setUnplaced(!placed)
        }),
      )
    }
    attempt(120)
    return () => {
      live = false
      cancelAnimationFrame(frame)
    }
  }, [open, theme.isAndroid, source, windowWidth, screen])
  if (theme.isAndroid) {
    const m = theme.material
    const icons = actions.some((action) => action.icon)
    return (
      <BottomSheetBase
        open={open}
        onOpenChange={onOpenChange}
        testID={testID}
        contentStyle={styles.androidList}
        aria-label={typeof title === "string" ? title : undefined}
        // With reduced motion the exit is at once either way
        exit={quick && !theme.reducedMotion ? ANDROID_PICK_EXIT : undefined}
        onExited={runPicked}
      >
        {/* Android's plain sheet title: Regular 16 in its secondary gray (#757575, #7D7D7D at night), 16 around it; a
            message under it in 14 */}
        {title != null || message != null ? (
          <View style={styles.androidHeader}>
            {title != null ? (
              <Text nativeID={ids.title} accessibilityRole="header" color={theme.colors.labelSecondary} style={styles.androidTitle}>
                {title}
              </Text>
            ) : null}
            {message != null ? (
              <Text nativeID={ids.message} color={theme.colors.labelSecondary} style={styles.androidMessage}>
                {message}
              </Text>
            ) : null}
          </View>
        ) : null}
        {actions.map((action, index) => {
          const color = action.destructive ? dangerText(theme) : m.onSurface
          return (
            <Pressable
              // Two actions may share a label: each keeps its place in `actions`
              key={index}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!action.disabled }}
              disabled={action.disabled}
              onPress={() => pick(action)}
              testID={action.testID}
              style={({ pressed }) => [
                styles.androidRow,
                icons ? null : styles.androidRowText,
                { opacity: action.disabled ? 0.5 : 1 },
                pressed ? { backgroundColor: theme.scheme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)" } : null,
              ]}
            >
              {icons ? (
                <View style={styles.androidIcon}>
                  {action.icon ? (
                    // A sheet row's icon: the ink (#1A1D21), a gray (#8C8C8C) at night
                    <IconDefaultsProvider size={24} color={action.destructive ? dangerText(theme) : theme.scheme === "dark" ? theme.colors.labelSecondary : m.onSurface}>
                      {action.icon}
                    </IconDefaultsProvider>
                  ) : null}
                </View>
              ) : null}
              <Text color={color} style={styles.androidLabel}>
                {action.label}
              </Text>
            </Pressable>
          )
        })}
      </BottomSheetBase>
    )
  }
  const height = theme.length("--dialog-alert-action-height", 48)
  const action = (item: ActionSheetAction, key: number | string, preferred = false) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!item.disabled }}
      disabled={item.disabled}
      onPress={() => (preferred ? close() : run(item))}
      testID={item.testID}
      style={({ pressed }) => [
        styles.iosAction,
        {
          minHeight: height,
          borderRadius: height / 2,
          backgroundColor: theme.color("--dialog-alert-fill"),
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {/* iOS 27's action sheet: every action one weight, 17/22, a destructive one in the native red (the danger
          solid). The kit's SF Semibold draws as heavy as Inter's Medium, so Medium, Cancel too */}
      <Text
        weight="medium"
        color={item.disabled ? theme.color("--mobile-label-tertiary") : item.destructive ? theme.color("--color-background-danger-solid") : theme.colors.text}
        style={styles.iosLabel}
      >
        {item.label}
      </Text>
    </Pressable>
  )
  const header =
    title != null || message != null ? (
      <View style={styles.iosHeader}>
        {title != null ? (
          <Text nativeID={ids.title} weight="semibold" accessibilityRole="header" style={styles.iosHeaderText}>
            {title}
          </Text>
        ) : null}
        {message != null ? (
          <Text nativeID={ids.message} style={styles.iosHeaderText}>
            {message}
          </Text>
        ) : null}
      </View>
    ) : null
  if (sourced) {
    // At its source: the phone popover's glass and corners (the web's Popover "Confirmation"), no Cancel
    return (
      <FloatingPanel
        open={open && anchor != null}
        onDismiss={close}
        anchor={anchor}
        side="top"
        align="center"
        sideOffset={8}
        collisionPadding={{ top: Math.max(insets.top, 8), bottom: Math.max(insets.bottom, 8), left: 8, right: 8 }}
        glass
        role="dialog"
        aria-label={typeof title === "string" ? title : undefined}
        testID={testID}
        style={{ width: Math.min(windowWidth - 16, theme.length("--action-sheet-source-width", 300)), maxHeight: screen - insets.top - insets.bottom - 16 }}
      >
        {() => (
          <Glass
            radius={theme.length("--popover-radius", 34)}
            elevation="raised"
            fillToken="--popover-mobile-background"
            filterToken="--popover-mobile-backdrop-filter"
            shadowToken="--menu-shadow"
            style={styles.iosPanel}
          >
            <ScrollView style={styles.scroll} contentContainerStyle={styles.iosList} bounces={false}>
              {header}
              {actions.map((item, index) => action(item, index))}
            </ScrollView>
          </Glass>
        )}
      </FloatingPanel>
    )
  }
  // The web names the sheet by its title and describes it by its message; a phone keeps the modal view
  const a11y =
    Platform.OS === "web"
      ? {
          role: "dialog" as const,
          "aria-modal": true,
          "aria-labelledby": title != null ? ids.title : undefined,
          "aria-describedby": message != null ? ids.message : undefined,
        }
      : { accessibilityViewIsModal: true }
  return (
    <Overlay open={open} onDismiss={close} scrim={iosDim(theme)} testID={testID}>
      {(progress, opening, focus) => (
        <View pointerEvents="box-none" style={styles.center}>
          <Animated.View
            {...a11y}
            // On the web the sheet itself takes the first focus, not its first action with a ring
            tabIndex={focus.tabIndex}
            onBlur={focus.onBlur}
            style={[
              focus.style,
              styles.iosStack,
              {
                maxHeight: screen - insets.top - insets.bottom - 16,
                opacity: glassOpacity(progress, opening),
                // An alert's entrance: it grows from 1.1 as it fades in; with reduced motion it fades in place. A
                // transform would stop the glass's blur on the web, so the web only fades
                transform: theme.reducedMotion || Platform.OS === "web" ? undefined : [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1.1, 1] }) }],
              },
            ]}
          >
            <Glass radius={theme.length("--dialog-alert-radius", 34)} elevation="raised" fillToken="--dialog-alert-background" style={[styles.iosPanel, styles.shrink]}>
              {/* Many actions scroll inside the panel; Cancel stays in view at its end */}
              <ScrollView style={styles.scroll} contentContainerStyle={styles.iosList} bounces={false}>
                {header}
                {actions.map((item, index) => action(item, index))}
              </ScrollView>
              {action(
                {
                  label: cancelLabel,
                  testID: testID ? `${testID}-cancel` : undefined,
                },
                "cancel",
                true,
              )}
            </Glass>
          </Animated.View>
        </View>
      )}
    </Overlay>
  )
}

/** How fast Android's menu sheet leaves after an item's tap, in ms. */
const ANDROID_PICK_EXIT = 180

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  // An alert's width at most (the kit's 300), 8 from the screen's edges on a narrow phone
  iosStack: { width: "100%", maxWidth: 316, paddingHorizontal: 8 },
  // iOS 27's action sheet (the iOS kit): 14 around, the actions 8 apart
  iosPanel: { padding: 14, gap: 8 },
  iosList: { gap: 8 },
  shrink: { flexShrink: 1 },
  scroll: { flexGrow: 0 },
  // The title Semibold and the message Regular, both Body 17/22 in the label color at the start, 8 in, 24 over the actions
  iosHeader: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 16, gap: 10 },
  iosHeaderText: { fontSize: 17, lineHeight: 22 },
  iosAction: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderCurve: "continuous",
  },
  iosLabel: { fontSize: 17, lineHeight: 22, textAlign: "center" },
  androidList: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 8 },
  androidHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 4 },
  androidTitle: { fontSize: 16, lineHeight: 20 },
  androidMessage: { fontSize: 14, lineHeight: 18 },
  // Android's sheet row: 48dp, the icon centered in a 56dp slot at the start, the text 16 past it (72 in), or
  // 16 in with no icons
  androidRow: { minHeight: 48, flexDirection: "row", alignItems: "center", paddingEnd: 21, paddingVertical: 6 },
  androidRowText: { paddingStart: 16, paddingEnd: 16 },
  androidIcon: { width: 56, marginEnd: 16, alignItems: "center" },
  androidLabel: { flexShrink: 1, fontSize: 16, lineHeight: 20 },
})
