import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  Teleport,
  watch,
  type ComputedRef,
  type HTMLAttributes,
  type InjectionKey,
  type PropType,
  type Ref,
} from "vue"
import s from "@plexui/styles/components/Toolbar/Toolbar.module.css"

// Vue port of packages/ui/src/components/Toolbar/Toolbar.tsx. Exports are flat
// (`ToolbarLeading` for `Toolbar.Leading`, ...).

export type ToolbarPlacement = "top" | "bottom"
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
 * and reserves the space; `Dialog` puts it 16px under the Sheet's top edge.
 */
export type ToolbarHost = {
  kind: "page" | "dialog"
  setHeight?: (placement: ToolbarPlacement, height: number | undefined) => void
  /** Content has scrolled under the top bar, so its glass casts a shadow and a hard or glass bar shows its line. */
  scrolled?: Ref<boolean>
  /** Content continues under the bottom bar, so a hard or glass bar shows its line. */
  contentBelow?: Ref<boolean>
  /** Calls the listener with the content's scroll offset on every scroll; returns the unsubscribe. A TabBar minimizes with it. */
  subscribeScroll?: (listener: (scrollTop: number) => void) => () => void
  /** A large title asks for a place in the content; returns the release. */
  requestLargeTitleSlot?: () => () => void
  /** The place at the top of the content where a large title scrolls with it, once the content has made one. */
  largeTitleSlot?: Ref<HTMLElement | null>
}

export const TOOLBAR_HOST: InjectionKey<ToolbarHost> = Symbol("ToolbarHost")

// The title style of the top bar, which a large title on a page needs to show itself inline once scrolled.
const TOOLBAR_TITLE_STYLE: InjectionKey<ComputedRef<ToolbarTitleStyle | undefined>> = Symbol("ToolbarTitleStyle")
// The bar itself, which a large title in the content marks once it has gone under the bar.
const TOOLBAR_ELEMENT: InjectionKey<Ref<HTMLElement | null>> = Symbol("ToolbarElement")

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

const ToolbarComponent = defineComponent({
  name: "Toolbar",
  props: {
    /** @default "top" */
    placement: { type: String as PropType<ToolbarPlacement>, default: "top" },
    /** Layout of `ToolbarTitle` in a top bar. @default "inline" */
    titleStyle: { type: String as PropType<ToolbarTitleStyle>, default: "inline" },
    /** Alignment of an inline title. Compact and large titles always start at the leading edge. @default "center" */
    titleAlign: { type: String as PropType<ToolbarTitleAlign>, default: "center" },
    /** How the bar meets the content scrolled under it on a phone. @default "glass" at the top, "soft" at the bottom */
    background: { type: String as PropType<ToolbarBackground>, default: undefined },
  },
  setup(props, { slots }) {
    const host = inject(TOOLBAR_HOST, null)
    provide(TOOLBAR_TITLE_STYLE, computed(() => (props.placement === "top" ? props.titleStyle : undefined)))
    const element = ref<HTMLElement | null>(null)
    provide(TOOLBAR_ELEMENT, element)
    let observer: ResizeObserver | undefined
    let reported: ToolbarPlacement | undefined
    onMounted(() => {
      const bar = element.value
      const setHeight = host?.setHeight
      if (!bar || !setHeight) return
      // A desktop layout hides the bar; its height then leaves the host's own header in charge.
      const update = () => {
        if (reported && reported !== props.placement) setHeight(reported, undefined)
        reported = props.placement
        setHeight(props.placement, bar.offsetHeight || undefined)
      }
      update()
      observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : undefined
      observer?.observe(bar, { box: "border-box" })
    })
    onBeforeUnmount(() => {
      observer?.disconnect()
      if (reported) host?.setHeight?.(reported, undefined)
    })
    return () => h("div", {
      "ref": element,
      "class": s.Toolbar,
      "data-toolbar": "",
      "data-placement": props.placement,
      "data-title-style": props.placement === "top" ? props.titleStyle : undefined,
      "data-title-align": props.placement === "top" ? props.titleAlign : undefined,
      "data-background": barBackground(props.background) ?? (props.placement === "bottom" ? "soft" : "glass"),
      "data-host": host?.kind,
      "data-scrolled": props.placement === "top" && host?.scrolled?.value ? "" : undefined,
      "data-content-below": props.placement === "bottom" && host?.contentBelow?.value ? "" : undefined,
    }, slots.default?.())
  },
})

/** Props of `Toolbar`. */
export type ToolbarProps = {
  placement?: ToolbarPlacement
  titleStyle?: ToolbarTitleStyle
  titleAlign?: ToolbarTitleAlign
  /** How the bar meets the content scrolled under it on a phone. @default "glass" at the top, "soft" at the bottom */
  background?: ToolbarBackground
} & HTMLAttributes

/** A phone toolbar, top or bottom. It never renders at the desktop breakpoint. */
export const Toolbar = ToolbarComponent as typeof ToolbarComponent & { new (): { $props: ToolbarProps } }

function part(name: string, className: string, role?: string) {
  return defineComponent({
    name,
    setup(_, { slots }) {
      return () => h("div", { class: className, role }, slots.default?.())
    },
  })
}

/** Items at the leading edge (React `Toolbar.Leading`). */
export const ToolbarLeading = part("ToolbarLeading", s.Leading)
/** Items at the trailing edge (React `Toolbar.Trailing`). */
export const ToolbarTrailing = part("ToolbarTrailing", s.Trailing)
/** Buttons that share one capsule (React `Toolbar.Group`). */
export const ToolbarGroup = part("ToolbarGroup", s.Group, "group")
/**
 * A row under the controls, part of the bar: a segmented control that switches the screen's views (a chat list's
 * folders under its bar), or a scope bar under a search field. It spans the bar, and a control in it fills the row.
 * Under a large title on a page it stands under the title, at the top of the content, and scrolls away with it, as
 * the drawer of a UIKit bar under a large title does (React `Toolbar.Row`).
 */
export const ToolbarRow = defineComponent({
  name: "ToolbarRow",
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    const host = inject(TOOLBAR_HOST, null)
    const titleStyle = inject(TOOLBAR_TITLE_STYLE, null)
    const large = computed(() => titleStyle?.value === "large" && host?.kind === "page")
    const slot = computed(() => (large.value ? host?.largeTitleSlot?.value ?? null : null))
    let release: (() => void) | undefined
    onMounted(() => { if (large.value) release = host?.requestLargeTitleSlot?.() })
    watch(large, (value) => {
      release?.()
      release = value ? host?.requestLargeTitleSlot?.() : undefined
    })
    onBeforeUnmount(() => release?.())
    return () => {
      const place = slot.value
      const row = h("div", { ...attrs, "class": [s.Row, attrs.class], "data-toolbar-row": "", "data-in-content": place ? "" : undefined }, slots.default?.())
      // Under a large title the row waits for its place in the content, as React's does.
      if (large.value) return place ? h(Teleport, { to: place }, [row]) : null
      return row
    }
  },
})

/** Custom middle content: a search field, a segmented control or a single centered action (React `Toolbar.Content`). */
export const ToolbarContent = defineComponent({
  name: "ToolbarContent",
  props: {
    /** Stretch between the leading and trailing items, as a search field does. */
    fill: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    return () => h("div", { "class": s.Content, "data-fill": props.fill ? "" : undefined }, slots.default?.())
  },
})

/** The bar title, with an optional second line (React `Toolbar.Title`). */
export const ToolbarTitle = defineComponent({
  name: "ToolbarTitle",
  inheritAttrs: false,
  props: {
    /** A second, smaller line below the title. The `subtitle` slot takes precedence. */
    subtitle: { type: String, default: undefined },
    /**
     * Heading level. In a Dialog the dialog's own title names the Sheet, so the bar title is hidden
     * from assistive technology there.
     * @default "h1"
     */
    as: { type: String as PropType<"h1" | "h2" | "h3">, default: "h1" },
  },
  setup(props, { slots, attrs }) {
    const host = inject(TOOLBAR_HOST, null)
    const titleStyle = inject(TOOLBAR_TITLE_STYLE, null)
    const bar = inject(TOOLBAR_ELEMENT, null)
    const heading = ref<HTMLElement | null>(null)
    const large = computed(() => titleStyle?.value === "large" && host?.kind === "page")
    const slot = computed(() => (large.value ? host?.largeTitleSlot?.value ?? null : null))
    let release: (() => void) | undefined
    onMounted(() => { if (large.value) release = host?.requestLargeTitleSlot?.() })
    watch(large, (value) => {
      release?.()
      release = value ? host?.requestLargeTitleSlot?.() : undefined
    })
    // In the content the title scrolls with it, on the compositor and through the overscroll, as on iOS 26. Once it has
    // gone under the bar (its last line at the bar's bottom), the bar shows it inline and a hard or glass bar its line.
    // It starts once mounted too: a bar replaced under a page that keeps its content finds the place already there.
    let stopFollowing: (() => void) | undefined
    const follow = () => {
      stopFollowing?.()
      stopFollowing = undefined
      const element = bar?.value
      const title = heading.value
      if (!slot.value || !element || !title || !host?.subscribeScroll) return
      stopFollowing = followLargeTitle(element, title, host.subscribeScroll)
    }
    onMounted(follow)
    watch([slot, () => bar?.value], follow, { flush: "post" })
    onBeforeUnmount(() => { stopFollowing?.(); release?.() })
    return () => {
      // An empty subtitle, from the prop or a slot that renders nothing, leaves the title on one line, as in React.
      const present = (value: unknown) => (Array.isArray(value) ? value.length > 0 : value != null && value !== "")
      const subtitle = slots.subtitle?.() ?? props.subtitle
      const place = slot.value
      const title = h("div", { "ref": heading, "class": s.Heading, "aria-hidden": host?.kind === "dialog" ? "true" : undefined, "data-in-content": place ? "" : undefined }, [
        h(props.as, { ...attrs, class: [s.Title, attrs.class] }, slots.default?.()),
        present(subtitle) ? h("p", { class: s.Subtitle }, subtitle) : null,
      ])
      if (!large.value) return title
      // Until the content has made its place (a server-rendered page before it hydrates), the title stands in the bar
      // where it will stand in the content. The inline copy the row of controls shows once the large title has gone
      // under it keeps a subtitle as a second line, as in the inline title (iOS 26 kit Toolbar - Top - iPhone, Title 2 Line).
      const copySubtitle = slots.subtitle?.() ?? props.subtitle
      const copy = present(copySubtitle)
        ? [h("span", { class: s.CollapsedLine }, slots.default?.()), h("span", { class: s.CollapsedSubtitle }, copySubtitle)]
        : slots.default?.()
      return [h(Teleport, { to: place ?? "body", disabled: !place }, [title]), h("span", { "class": s.CollapsedTitle, "aria-hidden": "true" }, copy)]
    }
  },
})
