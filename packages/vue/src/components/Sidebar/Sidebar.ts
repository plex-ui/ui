import {
  computed,
  defineComponent,
  Fragment,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  provide,
  ref,
  Text,
  watch,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type DefineComponent,
  type HTMLAttributes,
  type InjectionKey,
  type LiHTMLAttributes,
  type PropType,
  type Ref,
  type Slots,
  type VNode,
  type VNodeArrayChildren,
} from "vue"
import {
  attachDrawerSwipe,
  closeOnUnhandledEscape,
  drawerInitialFocus,
  returnDrawerFocus,
  loopDrawerFocus,
} from "../../lib/phoneDrawer.js"
import { Button } from "../Button/index.js"
import { ChevronRightMd, Disclosure, Search as SearchIcon, Sidebar as SidebarIcon, SidebarMenuMobile, X } from "../Icon/index.js"
import { Input, type InputProps } from "../Input/index.js"
import { Tooltip } from "../Tooltip/index.js"
import { composeEventHandlers, firstElementChild, flattenSlot, mergeSlotProps } from "../Tooltip/slot.js"
import s from "@plexui/styles/components/Sidebar/Sidebar.module.css"
import {
  SidebarProvider,
  useSidebar,
  type SidebarCollapsible,
  type SidebarSide,
  type SidebarProviderVariant,
  type SidebarVariant,
} from "./useSidebarContext.js"

// Vue port of packages/ui/src/components/Sidebar/Sidebar.tsx. Exports are
// flat, as in React's index. Every part renders its React element with the
// caller's attributes applied after its own (React spreads `...props` last),
// so a caller's attribute or listener replaces the part's own. `class` is
// merged. An `@click` on SidebarTrigger or SidebarMobileMenuButton runs before
// the toggle and cancels it with `preventDefault()`, as `onClick` does in
// React. `data-toggle` (injected by MDX) is dropped, as React's `cleanProps`
// does.
// - `asChild` (SidebarGroupLabel, SidebarMenuButton, SidebarMenuSubButton)
//   merges into the first element of the default slot the way Radix's Slot
//   does. SidebarMenuButton puts its inner `<span>` inside that element,
//   around the element's own content, as React clones it; with no single
//   element child it merges into the inner `<span>` instead.
// - ReactNode props are slots: SidebarMenuButton `tooltip` (prop or
//   `#tooltip` slot), SidebarTrigger's icon (default slot), SidebarInput's
//   `startAdornment` (slot, Search icon by default).
// - Parts whose React children are fixed (SidebarMenuChevron,
//   SidebarMenuSkeleton, SidebarMobileMenuButton) ignore the default slot.

// Re-export provider and composable
export { SidebarProvider, useSidebar }
export type { SidebarCollapsible, SidebarProviderVariant, SidebarSide, SidebarVariant }

type Attrs = Record<string, unknown>

// Filter out attributes that shouldn't reach the DOM (e.g. injected by MDX)
const cleanAttrs = (attrs: Attrs) => {
  const { "data-toggle": _, class: className, ...rest } = attrs
  return { className, rest }
}

// An explicit type keeps the published declaration on Vue's `DefineComponent`
// alias; an inferred one is expanded there and fails consumers' type checks
// (`GlobalComponents` against `Record<string, Component>`, TS2344).
type Part<A> = DefineComponent & { new (): { $props: A } }

/** A part that renders one element with its class and the caller's attributes. */
const part = <A>(name: string, tag: string, className: string | undefined): Part<A> => {
  const component = defineComponent({
    name,
    inheritAttrs: false,
    setup(_props, { attrs, slots }) {
      return () => {
        const { className: userClass, rest } = cleanAttrs(attrs)
        return h(tag, { ...rest, class: [className, userClass] }, slots.default?.())
      }
    },
  })
  return component as unknown as Part<A>
}

// =============================================
// Sidebar Root
// =============================================

const SidebarComponent = defineComponent({
  name: "Sidebar",
  inheritAttrs: false,
  props: {
    /** The side the sidebar is on. @default "left" */
    side: { type: String as PropType<SidebarSide>, default: "left" },
    /** The visual variant of the sidebar. @default "sidebar" */
    variant: { type: String as PropType<SidebarVariant>, default: "sidebar" },
  },
  setup(props, { attrs, slots }) {
    const sidebar = useSidebar()

    return () => {
      // Skip rendering sidebar on mobile for offcanvas mode
      if (sidebar.isMobile && sidebar.collapsible === "offcanvas") {
        return null
      }

      const { className, rest } = cleanAttrs(attrs)
      return h(
        "aside",
        { "data-side": props.side, "data-variant": props.variant, "class": [s.Sidebar, className], ...rest },
        slots.default?.(),
      )
    }
  },
})

export type SidebarProps = InstanceType<typeof SidebarComponent>["$props"] & HTMLAttributes

/** The sidebar container, an `<aside>`. Renders nothing on mobile in offcanvas mode. */
export const Sidebar = SidebarComponent as typeof SidebarComponent & { new (): { $props: SidebarProps } }

// =============================================
// Sidebar Sections
// =============================================

export type SidebarHeaderProps = HTMLAttributes

/** Sticky top area of the sidebar. */
export const SidebarHeader = part<SidebarHeaderProps>("SidebarHeader", "div", s.Header)

export type SidebarContentProps = HTMLAttributes

/**
 * Scrollable content area. Sets `data-content-scrollable` on the sidebar
 * while its content overflows.
 */
export const SidebarContent = defineComponent({
  name: "SidebarContent",
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const contentEl = ref<HTMLDivElement | null>(null)
    let observer: ResizeObserver | undefined

    onMounted(() => {
      const el = contentEl.value
      if (!el) return
      const sidebar = el.parentElement
      if (!sidebar) return

      const update = () => {
        const hasOverflow = el.scrollHeight > el.clientHeight
        sidebar.setAttribute("data-content-scrollable", hasOverflow ? "true" : "false")
      }
      update()
      observer = new ResizeObserver(update)
      observer.observe(el)
    })
    onBeforeUnmount(() => observer?.disconnect())

    return () => {
      const { className, rest } = cleanAttrs(attrs)
      return h("div", { ref: contentEl, class: [s.Content, className], ...rest }, slots.default?.())
    }
  },
}) as unknown as ReturnType<typeof part<SidebarContentProps>>

export type SidebarFooterProps = HTMLAttributes

/** Sticky bottom area of the sidebar, with a separator line on top. */
export const SidebarFooter = defineComponent({
  name: "SidebarFooter",
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => {
      const { className, rest } = cleanAttrs(attrs)
      return h("div", { class: [s.Footer, className], ...rest }, [
        h("div", { class: s.FooterSeparator }),
        slots.default?.(),
      ])
    }
  },
}) as unknown as ReturnType<typeof part<SidebarFooterProps>>

export type SidebarRailProps = HTMLAttributes

export const SidebarRail = part<SidebarRailProps>("SidebarRail", "div", s.Rail)

// =============================================
// Groups
// =============================================

const SidebarGroupComponent = defineComponent({
  name: "SidebarGroup",
  inheritAttrs: false,
  props: {
    /** Whether the group is open initially. A closed group hides its `SidebarGroupContent`. @default true */
    defaultOpen: { type: Boolean, default: true },
    /** Controlled open state. The group has no toggle of its own: change `open` from your own control. */
    open: { type: Boolean, default: undefined },
  },
  setup(props, { attrs, slots }) {
    // The initial value only, like an uncontrolled input's defaultValue
    const internalOpen = ref(props.defaultOpen)

    return () => {
      const open = props.open ?? internalOpen.value
      const { className, rest } = cleanAttrs(attrs)
      return h(
        "div",
        { "data-state": open ? "open" : "closed", "class": [s.Group, className], ...rest },
        slots.default?.(),
      )
    }
  },
})

export type SidebarGroupProps = InstanceType<typeof SidebarGroupComponent>["$props"] & HTMLAttributes

/** Section within the content. `data-state` follows `open` / `defaultOpen`. */
export const SidebarGroup = SidebarGroupComponent as typeof SidebarGroupComponent & {
  new (): { $props: SidebarGroupProps }
}

/** Radix Slot: the first element of the slot, with `slotProps` merged in. */
const renderAsChild = (children: VNodeArrayChildren | undefined, slotProps: Attrs) => {
  const child = firstElementChild(children)
  return child ? mergeSlotProps(child, slotProps) : null
}

/**
 * React's `cloneElement(child, undefined, wrap(child.props.children))`: the
 * same element (key and ref kept) with its content, or its default slot for a
 * component such as RouterLink, passed through `wrap`.
 */
const wrapChildContent = (child: VNode, wrap: (content: VNodeArrayChildren | undefined) => VNode): VNode => {
  const content = child.children
  let children: VNodeArrayChildren | Slots
  if (content && typeof content === "object" && !Array.isArray(content)) {
    // Drop the compiled-slots flag so the new default slot is always used
    const { _: _compiled, ...slotFns } = content as Slots & { _?: unknown }
    children = { ...slotFns, default: () => [wrap(slotFns.default?.())] }
  } else {
    children = [wrap(typeof content === "string" ? [content] : (content ?? undefined))]
  }
  return h(child.type as string, { ...child.props, key: child.key ?? undefined, ref: child.ref as never }, children as never)
}

const SidebarGroupLabelComponent = defineComponent({
  name: "SidebarGroupLabel",
  inheritAttrs: false,
  props: {
    /** Merges into the slot's first element instead of rendering a `<span>`. @default false */
    asChild: { type: Boolean, default: false },
    /**
     * Size variant for the label.
     * - "sm": Compact style for dashboard/settings sidebars
     * - "lg": Documentation style with larger text and more spacing
     * @default "lg"
     */
    size: { type: String as PropType<"sm" | "lg">, default: "lg" },
  },
  setup(props, { attrs, slots }) {
    return () => {
      const { className, rest } = cleanAttrs(attrs)
      const ownProps = { "data-size": props.size, "class": [s.GroupLabel, className], ...rest }
      return props.asChild ? renderAsChild(slots.default?.(), ownProps) : h("span", ownProps, slots.default?.())
    }
  },
})

export type SidebarGroupLabelProps = InstanceType<typeof SidebarGroupLabelComponent>["$props"] & HTMLAttributes

/** Section label within a SidebarGroup. */
export const SidebarGroupLabel = SidebarGroupLabelComponent as typeof SidebarGroupLabelComponent & {
  new (): { $props: SidebarGroupLabelProps }
}

export type SidebarGroupActionProps = HTMLAttributes

export const SidebarGroupAction = part<SidebarGroupActionProps>("SidebarGroupAction", "div", s.GroupAction)

export type SidebarGroupContentProps = HTMLAttributes

export const SidebarGroupContent = part<SidebarGroupContentProps>("SidebarGroupContent", "div", s.GroupContent)

// =============================================
// Menu
// =============================================

export type SidebarMenuProps = HTMLAttributes

/** Navigation menu, a `<ul>`. */
export const SidebarMenu = part<SidebarMenuProps>("SidebarMenu", "ul", s.Menu)

const SidebarMenuItemComponent = defineComponent({
  name: "SidebarMenuItem",
  inheritAttrs: false,
  props: {
    /** Marks the item as expanded (`data-expanded`), for chevrons and sub menus. */
    expanded: { type: Boolean, default: undefined },
  },
  setup(props, { attrs, slots }) {
    return () => {
      const { className, rest } = cleanAttrs(attrs)
      return h(
        "li",
        { "data-expanded": props.expanded ? "true" : undefined, "class": [s.MenuItem, className], ...rest },
        slots.default?.(),
      )
    }
  },
})

export type SidebarMenuItemProps = InstanceType<typeof SidebarMenuItemComponent>["$props"] & LiHTMLAttributes

/** Menu item, an `<li>`. */
export const SidebarMenuItem = SidebarMenuItemComponent as typeof SidebarMenuItemComponent & {
  new (): { $props: SidebarMenuItemProps }
}

// =============================================
// Menu Button
// =============================================

// Shared by every row of the rail: moving to the next one shows its label at once.
let railLeftAt = 0

// Rows inside the mobile drawer end with a disclosure chevron (see the drawer list in the styles), unless the drawer
// leaves it out (`:disclosure="false"`).
const sidebarDrawerKey: InjectionKey<Ref<boolean>> = Symbol("SidebarDrawer")
const notInDrawer = computed(() => false)

/** The chevron of a drawer row that leads to another page. */
const menuDisclosure = () => h("span", { "class": s.MenuDisclosure, "aria-hidden": "true" }, [h(Disclosure)])

const SidebarMenuButtonComponent = defineComponent({
  name: "SidebarMenuButton",
  inheritAttrs: false,
  props: {
    /** Whether the button is in an active/highlighted state. @default false */
    isActive: { type: Boolean, default: false },
    /**
     * Optional tooltip to show when the sidebar is collapsed (or the
     * `#tooltip` slot). Hidden on mobile.
     */
    tooltip: String,
    /** Whether to render the button as a custom element via Slot. @default false */
    asChild: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    const sidebar = useSidebar()
    const drawerRows = inject(sidebarDrawerKey, notInDrawer)
    const openDelay = ref<number>()

    return () => {
      const { className, rest } = cleanAttrs(attrs)
      const hasTooltip = !!(props.tooltip || slots.tooltip)
      const ownProps: Record<string, unknown> = {
        "data-active": props.isActive ? "true" : "false",
        "aria-current": props.isActive ? "page" : undefined,
        "class": [s.MenuButton, className],
        ...rest,
      }
      if (hasTooltip) {
        ownProps.onPointerenter = composeEventHandlers(rest.onPointerenter, () => {
          openDelay.value = Date.now() - railLeftAt < 300 ? 0 : undefined
        })
        ownProps.onPointerleave = composeEventHandlers(rest.onPointerleave, () => {
          railLeftAt = Date.now()
        })
      }
      const content = slots.default?.()
      const wrap = (children: VNodeArrayChildren | undefined) =>
        h("span", { class: s.MenuButtonInner }, drawerRows.value ? [children, menuDisclosure()] : children)
      let button: VNode
      if (props.asChild) {
        // With asChild the child element is the button, so the inner wrapper
        // goes inside it. Wrapping the child instead would merge the button
        // attributes onto the wrapper span.
        // A lone text child is wrapped below rather than slotted
        const nodes = flattenSlot(content)
        const child = nodes.length === 1 && nodes[0].type !== Text ? nodes[0] : undefined
        button = mergeSlotProps(child ? wrapChildContent(child, wrap) : wrap(content), ownProps)
      } else {
        button = h("button", ownProps, [wrap(content)])
      }

      // The tooltip shows when collapsed (icon mode) and not on mobile. It wraps
      // the row in every state, so the row stays mounted and its label can fade.
      if (hasTooltip) {
        const shown = sidebar.state === "collapsed" && !sidebar.isMobile
        return h(
          Tooltip,
          { content: shown ? props.tooltip : null, openDelay: openDelay.value, side: "right" },
          { default: () => button, ...(slots.tooltip && shown ? { content: slots.tooltip } : {}) },
        )
      }

      return button
    }
  },
})

export type SidebarMenuButtonProps = InstanceType<typeof SidebarMenuButtonComponent>["$props"] & ButtonHTMLAttributes

/** Menu item button. Shows its `tooltip` when the sidebar is collapsed to icons. */
export const SidebarMenuButton = SidebarMenuButtonComponent as typeof SidebarMenuButtonComponent & {
  new (): { $props: SidebarMenuButtonProps }
}

// =============================================
// Menu Button Parts
// =============================================

export type SidebarMenuButtonIconProps = HTMLAttributes

export const SidebarMenuButtonIcon = part<SidebarMenuButtonIconProps>(
  "SidebarMenuButtonIcon",
  "span",
  s.MenuButtonIcon,
)

const SidebarMenuButtonLabelComponent = defineComponent({
  name: "SidebarMenuButtonLabel",
  inheritAttrs: false,
  props: {
    /** Shorter label rendered next to the full one (`data-short-label`). */
    shortLabel: String,
  },
  setup(props, { attrs, slots }) {
    return () => {
      const { className, rest } = cleanAttrs(attrs)
      return [
        h(
          "span",
          { "data-long-label": "true", "class": [s.MenuButtonLabel, className], ...rest },
          slots.default?.(),
        ),
        props.shortLabel
          ? h("span", { "data-short-label": "true", "class": [s.MenuButtonLabel, className] }, props.shortLabel)
          : null,
      ]
    }
  },
})

export type SidebarMenuButtonLabelProps = InstanceType<typeof SidebarMenuButtonLabelComponent>["$props"] & HTMLAttributes

export const SidebarMenuButtonLabel = SidebarMenuButtonLabelComponent as typeof SidebarMenuButtonLabelComponent & {
  new (): { $props: SidebarMenuButtonLabelProps }
}

// =============================================
// Menu Chevron (Expand/Collapse Toggle)
// =============================================

export type SidebarMenuChevronProps = HTMLAttributes

export const SidebarMenuChevron = defineComponent({
  name: "SidebarMenuChevron",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    return () => {
      const { className, rest } = cleanAttrs(attrs)
      return h("span", { class: [s.MenuChevron, className], ...rest }, [h(ChevronRightMd)])
    }
  },
}) as unknown as ReturnType<typeof part<SidebarMenuChevronProps>>

// =============================================
// Menu Badge & Action
// =============================================

export type SidebarMenuBadgeProps = HTMLAttributes

export const SidebarMenuBadge = part<SidebarMenuBadgeProps>("SidebarMenuBadge", "span", s.MenuBadge)

export type SidebarMenuActionProps = HTMLAttributes

export const SidebarMenuAction = part<SidebarMenuActionProps>("SidebarMenuAction", "div", s.MenuAction)

// =============================================
// Menu Skeleton
// =============================================

const SidebarMenuSkeletonComponent = defineComponent({
  name: "SidebarMenuSkeleton",
  inheritAttrs: false,
  props: {
    /** Renders the icon placeholder. @default true */
    showIcon: { type: Boolean, default: true },
    /** Width of the label skeleton (e.g., "60%", "80%", "100px"). @default "60%" */
    labelWidth: { type: String, default: "60%" },
  },
  setup(props, { attrs }) {
    return () => {
      const { className, rest } = cleanAttrs(attrs)
      return h("div", { "data-skeleton": "true", "class": [s.MenuSkeleton, className], ...rest }, [
        props.showIcon ? h("div", { class: s.MenuSkeletonIcon }) : null,
        h("div", { class: s.MenuSkeletonLabel, style: { width: props.labelWidth } }),
      ])
    }
  },
})

export type SidebarMenuSkeletonProps = InstanceType<typeof SidebarMenuSkeletonComponent>["$props"] & HTMLAttributes

export const SidebarMenuSkeleton = SidebarMenuSkeletonComponent as typeof SidebarMenuSkeletonComponent & {
  new (): { $props: SidebarMenuSkeletonProps }
}

// =============================================
// Submenu
// =============================================

const SidebarMenuSubComponent = defineComponent({
  name: "SidebarMenuSub",
  inheritAttrs: false,
  props: {
    /** Whether the submenu is expanded. @default true */
    open: { type: Boolean, default: true },
    /**
     * When true, child items align with parent text that has icons.
     * This adjusts the padding so level 2 text aligns with level 1 text.
     * @default false
     */
    hasIcons: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    return () => {
      const { className, rest } = cleanAttrs(attrs)
      return h(
        "ul",
        {
          "data-state": props.open ? "open" : "closed",
          "data-has-icons": props.hasIcons ? "true" : undefined,
          // Collapsed items are only hidden visually: keep them out of the tab
          // order. "" renders `inert=""` (a DOM property in browsers)
          "inert": props.open ? undefined : "",
          "class": [s.MenuSub, className],
          ...rest,
        },
        slots.default?.(),
      )
    }
  },
})

export type SidebarMenuSubProps = InstanceType<typeof SidebarMenuSubComponent>["$props"] & HTMLAttributes

export const SidebarMenuSub = SidebarMenuSubComponent as typeof SidebarMenuSubComponent & {
  new (): { $props: SidebarMenuSubProps }
}

export type SidebarMenuSubItemProps = LiHTMLAttributes

export const SidebarMenuSubItem = part<SidebarMenuSubItemProps>("SidebarMenuSubItem", "li", s.MenuSubItem)

const SidebarMenuSubButtonComponent = defineComponent({
  name: "SidebarMenuSubButton",
  inheritAttrs: false,
  props: {
    /** Whether the button is in an active/highlighted state. @default false */
    isActive: { type: Boolean, default: false },
    /** Merges into the slot's first element instead of rendering a `<button>`. @default false */
    asChild: { type: Boolean, default: false },
    /**
     * Indent level for nested items (0-3).
     * Each level adds 12px of left margin.
     * @default 0
     */
    indent: { type: Number as PropType<0 | 1 | 2 | 3>, default: 0 },
  },
  setup(props, { attrs, slots }) {
    const drawerRows = inject(sidebarDrawerKey, notInDrawer)
    return () => {
      const { className, rest } = cleanAttrs(attrs)
      const ownProps = {
        "data-active": props.isActive ? "true" : "false",
        "aria-current": props.isActive ? "page" : undefined,
        "class": [s.MenuSubButton, s[`indent${props.indent}`], className],
        ...rest,
      }
      const content = slots.default?.()
      if (!drawerRows.value) return props.asChild ? renderAsChild(content, ownProps) : h("button", ownProps, content)
      // In the drawer the disclosure follows the content, inside the child element with asChild
      if (props.asChild) {
        const child = firstElementChild(content)
        return child ? mergeSlotProps(wrapChildContent(child, (inner) => h(Fragment, null, [inner, menuDisclosure()])), ownProps) : null
      }
      return h("button", ownProps, [content, menuDisclosure()])
    }
  },
})

export type SidebarMenuSubButtonProps = InstanceType<typeof SidebarMenuSubButtonComponent>["$props"] & ButtonHTMLAttributes

export const SidebarMenuSubButton = SidebarMenuSubButtonComponent as typeof SidebarMenuSubButtonComponent & {
  new (): { $props: SidebarMenuSubButtonProps }
}

// =============================================
// Separator
// =============================================

export type SidebarSeparatorProps = HTMLAttributes

export const SidebarSeparator = defineComponent({
  name: "SidebarSeparator",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    return () => {
      const { className, rest } = cleanAttrs(attrs)
      return h("hr", { class: [s.Separator, className], ...rest })
    }
  },
}) as unknown as ReturnType<typeof part<SidebarSeparatorProps>>

// =============================================
// Card
// =============================================

const SidebarCardComponent = defineComponent({
  name: "SidebarCard",
  inheritAttrs: false,
  props: {
    /** Visual variant. @default "default" */
    variant: { type: String as PropType<"default" | "elevated">, default: "default" },
    /** Shows a dismiss button. @default false */
    dismissible: { type: Boolean, default: false },
  },
  emits: {
    /** The dismiss button was clicked */
    dismiss: (_event: MouseEvent) => true,
  },
  setup(props, { attrs, slots, emit }) {
    return () => {
      const { className, rest } = cleanAttrs(attrs)
      return h("div", { "data-variant": props.variant, "class": [s.Card, className], ...rest }, [
        props.dismissible
          ? h(
              Button,
              {
                "uniform": true,
                "size": "3xs",
                "variant": "ghost",
                "color": "secondary",
                "class": s.CardDismiss,
                "onClick": (event: MouseEvent) => emit("dismiss", event),
                "aria-label": "Dismiss",
              },
              { default: () => h(X) },
            )
          : null,
        slots.default?.(),
      ])
    }
  },
})

export type SidebarCardProps = InstanceType<typeof SidebarCardComponent>["$props"] & HTMLAttributes

/** Promotional card for CTAs, upgrades or announcements. */
export const SidebarCard = SidebarCardComponent as typeof SidebarCardComponent & {
  new (): { $props: SidebarCardProps }
}

export type SidebarCardHeaderProps = HTMLAttributes

export const SidebarCardHeader = part<SidebarCardHeaderProps>("SidebarCardHeader", "div", s.CardHeader)

export type SidebarCardTitleProps = HTMLAttributes

export const SidebarCardTitle = part<SidebarCardTitleProps>("SidebarCardTitle", "div", s.CardTitle)

export type SidebarCardTitleLinkProps = AnchorHTMLAttributes

export const SidebarCardTitleLink = defineComponent({
  name: "SidebarCardTitleLink",
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => {
      const { className, rest } = cleanAttrs(attrs)
      return h("a", { class: [s.CardTitleLink, className], ...rest }, [
        slots.default?.(),
        h(ChevronRightMd, { class: s.CardTitleChevron }),
      ])
    }
  },
}) as unknown as ReturnType<typeof part<SidebarCardTitleLinkProps>>

export type SidebarCardContentProps = HTMLAttributes

export const SidebarCardContent = part<SidebarCardContentProps>("SidebarCardContent", "div", s.CardContent)

export type SidebarCardFooterProps = HTMLAttributes

export const SidebarCardFooter = part<SidebarCardFooterProps>("SidebarCardFooter", "div", s.CardFooter)

// =============================================
// Inset (Main Content Area)
// =============================================

export type SidebarInsetProps = HTMLAttributes

/**
 * Main content area next to the sidebar, a `<main>`. Behind the open phone drawer it takes no focus or touch
 * (`inert`); an `inert` of your own wins.
 */
export const SidebarInset = defineComponent({
  name: "SidebarInset",
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const sidebar = useSidebar()
    return () => {
      const { className, rest } = cleanAttrs(attrs)
      return h(
        "main",
        { inert: sidebar.isMobile && sidebar.openMobile ? "" : undefined, ...rest, class: [s.Inset, className] },
        slots.default?.(),
      )
    }
  },
}) as unknown as Part<SidebarInsetProps>

// =============================================
// Layout Container
// =============================================

export type SidebarLayoutProps = HTMLAttributes

/** Wrapper for the sidebar and the main content. */
export const SidebarLayout = part<SidebarLayoutProps>("SidebarLayout", "div", s.SidebarLayout)

// =============================================
// Trigger (Collapse Button)
// =============================================

export type SidebarTriggerProps = ButtonHTMLAttributes

/**
 * Collapse button. The default slot replaces the icon. Renders nothing when
 * `collapsible="none"`.
 */
export const SidebarTrigger = defineComponent({
  name: "SidebarTrigger",
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const sidebar = useSidebar()

    return () => {
      // Don't render if collapsible="none" (text-only sidebars)
      if (sidebar.collapsible === "none") {
        return null
      }

      const { className, rest } = cleanAttrs(attrs)
      const { onClick, ...others } = rest
      return h(
        "button",
        {
          "type": "button",
          "class": [s.Trigger, className],
          // The caller's listener runs first and can cancel the toggle
          "onClick": composeEventHandlers(onClick, () => sidebar.toggleSidebar()),
          "aria-label": sidebar.isMobile
            ? "Open menu"
            : sidebar.state === "expanded"
              ? "Collapse sidebar"
              : "Expand sidebar",
          ...others,
        },
        [
          h("span", { class: s.TriggerInner }, [
            // One icon for both states: the tooltip, not the icon, says what a press does
            h("span", { class: s.TriggerIcon }, slots.default ? slots.default() : [h(SidebarIcon)]),
          ]),
        ],
      )
    }
  },
}) as unknown as ReturnType<typeof part<SidebarTriggerProps>>

// =============================================
// Mobile Menu Button (SidebarMenuMobile icon → X)
// =============================================

export type SidebarMobileMenuButtonProps = ButtonHTMLAttributes

export const SidebarMobileMenuButton = defineComponent({
  name: "SidebarMobileMenuButton",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    const sidebar = useSidebar()

    return () => {
      const { className, rest } = cleanAttrs(attrs)
      const { onClick, ...others } = rest
      return h(
        "button",
        {
          "type": "button",
          "data-expanded": sidebar.openMobile ? "" : undefined,
          // Where focus goes when a drawer closes and what opened it can no longer take it (lib/phoneDrawer)
          "data-sidebar-mobile-menu-button": "",
          "class": [s.MobileMenuButton, className],
          // The caller's listener runs first and can cancel the toggle
          "onClick": composeEventHandlers(onClick, () => sidebar.setOpenMobile(!sidebar.openMobile)),
          "aria-label": sidebar.openMobile ? "Close menu" : "Open menu",
          ...others,
        },
        [
          h("span", { class: s.MobileMenuIcon }, [
            h(SidebarMenuMobile, { "class": s.MobileMenuGlyph, "data-glyph": "menu" }),
            h(X, { "class": s.MobileMenuGlyph, "data-glyph": "close" }),
          ]),
        ],
      )
    }
  },
}) as unknown as ReturnType<typeof part<SidebarMobileMenuButtonProps>>

// =============================================
// Mobile Sidebar
// =============================================

/**
 * The phone drawer: a modal dialog while it is open. Focus moves into it and Tab goes round its controls, the page
 * behind is inert (SidebarInset), Escape inside it closes it after any layer over it has taken its own, and focus
 * goes back to the control that opened it. A swipe in from the edge it slides from opens it and a swipe back closes
 * it (lib/phoneDrawer).
 */
/** Runs `run` once `element` has left the page: a leaving `<Transition>` keeps it there for its animation */
const whenDetached = (element: Element, run: () => void) => {
  if (!element.isConnected) return run()
  const observer = new MutationObserver(() => {
    if (element.isConnected) return
    observer.disconnect()
    run()
  })
  observer.observe(element.ownerDocument, { childList: true, subtree: true })
}

const SidebarMobileComponent = defineComponent({
  name: "SidebarMobile",
  inheritAttrs: false,
  props: {
    /** When true, drawer is positioned absolute instead of fixed (for contained demos) */
    contained: { type: Boolean, default: undefined },
    /** Rows that lead to another page end with a disclosure chevron, as in an iOS list. `false` leaves it out. @default true */
    disclosure: { type: Boolean, default: true },
  },
  setup(props, { attrs, slots }) {
    const sidebar = useSidebar()
    provide(sidebarDrawerKey, computed(() => props.disclosure))
    const drawer = ref<HTMLElement>()
    const setDrawer = (el: unknown) => {
      drawer.value = el instanceof HTMLElement ? el : ((el as { $el?: unknown } | null)?.$el as HTMLElement | undefined)
    }

    let detachSwipe: (() => void) | undefined
    // Vue runs a watcher's cleanup on unmount while the drawer is still on the page, where React runs it once the
    // drawer has left: focus goes back once the drawer has left (after unmount, or after a leaving <Transition>), so a
    // menu button that leaves with the drawer is not picked
    let unmounting = false
    let restoreAfterUnmount: (() => void) | undefined
    onMounted(() => {
      // Focus moves in on open and back to what opened the drawer on close, or to a menu button when that can no longer
      // take it (from mount, as React's effect). A drawer that is not contained shows only at phone width, so going
      // back to it from a wide window moves focus in again.
      watch(
        () => sidebar.openMobile && (sidebar.isMobile || Boolean(props.contained)),
        (open, _, onCleanup) => {
          const el = drawer.value
          if (!open || !el) return
          const trigger = document.activeElement
          // Taken now: after unmount the drawer has left the page, with no provider around it
          const root = el.closest("[data-mobile-menu]")
          if (!el.contains(document.activeElement)) drawerInitialFocus(el).focus({ preventScroll: true })
          onCleanup(() => {
            const restore = () => {
              const active = document.activeElement
              const lost = !active || active === document.body || el.contains(active)
              if (lost) returnDrawerFocus(trigger, el, root)
            }
            if (unmounting) restoreAfterUnmount = () => whenDetached(el, restore)
            else restore()
          })
        },
        { flush: "post", immediate: true },
      )

      const el = drawer.value
      const root = el?.closest<HTMLElement>("[data-mobile-menu]")
      if (!el || !root) return
      detachSwipe = attachDrawerSwipe({
        root,
        drawer: el,
        isOpen: () => sidebar.openMobile,
        setOpen: (open) => sidebar.setOpenMobile(open),
        enabled: () => sidebar.isMobile,
      })
    })
    onBeforeUnmount(() => {
      unmounting = true
      detachSwipe?.()
    })
    onUnmounted(() => {
      restoreAfterUnmount?.()
      restoreAfterUnmount = undefined
    })

    const onDrawerKeydown = (event: KeyboardEvent) => {
      const el = drawer.value
      if (!sidebar.openMobile || !el) return
      loopDrawerFocus(event, el)
      closeOnUnhandledEscape(event, el, () => sidebar.setOpenMobile(false))
    }

    return () => {
      const { className, rest } = cleanAttrs(attrs)
      const { onKeydown: userKeydown, ...drawerAttrs } = rest
      const contained = props.contained && s.contained
      const open = sidebar.openMobile
      return [
        // Backdrop
        h("div", {
          "class": [s.MobileBackdrop, contained],
          "onClick": () => sidebar.setOpenMobile(false),
          "aria-hidden": "true",
        }),
        // Drawer
        h(
          "div",
          {
            "ref": setDrawer,
            "role": "dialog",
            "aria-modal": open ? "true" : undefined,
            "aria-label": "Menu",
            "tabindex": -1,
            "inert": open ? undefined : "",
            ...drawerAttrs,
            "class": [s.MobileSidebar, contained, className],
            // Your handler runs first and can keep the drawer open with preventDefault(), as onKeyDown in React
            "onKeydown": (event: KeyboardEvent) => {
              for (const handler of [userKeydown].flat()) if (typeof handler === "function") handler(event)
              onDrawerKeydown(event)
            },
          },
          slots.default?.(),
        ),
      ]
    }
  },
})

export type SidebarMobileProps = InstanceType<typeof SidebarMobileComponent>["$props"] & HTMLAttributes

export const SidebarMobile = SidebarMobileComponent as typeof SidebarMobileComponent & {
  new (): { $props: SidebarMobileProps }
}

export type SidebarMobileHeaderProps = HTMLAttributes

export const SidebarMobileHeader = part<SidebarMobileHeaderProps>("SidebarMobileHeader", "div", s.MobileHeader)

export type SidebarMobileFooterProps = HTMLAttributes

export const SidebarMobileFooter = part<SidebarMobileFooterProps>("SidebarMobileFooter", "div", s.MobileFooter)

// =============================================
// Input (Search)
// =============================================

export type SidebarInputProps = InputProps

/**
 * Search input: an Input with a Search icon in its `startAdornment` slot.
 * Every attribute, listener and slot goes to the Input (`v-model:value`,
 * `@clear`, ...). A template ref gets the Input's `focus()` and `input`
 * (React forwards its ref to the <input>).
 */
export const SidebarInput = defineComponent({
  name: "SidebarInput",
  inheritAttrs: false,
  setup(_props, { attrs, slots, expose }) {
    // Input's exposed API
    const inputComponent = ref<{ input: HTMLInputElement | null; focus: () => void } | null>(null)

    expose({
      focus: () => inputComponent.value?.focus(),
      input: computed(() => inputComponent.value?.input ?? null),
    })

    return () => {
      const { className, rest } = cleanAttrs(attrs)
      return h("div", { class: s.Input }, [
        h(
          Input,
          { class: className, ...rest, ref: inputComponent },
          { ...slots, startAdornment: slots.startAdornment ?? (() => h(SearchIcon)) },
        ),
      ])
    }
  },
}) as unknown as typeof Input

// =============================================
// Footer Links
// =============================================

export type SidebarFooterLinksProps = HTMLAttributes

export const SidebarFooterLinks = part<SidebarFooterLinksProps>("SidebarFooterLinks", "div", s.FooterLinks)
