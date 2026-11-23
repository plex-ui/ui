"use client"

import clsx from "clsx"
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react"
import { createPortal } from "react-dom"
import { useEscCloseStack } from "../../hooks/useEscCloseStack"
import { Button } from "../Button/Button"
import { NavigationButton } from "../Button/NavigationButton"
import Search from "../Icon/svg/Search"
import s from "@plexui/styles/components/Toolbar/Toolbar.module.css"

export type ToolbarPlacement = "top" | "bottom"
/**
 * Where a screen's search field stands (`Toolbar.Content search`):
 * - `"bottom"`: the field itself, in the bar it is written in: in a bottom bar, in reach of the thumb, as iOS 26 places a
 *   screen's search
 * - `"top"`: a search button first among the top bar's trailing actions; pressed, it grows into the field over the bar,
 *   the bar's leading action turns into a back arrow that closes it, and a Sheet goes full screen on Android
 * - `"auto"`: the platform's place, the bottom on iOS and the top in the Plex Android look (`data-platform="android"`)
 */
export type ToolbarSearchPlacement = "auto" | "top" | "bottom"
/** Title layouts of the phone top bar. */
export type ToolbarTitleStyle = "inline" | "large" | "compact-large" | "compact-medium"
export type ToolbarTitleAlign = "center" | "start"
/**
 * How a bar meets the content scrolled under it, after the scroll edge effect of iOS 26:
 * - `"soft"` (the default of a bottom bar): at the top, once content is under the bar, a blur that grows toward the top under a
 *   thin veil of the canvas color, with no line, which lets go past the bar; at the bottom of a page the content stays clear
 *   under and around the controls, as on native iOS 26, and a Sheet's bottom bar fades its content into the panel
 * - `"hard"`: an opaque bar of the canvas color with a hairline once content is under it
 * - `"glass"` (the default of a top bar): a translucent, blurred bar with a hairline, shown once content is under it
 * - `"blur"`: no fill and no line, once content is under the bar: the content blurred a little over the bar and past it,
 *   and heavily toward the screen's edge
 *
 * iOS 27.2 has two scroll edges, soft and hard; glass is the bar of earlier iOS and blur an app's own.
 */
export type BarBackground = "soft" | "hard" | "glass" | "blur"
/**
 * `"solid"` is the earlier name of `"hard"`: iOS has no opaque bar without a line, and it draws the line of a hard edge
 * only once content is under the bar, so at rest the two look the same.
 */
export type BarBackgroundAlias = "solid"
/** `"edge"` is the earlier name of `"soft"`, `"solid"` of `"hard"`. */
export type ToolbarBackground = BarBackground | BarBackgroundAlias | "edge"

/** The background a bar draws, from its current name or an earlier one. */
export const barBackground = (background: ToolbarBackground | undefined): BarBackground | undefined =>
  background === "edge" ? "soft" : background === "solid" ? "hard" : background

/**
 * A surface that places phone toolbars: `Page` puts the top bar over its content
 * and reserves the space; `Dialog` puts it 16px under the Sheet's top edge. Both keep a large title at the top of
 * their content (Page.Content, Dialog.Body), where it scrolls and collapses into the bar.
 */
export type ToolbarHost = {
  kind: "page" | "dialog"
  setHeight?: (placement: ToolbarPlacement, height: number | undefined) => void
  /** Content has scrolled under the top bar, so its glass casts a shadow and a hard or glass bar shows its line. */
  scrolled?: boolean
  /** Content continues under the bottom bar, so a hard or glass bar shows its line. */
  contentBelow?: boolean
  /** Calls the listener with the content's scroll offset on every scroll; returns the unsubscribe. A TabBar minimizes with it. */
  subscribeScroll?: (listener: (scrollTop: number) => void) => () => void
  /** A large title asks for a place in the content; returns the release. */
  requestLargeTitleSlot?: () => () => void
  /** The place at the top of the content where a large title scrolls with it, once the content has made one. */
  largeTitleSlot?: HTMLElement | null
  /** The place under a large title where the bar's rows stand, pinned under the bar once scrolled up to it. */
  largeTitleRowSlot?: HTMLElement | null
  /** The rows under a large title are pinned under the bar, so its background reaches under them. */
  rowsPinned?: boolean
  /**
   * `false` while the host has no content to keep a large title in (a Dialog without Dialog.Body): the title and its
   * rows stay in the bar. Otherwise the rows wait for their place, so they mount once, there.
   */
  holdsLargeTitle?: boolean
}

export const ToolbarHostContext = createContext<ToolbarHost | null>(null)

// The title style of the top bar, which a large title on a page needs to show itself inline once scrolled.
const ToolbarTitleStyleContext = createContext<ToolbarTitleStyle | undefined>(undefined)
// The bar itself, which a large title in the content marks once it has gone under the bar. It is state, so a title
// that mounts before its bar (a bar replaced under a page that keeps its content) follows the bar once it is there.
const ToolbarElementContext = createContext<HTMLDivElement | null>(null)
// The bar a part is written in: its placement, and the count of its searches that stand in the other bar
type ToolbarBar = { placement: ToolbarPlacement; searchAway: () => () => void }
const ToolbarBarContext = createContext<ToolbarBar | null>(null)

// The tokens of a large title a bar can set for itself, which the title in the content no longer inherits from it.
const LARGE_TITLE_TOKENS = [
  "--toolbar-padding-bottom",
  "--toolbar-large-title-gap",
  "--toolbar-large-title-font-size",
  "--toolbar-large-title-line-height",
  "--toolbar-large-title-descent",
  "--toolbar-large-subtitle-font-size",
  "--toolbar-large-subtitle-line-height",
  "--toolbar-large-subtitle-descent",
]

/**
 * Follows a large title in the content: it takes the large title tokens the bar sets for itself, and once its last line
 * is at the bar's bottom the bar shows it inline. Scrolling moves it; a change of layout (a wide window turning into a
 * phone's, which shows the bar and the title) or of a class or style on the bar, the content or around them measures it
 * again. A token the bar shares with the content stays inherited, so it follows the page's changes. A hidden title has
 * not gone under anything.
 */
function followLargeTitle(bar: HTMLElement, heading: HTMLElement, subscribeScroll: (listener: () => void) => () => void) {
  const collapse = () => {
    const box = heading.getBoundingClientRect()
    bar.toggleAttribute("data-title-collapsed", box.height > 0 && box.bottom <= bar.getBoundingClientRect().bottom)
  }
  const layout = () => {
    const own = getComputedStyle(bar)
    const place = heading.parentElement ? getComputedStyle(heading.parentElement) : undefined
    for (const token of LARGE_TITLE_TOKENS) {
      const value = own.getPropertyValue(token).trim()
      if (value && value !== place?.getPropertyValue(token).trim()) heading.style.setProperty(token, value)
      else heading.style.removeProperty(token)
    }
    collapse()
  }
  layout()
  const unsubscribe = subscribeScroll(collapse)
  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(layout) : undefined
  observer?.observe(bar)
  observer?.observe(heading)
  const mutations = typeof MutationObserver !== "undefined" ? new MutationObserver(layout) : undefined
  // A token reaches the bar or the content from the class or style of either or of anything around them.
  for (const start of [bar, heading.parentElement]) {
    for (let node = start; node; node = node.parentElement) mutations?.observe(node, { attributes: true, attributeFilter: ["class", "style"] })
  }
  return () => {
    unsubscribe()
    observer?.disconnect()
    mutations?.disconnect()
    bar.removeAttribute("data-title-collapsed")
    for (const token of LARGE_TITLE_TOKENS) heading.style.removeProperty(token)
  }
}

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

export type ToolbarProps = HTMLAttributes<HTMLDivElement> & {
  /** @default "top" */
  placement?: ToolbarPlacement
  /** Layout of `Toolbar.Title` in a top bar. @default "inline" */
  titleStyle?: ToolbarTitleStyle
  /** Alignment of an inline title. Compact and large titles always start at the leading edge. @default "center" */
  titleAlign?: ToolbarTitleAlign
  /** How the bar meets the content scrolled under it on a phone. @default "glass" at the top, "soft" at the bottom */
  background?: ToolbarBackground
  ref?: Ref<HTMLDivElement>
}

function ToolbarRoot({
  placement = "top",
  titleStyle = "inline",
  titleAlign = "center",
  background = placement === "bottom" ? "soft" : "glass",
  className,
  children,
  ref,
  ...restProps
}: ToolbarProps) {
  const host = useContext(ToolbarHostContext)
  const element = useRef<HTMLDivElement | null>(null)
  const [barElement, setBarElement] = useState<HTMLDivElement | null>(null)
  const setRef = useCallback((node: HTMLDivElement | null) => {
    element.current = node
    setBarElement(node)
    if (typeof ref === "function") return ref(node)
    if (ref) ref.current = node
  }, [ref])
  // A bar that holds nothing but a search standing in the other bar (a bottom bar's field that the Plex Android look
  // puts at the top) leaves its place: it draws nothing and takes no height, and the search still renders from it.
  const [searchesAway, setSearchesAway] = useState(0)
  const searchAway = useCallback(() => {
    setSearchesAway((count) => count + 1)
    return () => setSearchesAway((count) => count - 1)
  }, [])
  const bar = useMemo(() => ({ placement, searchAway }), [placement, searchAway])
  const vacant = searchesAway > 0 && Children.toArray(children).every(isSearchContent)
  const setHeight = host?.setHeight
  useLayoutEffect(() => {
    const bar = element.current
    if (!bar || !setHeight || vacant) return
    // A desktop layout hides the bar; its height then leaves the host's own header in charge.
    const update = () => setHeight(placement, bar.offsetHeight || undefined)
    update()
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : undefined
    observer?.observe(bar, { box: "border-box" })
    return () => { observer?.disconnect(); setHeight(placement, undefined) }
  }, [placement, setHeight, vacant])

  const parts = (
    <ToolbarBarContext.Provider value={bar}>
      <ToolbarElementContext.Provider value={barElement}>
        <ToolbarTitleStyleContext.Provider value={placement === "top" ? titleStyle : undefined}>{children}</ToolbarTitleStyleContext.Provider>
      </ToolbarElementContext.Provider>
    </ToolbarBarContext.Provider>
  )
  // The same element, so the parts keep their state as the bar leaves and comes back
  if (vacant) return <div ref={setRef} hidden data-toolbar-vacant="">{parts}</div>
  return (
    <div
      ref={setRef}
      className={clsx(s.Toolbar, className)}
      data-toolbar=""
      data-placement={placement}
      data-title-style={placement === "top" ? titleStyle : undefined}
      data-title-align={placement === "top" ? titleAlign : undefined}
      data-background={barBackground(background)}
      data-host={host?.kind}
      data-scrolled={placement === "top" && host?.scrolled ? "" : undefined}
      data-content-below={placement === "bottom" && host?.contentBelow ? "" : undefined}
      data-rows-pinned={placement === "top" && host?.rowsPinned ? "" : undefined}
      {...restProps}
    >
      {parts}
    </div>
  )
}
ToolbarRoot.displayName = "Toolbar"

/* ------------------------------------------------------------------ */
/*  Parts                                                              */
/* ------------------------------------------------------------------ */

export type ToolbarSlotProps = HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }

function ToolbarLeading({ className, ...restProps }: ToolbarSlotProps) {
  return <div className={clsx(s.Leading, className)} {...restProps} />
}
ToolbarLeading.displayName = "Toolbar.Leading"

function ToolbarTrailing({ className, ...restProps }: ToolbarSlotProps) {
  return <div className={clsx(s.Trailing, className)} {...restProps} />
}
ToolbarTrailing.displayName = "Toolbar.Trailing"

export type ToolbarContentProps = ToolbarSlotProps & {
  /** Stretch between the leading and trailing items, as a search field does. */
  fill?: boolean
  /**
   * Marks the content as the screen's search field (an `Input`) and sets where it stands (`ToolbarSearchPlacement`):
   * write it in the bottom bar, and at the top it becomes a search button of the top bar beside it, a Page's or a
   * Sheet's, that opens the field over that bar. `true` is `"auto"`: the bottom on iOS, the top on Android.
   */
  search?: boolean | ToolbarSearchPlacement
}

/** Custom middle content: a search field, a segmented control or a single centered action. */
function ToolbarContent({ fill = false, search, className, ...restProps }: ToolbarContentProps) {
  if (search != null && search !== false) {
    return <ToolbarSearch placement={search === true ? "auto" : search} fill={fill} className={className} {...restProps} />
  }
  return <div className={clsx(s.Content, className)} data-fill={fill ? "" : undefined} {...restProps} />
}
ToolbarContent.displayName = "Toolbar.Content"

const isSearchContent = (part: ReactNode) =>
  isValidElement<ToolbarContentProps>(part) && part.type === ToolbarContent && part.props.search != null && part.props.search !== false

const ANDROID = '[data-platform="android"]'

/** Whether a part stands in the Plex Android look: `data-platform="android"` on it or around it (PlexUIProvider). */
function useAndroid(element: RefObject<Element | null>) {
  const [android, setAndroid] = useState(false)
  useLayoutEffect(() => {
    const read = () => setAndroid(!!(element.current ?? document.documentElement).closest(ANDROID))
    read()
    if (typeof MutationObserver === "undefined") return
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-platform"], subtree: true })
    return () => observer.disconnect()
  }, [element])
  return android
}

const TOP_BAR = '[data-toolbar][data-placement="top"]'

/** The places of a search at the top: its button's capsule among the bar's trailing actions, and the layer its field opens in. */
type SearchPlaces = { bar: HTMLElement; button: HTMLElement; layer: HTMLElement }

/**
 * The top bar a search at the top stands in: the bar it is written in, or the top bar beside it (a Page's, a Sheet's),
 * looked up no further than its dialog.
 */
function findTopBar(anchor: HTMLElement): HTMLElement | null {
  const home = anchor.parentElement
  if (home?.matches(TOP_BAR)) return home
  for (let node = home?.parentElement; node; node = node.parentElement) {
    const bar = node.querySelector<HTMLElement>(`:scope > ${TOP_BAR}`)
    if (bar) return bar
    if (node.hasAttribute("data-plex-dialog")) return null
  }
  return null
}

/**
 * Makes the places of a search in the top bar and keeps them there: its button's capsule first among the bar's trailing
 * actions (in a trailing place of its own while the bar has none) and the layer over the bar its field opens in. The
 * bar's parts come and go (a confirm shown once there are changes) and a page or a sheet can replace its bar: the
 * places follow, and `onPlaces` hears of each new bar. Returns the release.
 */
function placeSearch(anchor: HTMLElement, onPlaces: (places: SearchPlaces | null) => void) {
  const doc = anchor.ownerDocument
  const make = (className: string, mark: string) => {
    const element = doc.createElement("div")
    element.className = className
    element.setAttribute(mark, "")
    return element
  }
  const button = make(s.Group, "data-toolbar-search-button")
  const layer = make(s.SearchLayer, "data-toolbar-search-layer")
  const ownTrailing = make(s.Trailing, "data-toolbar-search-trailing")
  let bar: HTMLElement | null = null
  let reported: HTMLElement | null | undefined
  const leave = () => {
    bar?.removeAttribute("data-search")
    bar?.removeAttribute("data-search-open")
    button.remove()
    layer.remove()
    ownTrailing.remove()
  }
  const observer = typeof MutationObserver !== "undefined" ? new MutationObserver(() => place()) : undefined
  const place = () => {
    const next = findTopBar(anchor)
    if (next !== bar) {
      leave()
      observer?.disconnect()
      bar = next
      // The bar's own parts, and the bars beside it (a bar replaced, or one that comes later)
      for (const scope of [bar, bar?.parentElement, anchor.parentElement?.parentElement]) if (scope) observer?.observe(scope, { childList: true })
    }
    if (bar) {
      const trailing = Array.from(bar.children).find((child) => child.classList.contains(s.Trailing) && child !== ownTrailing)
      const home = trailing ?? ownTrailing
      if (home.firstElementChild !== button) home.prepend(button)
      if (trailing) ownTrailing.remove()
      else if (ownTrailing.parentElement !== bar) bar.append(ownTrailing)
      if (layer.parentElement !== bar) bar.append(layer)
      bar.setAttribute("data-search", "")
    }
    if (bar !== reported) {
      reported = bar
      onPlaces(bar ? { bar, button, layer } : null)
    }
  }
  place()
  return () => {
    observer?.disconnect()
    leave()
  }
}

/**
 * The field grows out of its button and shrinks back into it: the button's capsule in the bar, by its layout box, which
 * the bar's motion (its actions shrinking away) leaves where it is. Its distance from the end of the bar's content is
 * kept, not from the bar's edge, so it holds as the bar's gutter changes (a Sheet's at the full screen). Set at once,
 * with no transition.
 */
function followSearchButton({ bar, button, layer }: SearchPlaces, field: HTMLElement | null) {
  let left = 0
  for (let node: HTMLElement | null = button; node && node !== bar; node = node.offsetParent as HTMLElement | null) left += node.offsetLeft
  const style = getComputedStyle(bar)
  const end = style.direction === "rtl"
    ? left - (Number.parseFloat(style.paddingLeft) || 0)
    : bar.clientWidth - (Number.parseFloat(style.paddingRight) || 0) - left - button.offsetWidth
  layer.style.setProperty("--toolbar-search-from-end", `${end}px`)
  layer.style.setProperty("--toolbar-search-from-size", `${button.offsetWidth}px`)
  if (!field) return
  field.style.transition = "none"
  void field.offsetWidth
  field.style.transition = ""
}

/** Closing the search clears its field, as a search closed on Android or canceled on iOS does: the field's own input event. */
function clearSearchField(field: HTMLElement | null) {
  const input = field?.querySelector("input")
  if (!input || input.value === "") return
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set?.call(input, "")
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

type ToolbarSearchProps = ToolbarSlotProps & { placement: ToolbarSearchPlacement; fill: boolean }

/**
 * A screen's search field, where its placement puts it. At the bottom it is the field in its bar. At the top a search
 * button stands first among the top bar's trailing actions, in the capsule of the icon buttons next to it; pressed, it
 * grows into the field over the bar (from after a back circle to the bar's end) as the title and the actions fade, and
 * the leading action becomes a back arrow. Back, or Escape, closes it, clears the field and gives the button its focus
 * back; a Sheet on Android stands at the full screen while it is open (Dialog.module.css).
 */
function ToolbarSearch({ placement, fill, className, children, ref, ...restProps }: ToolbarSearchProps) {
  const bar = useContext(ToolbarBarContext)
  const anchor = useRef<HTMLSpanElement | null>(null)
  const android = useAndroid(anchor)
  const top = (placement === "auto" ? (android ? "top" : "bottom") : placement) === "top"
  const [places, setPlaces] = useState<SearchPlaces | null>(null)
  useLayoutEffect(() => {
    const mark = anchor.current
    if (!top || !mark) return
    const release = placeSearch(mark, setPlaces)
    return () => { release(); setPlaces(null) }
  }, [top])
  // Written in the bottom bar, it leaves that bar to the top one
  const searchAway = bar?.searchAway
  const away = !!places && bar?.placement !== "top"
  useLayoutEffect(() => (away ? searchAway?.() : undefined), [away, searchAway])

  const [open, setOpen] = useState(false)
  const field = useRef<HTMLDivElement | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const setField = useCallback((node: HTMLDivElement | null) => {
    field.current = node
    if (typeof ref === "function") return ref(node)
    if (ref) ref.current = node
  }, [ref])
  useEffect(() => { if (!places) setOpen(false) }, [places])
  useLayoutEffect(() => {
    if (places) followSearchButton(places, field.current)
  }, [places])
  useLayoutEffect(() => {
    if (!places) return
    places.bar.toggleAttribute("data-search-open", open)
    if (open) field.current?.querySelector("input")?.focus({ preventScroll: true })
  }, [places, open])
  // The button takes the field's name: "Search materials"
  const [name, setName] = useState("Search")
  useLayoutEffect(() => {
    const input = field.current?.querySelector("input")
    const next = input?.getAttribute("aria-label") || input?.placeholder || "Search"
    if (next !== name) setName(next)
  })
  const openSearch = () => {
    if (places) followSearchButton(places, field.current)
    setOpen(true)
  }
  const closeSearch = () => {
    if (places) {
      followSearchButton(places, null)
      // Closed at once, so the button is there to take the focus back
      places.bar.removeAttribute("data-search-open")
    }
    clearSearchField(field.current)
    setOpen(false)
    trigger.current?.focus({ preventScroll: true })
  }
  useEscCloseStack(open, closeSearch)

  const mark = <span ref={anchor} hidden data-toolbar-search-anchor="" />
  if (!places) {
    return <>{mark}<div ref={setField} className={clsx(s.Content, className)} data-fill={fill ? "" : undefined} {...restProps}>{children}</div></>
  }
  return (
    <>
      {mark}
      {createPortal(
        <Button ref={trigger} color="secondary" variant="soft" uniform pill aria-label={name} aria-expanded={open} onClick={openSearch} data-toolbar-search-trigger="">
          <Search />
        </Button>,
        places.button,
      )}
      {createPortal(
        <>
          <div className={clsx(s.Leading, s.SearchBack)}>
            <NavigationButton action="back" aria-label="Close search" tabIndex={open ? undefined : -1} onClick={closeSearch} />
          </div>
          <div ref={setField} className={clsx(s.Content, s.SearchField, className)} data-fill="" {...restProps}>{children}</div>
        </>,
        places.layer,
      )}
    </>
  )
}
ToolbarSearch.displayName = "Toolbar.Search"

/** Buttons that share one capsule. */
function ToolbarGroup({ className, ...restProps }: ToolbarSlotProps) {
  return <div role="group" className={clsx(s.Group, className)} {...restProps} />
}
ToolbarGroup.displayName = "Toolbar.Group"

const rowOfAnchor = new WeakMap<Element, HTMLElement>()

/**
 * Under a large title each row is portaled into the rows' place as it mounts, so a row that comes later (a search field
 * shown over a segmented control already there) would stand last. An empty anchor in the bar keeps the row's place among
 * the bar's rows, and the rows are moved into that order in the content, so the keyboard and a screen reader meet them
 * as they stand (Codex #7); a row added or removed in the bar orders them again.
 */
function followRowOrder(anchor: HTMLElement, row: HTMLElement) {
  const bar = anchor.closest("[data-toolbar]") ?? anchor.parentElement
  if (!bar) return () => {}
  rowOfAnchor.set(anchor, row)
  const place = () => {
    const slot = row.parentElement
    if (!slot) return
    const rows = Array.from(bar.querySelectorAll("[data-toolbar-row-anchor]"), (mark) => rowOfAnchor.get(mark))
      .filter((each): each is HTMLElement => each?.parentElement === slot)
    // From the last row back, a row that does not stand before the next one goes right before it: only a row out of
    // place moves (the one that came later), so a field focused in another row keeps its focus (Codex #8); moveBefore,
    // where the browser has it, keeps it even in the row that moves.
    const move = (slot as HTMLElement & { moveBefore?: (node: Node, child: Node | null) => void }).moveBefore
    for (let index = rows.length - 2; index >= 0; index--) {
      const each = rows[index]
      const next = rows[index + 1]
      if (each.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING) continue
      try {
        if (move) {
          move.call(slot, each, next)
          continue
        }
      } catch {
        // falls back to a plain move
      }
      slot.insertBefore(each, next)
    }
  }
  place()
  const observer = typeof MutationObserver !== "undefined" ? new MutationObserver(place) : undefined
  observer?.observe(bar, { childList: true, subtree: true })
  return () => {
    observer?.disconnect()
    rowOfAnchor.delete(anchor)
  }
}

/**
 * A row under the controls, part of the bar: a segmented control that switches the screen's views (a chat list's
 * folders under its bar), or a search field. It spans the bar, and a control in it fills the row; several rows stand in
 * their order (a search field over a segmented control). Under a large title on a page the rows stand under the title,
 * at the top of the content, and once scrolled up to the bar they stay pinned under its controls, as iOS 27.2 pins a
 * safeAreaBar under a large title's bar.
 */
function ToolbarRow({ className, ref, ...restProps }: ToolbarSlotProps) {
  const host = useContext(ToolbarHostContext)
  const titleStyle = useContext(ToolbarTitleStyleContext)
  // The rows go with the title: under it at the top of a page's content or a Sheet's body
  const large = titleStyle === "large" && !!host?.requestLargeTitleSlot
  const requestSlot = large ? host?.requestLargeTitleSlot : undefined
  const slot = large ? host?.largeTitleRowSlot ?? null : null
  useLayoutEffect(() => requestSlot?.(), [requestSlot])
  const element = useRef<HTMLDivElement | null>(null)
  const anchor = useRef<HTMLSpanElement | null>(null)
  const setRef = useCallback((node: HTMLDivElement | null) => {
    element.current = node
    if (typeof ref === "function") return ref(node)
    if (ref) ref.current = node
  }, [ref])
  useLayoutEffect(() => {
    if (!slot || !anchor.current || !element.current) return
    return followRowOrder(anchor.current, element.current)
  }, [slot])
  const row = <div ref={setRef} className={clsx(s.Row, className)} data-toolbar-row="" data-in-content={slot ? "" : undefined} {...restProps} />
  // Under a large title the row waits for its place in the content (it comes before the first paint) and never stands
  // in the bar first: moving it from the bar into the portal would mount its children again, and a switcher that holds
  // its own selection would lose it (Codex #5). A host with no content to keep the title in (a Sheet without a body)
  // keeps it in the bar.
  if (large && slot) return <>{createPortal(row, slot)}<span ref={anchor} data-toolbar-row-anchor="" hidden /></>
  if (large && host?.holdsLargeTitle !== false) return null
  return row
}
ToolbarRow.displayName = "Toolbar.Row"

export type ToolbarTitleProps = Omit<HTMLAttributes<HTMLHeadingElement>, "children"> & {
  children: ReactNode
  /** A second, smaller line below the title. */
  subtitle?: ReactNode
  /**
   * Heading level. In a Dialog the dialog's own title names the Sheet, so the bar title is hidden from
   * assistive technology there. @default "h1"
   */
  as?: "h1" | "h2" | "h3"
  ref?: Ref<HTMLHeadingElement>
}

function ToolbarTitle({ children, subtitle, as, className, ref, ...restProps }: ToolbarTitleProps) {
  const host = useContext(ToolbarHostContext)
  const titleStyle = useContext(ToolbarTitleStyleContext)
  const bar = useContext(ToolbarElementContext)
  const headingRef = useRef<HTMLDivElement | null>(null)
  // A page, and a Dialog with its body, keep the title at the top of their content
  const large = titleStyle === "large" && !!host?.requestLargeTitleSlot
  const requestSlot = large ? host?.requestLargeTitleSlot : undefined
  const slot = large ? host?.largeTitleSlot ?? null : null
  const subscribeScroll = host?.subscribeScroll
  useLayoutEffect(() => requestSlot?.(), [requestSlot])
  // In the content the title scrolls with it, on the compositor and through the overscroll, as on iOS 26. Once it has
  // gone under the bar (its last line at the bar's bottom), the bar shows it inline and a hard or glass bar its line.
  useLayoutEffect(() => {
    const heading = headingRef.current
    if (!slot || !bar || !heading || !subscribeScroll) return
    return followLargeTitle(bar, heading, subscribeScroll)
  }, [bar, slot, subscribeScroll])
  const decorative = host?.kind === "dialog"
  const Tag = as ?? "h1"
  const hasSubtitle = subtitle != null && subtitle !== false && subtitle !== ""
  const heading = (
    <div ref={headingRef} className={s.Heading} aria-hidden={decorative || undefined} data-in-content={slot ? "" : undefined}>
      <Tag ref={ref} className={clsx(s.Title, className)} {...restProps}>{children}</Tag>
      {hasSubtitle && <p className={s.Subtitle}>{subtitle}</p>}
    </div>
  )
  if (!large) return heading
  // Until the content has made its place (a server-rendered page before it hydrates), the title stands in the bar
  // where it will stand in the content. The inline copy the row of controls shows once the large title has gone
  // under it keeps a subtitle as a second line, as in the inline title (iOS 26 kit Toolbar - Top - iPhone, Title 2 Line).
  return (
    <>
      {slot ? createPortal(heading, slot) : heading}
      <span className={s.CollapsedTitle} aria-hidden="true">
        {hasSubtitle ? <><span className={s.CollapsedLine}>{children}</span><span className={s.CollapsedSubtitle}>{subtitle}</span></> : children}
      </span>
    </>
  )
}
ToolbarTitle.displayName = "Toolbar.Title"

/* ------------------------------------------------------------------ */
/*  Compound                                                           */
/* ------------------------------------------------------------------ */

export const Toolbar = ToolbarRoot as typeof ToolbarRoot & {
  Leading: typeof ToolbarLeading
  Title: typeof ToolbarTitle
  Content: typeof ToolbarContent
  Group: typeof ToolbarGroup
  Trailing: typeof ToolbarTrailing
  Row: typeof ToolbarRow
}

Toolbar.Leading = ToolbarLeading
Toolbar.Title = ToolbarTitle
Toolbar.Content = ToolbarContent
Toolbar.Group = ToolbarGroup
Toolbar.Trailing = ToolbarTrailing
Toolbar.Row = ToolbarRow
