import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
  type ComputedRef,
  type InjectionKey,
  type PropType,
} from "vue"
import s from "@plexui/styles/components/TabBar/TabBar.module.css"
import { Search as SearchIcon } from "../Icon/index.js"
import { TOOLBAR_HOST, type BarBackground } from "../Toolbar/Toolbar.js"

// Vue port of packages/ui/src/components/TabBar/TabBar.tsx. Exports are flat (`TabBarItem` for `TabBar.Item`);
// the symbol of an item is its `icon` slot. React's `value` + `onValueChange` become `value` + `update:value`
// (`v-model:value`), `minimized` + `onMinimizedChange` become `minimized` + `update:minimized`.

/** A scroll of at least this many pixels in one direction minimizes or expands the bar. */
const MINIMIZE_AFTER = 8

type TabBarContext = {
  value: ComputedRef<string | undefined>
  minimized: ComputedRef<boolean>
  select: (value: string) => void
  expand: () => void
}

const TAB_BAR: InjectionKey<TabBarContext> = Symbol("TabBar")

export type TabBarSearch = {
  /** The value of the search tab. */
  value: string
  /** Accessible name of the search tab. @default "Search" */
  label?: string
}

const TabBarItemComponent = defineComponent({
  name: "TabBarItem",
  inheritAttrs: false,
  props: {
    /** The value of the tab. */
    value: { type: String, required: true },
    /** The label under the symbol, and the accessible name of the tab. */
    label: { type: String, required: true },
    /** Makes the tab a link to this URL. */
    href: String,
    /** When `true`, the tab cannot be selected. */
    disabled: { type: Boolean, default: false },
    /** @internal The search tab shows its symbol only. */
    hideLabel: { type: Boolean, default: false },
  },
  emits: {
    /** The tab was pressed, before it is selected */
    click: (event: MouseEvent) => event instanceof MouseEvent,
  },
  setup(props, { attrs, emit, slots }) {
    const context = inject(TAB_BAR, null)
    if (!context) throw new Error("TabBarItem must be used within TabBar")
    const selected = computed(() => context.value.value === props.value)
    // A minimized bar shows the selected tab only; pressing it brings the other tabs back.
    const collapsed = computed(() => context.minimized.value && selected.value && !props.hideLabel)
    const handleClick = (event: MouseEvent) => {
      emit("click", event)
      if (event.defaultPrevented || props.disabled) return
      if (collapsed.value) {
        event.preventDefault()
        return context.expand()
      }
      context.select(props.value)
    }
    return () => {
      const content = [
        h("span", { "class": s.Icon, "aria-hidden": "true" }, slots.icon?.()),
        props.hideLabel ? null : h("span", { class: s.Label }, props.label),
      ]
      const shared = {
        "class": [s.Item, attrs.class],
        "aria-current": selected.value ? "page" : undefined,
        "aria-label": props.hideLabel ? props.label : undefined,
        "aria-expanded": collapsed.value ? false : undefined,
        "data-selected": selected.value ? "" : undefined,
        "data-disabled": props.disabled ? "" : undefined,
        "data-value": props.value,
        "onClick": handleClick,
      }
      if (props.href !== undefined && !props.disabled) return h("a", { href: props.href, ...shared }, content)
      return h("button", { type: "button", disabled: props.disabled, ...shared }, content)
    }
  },
})

/** Props of `TabBarItem`. */
export type TabBarItemProps = InstanceType<typeof TabBarItemComponent>["$props"]

/** One tab of a `TabBar` (React `TabBar.Item`): its `icon` slot holds the symbol, a PlexUI icon. */
export const TabBarItem = TabBarItemComponent

const TabBarComponent = defineComponent({
  name: "TabBar",
  inheritAttrs: false,
  props: {
    /** The controlled value of the selected tab. Bind with `v-model:value`. */
    value: { type: String, default: undefined },
    /** The selected tab when it is initially rendered. */
    defaultValue: { type: String, default: undefined },
    /** A search tab in a glass circle of its own at the trailing end, as the iOS 26 separate search tab. */
    search: { type: Object as PropType<TabBarSearch>, default: undefined },
    /**
     * `onScrollDown` minimizes the bar to the selected tab while the content of the `Page` scrolls down and
     * expands it when the content scrolls back up; a tap on the minimized tab expands it too. @default "never"
     */
    minimizeBehavior: { type: String as PropType<"never" | "onScrollDown">, default: "never" },
    /** Controlled minimized state. Bind with `v-model:minimized`. */
    minimized: { type: Boolean, default: undefined },
    /** The minimized state when it is initially rendered. @default false */
    defaultMinimized: { type: Boolean, default: false },
    /** How the bar meets the content scrolled under it; see `BarBackground`. @default "soft" */
    background: { type: String as PropType<BarBackground>, default: "soft" },
    /** Accessible name of the navigation. @default "Tabs" */
    ariaLabel: { type: String, default: "Tabs" },
  },
  emits: {
    /** A tab was selected */
    "update:value": (value: string) => typeof value === "string",
    /** A tab was selected (React `onValueChange`) */
    "valueChange": (value: string) => typeof value === "string",
    /** The bar minimized or expanded */
    "update:minimized": (minimized: boolean) => typeof minimized === "boolean",
  },
  setup(props, { attrs, emit, slots }) {
    const host = inject(TOOLBAR_HOST, null)
    const internalValue = ref(props.defaultValue)
    const value = computed(() => props.value ?? internalValue.value)
    const internalMinimized = ref(props.defaultMinimized)
    const minimized = computed(() => props.minimized ?? internalMinimized.value)

    const select = (next: string) => {
      if (props.value === undefined) internalValue.value = next
      emit("update:value", next)
      emit("valueChange", next)
    }
    const setMinimized = (next: boolean) => {
      if (next === minimized.value) return
      if (props.minimized === undefined) internalMinimized.value = next
      emit("update:minimized", next)
    }
    provide(TAB_BAR, { value, minimized, select, expand: () => setMinimized(false) })

    // The bar follows the Page content: down by MINIMIZE_AFTER minimizes it, up by as much (or the top) expands it.
    let unsubscribe: (() => void) | undefined
    const follow = () => {
      unsubscribe?.()
      unsubscribe = undefined
      if (props.minimizeBehavior !== "onScrollDown" || !host?.subscribeScroll) return
      let anchor = 0
      unsubscribe = host.subscribeScroll((scrollTop) => {
        if (scrollTop <= 0) {
          anchor = 0
          return setMinimized(false)
        }
        const delta = scrollTop - anchor
        if (minimized.value ? delta < 0 : delta > 0) {
          if (Math.abs(delta) >= MINIMIZE_AFTER) {
            anchor = scrollTop
            setMinimized(!minimized.value)
          }
          return
        }
        anchor = scrollTop
      })
    }
    watch(() => props.minimizeBehavior, follow, { immediate: true })

    // Like a bottom Toolbar, the bar reserves its height on the Page; a desktop layout hides it.
    const element = ref<HTMLElement | null>(null)
    let observer: ResizeObserver | undefined
    onMounted(() => {
      const bar = element.value
      const setHeight = host?.setHeight
      if (!bar || !setHeight) return
      const update = () => setHeight("bottom", bar.offsetHeight || undefined)
      update()
      observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : undefined
      observer?.observe(bar, { box: "border-box" })
    })
    onBeforeUnmount(() => {
      unsubscribe?.()
      observer?.disconnect()
      host?.setHeight?.("bottom", undefined)
    })

    return () => h("nav", {
      ...attrs,
      "ref": element,
      "aria-label": props.ariaLabel,
      "class": [s.TabBar, attrs.class],
      "data-host": host?.kind,
      "data-background": props.background,
      "data-content-below": host?.contentBelow?.value ? "" : undefined,
      "data-minimized": minimized.value ? "" : undefined,
      "data-search": props.search ? "" : undefined,
    }, [
      h("div", { class: s.Tabs }, slots.default?.()),
      props.search
        ? h(TabBarItem, { class: s.Search, value: props.search.value, label: props.search.label ?? "Search", hideLabel: true }, { icon: () => h(SearchIcon) })
        : null,
    ])
  },
})

/** Props of `TabBar`. */
export type TabBarProps = InstanceType<typeof TabBarComponent>["$props"]

/**
 * The tab bar of a phone screen after the iOS 26 kit Tab Bar - iPhone (507:24689): two to five tabs, each a
 * symbol over a label, in a floating glass capsule at the bottom, the selected tab on a pill, and an optional
 * search tab in a circle of its own. It minimizes to the selected tab while the content scrolls down. A desktop
 * layout navigates with a Sidebar or Tabs, so the bar never renders from 768px up.
 */
export const TabBar = TabBarComponent
