import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type LiHTMLAttributes,
  type PropType,
  type VNode,
  type VNodeArrayChildren,
} from "vue"
import { Button } from "../Button/index.js"
import { ChevronRightMd, Search as SearchIcon, SidebarLeft, X } from "../Icon/index.js"
import { Input, type InputProps } from "../Input/index.js"
import { Tooltip } from "../Tooltip/index.js"
import { firstElementChild, mergeSlotProps } from "../Tooltip/slot.js"
import s from "@plexui/styles/components/Sidebar/Sidebar.module.css"
import {
  SidebarProvider,
  useSidebar,
  type SidebarCollapsible,
  type SidebarSide,
  type SidebarVariant,
} from "./useSidebarContext.js"

// Vue port of packages/ui/src/components/Sidebar/Sidebar.tsx. Exports are
// flat, as in React's index. Every part renders its React element with the
// caller's attributes applied after its own (React spreads `...props` last),
// so a caller's attribute or listener replaces the part's own: an `@click` on
// SidebarTrigger or SidebarMobileMenuButton replaces the toggle, as `onClick`
// does in React. `class` is merged. `data-toggle` (injected by MDX) is
// dropped, as React's `cleanProps` does.
// - `asChild` (SidebarGroupLabel, SidebarMenuButton, SidebarMenuSubButton)
//   merges into the first element of the default slot the way Radix's Slot
//   does. SidebarMenuButton's slot child is its own inner `<span>`, so with
//   `asChild` it renders that `<span>` carrying the button's attributes, with
//   the slot content inside, as in React.
// - ReactNode props are slots: SidebarMenuButton `tooltip` (prop or
//   `#tooltip` slot), SidebarTrigger's icon (default slot), SidebarInput's
//   `startAdornment` (slot, Search icon by default).
// - Parts whose React children are fixed (SidebarMenuChevron,
//   SidebarMenuSkeleton, SidebarMobileMenuButton) ignore the default slot.

// Re-export provider and composable
export { SidebarProvider, useSidebar }
export type { SidebarCollapsible, SidebarSide, SidebarVariant }

type Attrs = Record<string, unknown>

// Filter out attributes that shouldn't reach the DOM (e.g. injected by MDX)
const cleanAttrs = (attrs: Attrs) => {
  const { "data-toggle": _, class: className, ...rest } = attrs
  return { className, rest }
}

/** A part that renders one element with its class and the caller's attributes. */
const part = <A>(name: string, tag: string, className: string | undefined) => {
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
  return component as typeof component & { new (): { $props: A } }
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
    /** Whether the group is open by default. @default true */
    defaultOpen: { type: Boolean, default: true },
    /** Controlled open state (`v-model:open`) */
    open: { type: Boolean, default: undefined },
  },
  emits: {
    /**
     * The group open state changes. Declared as in React, where nothing in the
     * group calls `onOpenChange` either.
     */
    "update:open": (_open: boolean) => true,
  },
  setup(props, { attrs, slots }) {
    // React keeps the state but never changes it (its toggle handler is unused)
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

    return () => {
      const { className, rest } = cleanAttrs(attrs)
      const ownProps = {
        "data-active": props.isActive ? "true" : "false",
        "aria-current": props.isActive ? "page" : undefined,
        "class": [s.MenuButton, className],
        ...rest,
      }
      const inner = h("span", { class: s.MenuButtonInner }, slots.default?.())
      const button: VNode = props.asChild ? mergeSlotProps(inner, ownProps) : h("button", ownProps, [inner])

      // Show tooltip when collapsed (icon mode) and not mobile
      if ((props.tooltip || slots.tooltip) && sidebar.state === "collapsed" && !sidebar.isMobile) {
        return h(
          Tooltip,
          { content: props.tooltip, side: "right" },
          { default: () => button, ...(slots.tooltip ? { content: slots.tooltip } : {}) },
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
    return () => {
      const { className, rest } = cleanAttrs(attrs)
      const ownProps = {
        "data-active": props.isActive ? "true" : "false",
        "aria-current": props.isActive ? "page" : undefined,
        "class": [s.MenuSubButton, s[`indent${props.indent}`], className],
        ...rest,
      }
      return props.asChild ? renderAsChild(slots.default?.(), ownProps) : h("button", ownProps, slots.default?.())
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

/** Main content area next to the sidebar, a `<main>`. */
export const SidebarInset = part<SidebarInsetProps>("SidebarInset", "main", s.Inset)

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
      return h(
        "button",
        {
          "type": "button",
          "class": [s.Trigger, className],
          "onClick": sidebar.toggleSidebar,
          "aria-label": sidebar.isMobile
            ? "Open menu"
            : sidebar.state === "expanded"
              ? "Collapse sidebar"
              : "Expand sidebar",
          ...rest,
        },
        [
          h("span", { class: s.TriggerInner }, [
            // Default icon (same for both states, as per reference)
            h("span", { class: s.TriggerIcon }, slots.default ? slots.default() : [h(SidebarLeft)]),
          ]),
        ],
      )
    }
  },
}) as unknown as ReturnType<typeof part<SidebarTriggerProps>>

// =============================================
// Mobile Menu Button (Hamburger → X)
// =============================================

export type SidebarMobileMenuButtonProps = ButtonHTMLAttributes

export const SidebarMobileMenuButton = defineComponent({
  name: "SidebarMobileMenuButton",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    const sidebar = useSidebar()

    return () => {
      const { className, rest } = cleanAttrs(attrs)
      return h(
        "button",
        {
          "type": "button",
          "data-expanded": sidebar.openMobile ? "" : undefined,
          "class": [s.MobileMenuButton, className],
          "onClick": () => sidebar.setOpenMobile(!sidebar.openMobile),
          "aria-label": sidebar.openMobile ? "Close menu" : "Open menu",
          ...rest,
        },
        [
          h("span", { class: s.MobileMenuIcon }, [
            h("span", { "class": s.MobileMenuLine, "data-top": "true" }),
            h("span", { class: s.MobileMenuMiddle }, [h("span", { "class": s.MobileMenuLine, "data-bottom": "true" })]),
          ]),
        ],
      )
    }
  },
}) as unknown as ReturnType<typeof part<SidebarMobileMenuButtonProps>>

// =============================================
// Mobile Sidebar
// =============================================

const SidebarMobileComponent = defineComponent({
  name: "SidebarMobile",
  inheritAttrs: false,
  props: {
    /** When true, drawer is positioned absolute instead of fixed (for contained demos) */
    contained: { type: Boolean, default: undefined },
  },
  setup(props, { attrs, slots }) {
    const sidebar = useSidebar()

    return () => {
      const { className, rest } = cleanAttrs(attrs)
      const contained = props.contained && s.contained
      return [
        // Backdrop
        h("div", {
          "class": [s.MobileBackdrop, contained],
          "onClick": () => sidebar.setOpenMobile(false),
          "aria-hidden": "true",
        }),
        // Drawer
        h("div", { class: [s.MobileSidebar, contained, className], ...rest }, slots.default?.()),
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
 * `@clear`, ...).
 */
export const SidebarInput = defineComponent({
  name: "SidebarInput",
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => {
      const { className, rest } = cleanAttrs(attrs)
      return h("div", { class: s.Input }, [
        h(
          Input,
          { class: className, ...rest },
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
