import { useId, type ReactNode } from "react"
import { Animated, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Glass } from "../../internal/Glass"
import { glassOpacity, iosDim, Overlay } from "../../internal/Overlay"
import { dangerText } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { BottomSheet } from "../BottomSheet/BottomSheet"
import { IconDefaultsProvider } from "../Icon/createIcon"
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
  /** The cancel action of iOS, apart from the others. Android closes the sheet with a tap outside or Back. @default "Cancel" */
  cancelLabel?: string
  testID?: string
}

/**
 * A choice of actions from the bottom of the screen (React Native only: the web has a Menu). iOS 26 draws
 * UIAlertController's `.actionSheet` on an iPhone: a glass panel of 48pt capsule actions with the title and message
 * over them, and the cancel capsule apart under it; Android a menu sheet (its items: 48dp rows of Regular 16, the
 * icon in a 56dp slot in the ink, gray at night, the text 16 in with no icons, a gray title of 16 over them).
 */
export function ActionSheet({ open, onOpenChange, title, message, actions, cancelLabel = "Cancel", testID }: ActionSheetProps) {
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
  const ids = { title: useId(), message: useId() }
  if (theme.isAndroid) {
    const m = theme.material
    const icons = actions.some((action) => action.icon)
    return (
      <BottomSheet open={open} onOpenChange={onOpenChange} testID={testID} contentStyle={styles.androidList} aria-label={typeof title === "string" ? title : undefined}>
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
              onPress={() => run(action)}
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
      </BottomSheet>
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
      <Text
        weight={preferred ? "semibold" : "medium"}
        color={item.disabled ? theme.color("--mobile-label-tertiary") : item.destructive ? theme.color("--color-text-danger") : theme.colors.text}
        style={styles.iosLabel}
      >
        {item.label}
      </Text>
    </Pressable>
  )
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
    <Overlay open={open} onDismiss={close} scrim={iosDim(theme)} motion="sheet" testID={testID}>
      {(progress, opening, focus) => (
        <View pointerEvents="box-none" style={styles.bottom}>
          <Animated.View
            {...a11y}
            // On the web the sheet itself takes the first focus, not its first action with a ring
            tabIndex={focus.tabIndex}
            onBlur={focus.onBlur}
            style={[
              focus.style,
              styles.iosStack,
              // An offset, not a transform: a transform would stop the glass's blur on the web
              {
                maxHeight: screen - insets.top - 8,
                paddingBottom: Math.max(insets.bottom, 8),
                opacity: glassOpacity(progress, opening),
                // With reduced motion it fades in place
                top: theme.reducedMotion ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }),
              },
            ]}
          >
            <Glass radius={theme.length("--dialog-alert-radius", 34)} elevation="raised" fillToken="--dialog-alert-background" style={[styles.iosPanel, styles.shrink]}>
              {/* Many actions scroll inside the panel; the cancel capsule stays in view */}
              <ScrollView style={styles.scroll} contentContainerStyle={styles.iosList} bounces={false}>
                {title != null || message != null ? (
                  <View style={styles.iosHeader}>
                    {title != null ? (
                      <Text nativeID={ids.title} weight="semibold" color={theme.color("--dialog-alert-message-color")} accessibilityRole="header" style={styles.iosHeaderText}>
                        {title}
                      </Text>
                    ) : null}
                    {message != null ? (
                      <Text nativeID={ids.message} color={theme.color("--dialog-alert-message-color")} style={styles.iosHeaderText}>
                        {message}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {actions.map((item, index) => action(item, index))}
              </ScrollView>
            </Glass>
            <Glass radius={theme.length("--dialog-alert-radius", 34)} elevation="raised" fillToken="--dialog-alert-background" style={styles.iosPanel}>
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

const styles = StyleSheet.create({
  bottom: { flex: 1, justifyContent: "flex-end" },
  iosStack: { paddingHorizontal: 8, gap: 8 },
  iosPanel: { padding: 16, gap: 8 },
  iosList: { gap: 8 },
  shrink: { flexShrink: 1 },
  scroll: { flexGrow: 0 },
  iosHeader: { paddingHorizontal: 15, paddingTop: 4, paddingBottom: 6, gap: 2 },
  iosHeaderText: { fontSize: 13, lineHeight: 18, textAlign: "center" },
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
