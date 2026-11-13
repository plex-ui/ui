import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  onMounted,
  onBeforeUnmount,
  provide,
  ref,
  shallowRef,
  watch,
  type HTMLAttributes,
  type InjectionKey,
  type PropType,
  type Ref,
} from "vue"
import { provideFloatingBoundaryScope, useFloatingBoundaryRegistration } from "../../composables/useFloatingBoundary.js"
import { barBackground, TOOLBAR_HOST, type BarBackground, type BarBackgroundAlias, type ToolbarPlacement } from "../Toolbar/Toolbar.js"
import { observeScrollEdges } from "../../lib/scrollEdges.js"
import s from "@plexui/styles/components/Page/Page.module.css"

// Vue port of packages/ui/src/components/Page/Page.tsx. Exports are flat
// (`PageHeader` for `Page.Header`, ...). As in React, caller attributes are
// applied after the page's own (`class` is merged), so they win.

/** How a phone bar of the page meets the content scrolled under it; see `BarBackground`. `"solid"` is the earlier name of `"hard"`. */
export type PageBarBackground = BarBackground | BarBackgroundAlias

export type PageWidth = "full" | "wide" | "column"

type PageContext = {
  /** Content has scrolled under the header. */
  scrolled: Ref<boolean>
  /** Content continues under the footer. */
  contentBelow: Ref<boolean>
  footerHeight: Ref<number>
  headerHeight: Ref<number | undefined>
  /** Tells the bars that follow the scroll, such as a minimizing TabBar or a large title, the content's scroll offset. */
  notifyScroll: (scrollY: number) => void
  /** A large Toolbar title asks for a place at the top of the content, where it scrolls with the content. */
  largeTitle: Ref<boolean>
  setLargeTitleSlot: (slot: unknown) => void
  /** The place of the bar's rows under a large title, which pins them under the bar. */
  largeTitleRowSlot: Ref<HTMLElement | null>
  setLargeTitleRowSlot: (slot: unknown) => void
  /** The rows under a large title are pinned under the bar, and their height, which the bar's background takes in. */
  titleRowsPinned: Ref<boolean>
  titleRowsHeight: Ref<number>
}

/**
 * Follows the rows of a large title's bar (Toolbar.Row) in the content. They stand under the title and, scrolled up to
 * the bar, stay under its controls (`position: sticky`): they are pinned once the sticky offset moves them off the
 * title's bottom, where they would stand. It reports that and their height, which the bar's background takes in. React's
 * twin.
 */
function followTitleRows(content: HTMLElement, rows: HTMLElement, report: (pinned: boolean, height: number) => void) {
  let last = ""
  const update = () => {
    const height = rows.offsetHeight
    const title = rows.previousElementSibling
    const pinned = height > 0 && !!title && rows.getBoundingClientRect().top - title.getBoundingClientRect().bottom > 0.5
    if (`${pinned} ${height}` === last) return
    last = `${pinned} ${height}`
    report(pinned, height)
  }
  update()
  content.addEventListener("scroll", update, { passive: true })
  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : undefined
  observer?.observe(rows)
  observer?.observe(content)
  // The title changing its height (a subtitle shown or gone) moves the rows with no scroll (Codex #7).
  const title = rows.previousElementSibling
  if (title) observer?.observe(title)
  return () => {
    content.removeEventListener("scroll", update)
    observer?.disconnect()
    report(false, 0)
  }
}
const PAGE_CONTEXT: InjectionKey<PageContext> = Symbol("Page")

function injectPageContext(part: string): PageContext {
  const scrolled = inject(PAGE_CONTEXT, null)
  if (!scrolled) {
    throw new Error(`${part} must be used within Page`)
  }
  return scrolled
}

const PageComponent = defineComponent({
  name: "Page",
  props: {
    /**
     * Width of the column that header and content share: `"full"` (edge to
     * edge, for tables), `"wide"` (1280px, centred, for overviews) or `"column"`
     * (768px, centred, for settings and forms). Set `--page-width` on the page
     * for any other width.
     * @default "full"
     */
    width: { type: String as PropType<PageWidth>, default: "full" },
    /** Mobile canvas and grouped-field palette. @default "plain" */
    surface: { type: String as PropType<"plain" | "grouped">, default: "plain" },
  },
  setup(props, { slots }) {
    const boundary = provideFloatingBoundaryScope()
    const setRoot = (node: unknown) => boundary.setRoot(node)
    const scrollListeners = new Set<(scrollTop: number) => void>()
    const notifyScroll = (scrollY: number) => scrollListeners.forEach((listener) => listener(scrollY))
    const subscribeScroll = (listener: (scrollTop: number) => void) => {
      scrollListeners.add(listener)
      return () => { scrollListeners.delete(listener) }
    }
    // A large Toolbar title lives in the content, where the browser scrolls it with the content and its overscroll;
    // PageContent keeps a place for it at its top while a title asks for one.
    const largeTitleRequests = ref(0)
    const largeTitle = computed(() => largeTitleRequests.value > 0)
    const largeTitleSlot = shallowRef<HTMLElement | null>(null)
    const setLargeTitleSlot = (slot: unknown) => { largeTitleSlot.value = slot instanceof HTMLElement ? slot : null }
    const requestLargeTitleSlot = () => {
      largeTitleRequests.value += 1
      return () => { largeTitleRequests.value -= 1 }
    }
    // The bar's rows under a large title have a place of their own under it, which pins them under the bar once scrolled.
    const largeTitleRowSlot = shallowRef<HTMLElement | null>(null)
    const setLargeTitleRowSlot = (slot: unknown) => { largeTitleRowSlot.value = slot instanceof HTMLElement ? slot : null }
    const titleRowsPinned = ref(false)
    const titleRowsHeight = ref(0)
    const context = {
      scrolled: ref(false), contentBelow: ref(false), footerHeight: ref(0), headerHeight: ref<number>(), notifyScroll, largeTitle,
      setLargeTitleSlot, largeTitleRowSlot, setLargeTitleRowSlot, titleRowsPinned, titleRowsHeight,
    }
    provide(PAGE_CONTEXT, context)
    // A phone Toolbar replaces the header and footer bars; it reports its own heights.
    const toolbarTop = ref<number>()
    const toolbarBottom = ref<number>()
    provide(TOOLBAR_HOST, {
      kind: "page",
      scrolled: context.scrolled,
      contentBelow: context.contentBelow,
      subscribeScroll,
      requestLargeTitleSlot,
      largeTitleSlot: computed(() => (largeTitle.value ? largeTitleSlot.value : null)),
      largeTitleRowSlot: computed(() => (largeTitle.value ? largeTitleRowSlot.value : null)),
      rowsPinned: computed(() => largeTitle.value && titleRowsPinned.value),
      setHeight: (placement: ToolbarPlacement, height: number | undefined) => { (placement === "top" ? toolbarTop : toolbarBottom).value = height },
    })
    return () => h("div", { "ref": setRoot, "class": s.Page, "data-width": props.width, "data-surface": props.surface,
      style: {
        "--page-footer-height": `${context.footerHeight.value}px`,
        ...(context.headerHeight.value !== undefined ? { "--page-header-height": `${context.headerHeight.value}px` } : {}),
        ...(toolbarTop.value !== undefined ? { "--page-toolbar-height": `${toolbarTop.value}px` } : {}),
        ...(toolbarBottom.value !== undefined ? { "--page-toolbar-bottom-height": `${toolbarBottom.value}px` } : {}),
        ...(titleRowsHeight.value > 0 ? { "--page-toolbar-rows-height": `${titleRowsHeight.value}px` } : {}),
      } }, slots.default?.())
  },
})

/** Props of `Page`. */
export type PageProps = { width?: PageWidth; surface?: "plain" | "grouped" } & HTMLAttributes

export const Page = PageComponent as typeof PageComponent & { new (): { $props: PageProps } }

/** The band above the content, one column with it (React `Page.Header`). */
export const PageHeader = defineComponent({
  name: "PageHeader",
  props: {
    /**
     * Shows a divider once the content has scrolled under the header: on a
     * desktop layout, and on a phone with a `"hard"` or `"glass"` background.
     * Turn it off when the content already draws a line of
     * its own at that place.
     * @default true
     */
    divider: { type: Boolean, default: true },
    /** How the bar meets the content scrolled under it on a phone. @default "glass" */
    background: { type: String as PropType<PageBarBackground>, default: "glass" },
  },
  setup(props, { slots }) {
    const { scrolled, headerHeight } = injectPageContext("PageHeader")
    const element = ref<HTMLElement | null>(null)
    let observer: ResizeObserver | undefined
    onMounted(() => {
      const header = element.value
      if (!header) return
      const update = () => { headerHeight.value = header.offsetHeight }
      update()
      observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : undefined
      observer?.observe(header, { box: "border-box" })
    })
    onBeforeUnmount(() => { observer?.disconnect(); headerHeight.value = undefined })

    return () =>
      h("div", { "ref": element, "class": s.Header, "data-background": barBackground(props.background), "data-scrolled": scrolled.value ? "" : undefined, "data-divider": props.divider ? "" : undefined }, [
        h("div", { class: s.Head }, slots.default?.()),
      ])
  },
})

function part(name: string, tag: string, className: string) {
  return defineComponent({
    name,
    setup(_, { slots }) {
      return () => h(tag, { class: className }, slots.default?.())
    },
  })
}

/** The row of the title and the actions (React `Page.Bar`). */
export const PageBar = defineComponent({
  name: "PageBar",
  setup(_, { slots }) {
    const element = ref<HTMLElement | null>(null)
    let observer: ResizeObserver | undefined
    let children: MutationObserver | undefined
    onMounted(() => {
      const bar = element.value
      if (!bar) return
      const sides = () => bar.querySelectorAll<HTMLElement>(`:scope > .${s.Leading}, :scope > .${s.Actions}`)
      const update = () => {
        const width = Math.max(44, ...Array.from(sides(), (side) => side.offsetWidth))
        bar.style.setProperty("--page-bar-side-width", `${width}px`)
      }
      observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : undefined
      const observeSides = () => { observer?.disconnect(); sides().forEach((side) => observer?.observe(side, { box: "border-box" })); update() }
      observeSides()
      children = new MutationObserver(observeSides)
      children.observe(bar, { childList: true })
    })
    onBeforeUnmount(() => { observer?.disconnect(); children?.disconnect() })
    return () => h("div", { ref: element, class: s.Bar }, slots.default?.())
  },
})
/** Navigation controls on the leading side (React `Page.Leading`). */
export const PageLeading = part("PageLeading", "div", s.Leading)
/** Title with what stands beside it, a subtitle under it on a phone (React `Page.Heading`). */
export const PageHeading = part("PageHeading", "div", s.Heading)
/** Page heading, an `<h1>` (React `Page.Title`). */
export const PageTitle = part("PageTitle", "h1", s.Title)
/** Status of the page, a flow container for badges and text (React `Page.Subtitle`). */
export const PageSubtitle = part("PageSubtitle", "div", s.Subtitle)
/** Buttons on the trailing side of the bar (React `Page.Actions`). */
export const PageActions = part("PageActions", "div", s.Actions)

/** The part of the page that scrolls (React `Page.Content`). */
export const PageContent = defineComponent({
  name: "PageContent",
  inheritAttrs: false,
  props: {
    /**
     * The content fills the page and scrolls inside itself, as a table does:
     * the page stops scrolling from 768px up.
     * @default false
     */
    fill: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    const { scrolled, contentBelow, notifyScroll, largeTitle, setLargeTitleSlot, largeTitleRowSlot, setLargeTitleRowSlot, titleRowsPinned, titleRowsHeight } = injectPageContext("PageContent")
    const element = ref<HTMLElement | null>(null)
    let stop: (() => void) | undefined
    onMounted(() => {
      if (!element.value) return
      stop = observeScrollEdges(element.value, (edges) => {
        scrolled.value = edges.scrolled
        contentBelow.value = edges.contentBelow
      })
    })
    onBeforeUnmount(() => { stop?.(); scrolled.value = false; contentBelow.value = false })
    // The rows of a large title's bar pin under it once scrolled up to it.
    let stopRows: (() => void) | undefined
    watch([element, largeTitleRowSlot], ([content, rows]) => {
      stopRows?.()
      stopRows = content && rows
        ? followTitleRows(content, rows, (pinned, height) => { titleRowsPinned.value = pinned; titleRowsHeight.value = height })
        : undefined
    }, { flush: "post" })
    onBeforeUnmount(() => { stopRows?.(); stopRows = undefined })

    const onScroll = (event: Event) => {
      notifyScroll((event.currentTarget as HTMLElement).scrollTop)
    }

    return () =>
      h(
        "div",
        mergeProps(
          { "ref": element, "class": s.Content, "data-fill": props.fill ? "" : undefined, onScroll },
          attrs,
        ),
        [h("div", { class: s.Column }, [
          largeTitle.value ? h("div", { ref: setLargeTitleSlot, class: s.LargeTitle }) : null,
          largeTitle.value ? h("div", { ref: setLargeTitleRowSlot, class: s.LargeTitleRows }) : null,
          slots.default?.(),
        ])],
      )
  },
})

/** Actions that remain below the scrolling content (React `Page.Footer`). */
export const PageFooter = defineComponent({
  name: "PageFooter",
  props: {
    /** How the bar meets the content scrolled under it on a phone. @default "soft" */
    background: { type: String as PropType<PageBarBackground>, default: "soft" },
  },
  setup(props, { slots }) {
    const element = ref<HTMLElement | null>(null)
    const { contentBelow, footerHeight } = injectPageContext("PageFooter")
    const boundary = useFloatingBoundaryRegistration()
    const setFooter = (node: unknown) => {
      element.value = node instanceof HTMLElement ? node : null
      boundary?.setFooter(node)
    }
    let observer: ResizeObserver | undefined
    onMounted(() => {
      const footer = element.value
      if (!footer) return
      const update = () => { footerHeight.value = footer.offsetHeight }
      update()
      if (typeof ResizeObserver === "undefined") return
      observer = new ResizeObserver(update)
      observer.observe(footer, { box: "border-box" })
    })
    onBeforeUnmount(() => { observer?.disconnect(); footerHeight.value = 0 })
    return () => h("div", { ref: setFooter, class: s.Footer, "data-background": barBackground(props.background), "data-content-below": contentBelow.value ? "" : undefined }, [
      h("div", { class: s.FooterContent }, slots.default?.()),
    ])
  },
})

/** Props of the Page parts: native attributes of their element. */
export type PageSlotProps = HTMLAttributes

export type PageFooterProps = PageSlotProps & { background?: PageBarBackground }
