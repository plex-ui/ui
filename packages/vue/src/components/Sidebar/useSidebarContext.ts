import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  reactive,
  ref,
  watch,
  type InjectionKey,
  type PropType,
  type SlotsType,
  type StyleValue,
} from "vue"

// Vue port of packages/ui/src/components/Sidebar/useSidebarContext.tsx.
// - `useSidebar()` returns the context as a reactive object (read
//   `sidebar.state`; destructuring outside a render loses reactivity).
//   Templates get the same object as the default slot props of
//   SidebarProvider (`v-slot="{ state, toggleSidebar }"`), the way Popover's
//   content slot exposes its controller.
// - `open` + `update:open` support `v-model:open`. As in React, the provider
//   is controlled only when `open` is passed; `update:open` is emitted either way.
// - Mobile detection, the Cmd/Ctrl+B shortcut and the Escape listener start
//   on mount, as React's effects do (SSR-safe).

// Constants
const SIDEBAR_COOKIE_NAME = "sidebar:state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const SIDEBAR_WIDTH = "240px"
const SIDEBAR_WIDTH_MOBILE = "288px"
const SIDEBAR_WIDTH_ICON = "64px"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"
const MOBILE_BREAKPOINT = 768

// Types
export type SidebarState = "expanded" | "collapsed"
export type SidebarCollapsible = "offcanvas" | "icon" | "none"
export type SidebarSide = "left" | "right"
export type SidebarVariant = "sidebar" | "docs"

type SetBoolean = (value: boolean | ((prev: boolean) => boolean)) => void

export type SidebarContextValue = {
  state: SidebarState
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  collapsible: SidebarCollapsible
  toggleSidebar: () => void
}

// Context
const SidebarContextKey: InjectionKey<SidebarContextValue> = Symbol("PlexUISidebar")

/** Sidebar state and controls; call it in `setup()` of a component inside SidebarProvider. */
export const useSidebar = (): SidebarContextValue => {
  const context = inject(SidebarContextKey, null)

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }

  return context
}

// Composable for mobile detection via matchMedia
function useIsMobile() {
  const isMobile = ref(false)
  let cleanup: (() => void) | undefined

  onMounted(() => {
    // Check if we're in browser environment
    if (typeof window === "undefined") return

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    const handleChange = () => {
      isMobile.value = mql.matches
    }
    handleChange() // Initial check

    mql.addEventListener("change", handleChange)
    cleanup = () => mql.removeEventListener("change", handleChange)
  })
  onBeforeUnmount(() => cleanup?.())

  return isMobile
}

/** Native attributes of the provider's `<div>` that React accepts: `class` and `style`. */
export type SidebarProviderAttrs = { class?: unknown; style?: StyleValue }

const SidebarProviderComponent = defineComponent({
  name: "SidebarProvider",
  inheritAttrs: false,
  props: {
    /** Default open state (uncontrolled). @default true */
    defaultOpen: { type: Boolean, default: true },
    /** Controlled open state (`v-model:open`) */
    open: { type: Boolean, default: undefined },
    /** Collapsible mode. @default "offcanvas" */
    collapsible: { type: String as PropType<SidebarCollapsible>, default: "offcanvas" },
  },
  emits: {
    /** The open state changes (`v-model:open`) */
    "update:open": (_open: boolean) => true,
  },
  slots: Object as SlotsType<{ default?: (context: SidebarContextValue) => unknown }>,
  setup(props, { attrs, slots, emit }) {
    const isMobile = useIsMobile()
    const openMobile = ref(false)

    // Controlled vs uncontrolled state for desktop
    const internalOpen = ref(props.defaultOpen)
    const open = computed(() => props.open ?? internalOpen.value)

    const setOpen: SetBoolean = (value) => {
      const openState = typeof value === "function" ? value(open.value) : value

      // Controlled only when `open` is passed; update:open alone is a notification
      if (props.open === undefined) {
        internalOpen.value = openState
      }
      emit("update:open", openState)

      // Persist state in cookie for SSR
      if (typeof document !== "undefined") {
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      }
    }

    const setOpenMobile: SetBoolean = (value) => {
      openMobile.value = typeof value === "function" ? value(openMobile.value) : value
    }

    // Toggle function that handles both mobile and desktop
    const toggleSidebar = () => {
      if (isMobile.value) {
        setOpenMobile((prev) => !prev)
      } else {
        setOpen((prev) => !prev)
      }
    }

    // Keyboard shortcut: Cmd/Ctrl + B
    const handleShortcut = (event: KeyboardEvent) => {
      // Skip if collapsible is "none"
      if (props.collapsible === "none") return

      // Don't trigger when focus is in an editable element (input, textarea, contenteditable)
      const target = event.target as HTMLElement | null
      if (target?.closest?.("input, textarea") || target?.isContentEditable) return

      // Check for Cmd (Mac) or Ctrl (Windows/Linux) + B
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault()
        toggleSidebar()
      }
    }
    onMounted(() => window.addEventListener("keydown", handleShortcut))
    onBeforeUnmount(() => window.removeEventListener("keydown", handleShortcut))

    // Close mobile menu on escape key
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMobile(false)
      }
    }
    watch(
      openMobile,
      (isOpen, _, onCleanup) => {
        if (!isOpen) return
        window.addEventListener("keydown", handleEscape)
        onCleanup(() => window.removeEventListener("keydown", handleEscape))
      },
      { flush: "post" },
    )
    onBeforeUnmount(() => window.removeEventListener("keydown", handleEscape))

    // Derive state from open boolean
    const state = computed<SidebarState>(() => (open.value ? "expanded" : "collapsed"))

    const context = reactive({
      state,
      open,
      setOpen: setOpen as (open: boolean) => void,
      openMobile,
      setOpenMobile: setOpenMobile as (open: boolean) => void,
      isMobile,
      collapsible: computed(() => props.collapsible),
      toggleSidebar,
    }) as SidebarContextValue

    provide(SidebarContextKey, context)

    return () =>
      h(
        "div",
        {
          "class": attrs.class,
          "style": [
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            },
            attrs.style as StyleValue,
          ],
          "data-sidebar": state.value,
          "data-mobile-menu": openMobile.value ? "visible" : "hidden",
          "data-collapsible": props.collapsible,
        },
        slots.default?.(context) as never,
      )
  },
})

type SidebarProviderOwnProps = InstanceType<typeof SidebarProviderComponent>["$props"]

export type SidebarProviderProps = SidebarProviderOwnProps & SidebarProviderAttrs

/**
 * Handles the sidebar state and provides it to every part. Like React, it
 * renders a `<div>` that takes only `class` and `style`. The default slot
 * receives the context (`v-slot="{ state, toggleSidebar }"`).
 */
export const SidebarProvider = SidebarProviderComponent as typeof SidebarProviderComponent & {
  new (): { $props: SidebarProviderProps }
}

// Re-export constants for external use
export const SIDEBAR_CONSTANTS = {
  WIDTH: SIDEBAR_WIDTH,
  WIDTH_MOBILE: SIDEBAR_WIDTH_MOBILE,
  WIDTH_ICON: SIDEBAR_WIDTH_ICON,
  KEYBOARD_SHORTCUT: SIDEBAR_KEYBOARD_SHORTCUT,
  MOBILE_BREAKPOINT,
  COOKIE_NAME: SIDEBAR_COOKIE_NAME,
  COOKIE_MAX_AGE: SIDEBAR_COOKIE_MAX_AGE,
} as const
