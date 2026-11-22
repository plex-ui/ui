import type { ReactNode } from "react"
import { Animated, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Glass } from "../../internal/Glass"
import { glassOpacity, iosDim, Overlay } from "../../internal/Overlay"
import { stateLayer, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { materialType } from "../../theme/typography"
import { BottomSheet } from "../BottomSheet/BottomSheet"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text } from "../Text/Text"

export type ActionSheetAction = {
  label: string
  onPress?: () => void
  /** A symbol before the label; Material's list shows it, iOS leaves it out as UIAlertController does. */
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
 * over them, and the cancel capsule apart under it; Android a Material 3 modal bottom sheet with a list of 56dp rows.
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
  if (theme.isAndroid) {
    const m = theme.material
    const body = materialType.bodyLarge
    return (
      <BottomSheet open={open} onOpenChange={onOpenChange} title={title} testID={testID} contentStyle={styles.androidList} aria-label={typeof title === "string" ? title : undefined}>
        {message != null ? (
          <Text
            color={m.onSurfaceVariant}
            style={[
              styles.androidMessage,
              {
                fontSize: materialType.bodyMedium.fontSize,
                lineHeight: materialType.bodyMedium.lineHeight,
              },
            ]}
          >
            {message}
          </Text>
        ) : null}
        {actions.map((action) => {
          const color = action.disabled ? withAlpha(m.onSurface, 0.38) : action.destructive ? m.error : m.onSurface
          return (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!action.disabled }}
              disabled={action.disabled}
              onPress={() => run(action)}
              testID={action.testID}
              style={({ pressed }) => [
                styles.androidRow,
                pressed
                  ? {
                      backgroundColor: withAlpha(m.onSurface, stateLayer.pressed),
                    }
                  : null,
              ]}
            >
              {action.icon ? (
                <IconDefaultsProvider size={24} color={action.disabled ? color : action.destructive ? m.error : m.onSurfaceVariant}>
                  {action.icon}
                </IconDefaultsProvider>
              ) : null}
              <Text color={color} style={{ fontSize: body.fontSize, lineHeight: body.lineHeight }}>
                {action.label}
              </Text>
            </Pressable>
          )
        })}
      </BottomSheet>
    )
  }
  const height = theme.length("--dialog-alert-action-height", 48)
  const action = (item: ActionSheetAction, preferred = false) => (
    <Pressable
      key={item.label}
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
  return (
    <Overlay open={open} onDismiss={close} scrim={iosDim(theme.scheme === "dark")} enter={350} exit={250} testID={testID}>
      {(progress) => (
        <View pointerEvents="box-none" style={styles.bottom}>
          <Animated.View
            accessibilityViewIsModal
            aria-modal
            style={[
              styles.iosStack,
              // An offset, not a transform: a transform would stop the glass's blur on the web
              {
                maxHeight: screen - insets.top - 8,
                paddingBottom: Math.max(insets.bottom, 8),
                opacity: glassOpacity(progress, open),
                top: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [80, 0],
                }),
              },
            ]}
          >
            <Glass radius={theme.length("--dialog-alert-radius", 34)} elevation="raised" fillToken="--dialog-alert-background" style={[styles.iosPanel, styles.shrink]}>
              {/* Many actions scroll inside the panel; the cancel capsule stays in view */}
              <ScrollView style={styles.scroll} contentContainerStyle={styles.iosList} bounces={false}>
                {title != null || message != null ? (
                  <View style={styles.iosHeader}>
                    {title != null ? (
                      <Text weight="semibold" color={theme.color("--dialog-alert-message-color")} accessibilityRole="header" style={styles.iosHeaderText}>
                        {title}
                      </Text>
                    ) : null}
                    {message != null ? (
                      <Text color={theme.color("--dialog-alert-message-color")} style={styles.iosHeaderText}>
                        {message}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {actions.map((item) => action(item))}
              </ScrollView>
            </Glass>
            <Glass radius={theme.length("--dialog-alert-radius", 34)} elevation="raised" fillToken="--dialog-alert-background" style={styles.iosPanel}>
              {action(
                {
                  label: cancelLabel,
                  testID: testID ? `${testID}-cancel` : undefined,
                },
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
  androidList: { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 8 },
  androidMessage: { paddingHorizontal: 24, paddingBottom: 8 },
  androidRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
  },
})
