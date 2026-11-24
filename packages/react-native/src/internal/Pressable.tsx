import { forwardRef, type ComponentRef } from "react"
import { Platform, Pressable as NativePressable, type PressableProps } from "react-native"

// A press target takes no text selection on the web: a drag or a long press over a row, a button or a segment selects
// nothing, as on iOS and Android, where a control's label is never selectable
const NO_SELECT = Platform.OS === "web" ? ({ userSelect: "none" } as object) : null

/** react-native's Pressable that selects no text on the web; every pressable control of the kit is drawn with it. */
export const Pressable = forwardRef<ComponentRef<typeof NativePressable>, PressableProps>(function Pressable({ style, ...props }, ref) {
  return (
    <NativePressable
      ref={ref}
      {...props}
      style={typeof style === "function" ? (state) => [NO_SELECT, style(state)] : [NO_SELECT, style]}
    />
  )
})
