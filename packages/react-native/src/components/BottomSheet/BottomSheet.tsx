import { useMemo, useState, type ReactNode } from "react"
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { iosDim, MATERIAL_SCRIM, Overlay } from "../../internal/Overlay"
import { useTheme } from "../../theme/ThemeProvider"
import { materialType } from "../../theme/typography"
import { Text } from "../Text/Text"

export type BottomSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** A title over the content, centered on iOS. */
  title?: ReactNode
  children?: ReactNode
  /** A tap on the dim, a drag down, Android's back and Escape close it. @default true */
  dismissible?: boolean
  /** Accessible name when there is no title. */
  "aria-label"?: string
  testID?: string
  /** The sheet's content area. */
  contentStyle?: StyleProp<ViewStyle>
  /** The accessible name of the grabber, a button that closes the sheet for VoiceOver and TalkBack. @default "Close" */
  closeLabel?: string
}

/** A drag of this share of the sheet, or a flick, closes it. */
const CLOSE_AT = 0.3

/**
 * A sheet from the bottom edge: on iOS 26 the sheet of the phone layer (`--dialog-sheet-radius` 38 on its top corners,
 * a grabber, the title 17/22 semibold), on Android Material 3's modal bottom sheet (28dp top corners,
 * surfaceContainerLow, the 32x4 drag handle, a 32% scrim, 640dp at most). Drag it down to close it.
 */
export function BottomSheet({ open, onOpenChange, title, children, dismissible = true, "aria-label": ariaLabel, testID, contentStyle, closeLabel = "Close" }: BottomSheetProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { height: screen } = useWindowDimensions()
  const [height, setHeight] = useState(0)
  const [drag] = useState(() => new Animated.Value(0))
  const close = () => onOpenChange(false)
  const responder = useMemo(
    () =>
      PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => drag.setValue(Math.max(0, gesture.dy)),
      onPanResponderRelease: (_, gesture) => {
        if (dismissible && (gesture.dy > (height || 1) * CLOSE_AT || gesture.vy > 1)) {
          onOpenChange(false)
          // The sheet leaves from where the finger let it go
          Animated.timing(drag, { toValue: 0, duration: 0, delay: 250, useNativeDriver: false }).start()
        } else Animated.spring(drag, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start()
      },
      onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start(),
    }),
    [drag, dismissible, height, onOpenChange],
  )
  const android = theme.isAndroid
  const m = theme.material
  const radius = android ? 28 : theme.length("--dialog-sheet-radius", 38)
  const background = android ? m.surfaceContainerLow : theme.color("--color-surface-elevated", theme.colors.background)
  const titleType = android ? materialType.titleLarge : { fontSize: 17, lineHeight: 22 }
  return (
    <Overlay open={open} onDismiss={close} scrim={android ? MATERIAL_SCRIM : iosDim(theme.scheme === "dark")} dismissible={dismissible} enter={350} exit={250} testID={testID}>
      {(progress) => (
        <View pointerEvents="box-none" style={styles.bottom}>
          <Animated.View
            accessibilityViewIsModal
            aria-modal
            aria-label={ariaLabel}
            onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
            style={[
              styles.sheet,
              {
                maxHeight: screen - insets.top - (android ? 56 : 16),
                maxWidth: android ? 640 : undefined,
                borderTopLeftRadius: radius,
                borderTopRightRadius: radius,
                backgroundColor: background,
                paddingBottom: insets.bottom,
                transform: [{ translateY: Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [height || screen, 0] }), drag) }],
              },
            ]}
          >
            <View {...responder.panHandlers} style={android ? styles.androidHandleArea : styles.iosHandleArea}>
              {/* The grabber is a button for a screen reader, as UIKit's and Material's are: it closes the sheet */}
              <Pressable
                accessible={dismissible}
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
                disabled={!dismissible}
                onPress={close}
                hitSlop={12}
                style={android ? [styles.androidHandle, { backgroundColor: m.onSurfaceVariant }] : [styles.iosGrabber, { backgroundColor: theme.color("--mobile-label-tertiary") }]}
              />
              {title != null ? (
                <Text
                  accessibilityRole="header"
                  weight={android ? "regular" : "semibold"}
                  color={android ? m.onSurface : undefined}
                  style={[{ fontSize: titleType.fontSize, lineHeight: titleType.lineHeight }, android ? styles.androidTitle : styles.iosTitle]}
                >
                  {title}
                </Text>
              ) : null}
            </View>
            {/* Content taller than the screen scrolls; the drag stays on the handle */}
            <ScrollView style={styles.scroll} contentContainerStyle={[android ? [styles.androidContent, title == null && styles.androidContentUntitled] : styles.iosContent, contentStyle]} bounces={false}>
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </Overlay>
  )
}

const styles = StyleSheet.create({
  bottom: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  sheet: { alignSelf: "stretch", overflow: "hidden", borderCurve: "continuous", marginHorizontal: "auto", width: "100%" },
  scroll: { flexGrow: 0, flexShrink: 1 },
  iosHandleArea: { alignItems: "center", paddingTop: 5, paddingBottom: 8 },
  iosGrabber: { width: 36, height: 5, borderRadius: 2.5 },
  iosTitle: { marginTop: 9, paddingHorizontal: 16, textAlign: "center" },
  iosContent: { paddingHorizontal: 16, paddingBottom: 16 },
  androidHandleArea: { alignItems: "center", paddingTop: 22 },
  androidHandle: { width: 32, height: 4, borderRadius: 2 },
  androidTitle: { alignSelf: "stretch", marginTop: 22, paddingHorizontal: 24 },
  androidContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  // Compose's DragHandle has 22 above and below it (SheetDefaults.DragHandle's vertical padding)
  androidContentUntitled: { paddingTop: 22 },
})
