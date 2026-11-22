import type { ReactNode } from "react"
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Glass } from "../../internal/Glass"
import { canTransformGlass, glassOpacity, iosDim, MATERIAL_SCRIM, Overlay } from "../../internal/Overlay"
import { stateLayer, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { materialType } from "../../theme/typography"
import { Text } from "../Text/Text"

export type DialogAction = {
  label: string
  onPress?: () => void
  /** `cancel` stands where the platform puts it (first of two on iOS, last of a stack); `destructive` in red. */
  variant?: "default" | "cancel" | "destructive"
  /** The preferred action: semibold on a solid fill on iOS (UIAlertController `preferredAction`). */
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
  /** A tap outside closes it: Material's dialogs do, an iOS alert does not. @default Android true, iOS false */
  dismissible?: boolean
  testID?: string
}

/**
 * A dialog that asks for a decision: on iOS the alert of iOS 26 (UIAlertController `.alert`: 320 wide, glass, radius
 * 34, capsule actions 48 tall, `--dialog-alert-*`, Dialog.module.css), on Android Material 3's basic dialog
 * (radius 28, surfaceContainerHigh, Headline S, text buttons). The web Dialog's `mobileVariant="alert"` as one call;
 * a sheet is `BottomSheet`.
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
  const scrim = theme.isAndroid ? MATERIAL_SCRIM : iosDim(theme.scheme === "dark")
  const insets = useSafeAreaInsets()
  return (
    <Overlay open={open} onDismiss={close} scrim={scrim} dismissible={dismissible ?? theme.isAndroid} testID={testID}>
      {(progress, opening) => (
        // The dialog rises over the keyboard (on Android the modal's window resizes for it), and its text scrolls
        // when the screen is short
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          pointerEvents="box-none"
          style={[styles.center, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
        >
          <Animated.View
            accessibilityViewIsModal
            accessibilityRole="alert"
            aria-modal
            style={{
              flexShrink: 1,
              opacity: theme.isAndroid ? progress : glassOpacity(progress, opening),
              transform: theme.isAndroid || canTransformGlass ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [theme.isAndroid ? 0.9 : 1.1, 1] }) }] : undefined,
            }}
          >
            {theme.isAndroid ? (
              <AndroidDialog theme={theme} title={title} description={description} actions={actions} run={run}>
                {children}
              </AndroidDialog>
            ) : (
              <IOSAlert theme={theme} title={title} description={description} actions={actions} run={run} layout={mobileLayout}>
                {children}
              </IOSAlert>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </Overlay>
  )
}

type PanelProps = { theme: Theme; title: ReactNode; description?: ReactNode; actions: DialogAction[]; run: (action: DialogAction) => void; children?: ReactNode }

function IOSAlert({ theme, title, description, actions, run, layout, children }: PanelProps & { layout?: "inline" | "stacked" }) {
  const { width: screen } = useWindowDimensions()
  const width = Math.min(theme.length("--dialog-alert-width", 320), screen - 32)
  const radius = theme.length("--dialog-alert-radius", 34)
  const inline = layout === "inline" || (layout !== "stacked" && actions.length <= 2)
  // UIAlertController puts the cancel action first of two side by side and last of a stack
  const cancel = actions.filter((action) => action.variant === "cancel")
  const others = actions.filter((action) => action.variant !== "cancel")
  const ordered = inline ? [...cancel, ...others] : [...others, ...cancel]
  const gap = theme.length("--dialog-alert-action-gap", 8)
  const type = { fontSize: theme.length("--dialog-mobile-type-size", 17), lineHeight: theme.length("--dialog-mobile-type-leading", 22) }
  return (
    <Glass radius={radius} elevation="raised" fillToken="--dialog-alert-background" style={{ width, flexShrink: 1, padding: theme.length("--dialog-alert-padding", 16), gap: 10 }}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ gap: 10 }} bounces={false}>
        {/* The text 31 from the sides: 16 of padding and 15 of the header's own */}
        <View style={{ paddingTop: 5, paddingHorizontal: 15, paddingBottom: 5.5, gap: 5.67 }}>
          <Text weight="semibold" style={[type, { textAlign: description == null ? "center" : "left" }]} accessibilityRole="header">
            {title}
          </Text>
          {description != null ? (
            <Text color={theme.color("--dialog-alert-message-color")} style={{ fontSize: 15, lineHeight: 20 }}>
              {description}
            </Text>
          ) : null}
        </View>
        {children != null ? <View style={{ paddingBottom: 10, marginHorizontal: -1 }}>{children}</View> : null}
      </ScrollView>
      {ordered.length ? (
        <View style={[{ gap, marginTop: children != null ? 0 : 4 }, inline ? styles.row : null]}>
          {ordered.map((action) => (
            <IOSAction key={action.label} theme={theme} action={action} run={run} type={type} grow={inline} />
          ))}
        </View>
      ) : null}
    </Glass>
  )
}

function IOSAction({ theme, action, run, type, grow }: { theme: Theme; action: DialogAction; run: (action: DialogAction) => void; type: { fontSize: number; lineHeight: number }; grow: boolean }) {
  const solid = action.preferred && action.variant !== "destructive"
  const fill = solid ? theme.color("--color-background-primary-solid") : theme.color("--dialog-alert-fill")
  const text = action.disabled
    ? theme.color("--mobile-label-tertiary")
    : action.variant === "destructive"
      ? theme.color("--color-text-danger")
      : solid
        ? theme.color("--color-text-primary-solid")
        : theme.colors.text
  const height = theme.length("--dialog-alert-action-height", 48)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!action.disabled }}
      disabled={action.disabled}
      onPress={() => run(action)}
      testID={action.testID}
      style={({ pressed }) => [styles.iosAction, { minHeight: height, borderRadius: height / 2, backgroundColor: fill, opacity: pressed ? 0.7 : 1 }, grow ? styles.grow : null]}
    >
      <Text color={text} weight={action.preferred ? "semibold" : "medium"} style={[type, styles.centered]}>
        {action.label}
      </Text>
    </Pressable>
  )
}

function AndroidDialog({ theme, title, description, actions, run, children }: PanelProps) {
  const m = theme.material
  const { width: screen } = useWindowDimensions()
  // Compose AlertDialog: 280 to 560 wide, 24 of padding, the title 16 over the text and the buttons 24 under it
  const width = Math.max(280, Math.min(560, screen - 48))
  const headline = materialType.headlineSmall
  const body = materialType.bodyMedium
  const label = materialType.labelLarge
  return (
    <View style={[styles.android, { width, backgroundColor: m.surfaceContainerHigh }]}>
      <ScrollView style={styles.scroll} bounces={false}>
        <Text color={m.onSurface} accessibilityRole="header" style={{ fontSize: headline.fontSize, lineHeight: headline.lineHeight }}>
          {title}
        </Text>
        {description != null ? (
          <Text color={m.onSurfaceVariant} style={{ marginTop: 16, fontSize: body.fontSize, lineHeight: body.lineHeight }}>
            {description}
          </Text>
        ) : null}
        {children != null ? <View style={{ marginTop: 16 }}>{children}</View> : null}
      </ScrollView>
      {actions.length ? (
        <View style={styles.androidActions}>
          {actions.map((action) => {
            const color = action.disabled ? withAlpha(m.onSurface, 0.38) : action.variant === "destructive" ? m.error : m.primary
            return (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                accessibilityState={{ disabled: !!action.disabled }}
                disabled={action.disabled}
                onPress={() => run(action)}
                testID={action.testID}
                // A 40dp text button in a 48dp touch target, as Compose's minimumInteractiveComponentSize
                hitSlop={TARGET_SLOP}
                style={({ pressed }) => [styles.androidButton, pressed ? { backgroundColor: withAlpha(color, stateLayer.pressed) } : null]}
              >
                <Text color={color} style={{ fontSize: label.fontSize, lineHeight: label.lineHeight, ...theme.font("medium") }}>
                  {action.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}

const TARGET_SLOP = { top: 4, bottom: 4 }

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  row: { flexDirection: "row" },
  grow: { flex: 1, flexBasis: 0 },
  centered: { textAlign: "center" },
  iosAction: { alignItems: "center", justifyContent: "center", paddingVertical: 13, paddingHorizontal: 16, borderCurve: "continuous" },
  android: { flexShrink: 1, borderRadius: 28, padding: 24 },
  androidActions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 8, marginTop: 24 },
  androidButton: { height: 40, paddingHorizontal: 12, borderRadius: 20, alignItems: "center", justifyContent: "center" },
})
