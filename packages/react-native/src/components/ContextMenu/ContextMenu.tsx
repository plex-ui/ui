import { cloneElement, createContext, isValidElement, useCallback, useContext, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react"
import { Dimensions, Platform, View, type AccessibilityActionEvent, type StyleProp, type ViewStyle } from "react-native"
import { useTheme } from "../../theme/ThemeProvider"
import { Menu, MenuSurface, hasCheckedItems, measure, type MenuAnchor, type MenuContentProps, type Measurable } from "../Menu/Menu"

/** A touch and hold opens the menu after half a second, as the web's ContextMenu (CONTEXT_MENU_LONG_PRESS). */
export const CONTEXT_MENU_LONG_PRESS = 500

type ContextMenuState = {
  open: boolean
  setOpen: (next: boolean) => void
  anchor: MenuAnchor | null
  preview: ReactNode
  setTarget: (node: Measurable | null, preview: ReactNode) => void
}

const ContextMenuContext = createContext<ContextMenuState | null>(null)

function useContextMenu(part: string) {
  const context = useContext(ContextMenuContext)
  if (!context) throw new Error(`${part} must be inside a ContextMenu`)
  return context
}

export type ContextMenuProps = {
  children: ReactNode
  /** Holds the menu open or closed. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * A menu of actions for an element, opened by a touch and hold (and a right click on the web): on iOS 27 the screen
 * dims and blurs, the element stays clear over it as a lifted preview, and the glass menu stands 16 from it by the
 * third of the screen it is in, over it when it stands in the lower half; on Android Material's popup under the
 * element, the screen dimmed around it. Parts as @plexui/ui: `ContextMenu.Trigger`, `ContextMenu.Content`, and the
 * items of Menu (`ContextMenu.Item`, `ContextMenu.Separator`, `ContextMenu.Label`).
 */
function ContextMenuRoot({ children, open: openProp, onOpenChange }: ContextMenuProps) {
  const [own, setOwn] = useState(false)
  const open = openProp ?? own
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null)
  const target = useRef<{ node: Measurable | null; preview: ReactNode }>({ node: null, preview: null })
  const [preview, setPreview] = useState<ReactNode>(null)
  const apply = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOwn(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange],
  )
  const setOpen = apply
  const applyRef = useRef(apply)
  applyRef.current = apply
  // The element is measured as the menu opens, by a touch and hold or by `open`: the menu and its preview stand where
  // it is. Until then nothing is drawn
  useEffect(() => {
    if (!open) {
      setAnchor(null)
      return
    }
    let live = true
    measure(target.current.node, (box) => {
      if (!live) return
      setAnchor(box)
      setPreview(target.current.preview)
    })
    // A turn of the screen moves the element: the menu closes, as iOS dismisses a context menu on rotation
    const sub = Dimensions.addEventListener("change", () => applyRef.current(false))
    return () => {
      live = false
      sub.remove()
    }
  }, [open])
  const setTarget = useCallback((node: Measurable | null, next: ReactNode) => {
    target.current = { node, preview: next }
  }, [])
  return <ContextMenuContext.Provider value={{ open, setOpen, anchor, preview, setTarget }}>{children}</ContextMenuContext.Provider>
}
ContextMenuRoot.displayName = "ContextMenu"

type Holdable = {
  onLongPress?: (...args: unknown[]) => void
  onPress?: unknown
  accessibilityActions?: ReadonlyArray<{ name: string; label?: string }>
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void
}

/**
 * The element the menu is for: a ListItem, a Pressable, a Button, anything with `onLongPress`. Its own press still
 * runs; a touch and hold opens the menu, and so does a right click on the web. The lifted preview on iOS is the
 * element drawn again from its props, so state the element keeps inside itself is not in it.
 */
function ContextMenuTrigger({ children, style }: { children: ReactElement<Holdable>; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme()
  const { setOpen, setTarget, open, anchor } = useContextMenu("ContextMenu.Trigger")
  const child = isValidElement<Holdable>(children) ? children : null
  const own = child?.props
  // The element's own long press gets its event, then the menu opens
  const hold = (...args: unknown[]) => {
    own?.onLongPress?.(...args)
    setOpen(true)
  }
  // VoiceOver and TalkBack open it through the element's long-press action (ListItem names it itself)
  const actions = own?.accessibilityActions ?? []
  const a11y = actions.some((action) => action.name === "longpress")
    ? null
    : {
        accessibilityActions: [...actions, { name: "longpress" }],
        onAccessibilityAction: (event: AccessibilityActionEvent) => {
          if (event.nativeEvent.actionName === "longpress") hold()
          else own?.onAccessibilityAction?.(event)
        },
      }
  // The preview is the element drawn again over the dimming, taking no presses
  const preview = child ? cloneElement(child, { onLongPress: undefined, onPress: undefined }) : null
  const web = Platform.OS === "web"
  return (
    <View
      ref={(next: unknown) => setTarget(next as Measurable | null, preview)}
      collapsable={false}
      // On iOS the element hides under its lifted preview while the menu is open, so it is not drawn twice; Android
      // keeps it lit in its place
      style={[{ opacity: open && anchor && !theme.isAndroid ? 0 : 1 }, style]}
      {...(web
        ? {
            onContextMenu: (event: { preventDefault: () => void }) => {
              event.preventDefault()
              setOpen(true)
            },
          }
        : null)}
    >
      {child ? cloneElement(child, { onLongPress: hold, ...a11y }) : children}
    </View>
  )
}
ContextMenuTrigger.displayName = "ContextMenu.Trigger"

export type ContextMenuContentProps = Omit<MenuContentProps, "align">

/** The menu: Menu's items, 250 wide on iOS. */
function ContextMenuContent(props: ContextMenuContentProps) {
  const theme = useTheme()
  const { open, setOpen, anchor, preview } = useContextMenu("ContextMenu.Content")
  // The preview keeps a row's corners to half its height, else the kit's 30 (--context-menu-preview-radius)
  // Items that say `checked` make a set of options, with the checkmark's column, as in Menu
  const check = hasCheckedItems(props.children)
  const radius = Math.min(theme.length("--context-menu-preview-radius", 30), (anchor?.height ?? 60) / 2)
  if (theme.isAndroid) {
    // Android: Material's popup under the element at its end, the screen dimmed around it
    return <MenuSurface {...props} check={check} open={open && anchor != null} anchor={anchor} row={anchor ? { box: anchor, radius: { top: 0, bottom: 0 } } : null} cover={false} onClose={() => setOpen(false)} />
  }
  return <MenuSurface {...props} check={check} open={open && anchor != null} anchor={anchor} context={{ preview, radius }} onClose={() => setOpen(false)} />
}
ContextMenuContent.displayName = "ContextMenu.Content"

export const ContextMenu = Object.assign(ContextMenuRoot, {
  Trigger: ContextMenuTrigger,
  Content: ContextMenuContent,
  Item: Menu.Item,
  Separator: Menu.Separator,
  Label: Menu.Label,
})
