import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  provide,
  ref,
  type HTMLAttributes,
  type InjectionKey,
  type PropType,
  type Ref,
} from "vue"
import s from "@plexui/styles/components/Page/Page.module.css"

// Vue port of packages/ui/src/components/Page/Page.tsx. Exports are flat
// (`PageHeader` for `Page.Header`, ...). As in React, caller attributes are
// applied after the page's own (`class` is merged), so they win.

export type PageWidth = "full" | "wide" | "column"

// A trackpad's small settle at the top must not flash the line.
const SCROLLED_AFTER = 4

const PAGE_CONTEXT: InjectionKey<Ref<boolean>> = Symbol("Page")

function injectPageContext(part: string): Ref<boolean> {
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
  },
  setup(props, { slots }) {
    provide(PAGE_CONTEXT, ref(false))

    return () => h("div", { "class": s.Page, "data-width": props.width }, slots.default?.())
  },
})

/** Props of `Page`. */
export type PageProps = { width?: PageWidth } & HTMLAttributes

export const Page = PageComponent as typeof PageComponent & { new (): { $props: PageProps } }

/** The band above the content, one column with it (React `Page.Header`). */
export const PageHeader = defineComponent({
  name: "PageHeader",
  props: {
    /**
     * Shows the line, and the glass on a phone, once the content has scrolled
     * under the header. Turn it off when the content already draws a line of
     * its own at that place.
     * @default true
     */
    divider: { type: Boolean, default: true },
  },
  setup(props, { slots }) {
    const scrolled = injectPageContext("PageHeader")
    const line = computed(() => props.divider && scrolled.value)

    return () =>
      h("div", { "class": s.Header, "data-scrolled": line.value ? "" : undefined }, [
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
export const PageBar = part("PageBar", "div", s.Bar)
/** Title with what stands beside it, a subtitle under it on a phone (React `Page.Heading`). */
export const PageHeading = part("PageHeading", "div", s.Heading)
/** Page heading, an `<h1>` (React `Page.Title`). */
export const PageTitle = part("PageTitle", "h1", s.Title)
/** Status of the page, a `<p>` (React `Page.Subtitle`). */
export const PageSubtitle = part("PageSubtitle", "p", s.Subtitle)
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
    const scrolled = injectPageContext("PageContent")

    const onScroll = (event: Event) => {
      scrolled.value = (event.currentTarget as HTMLElement).scrollTop > SCROLLED_AFTER
    }

    return () =>
      h(
        "div",
        mergeProps(
          { "class": s.Content, "data-fill": props.fill ? "" : undefined, onScroll },
          attrs,
        ),
        [h("div", { class: s.Column }, slots.default?.())],
      )
  },
})

/** Actions that remain below the scrolling content (React `Page.Footer`). */
export const PageFooter = defineComponent({
  name: "PageFooter",
  setup(_props, { slots }) {
    return () => h("div", { class: s.Footer }, [
      h("div", { class: s.FooterContent }, slots.default?.()),
    ])
  },
})

/** Props of the Page parts: native attributes of their element. */
export type PageSlotProps = HTMLAttributes
