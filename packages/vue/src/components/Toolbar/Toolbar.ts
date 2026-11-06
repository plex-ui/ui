import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
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
/** `"edge"` fades the canvas over content scrolled under the bar; `"solid"` fills the bar. */
export type ToolbarBackground = "edge" | "solid"

/**
 * A surface that places phone toolbars: `Page` puts the top bar over its content
 * and reserves the space; `Dialog` puts it under the Sheet's grabber.
 */
export type ToolbarHost = {
  kind: "page" | "dialog"
  setHeight?: (placement: ToolbarPlacement, height: number | undefined) => void
  /** Content has scrolled under the top bar, so its glass casts a shadow. */
  scrolled?: Ref<boolean>
}

export const TOOLBAR_HOST: InjectionKey<ToolbarHost> = Symbol("ToolbarHost")

// The title style of the top bar, which a large title on a page needs to show itself inline once scrolled.
const TOOLBAR_TITLE_STYLE: InjectionKey<ComputedRef<ToolbarTitleStyle | undefined>> = Symbol("ToolbarTitleStyle")

/**
 * A large title on a page scrolls up with the content under the row of controls; the row shows the
 * title inline once it has gone. The distance it travels (the gap above it and its height) goes to
 * `--toolbar-large-title-travel`, in pixels as a number, as the page's `--page-scroll-y` is.
 */
function measureLargeTitle(bar: HTMLElement) {
  if (bar.dataset.titleStyle !== "large") return
  const heading = Array.from(bar.children).find((child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains(s.Heading))
  if (!heading) return
  const gap = Number.parseFloat(getComputedStyle(bar).rowGap) || 0
  bar.style.setProperty("--toolbar-large-title-travel", String(heading.offsetHeight + gap))
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
    /** @default "edge" */
    background: { type: String as PropType<ToolbarBackground>, default: "edge" },
  },
  setup(props, { slots }) {
    const host = inject(TOOLBAR_HOST, null)
    provide(TOOLBAR_TITLE_STYLE, computed(() => (props.placement === "top" ? props.titleStyle : undefined)))
    const element = ref<HTMLElement | null>(null)
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
        measureLargeTitle(bar)
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
      "data-background": props.background,
      "data-host": host?.kind,
      "data-scrolled": props.placement === "top" && host?.scrolled?.value ? "" : undefined,
    }, slots.default?.())
  },
})

/** Props of `Toolbar`. */
export type ToolbarProps = {
  placement?: ToolbarPlacement
  titleStyle?: ToolbarTitleStyle
  titleAlign?: ToolbarTitleAlign
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
    return () => {
      const subtitle = slots.subtitle?.() ?? props.subtitle
      const heading = h("div", { "class": s.Heading, "aria-hidden": host?.kind === "dialog" ? "true" : undefined }, [
        h(props.as, { ...attrs, class: [s.Title, attrs.class] }, slots.default?.()),
        subtitle != null && subtitle !== "" ? h("p", { class: s.Subtitle }, subtitle) : null,
      ])
      if (titleStyle?.value !== "large" || host?.kind !== "page") return heading
      // The inline copy the row of controls shows once the large title has scrolled under it.
      return [heading, h("span", { "class": s.CollapsedTitle, "aria-hidden": "true" }, slots.default?.())]
    }
  },
})
