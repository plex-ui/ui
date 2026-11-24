import { cloneElement, createContext, isValidElement, useContext, useEffect, useState, type ReactElement, type ReactNode } from "react"
import { NativeModules, Platform, Text as RNText, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native"
import CheckMd from "../../icons/plex/CheckMd"
import Copy from "../../icons/plex/Copy"
import { useDescription } from "../../internal/a11y"
import { FloatingPanel } from "../../internal/FloatingPanel"
import { anchorProps, type FloatingAlign, type FloatingSide } from "../../internal/floating"
import { elevationShadow } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { useMenuAnchor } from "../Menu/Menu"
import { Text, type TextProps } from "../Text/Text"

export type TooltipGutterSize = "sm" | "md" | "lg"

type TooltipPlacementProps = {
  /** The preferred side of the trigger; it turns when there is no room. @default "top" */
  side?: FloatingSide
  /** The preferred alignment against the trigger. @default "center" */
  align?: FloatingAlign
  /** An offset from the `start` or `end` alignment. @default 0 */
  alignOffset?: number
  /** The distance from the trigger. @default 5 */
  sideOffset?: number
}

export type TooltipProps = TooltipPlacementProps & {
  /** The trigger: a single element. Wrap plain text in `Tooltip.TriggerDecorator`. */
  children: ReactNode
  /** The tooltip's content; `null` shows no tooltip. */
  content: ReactNode
  /** The tooltip's max width; `"none"` keeps it on one line at its natural width. @default 300 */
  maxWidth?: number | "none"
  /** Keeps the tooltip open (`true`) or closed (`false`). */
  forceOpen?: boolean
  /** Short tooltips of one to three words, in inverted colors. @default false */
  compact?: boolean
  /** The padding inside the tooltip. @default "md" */
  gutterSize?: TooltipGutterSize
  /** The style of the tooltip's panel. */
  contentStyle?: StyleProp<ViewStyle>
  testID?: string
}

type TooltipContextValue = { open: boolean; show: () => void }
const TooltipContext = createContext<TooltipContextValue | null>(null)

/** How long a tooltip opened by a long press stays: Material's 1500ms. */
const SHOW_FOR = 1500

const GUTTERS: Record<TooltipGutterSize, { vertical: number; horizontal: number }> = {
  sm: { vertical: 8, horizontal: 12 },
  md: { vertical: 12, horizontal: 16 },
  lg: { vertical: 14, horizontal: 18 },
}

/**
 * Brief text that explains a control, as @plexui/ui's Tooltip. A phone has no hover: a long press on the trigger
 * shows it for 1.5 seconds, as Android shows a tooltip, and a tap anywhere hides it; `forceOpen` keeps it shown. A
 * screen reader reads the content as the trigger's description. On iOS (which has no tooltips) and the web it is the
 * web's tooltip (the elevated surface with its shadow, `--radius-md`, 14/20 text; `compact` inverted, 2 by 8); on
 * Android Material 3's tooltips: `compact` the plain tooltip (inverse surface, Body S, 4dp corners), otherwise the
 * rich tooltip's surface (12dp corners, Body M, level 2 shadow). A disabled trigger shows its tooltip too.
 */
export function Tooltip({
  children,
  content,
  maxWidth = 300,
  forceOpen,
  compact = false,
  side = "top",
  align = "center",
  alignOffset = 0,
  sideOffset = 5,
  gutterSize = "md",
  contentStyle,
  testID,
}: TooltipProps) {
  const enabled = content !== null
  const [visible, setVisible] = useState(false)
  const open = enabled && (forceOpen ?? visible)
  const { anchor, place, setTrigger } = useMenuAnchor(open)
  const show = () => {
    if (!enabled || forceOpen !== undefined) return
    place(() => setVisible(true))
  }
  // A long press shows it for a while; a tap anywhere hides it sooner
  useEffect(() => {
    if (!visible || forceOpen !== undefined) return
    const timer = setTimeout(() => setVisible(false), SHOW_FOR)
    return () => clearTimeout(timer)
  }, [visible, forceOpen])
  const description = useDescription(enabled ? content : null)
  const [touch] = useState(() => new LongTouch())
  useEffect(() => () => touch.cancel(), [touch])
  const first = Array.isArray(children) ? children[0] : children
  // Plain text is a decorated trigger
  const child: ReactNode = typeof first === "string" || typeof first === "number" ? <TriggerDecorator>{first}</TriggerDecorator> : first
  const trigger = isValidElement(child)
    ? cloneElement(child as ReactElement<TriggerChildProps>, triggerProps(child as ReactElement<TriggerChildProps>, show, touch, description.props, anchorProps((child as ReactElement<TriggerChildProps>).props, setTrigger as never, open ? () => place() : undefined)))
    : child
  return (
    <TooltipContext.Provider value={{ open, show }}>
      {trigger}
      {enabled && Platform.OS === "web" && description.id ? (
        // The web's description: the trigger points at it with aria-describedby
        <RNText nativeID={description.id} style={styles.hidden}>
          {textContent(content)}
        </RNText>
      ) : null}
      {enabled ? (
        <TooltipPanel
          open={open}
          onDismiss={() => setVisible(false)}
          anchor={anchor}
          side={side}
          align={align}
          alignOffset={alignOffset}
          sideOffset={sideOffset}
          compact={compact}
          maxWidth={maxWidth}
          gutterSize={gutterSize}
          style={contentStyle}
          testID={testID}
        >
          {content}
        </TooltipPanel>
      ) : null}
    </TooltipContext.Provider>
  )
}
Tooltip.displayName = "Tooltip"

type TriggerChildProps = {
  onLongPress?: (event: GestureResponderEvent) => void
  onTouchStart?: (event: GestureResponderEvent) => void
  onTouchEnd?: (event: GestureResponderEvent) => void
  onTouchCancel?: (event: GestureResponderEvent) => void
  onTouchMove?: (event: GestureResponderEvent) => void
  disabled?: boolean | null
  ref?: unknown
  onLayout?: (event: never) => void
}
type DescribedProps = { accessibilityHint?: string; "aria-describedby"?: string }

/** A press held for 500ms, as React Native's long press: a disabled control's own touches, which it does not take. */
class LongTouch {
  private timer: ReturnType<typeof setTimeout> | undefined
  start(run: () => void) {
    clearTimeout(this.timer)
    this.timer = setTimeout(run, LONG_PRESS)
  }
  cancel() {
    clearTimeout(this.timer)
  }
}

const LONG_PRESS = 500

/**
 * The trigger's props: the tooltip as its description, the long press that shows it after its own, and its node and
 * layout as the tooltip's anchor. A disabled control takes no press, so its touches show the tooltip.
 */
function triggerProps(child: ReactElement<TriggerChildProps>, show: () => void, touch: LongTouch, described: DescribedProps, anchor: object): Partial<TriggerChildProps> {
  const own = child.props
  const disabled = own.disabled === true
  return {
    ...described,
    ...anchor,
    onLongPress: (event: GestureResponderEvent) => {
      own.onLongPress?.(event)
      show()
    },
    ...(disabled
      ? {
          onTouchStart: (event: GestureResponderEvent) => {
            own.onTouchStart?.(event)
            touch.start(show)
          },
          onTouchEnd: (event: GestureResponderEvent) => {
            own.onTouchEnd?.(event)
            touch.cancel()
          },
          onTouchCancel: (event: GestureResponderEvent) => {
            own.onTouchCancel?.(event)
            touch.cancel()
          },
          onTouchMove: (event: GestureResponderEvent) => {
            own.onTouchMove?.(event)
            touch.cancel()
          },
        }
      : null),
  }
}

const textContent = (node: ReactNode): string =>
  node == null || typeof node === "boolean" ? "" : typeof node === "string" || typeof node === "number" ? String(node) : Array.isArray(node) ? node.map(textContent).join("") : isValidElement<{ children?: ReactNode }>(node) ? textContent(node.props.children) : ""

type TooltipPanelProps = Required<TooltipPlacementProps> & {
  open: boolean
  onDismiss: () => void
  anchor: Parameters<typeof FloatingPanel>[0]["anchor"]
  compact: boolean
  maxWidth: number | "none"
  gutterSize: TooltipGutterSize
  style?: StyleProp<ViewStyle>
  testID?: string
  children: ReactNode
}

/** The colors and shape of a tooltip on each platform. */
function tooltipLook(theme: Theme, compact: boolean, gutterSize: TooltipGutterSize) {
  const m = theme.material
  if (theme.isAndroid) {
    return compact
      ? // Material 3's plain tooltip
        { background: m.inverseSurface, text: m.inverseOnSurface, radius: 4, padding: { vertical: 4, horizontal: 8 }, minHeight: 24, shadow: undefined, maxWidth: 200, variant: "caption1" as const, weight: "regular" as const }
      : // Material 3's rich tooltip: its supporting text on its container
        { background: m.surfaceContainer, text: m.onSurfaceVariant, radius: 12, padding: { vertical: 12, horizontal: 16 }, minHeight: 0, shadow: elevationShadow.level2, maxWidth: 320, variant: "subheadline" as const, weight: undefined }
  }
  const shadow = [theme.token("--shadow"), theme.token("--shadow-hairline")].filter((part) => typeof part === "string").join(", ")
  return compact
    ? { background: theme.color("--gray-700"), text: theme.color("--gray-0"), radius: theme.length("--radius-md", 8), padding: { vertical: 2, horizontal: 8 }, minHeight: 0, shadow, maxWidth: undefined, variant: undefined, weight: undefined }
    : { background: theme.color("--color-surface-elevated", theme.colors.surfaceElevated), text: theme.colors.text, radius: theme.length("--radius-md", 8), padding: GUTTERS[gutterSize], minHeight: 0, shadow, maxWidth: undefined, variant: undefined, weight: undefined }
}

function TooltipPanel({ open, onDismiss, anchor, side, align, alignOffset, sideOffset, compact, maxWidth, gutterSize, style, testID, children }: TooltipPanelProps) {
  const theme = useTheme()
  const look = tooltipLook(theme, compact, gutterSize)
  // Material's tooltips stand 4dp from their anchor
  const offset = theme.isAndroid ? Math.min(sideOffset, 4) : sideOffset
  const width: ViewStyle = maxWidth === "none" ? {} : { maxWidth: look.maxWidth != null ? Math.min(maxWidth, look.maxWidth) : maxWidth }
  return (
    <FloatingPanel
      open={open}
      onDismiss={onDismiss}
      anchor={anchor}
      side={side}
      align={align}
      alignOffset={alignOffset}
      sideOffset={offset}
      collisionPadding={15}
      motion="tooltip"
      passThrough
      autoFocus={false}
      role="tooltip"
      testID={testID}
      style={width}
    >
      {() => (
        <View
          style={[
            styles.panel,
            {
              backgroundColor: look.background,
              borderRadius: look.radius,
              paddingVertical: look.padding.vertical,
              paddingHorizontal: look.padding.horizontal,
              minHeight: look.minHeight,
              boxShadow: look.shadow,
            },
            style,
          ]}
        >
          <IconDefaultsProvider size={theme.isAndroid ? 16 : 18} color={look.text}>
            {typeof children === "string" || typeof children === "number" ? (
              <Text variant={look.variant} size={look.variant ? undefined : "sm"} weight={look.weight} color={look.text} numberOfLines={maxWidth === "none" ? 1 : undefined}>
                {children}
              </Text>
            ) : (
              children
            )}
          </IconDefaultsProvider>
        </View>
      )}
    </FloatingPanel>
  )
}

export type TriggerDecoratorProps = Pick<TextProps, "variant" | "size" | "weight" | "color" | "style"> & {
  /** Text that the tooltip explains. */
  children: ReactNode
  /** Makes the text a stop of the keyboard (the web). @default true */
  focusable?: boolean
  testID?: string
}

/**
 * Makes text a tooltip's trigger, as @plexui/ui's Tooltip.TriggerDecorator: a tap or a long press shows the tooltip,
 * and the text gets the dotted underline of an open tooltip (the tertiary text color; Android draws it solid).
 */
export function TriggerDecorator({ children, focusable = true, testID, variant, size, weight, color, style, ...described }: TriggerDecoratorProps & DescribedProps) {
  const theme = useTheme()
  const tooltip = useContext(TooltipContext)
  const open = tooltip?.open ?? false
  return (
    <Text
      {...described}
      // A text of its own: it takes the type the web's decorator inherits from the text around it
      variant={variant}
      size={size}
      weight={weight}
      color={color}
      accessibilityRole="text"
      onPress={tooltip?.show}
      onLongPress={tooltip?.show}
      suppressHighlighting
      // A stop of the web's keyboard, as the web's decorator (tabindex 0)
      {...((Platform.OS === "web" && focusable ? { tabIndex: 0 } : null) as object)}
      testID={testID}
      // The web's underline is there in a transparent color until the tooltip opens; Android draws no colored or
      // dotted line, so the line itself comes and goes
      style={[style, open ? [styles.decorator, { textDecorationColor: theme.color("--color-text-tertiary") }] : null]}
    >
      {children}
    </Text>
  )
}
TriggerDecorator.displayName = "Tooltip.TriggerDecorator"

Tooltip.TriggerDecorator = TriggerDecorator

export type CopyTooltipProps = TooltipPlacementProps & {
  /** The trigger element (a Button, or text in `Tooltip.TriggerDecorator`). */
  children: ReactNode
  /** The text copied to the clipboard. */
  copyValue: string
  /** Called once the clipboard write settles, with whether it succeeded; Copied! shows only after a successful write. */
  onCopy?: (copied: boolean) => void
  /**
   * Writes the text to the clipboard, in place of the default: the web's Clipboard API, React Native's clipboard
   * module elsewhere. Pass one that uses your app's clipboard library (`expo-clipboard`'s `setStringAsync`).
   */
  copy?: (value: string) => Promise<boolean | void> | boolean | void
  testID?: string
}

/**
 * The pending feedback of a CopyTooltip: its timer, and the copy it belongs to. A newer copy, a long press or a close
 * drops an older one's.
 */
class Feedback {
  mounted = true
  private generation = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  /** Starts a new attempt and cancels the pending one. */
  next() {
    this.generation += 1
    clearTimeout(this.timer)
    return this.generation
  }
  current(generation: number) {
    return generation === this.generation
  }
  after(ms: number, run: () => void) {
    clearTimeout(this.timer)
    this.timer = setTimeout(run, ms)
  }
  mount() {
    this.mounted = true
    return () => {
      this.mounted = false
      clearTimeout(this.timer)
    }
  }
}

/** Copied! stays for a second, as on the web. */
const COPIED_FOR = 1000

/**
 * A trigger that copies a value, as @plexui/ui's CopyTooltip on a phone: a tap copies it and says Copied! with a check
 * in a compact tooltip for a second; a long press shows Copy.
 */
export function CopyTooltip({ children, copyValue, onCopy, copy = writeClipboard, side = "top", align = "center", alignOffset = 0, sideOffset = 5, testID }: CopyTooltipProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const { anchor, place, setTrigger } = useMenuAnchor(open)
  const [feedback] = useState(() => new Feedback())
  useEffect(() => feedback.mount(), [feedback])
  const hide = () => {
    feedback.next()
    setOpen(false)
  }
  const run = async () => {
    const own = feedback.next()
    setCopied(false)
    let succeeded = false
    try {
      succeeded = (await copy(copyValue)) !== false
    } catch {
      succeeded = false
    }
    if (!feedback.mounted) return
    onCopy?.(succeeded)
    if (!feedback.current(own) || !succeeded) return
    setCopied(true)
    place(() => setOpen(true))
    feedback.after(COPIED_FOR, () => setOpen(false))
  }
  const ask = () => {
    feedback.next()
    setCopied(false)
    place(() => setOpen(true))
    feedback.after(SHOW_FOR, () => setOpen(false))
  }
  const first = Array.isArray(children) ? children[0] : children
  const child: ReactNode = typeof first === "string" || typeof first === "number" ? <TriggerDecorator>{first}</TriggerDecorator> : first
  const own = isValidElement(child) ? (child.props as TriggerChildProps & { onPress?: (event: GestureResponderEvent) => void }) : null
  const trigger =
    isValidElement(child) && own
      ? cloneElement(child as ReactElement<TriggerChildProps>, {
          ...anchorProps(own, setTrigger as never, open ? () => place() : undefined),
          onPress: (event: GestureResponderEvent) => {
            own.onPress?.(event)
            void run()
          },
          onLongPress: ask,
        } as Partial<TriggerChildProps>)
      : child
  return (
    <TooltipContext.Provider value={{ open, show: () => void run() }}>
      {trigger}
      <TooltipPanel
        open={open}
        onDismiss={hide}
        anchor={anchor}
        side={side}
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        compact
        maxWidth="none"
        gutterSize="md"
        testID={testID}
      >
        <CopyLabel copied={copied} />
      </TooltipPanel>
    </TooltipContext.Provider>
  )
}

/** Copy with its icon, or Copied! with a check: the check's own room makes the gap smaller, as on the web. */
function CopyLabel({ copied }: { copied: boolean }) {
  const theme = useTheme()
  const look = tooltipLook(theme, true, "md")
  return (
    <View style={[styles.copyLabel, { gap: copied ? 2 : 4 }]}>
      {copied ? <CheckMd /> : <Copy />}
      <Text variant={look.variant} size={look.variant ? undefined : "sm"} weight={look.weight} color={look.text}>
        {copied ? "Copied!" : "Copy"}
      </Text>
    </View>
  )
}

/** The web's Clipboard API; React Native's own clipboard module on a phone (its `setString`). */
async function writeClipboard(value: string): Promise<boolean> {
  if (Platform.OS === "web") {
    const clipboard = (globalThis as { navigator?: { clipboard?: { writeText?: (text: string) => Promise<void> } } }).navigator?.clipboard
    if (!clipboard?.writeText) return false
    await clipboard.writeText(value)
    return true
  }
  const module = (NativeModules as { Clipboard?: { setString?: (text: string) => void } }).Clipboard
  if (!module?.setString) return false
  module.setString(value)
  return true
}

const styles = StyleSheet.create({
  panel: { justifyContent: "center", borderCurve: "continuous" },
  hidden: { display: "none" },
  decorator: { textDecorationLine: "underline", textDecorationStyle: "dotted" },
  copyLabel: { flexDirection: "row", alignItems: "center" },
})
