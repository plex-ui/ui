import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react"
import { ActivityIndicator, StyleSheet, View, useWindowDimensions, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native"
import { Pressable } from "../../internal/Pressable"
import Svg, { Path } from "react-native-svg"
import X from "../../icons/plex/X"
import { flattenChildren, isRenderable, textOf } from "../../internal/children"
import { FloatingPanel } from "../../internal/FloatingPanel"
import { anchorProps, type FloatingAlign, type FloatingSide } from "../../internal/floating"
import { Glass } from "../../internal/Glass"
import { accentText, barSurface, controlHighlight, dangerText, elevationShadow, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { Button, type ButtonColor, type ButtonProps } from "../Button/Button"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { useMenuAnchor } from "../Menu/Menu"
import { Text, TextColorProvider } from "../Text/Text"

/** Material's text button sets its label 12dp in: the row moves out by as much, so the labels line up with the text. */
const ANDROID_TEXT_BUTTON_INSET = 12

/** The edge of an inline tip that points at what it explains. */
export type TipArrowEdge = "top" | "bottom" | "left" | "right"

/** How a tip's actions show on a phone. */
export type TipMobileActions = "rows" | "buttons"

type TipContentProps = {
  /** The tip's title: what the feature is. */
  title: ReactNode
  /** One or two sentences on how to use it. */
  description?: ReactNode
  /** A symbol that leads the message, as a TipKit tip's image. */
  icon?: ReactNode
  /** Buttons for the tip's actions, below the message. */
  actions?: ReactNode
  /**
   * `rows`: each action a row of text in its button's color under a separator, as iOS tips show them (text buttons on
   * Android); `buttons`: each Button as given, a full-width capsule under the message, as an iOS card that asks for a
   * permission. @default "rows"
   */
  mobileActions?: TipMobileActions
}

export type TipProps = TipContentProps & {
  /** Shows the Close button; called when it is pressed. */
  onClose?: () => void
  /** The Close button's label. @default "Close tip" */
  closeLabel?: string
  /** Draws an arrow at this edge, pointing at what the tip explains (TipKit's annotation). */
  arrowEdge?: TipArrowEdge
  testID?: string
  style?: StyleProp<ViewStyle>
}

/** The kit's arrow (47 by 13), pointing down: the same path as the web's clip-path. */
const ARROW_PATH =
  "M0 0C1.71 0 3.42 -.01 5.14 .01C6.78 .03 8.61 .06 10.21 .66C11.93 1.31 13.07 2.44 14.22 3.78C15.04 4.74 16.67 6.8 17.46 7.79C18.1 8.6 19.37 10.21 20.06 10.98C20.93 11.96 22.01 13 23.5 13C24.99 13 26.07 11.96 26.94 10.98C27.63 10.21 28.9 8.6 29.54 7.79C30.33 6.8 31.96 4.74 32.78 3.78C33.93 2.44 35.07 1.31 36.79 .66C38.39 .06 40.22 .03 41.86 .01C43.58 -.01 45.29 0 47 0Z"
/** Material 3's rich tooltip caret, 16 by 8, pointing down. */
const CARET_PATH = "M0 0L8 8L16 0Z"

/**
 * The numbers of each platform. iOS: Tip.module.css at 767px and below (TipKit: 26 corners, 14 top and the layout
 * margin across, a 36 symbol 12 from the text, 17/22 semibold over 15/20 secondary, a bare 22 Close in the tertiary
 * label in a 44 target 1 from the top and 6 from the end, rows of 17 regular 46 tall under a separator, capsules of
 * 48 10 apart). Android: a card of the Plex Android look with Material 3's rich tooltip inside (16dp corners, 16dp
 * padding, a 24dp symbol, Title M over Body M, Close 24dp in a 48dp target, text buttons, 40dp capsules).
 */
function metricsOf(theme: Theme) {
  if (theme.isAndroid) {
    return { radius: 16, top: 16, inline: 16, bottomRows: 8, bottomNone: 16, bottomButtons: 16, gap: 12, gapButtons: 16, iconFrame: 24, icon: 24, iconGap: 16, closeTarget: 48, closeIcon: 24, closeTop: 4, closeEnd: 4, messageEnd: 28, arrow: { width: 16, height: 8, path: CARET_PATH } }
  }
  const inline = theme.length("--mobile-layout-margin", 16)
  const closeSize = 22
  const closeOffset = 17
  return {
    radius: 26,
    top: 14,
    inline,
    bottomRows: 0,
    bottomNone: 14,
    bottomButtons: 16,
    gap: 11,
    gapButtons: 16,
    iconFrame: 36,
    icon: 36,
    iconGap: 12,
    closeTarget: 44,
    closeIcon: 22,
    // The 44 target centers the 22 glyph 12 from the top and 17 from the end
    closeTop: 12 - (44 - closeSize) / 2,
    closeEnd: closeOffset - (44 - closeSize) / 2,
    messageEnd: closeSize + closeOffset - inline + 1,
    arrow: { width: theme.length("--tip-arrow-width", 47), height: theme.length("--tip-arrow-height", 13), path: ARROW_PATH },
  }
}

type TipBodyProps = TipContentProps & {
  onClose?: () => void
  closeLabel: string
  /** The card's fill; transparent over the popover's glass. */
  background?: string
  role?: "note"
  testID?: string
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}

function TipBody({ title, description, icon, actions, mobileActions = "rows", onClose, closeLabel, background, role, testID, style, children }: TipBodyProps) {
  const theme = useTheme()
  const android = theme.isAndroid
  const m = metricsOf(theme)
  const items = flattenChildren(actions).filter(isRenderable)
  const hasActions = items.length > 0
  const buttons = mobileActions === "buttons"
  const hasIcon = isRenderable(icon)
  const closable = onClose != null
  const descriptionColor = android ? theme.colors.textSecondary : theme.color("--tip-description-color", theme.colors.textSecondary)
  const paddingBottom = !hasActions ? m.bottomNone : buttons ? m.bottomButtons : m.bottomRows
  // iOS's tip with button actions is TipKit's mini tip (its kit's Hint View): 22 over the title, 4 between the title
  // and the message, 22 from the words to the action and 16 under it
  const miniTip = !android && hasActions && buttons
  const textStart = hasIcon ? m.iconFrame + m.iconGap : 0
  return (
    <View
      role={role}
      aria-label={role ? textOf(title) || undefined : undefined}
      testID={testID}
      style={[
        styles.tip,
        {
          borderRadius: m.radius,
          paddingTop: miniTip ? 22 : m.top,
          paddingHorizontal: m.inline,
          paddingBottom,
          columnGap: m.iconGap,
          rowGap: miniTip ? 22 : hasActions && buttons ? m.gapButtons : m.gap,
          backgroundColor: background ?? theme.colors.groupedSurface,
        },
        style,
      ]}
    >
      {children}
      {hasIcon ? (
        <View style={[styles.icon, { width: m.iconFrame, height: m.iconFrame }]}>
          <IconDefaultsProvider size={m.icon} color={descriptionColor}>
            {icon}
          </IconDefaultsProvider>
        </View>
      ) : null}
      <View style={[styles.message, closable ? { paddingEnd: m.messageEnd } : null]}>
        <Text variant="headline">{title}</Text>
        {isRenderable(description) ? (
          <TextColorProvider value={descriptionColor}>
            <Text variant="subheadline" color={descriptionColor} style={android ? styles.androidDescription : miniTip ? styles.miniDescription : null}>
              {description}
            </Text>
          </TextColorProvider>
        ) : null}
      </View>
      {hasActions ? (
        <View
          style={[
            styles.actions,
            buttons ? styles.buttons : android ? [styles.androidActions, { marginStart: textStart - ANDROID_TEXT_BUTTON_INSET }] : { paddingStart: textStart },
          ]}
        >
          {items.map((item, index) => (buttons ? <ActionButton key={index} item={item} /> : <ActionRow key={index} item={item} />))}
        </View>
      ) : null}
      {closable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
          style={[styles.close, { width: m.closeTarget, height: m.closeTarget, top: m.closeTop, end: m.closeEnd, borderRadius: m.closeTarget / 2 }]}
        >
          {({ pressed }) => (
            <View style={[styles.closeGlyph, android && pressed ? { backgroundColor: controlHighlight(theme.scheme), borderRadius: m.closeTarget / 2 } : null]}>
              <X size={m.closeIcon} color={android ? theme.colors.labelSecondary : theme.colors.labelTertiary} style={!android && pressed ? styles.pressed : undefined} />
            </View>
          )}
        </Pressable>
      ) : null}
    </View>
  )
}

/**
 * An action as a capsule across the tip. On iOS it is TipKit's action (the kit's Hint View): 50 tall, a 17 Semibold
 * label in the action's color (the accent for a primary one) on that color at 8% over the gray fill at 8%. On Android
 * the Button keeps its color and variant, a 40dp capsule.
 */
function ActionButton({ item }: { item: ReactNode }) {
  const theme = useTheme()
  if (!isValidElement(item) || item.type !== Button) return <>{item}</>
  const button = item as ReactElement<ButtonProps>
  if (theme.isAndroid) return cloneElement(button, { size: "lg", pill: true, block: true })
  // The Button's look props stay here; its handlers, ref and accessibility props pass on to the capsule
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    color = "primary",
    children,
    disabled = false,
    loading = false,
    inert: inertProp = loading,
    variant,
    size,
    pill,
    shape,
    mobileMaterial,
    uniform,
    block,
    labelLines,
    selected,
    iconSize,
    gutterSize,
    opticallyAlign,
    style,
    accessibilityState,
    ...pressable
  } = button.props
  /* eslint-enable @typescript-eslint/no-unused-vars */
  // As the Button: a loading or inert action takes no presses and keeps its look; a disabled one dims
  const inert = disabled || inertProp
  const ink = color === "primary" ? theme.colors.accent : theme.color(`--color-text-${color}-ghost`, theme.colors.accent)
  return (
    <Pressable
      accessibilityRole="button"
      {...pressable}
      accessibilityState={{ ...accessibilityState, disabled: inert, busy: loading }}
      aria-busy={loading}
      disabled={inert}
      style={({ pressed }) => [styles.miniAction, { backgroundColor: MINI_GRAY, opacity: disabled ? 0.4 : 1 }, pressed && !inert ? styles.pressed : null]}
    >
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.miniActionTint, { backgroundColor: withAlpha(ink, 0.08) }]} />
      {loading ? (
        <ActivityIndicator color={ink} />
      ) : (
        <Text variant="body" weight="semibold" numberOfLines={2} style={styles.miniLabel} color={ink}>
          {children as ReactNode}
        </Text>
      )}
    </Pressable>
  )
}

/** The gray under a TipKit action's tint: the kit's rgba(116, 116, 128, 0.08). */
const MINI_GRAY = "rgba(116, 116, 128, 0.08)"

/**
 * An action as a row of text in its Button's color under a separator, 46 tall, as iOS tips list them; on Android a
 * text button in the accent, as Material 3's rich tooltip sets its actions. Other elements stand as given.
 */
function ActionRow({ item }: { item: ReactNode }) {
  const theme = useTheme()
  if (!isValidElement(item) || item.type !== Button) return <>{item}</>
  const { color = "primary", children, onPress, disabled, accessibilityLabel, testID } = (item as ReactElement<ButtonProps & { color?: ButtonColor }>).props
  if (theme.isAndroid) {
    // Material's text button: 40dp, 12dp in, the label in the accent (red for a danger action), a press layer behind
    const label = disabled ? theme.colors.labelTertiary : color === "danger" ? dangerText(theme) : accentText(theme)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled ?? undefined}
        onPress={onPress as ((event: GestureResponderEvent) => void) | undefined}
        testID={testID}
        style={({ pressed }) => [styles.androidRow, pressed ? { backgroundColor: controlHighlight(theme.scheme) } : null]}
      >
        <Text variant="subheadline" weight="medium" color={label}>
          {children as ReactNode}
        </Text>
      </Pressable>
    )
  }
  const ink = theme.color(`--color-text-${color}-ghost`, theme.colors.text)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled ?? undefined}
      onPress={onPress as ((event: GestureResponderEvent) => void) | undefined}
      testID={testID}
      style={({ pressed }) => [styles.row, { borderTopColor: theme.color("--color-border", theme.colors.border) }, pressed ? { backgroundColor: theme.color("--alpha-05") } : null]}
    >
      <Text variant="body" color={disabled ? theme.colors.labelTertiary : ink}>
        {children as ReactNode}
      </Text>
    </Pressable>
  )
}

/** The arrow of a tip at its edge, in the tip's fill: the kit's 47 by 13 on iOS, Material's 16 by 8 caret on Android. */
function TipArrow({ edge, color, offset, length }: { edge: TipArrowEdge; color: string; offset?: number; length?: number }) {
  const theme = useTheme()
  const { arrow } = metricsOf(theme)
  const rotate = edge === "bottom" ? "0deg" : edge === "top" ? "180deg" : edge === "left" ? "90deg" : "-90deg"
  // A sideways arrow turns about its own center: it is moved by half its length less half its height
  const shift = (arrow.width - arrow.height) / 2
  const along = offset != null ? offset - arrow.width / 2 : length != null ? (length - arrow.width) / 2 : undefined
  const position: ViewStyle =
    edge === "bottom"
      ? { top: "100%", left: along ?? "50%", marginLeft: along == null ? -arrow.width / 2 : 0 }
      : edge === "top"
        ? { bottom: "100%", left: along ?? "50%", marginLeft: along == null ? -arrow.width / 2 : 0 }
        : edge === "left"
          ? { top: along != null ? along + shift : "50%", marginTop: along == null ? -arrow.height / 2 : 0, right: "100%", marginRight: -shift }
          : { top: along != null ? along + shift : "50%", marginTop: along == null ? -arrow.height / 2 : 0, left: "100%", marginLeft: -shift }
  return (
    <View pointerEvents="none" style={[styles.arrow, position, { width: arrow.width, height: arrow.height, transform: [{ rotate }] }]}>
      <Svg width={arrow.width} height={arrow.height} viewBox={`0 0 ${arrow.width} ${arrow.height}`}>
        <Path d={arrow.path} fill={color} />
      </Svg>
    </View>
  )
}

/**
 * A tip inside the page, as @plexui/ui's Tip on a phone (TipKit's inline tip): a title, a description, an optional
 * symbol, actions and Close, on the card of a grouped list; `arrowEdge` adds TipKit's annotation arrow. On Android the
 * same card in the Plex Android look, laid out as Material 3's rich tooltip.
 */
export function Tip({ onClose, closeLabel = "Close tip", arrowEdge, testID, style, ...content }: TipProps) {
  const theme = useTheme()
  const { arrow } = metricsOf(theme)
  const fill = theme.colors.groupedSurface
  const room: ViewStyle | null = arrowEdge
    ? { [arrowEdge === "top" ? "marginTop" : arrowEdge === "bottom" ? "marginBottom" : arrowEdge === "left" ? "marginLeft" : "marginRight"]: arrow.height }
    : null
  return (
    <TipBody {...content} onClose={onClose} closeLabel={closeLabel} role="note" testID={testID} background={fill} style={[room, style]}>
      {arrowEdge ? <TipArrow edge={arrowEdge} color={fill} /> : null}
    </TipBody>
  )
}

export type TipPopoverProps = TipContentProps & {
  /** Shows the tip (controlled). */
  open?: boolean
  /** Shows the tip at first (uncontrolled). @default false */
  defaultOpen?: boolean
  /** Called when the tip opens or closes: Close, a tap outside, Android's back or the web's Escape closes it. */
  onOpenChange?: (open: boolean) => void
  /** The control the tip explains: an element that hands its native view to `ref` (a Button, Pressable, View). */
  children: ReactElement
  /** The side of the control the tip shows on. Turned when it does not fit. @default "bottom" */
  side?: FloatingSide
  /** The alignment against the control. @default "center" */
  align?: FloatingAlign
  /** The distance from the control to the arrow's point. @default 4 */
  sideOffset?: number
  /** Shows the Close button. @default true */
  closeButton?: boolean
  /** The Close button's label. @default "Close tip" */
  closeLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * A tip anchored to a control, as @plexui/ui's Tip.Popover on a phone (TipKit's popover tip): the tip's content on the
 * iOS 27 alert's glass with the kit's popover shadow, 300 wide, its arrow pointing at the control; on Android the
 * popup surface of the Plex Android look with Material's caret. It does not take the focus.
 */
function TipPopover({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
  side = "bottom",
  align = "center",
  sideOffset = 4,
  closeButton = true,
  closeLabel = "Close tip",
  testID,
  style,
  ...content
}: TipPopoverProps) {
  const theme = useTheme()
  const window = useWindowDimensions()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }
  const { anchor, place, setTrigger } = useMenuAnchor(open)
  const android = theme.isAndroid
  const { arrow } = metricsOf(theme)
  const padding = 16
  const width = Math.min(theme.length("--tip-popover-width", 300), window.width - padding * 2)
  const fill = android ? barSurface(theme.material, theme.scheme) : theme.color("--dialog-alert-background", theme.color("--tip-popover-background"))
  const body = (
    <TipBody {...content} onClose={closeButton ? () => setOpen(false) : undefined} closeLabel={closeLabel} background="transparent" />
  )
  return (
    <>
      {/* The control keeps its place in the layout; the tip stands at it and follows it */}
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ ref?: unknown; onLayout?: (event: never) => void }>, anchorProps((children as ReactElement<{ ref?: unknown; onLayout?: (event: never) => void }>).props, setTrigger as never, open ? () => place() : undefined) as never)
        : children}
      <FloatingPanel
        open={open}
        onDismiss={() => setOpen(false)}
        anchor={anchor}
        side={side}
        align={align}
        // Radix adds the arrow's height to the offset: the distance is to the arrow's point
        sideOffset={sideOffset + arrow.height}
        collisionPadding={padding}
        arrow={{ width: arrow.width, padding: android ? 12 : 26 }}
        glass={!android}
        autoFocus={false}
        role="dialog"
        aria-label={textOf(content.title) || undefined}
        testID={testID}
        style={[{ width }, style]}
      >
        {(placement) => (
          <>
            {android ? (
              <View style={[styles.popupSurface, { backgroundColor: fill, boxShadow: elevationShadow.level2 }]}>{body}</View>
            ) : (
              <Glass
                radius={metricsOf(theme).radius}
                fillToken="--dialog-alert-background"
                filterToken="--dialog-alert-backdrop-filter"
                shadowToken="--tip-popover-shadow"
              >
                {body}
              </Glass>
            )}
            <TipArrow edge={opposite[placement.side]} color={fill} offset={placement.size ? placement.arrow : undefined} />
          </>
        )}
      </FloatingPanel>
    </>
  )
}

/** The tip's edge that faces the control: the arrow points back at it. */
const opposite: Record<FloatingSide, TipArrowEdge> = { bottom: "top", top: "bottom", left: "right", right: "left" }

const styles = StyleSheet.create({
  tip: { position: "relative", flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", alignSelf: "stretch", borderCurve: "continuous" },
  icon: { flexShrink: 0, alignItems: "center", justifyContent: "center" },
  message: { flex: 1, minWidth: 0 },
  androidDescription: { marginTop: 2 },
  actions: { flexBasis: "100%", flexGrow: 1, flexDirection: "column" },
  buttons: { gap: 10 },
  miniDescription: { marginTop: 4 },
  miniAction: { minHeight: 50, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 25, borderCurve: "continuous", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  miniActionTint: { borderRadius: 25 },
  miniLabel: { lineHeight: 18, textAlign: "center" },
  androidActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  row: { minHeight: 46, paddingVertical: 12, borderTopWidth: 1, justifyContent: "center" },
  androidRow: { alignSelf: "flex-start", minHeight: 40, paddingHorizontal: 12, borderRadius: 20, justifyContent: "center" },
  close: { position: "absolute", alignItems: "center", justifyContent: "center" },
  closeGlyph: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.5 },
  arrow: { position: "absolute" },
  popupSurface: { borderRadius: 12, borderCurve: "continuous" },
})

Tip.Popover = TipPopover
