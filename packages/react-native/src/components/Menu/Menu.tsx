import { Children, cloneElement, createContext, Fragment, isValidElement, useCallback, useContext, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react"
import { Animated, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import CheckMd from "../../icons/plex/CheckMd"
import { Glass } from "../../internal/Glass"
import { canTransformGlass, glassOpacity, Overlay } from "../../internal/Overlay"
import { elevationShadow, stateLayer, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { materialType } from "../../theme/typography"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text } from "../Text/Text"

export type MenuAnchor = { x: number; y: number; width: number; height: number }

export type Measurable = { measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void }

type MenuContextValue = { open: boolean; setOpen: (open: boolean) => void; anchor: MenuAnchor | null; setTrigger: (node: Measurable | null) => void }
const MenuContext = createContext<MenuContextValue | null>(null)

/** Closes the menu once an item is chosen; also used by Select. */
const SurfaceContext = createContext<{ close: () => void; check: boolean }>({ close: () => {}, check: false })

export type MenuProps = {
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/** Measures an element in the window, where the overlay lays the menu out. */
export function measure(node: Measurable | null, done: (anchor: MenuAnchor) => void) {
  if (!node?.measureInWindow) return done({ x: 0, y: 0, width: 0, height: 0 })
  node.measureInWindow((x, y, width, height) => done({ x, y, width, height }))
}

/**
 * A menu of actions from a trigger: iOS 26's pop-up menu (glass, radius 34, 250 wide, 17/20 rows of 42 with the
 * symbol at the leading edge, `--menu-*` of the phone layer), Android Material 3 Expressive's menu (Compose's
 * `DropdownMenuGroup`: surfaceContainerLow, 16dp corners, 44dp items in Label L, a chosen item filled with
 * tertiaryContainer). Parts as @plexui/ui: `Menu.Trigger`, `Menu.Content`, `Menu.Item`, `Menu.Separator`,
 * `Menu.Label`.
 */
function MenuRoot({ children, open: openProp, onOpenChange }: MenuProps) {
  const [own, setOwn] = useState(false)
  const open = openProp ?? own
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null)
  const trigger = useRef<Measurable | null>(null)
  const setTrigger = useCallback((node: Measurable | null) => {
    trigger.current = node
  }, [])
  const setOpen = (next: boolean) => {
    const apply = () => {
      if (openProp === undefined) setOwn(next)
      onOpenChange?.(next)
    }
    if (next) measure(trigger.current, (box) => (setAnchor(box), apply()))
    else apply()
  }
  // A menu opened from outside (the controlled `open`) is placed at its trigger too
  useEffect(() => {
    if (openProp) measure(trigger.current, setAnchor)
  }, [openProp])
  return <MenuContext.Provider value={{ open, setOpen, anchor, setTrigger }}>{children}</MenuContext.Provider>
}
MenuRoot.displayName = "Menu"

function useMenu(part: string) {
  const context = useContext(MenuContext)
  if (!context) throw new Error(`${part} must be inside a Menu`)
  return context
}

/** The element that opens the menu: a Button or anything with `onPress`. */
function MenuTrigger({ children, style }: { children: ReactElement<{ onPress?: (event: GestureResponderEvent) => void }>; style?: StyleProp<ViewStyle> }) {
  const { open, setOpen, setTrigger } = useMenu("Menu.Trigger")
  const onPress = isValidElement(children) ? children.props.onPress : undefined
  const child = isValidElement(children)
    ? cloneElement(children, {
        onPress: (event: GestureResponderEvent) => {
          onPress?.(event)
          setOpen(!open)
        },
        "aria-haspopup": "menu",
        "aria-expanded": open,
      } as Record<string, unknown>)
    : children
  return (
    <View ref={setTrigger as never} collapsable={false} style={[styles.trigger, style]}>
      {child}
    </View>
  )
}
MenuTrigger.displayName = "Menu.Trigger"

export type MenuContentProps = {
  children: ReactNode
  /** The menu's edge that lines up with the trigger's. @default "start" */
  align?: "start" | "end"
  /** @default 250 on iOS; Material's menu fits its items, 112 to 280 (and 4 on each side) */
  width?: number
  "aria-label"?: string
  testID?: string
}

function MenuContent(props: MenuContentProps) {
  const menu = useMenu("Menu.Content")
  return <MenuSurface {...props} open={menu.open} anchor={menu.anchor} onClose={() => menu.setOpen(false)} />
}
MenuContent.displayName = "Menu.Content"

/** The floating panel of a menu, placed under its anchor (over it when the screen ends first). */
export function MenuSurface({
  open,
  anchor,
  onClose,
  align = "start",
  width,
  check = false,
  children,
  "aria-label": ariaLabel,
  testID,
}: MenuContentProps & { open: boolean; anchor: MenuAnchor | null; onClose: () => void; check?: boolean }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const window = useWindowDimensions()
  const [size, setSize] = useState({ width: 0, height: 0 })
  // An Android menu is as wide as its items, which a ScrollView does not tell its parent: the items stand in a plain
  // View, measured, and only a menu taller than the screen scrolls, at the width they took
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null)
  const android = theme.isAndroid
  const m = theme.material
  const box = anchor ?? { x: window.width / 2, y: window.height / 2, width: 0, height: 0 }
  const panelWidth = android ? undefined : (width ?? theme.length("--menu-default-width", 250))
  const measured = panelWidth ?? size.width
  // Compose opens a dropdown menu right at its anchor's edge
  const gap = android ? 0 : 8
  const margin = 8
  let left = align === "end" ? box.x + box.width - measured : box.x
  left = Math.max(margin, Math.min(left, window.width - measured - margin))
  const below = box.y + box.height + gap
  const fitsBelow = below + size.height <= window.height - insets.bottom - margin
  const top = fitsBelow ? below : Math.max(insets.top + margin, box.y - gap - size.height)
  const maxHeight = window.height - insets.top - insets.bottom - 2 * margin
  const scrolls = natural != null && natural.height > maxHeight
  const content = <SurfaceContext.Provider value={{ close: onClose, check }}>{android ? placeItems(children) : children}</SurfaceContext.Provider>
  return (
    <Overlay open={open} onDismiss={onClose} enter={200} exit={150} testID={testID}>
      {(progress) => (
        <Animated.View
          accessibilityRole="menu"
          aria-label={ariaLabel}
          onLayout={(event) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
          style={[
            styles.surface,
            {
              left,
              top,
              width: panelWidth,
              maxHeight,
              opacity: android ? progress : glassOpacity(progress, open),
              transform: android || canTransformGlass ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [android ? 0.95 : 0.8, 1] }) }] : undefined,
            },
          ]}
        >
          {android ? (
            <View style={[styles.android, { backgroundColor: m.surfaceContainerLow, minWidth: Math.max(120, width ?? 0), maxWidth: Math.max(288, width ?? 0) }, width ? { width } : scrolls ? { width: natural.width } : null]}>
              {scrolls ? (
                <ScrollView style={styles.scroll} bounces={false}>
                  {content}
                </ScrollView>
              ) : (
                <View onLayout={(event) => setNatural({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height + 4 })}>{content}</View>
              )}
            </View>
          ) : (
            <Glass radius={theme.length("--menu-radius", 34)} elevation="raised" fillToken="--menu-mobile-background" style={[styles.shrink, { padding: theme.length("--menu-gutter", 10) }]}>
              {/* A long menu scrolls inside the screen */}
              <ScrollView style={styles.scroll} bounces={false}>
                {content}
              </ScrollView>
            </Glass>
          )}
        </Animated.View>
      )}
    </Overlay>
  )
}

/** The 2dp around an item that its 48dp touch target takes. */
const ITEM_SLOP = { top: 2, bottom: 2, left: 4, right: 4 }

/** An item's place in its group, the items between two separators: Compose rounds a group's first and last item more. */
const ItemPlaceContext = createContext<{ first: boolean; last: boolean }>({ first: false, last: false })

/** The children of a menu with fragments opened, each with a key scoped by the fragments it came from. */
function flatten(children: ReactNode, scope = ""): Array<{ node: ReactNode; key: string }> {
  return Children.toArray(children).flatMap((child, index) => {
    const key = `${scope}${isValidElement(child) && child.key != null ? child.key : index}`
    return isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? flatten(child.props.children, `${key}/`) : [{ node: child, key }]
  })
}

/** Tells each Menu.Item where it stands in its group, keeping every child's identity (its own key). */
function placeItems(children: ReactNode) {
  const flat = flatten(children)
  let group = 0
  const groups = flat.map(({ node }) => {
    if (isValidElement(node) && node.type === MenuSeparator) group++
    return isValidElement(node) && node.type === MenuItem ? group : -1
  })
  return flat.map(({ node, key }, index) => {
    const own = groups[index]
    if (own < 0) return <Fragment key={key}>{node}</Fragment>
    const before = groups.slice(0, index).filter((g) => g >= 0)
    const after = groups.slice(index + 1).filter((g) => g >= 0)
    const first = before.length === 0 || before[before.length - 1] !== own
    const last = after.length === 0 || after[0] !== own
    return (
      <ItemPlaceContext.Provider key={key} value={{ first, last }}>
        {node}
      </ItemPlaceContext.Provider>
    )
  })
}

export type MenuItemProps = {
  children: ReactNode
  /** A symbol at the leading edge. */
  icon?: ReactNode
  description?: ReactNode
  danger?: boolean
  disabled?: boolean
  /** Shows the checkmark of a chosen option (Select, a radio item). */
  checked?: boolean
  onSelect?: () => void
  testID?: string
}

function MenuItem({ children, icon, description, danger = false, disabled = false, checked, onSelect, testID }: MenuItemProps) {
  const theme = useTheme()
  const surface = useContext(SurfaceContext)
  const place = useContext(ItemPlaceContext)
  const select = () => {
    if (disabled) return
    onSelect?.()
    surface.close()
  }
  if (theme.isAndroid) {
    // Compose material3 Expressive: SegmentedMenuTokens (geometry) and StandardMenuTokens (colors)
    const m = theme.material
    const chosen = surface.check && !!checked
    const off = withAlpha(chosen ? m.onTertiaryContainer : m.onSurface, 0.38)
    const color = disabled ? off : chosen ? m.onTertiaryContainer : danger ? m.error : m.onSurface
    const iconColor = disabled ? off : chosen ? m.onTertiaryContainer : danger ? m.error : m.onSurfaceVariant
    const label = materialType.labelLarge
    const body = materialType.bodyMedium
    // The first and last item of a group round to the group's corners; a chosen item is a 12dp rounded fill
    const top = chosen || place.first ? 12 : 4
    const bottom = chosen || place.last ? 12 : 4
    const shape = { borderTopLeftRadius: top, borderTopRightRadius: top, borderBottomLeftRadius: bottom, borderBottomRightRadius: bottom }
    // A chosen item shows the check at its leading edge, in place of its icon
    const leading = chosen ? <CheckMd /> : icon
    return (
      <Pressable
        accessibilityRole="menuitem"
        accessibilityState={{ disabled, checked: surface.check ? !!checked : undefined }}
        disabled={disabled}
        onPress={select}
        testID={testID}
        hitSlop={ITEM_SLOP}
        style={[styles.androidItem, shape, chosen ? { backgroundColor: m.tertiaryContainer } : null]}
      >
        {({ pressed }) => (
          <>
            {pressed ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, shape, { backgroundColor: withAlpha(color, stateLayer.pressed) }]} /> : null}
            {leading ? (
              <IconDefaultsProvider size={20} color={iconColor}>
                {leading}
              </IconDefaultsProvider>
            ) : null}
            <View style={styles.text}>
              <Text color={color} numberOfLines={1} style={{ fontSize: label.fontSize, lineHeight: label.lineHeight, ...theme.font("medium") }}>
                {children}
              </Text>
              {description != null ? (
                <Text color={disabled ? off : chosen ? m.onTertiaryContainer : m.onSurfaceVariant} style={{ fontSize: body.fontSize, lineHeight: body.lineHeight }}>
                  {description}
                </Text>
              ) : null}
            </View>
          </>
        )}
      </Pressable>
    )
  }
  const color = disabled ? theme.color("--menu-disabled-label-color") : danger ? theme.color("--color-text-danger") : theme.colors.text
  const inner = theme.length("--menu-radius", 34) - theme.length("--menu-gutter", 10)
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ disabled, checked: surface.check ? !!checked : undefined }}
      disabled={disabled}
      onPress={select}
      testID={testID}
      style={({ pressed }) => [
        styles.iosItem,
        { minHeight: theme.length("--menu-row-min-height", 42), borderRadius: inner, gap: theme.length("--menu-item-gap", 6) },
        pressed ? { backgroundColor: theme.color("--menu-press-background") } : null,
      ]}
    >
      {surface.check ? (
        <View style={styles.check}>{checked ? <CheckMd size={theme.length("--menu-check-size", 18)} color={color} /> : null}</View>
      ) : null}
      {icon ? (
        <View style={{ width: theme.length("--menu-leading-icon-slot", 36), alignItems: "center" }}>
          <IconDefaultsProvider size={theme.length("--menu-leading-icon-size", 20)} color={color}>
            {icon}
          </IconDefaultsProvider>
        </View>
      ) : null}
      <View style={styles.text}>
        <Text color={color} style={{ fontSize: theme.length("--menu-font-size", 17), lineHeight: theme.length("--menu-line-height", 20) }}>
          {children}
        </Text>
        {description != null ? (
          <Text
            color={disabled ? theme.color("--menu-disabled-description-color") : theme.color("--menu-description-color")}
            style={{ fontSize: theme.length("--menu-description-font-size", 13), lineHeight: theme.length("--menu-description-line-height", 18) }}
          >
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}
MenuItem.displayName = "Menu.Item"

function MenuSeparator() {
  const theme = useTheme()
  return theme.isAndroid ? (
    <View style={[styles.androidSeparator, { backgroundColor: theme.material.outlineVariant }]} />
  ) : (
    <View style={[styles.iosSeparator, { backgroundColor: theme.color("--alpha-10") }]} />
  )
}
MenuSeparator.displayName = "Menu.Separator"

/** A heading over a group of items. */
function MenuLabel({ children }: { children: ReactNode }) {
  const theme = useTheme()
  if (theme.isAndroid) {
    // Compose's DropdownMenuGroupLabel: Label L, at least 32 tall, 12 in
    const type = materialType.labelLarge
    return (
      <View style={styles.androidLabel}>
        <Text color={theme.material.onSurfaceVariant} style={{ fontSize: type.fontSize, lineHeight: type.lineHeight, ...theme.font("medium") }}>
          {children}
        </Text>
      </View>
    )
  }
  return (
    <Text
      color="secondary"
      weight="medium"
      style={{ fontSize: theme.length("--menu-label-font-size", 13), lineHeight: theme.length("--menu-label-line-height", 15), paddingTop: 4, paddingHorizontal: 8, paddingBottom: 10 }}
    >
      {children}
    </Text>
  )
}
MenuLabel.displayName = "Menu.Label"

export const Menu = Object.assign(MenuRoot, { Trigger: MenuTrigger, Content: MenuContent, Item: MenuItem, Separator: MenuSeparator, Label: MenuLabel })

const styles = StyleSheet.create({
  trigger: { alignSelf: "flex-start" },
  surface: { position: "absolute" },
  shrink: { flexShrink: 1 },
  scroll: { flexGrow: 0 },
  // A standalone group: 16dp corners, 2 above and below its items, elevation level 2
  android: { flexShrink: 1, borderRadius: 16, paddingVertical: 2, boxShadow: elevationShadow.level2 },
  // 44 tall, 12 around its content, 4 in from the group's sides; the icon 8 before the label. Compose's item Surface
  // takes the 48dp minimum touch size, so a one-line item keeps 2 above and below (a two-line one has the same 2 as
  // padding): the items stand 4 apart and 4 in from the group's edge, concentric with its 16dp corners
  androidItem: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 12, marginHorizontal: 4, marginVertical: 2 },
  androidSeparator: { height: 1, marginHorizontal: 12, marginVertical: 2 },
  androidLabel: { minHeight: 32, justifyContent: "center", paddingLeft: 12, paddingRight: 4 },
  iosItem: { flexDirection: "row", alignItems: "center", paddingTop: 10, paddingBottom: 10, paddingLeft: 6, paddingRight: 8, borderCurve: "continuous" },
  iosSeparator: { height: StyleSheet.hairlineWidth, marginVertical: 10, marginHorizontal: 8 },
  // The check column, 8.5 before the label (6 of the row gap and 2.5): the label stands 27.5 in, as `--menu-check-label-inset`
  check: { width: 13, marginRight: 2.5, alignItems: "center", overflow: "visible" },
  // Grows and shrinks from its own width (not `flex: 1`, whose zero basis gives an Android menu sized by its items no width)
  text: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
})
