import {
  cloneVNode,
  computed,
  createCommentVNode,
  defineComponent,
  Fragment as FragmentVNode,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  provide,
  ref,
  shallowRef,
  Teleport,
  watch,
  type ComputedRef,
  type CSSProperties,
  type HTMLAttributes,
  type InjectionKey,
  type PropType,
  type Ref,
  type VNode,
  type VNodeArrayChildren,
  isVNode,
  mergeProps,
} from "vue"
import {
  DialogContent as RekaDialogContent,
  DialogDescription as RekaDialogDescription,
  DialogOverlay as RekaDialogOverlay,
  DialogPortal as RekaDialogPortal,
  DialogRoot as RekaDialogRoot,
  DialogTitle as RekaDialogTitle,
  FocusScope as RekaFocusScope,
  injectDialogRootContext,
  useForwardExpose,
  useId,
} from "reka-ui"
import { useEscCloseStack } from "../../composables/useEscCloseStack.js"
import { inToastRegion } from "../../lib/toastRegion.js"
import { cancelableKeyCopy, dataAttributes, keepMovedFocus, preventDefaultHandler, toCssVariables } from "../../lib/helpers.js"
import { dismissableSurfaces, useDeferredPointerDownOutside } from "../Popover/deferredPointerDownOutside.js"
import { firstElementChild } from "../Tooltip/slot.js"
import { TransitionGroup } from "../Transition/index.js"
import { attachSheetDrag } from "./sheetDrag.js"
import { watchDialogViewport } from "./dialogViewport.js"
import { enterStep, leaveStep, releaseStepHeight, settleStepHeight, STEP_TIMING } from "./dialogSteps.js"
import { PHONE_LAYOUT as PHONE_LAYOUT_SCOPE, type PhoneLayoutValue } from "../PhoneLayout/PhoneLayout.js"
import { overlayTiming, overlayTimingLarge } from "../Transition/shared.js"
import { provideFloatingBoundaryScope, useFloatingBoundaryRegistration } from "../../composables/useFloatingBoundary.js"
import { NavigationButton } from "../Button/NavigationButton.js"
import { TOOLBAR_HOST, Toolbar, ToolbarLeading, ToolbarTrailing, type BarBackground } from "../Toolbar/Toolbar.js"
import { observeScrollEdges } from "../../lib/scrollEdges.js"
import s from "@plexui/styles/components/Dialog/Dialog.module.css"
import t from "@plexui/styles/components/Toolbar/Toolbar.module.css"

const DOUBLE_CLICK = 300

/** Where content lies under the bars: DialogBody reports it, the bars show their lines with it. */
type DialogScroll = { scrolled: Ref<boolean>; contentBelow: Ref<boolean> }
const DIALOG_SCROLL: InjectionKey<DialogScroll> = Symbol("DialogScroll")
// What the header of a Sheet needs from its content to become the Sheet's bar on a phone
type DialogSheet = { showClose: boolean }
const DIALOG_SHEET: InjectionKey<ComputedRef<DialogSheet | null>> = Symbol("DialogSheet")
// Inside that bar: the title, the description and the header actions take the Toolbar's parts
const DIALOG_BAR: InjectionKey<ComputedRef<boolean>> = Symbol("DialogBar")
// Where DialogBody takes a phone Sheet's description: the first text of the content, under the bar
// Where a phone Sheet's description goes: the top of DialogBody, or first a DialogDescriptionSlot of the content's own
type DialogDescriptionSlots = { body: Ref<HTMLElement | null>; own: Ref<HTMLElement | null> }
const DIALOG_DESCRIPTION_SLOT: InjectionKey<DialogDescriptionSlots> = Symbol("DialogDescriptionSlot")

// The phone layout of the Dialog style sheet (its rules for the Sheet's bar use the same query). A dialog's content
// mounts on the client only (its portal waits for the document), so it reads the layout as it mounts, with nothing to
// swap after it.
const PHONE_LAYOUT = "(width <= 767px)"
const phoneLayout = () => (typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(PHONE_LAYOUT) : null)
const usePhoneLayout = (): Readonly<Ref<boolean>> => {
  // Inside a PhoneLayout, or a dialog with `layout="phone"`, at any window width
  const scope = inject(PHONE_LAYOUT_SCOPE, null)
  const query = phoneLayout()
  const narrow = ref(query?.matches ?? false)
  const phone = computed(() => !!scope?.phone.value || narrow.value)
  const update = () => { narrow.value = !!query?.matches }
  if (!query) return phone
  // Safari before 14 has only the older listener methods
  if (typeof query.addEventListener !== "function") {
    query.addListener(update)
    onBeforeUnmount(() => query.removeListener(update))
  } else {
    query.addEventListener("change", update)
    onBeforeUnmount(() => query.removeEventListener("change", update))
  }
  return phone
}

// Vue port of packages/ui/src/components/Dialog/Dialog.tsx on Reka UI
// (the Vue lineage of Radix, same anatomy). Exports are flat (`Dialog`,
// `DialogTrigger`, ...) because runtime-compiled templates cannot resolve
// `Dialog.Trigger` from the `components` option.
//
// Where Reka differs from Radix (radix-ui 1.8), the port follows Radix:
// - The content is labelled and described only while a DialogTitle /
//   DialogDescription is mounted.
// - A press outside (the overlay) closes it on the click that follows
//   (../Popover/deferredPointerDownOutside.ts); the overlay is a dismiss
//   surface.
// - The portal renders once mounted, so a closed dialog server-renders
//   nothing.

type DialogContextValue = {
  open: ComputedRef<boolean>
  setOpen: (nextState: boolean) => void
  /** Mounted DialogTitle / DialogDescription parts (Radix's title and description counts) */
  titleCount: Ref<number>
  descriptionCount: Ref<number>
  /** Retain the native modal owner until its animated subtree actually unmounts. */
  mountedSurfaces: Ref<number>
}

const DialogContextKey: InjectionKey<DialogContextValue> = Symbol("PlexUIDialog")

const useDialogContext = () => {
  const context = inject(DialogContextKey, null)

  if (!context) {
    throw new Error("Dialog compound components must be used inside <Dialog>")
  }

  return context
}

/** Modal dialog root. Uncontrolled by default; bind `v-model:open` to control it. */
export const Dialog = defineComponent({
  name: "Dialog",
  props: {
    open: { type: Boolean, default: undefined },
  },
  emits: {
    "update:open": (open: boolean) => typeof open === "boolean",
  },
  setup(props, { slots, emit }) {
    const internalOpen = ref(false)
    const isOpen = computed(() => props.open ?? internalOpen.value)
    const mountedSurfaces = ref(0)
    const nativeOpen = computed(() => isOpen.value || mountedSurfaces.value > 0)

    const setOpen = (nextState: boolean) => {
      emit("update:open", nextState)
      internalOpen.value = nextState
    }

    provide(DialogContextKey, { open: isOpen, setOpen, titleCount: ref(0), descriptionCount: ref(0), mountedSurfaces })

    return () =>
      h(RekaDialogRoot, { "open": nativeOpen.value, "onUpdate:open": setOpen }, { default: () => slots.default?.() })
  },
})

// Trigger and Close render their child with the dialog wiring merged in,
// like Reka's `asChild` parts, but run the dialog action after the child's
// own click handlers and skip it when one called preventDefault() (Radix's
// composeEventHandlers). Reka's parts run first and cannot be cancelled.
// Attributes the child sets itself win, as with Radix and Reka slots. The
// child is the first element, also through a forwarded `<slot />`.
const withDialogProps = (
  child: VNode | undefined,
  props: Record<string, unknown>,
  onClick: (event: Event) => void,
  ref?: (el: unknown) => void,
) => {
  if (!child) return null
  const own = child.props ?? {}
  const extra = Object.fromEntries(Object.entries(props).filter(([key]) => !(key in own)))
  return cloneVNode(child, { ...extra, onClick, ...(ref ? { ref } : {}) }, true)
}

export const DialogTrigger = defineComponent({
  name: "DialogTrigger",
  setup(_props, { slots }) {
    const rootContext = injectDialogRootContext()
    const { open, setOpen } = useDialogContext()
    const { forwardRef, currentElement } = useForwardExpose()
    rootContext.contentId ||= useId(undefined, "reka-dialog-content")
    // Focus returns here when the dialog closes
    onMounted(() => {
      rootContext.triggerElement.value = currentElement.value
    })

    const onClick = (event: Event) => {
      if (!event.defaultPrevented) setOpen(!open.value)
    }

    return () => {
      const isOpen = open.value
      return withDialogProps(
        firstElementChild(slots.default?.()),
        {
          "type": "button",
          "aria-haspopup": "dialog",
          "aria-expanded": isOpen || false,
          "aria-controls": isOpen ? rootContext.contentId : undefined,
          "data-state": isOpen ? "open" : "closed",
        },
        onClick,
        forwardRef as (el: unknown) => void,
      )
    }
  },
})

// Reka 2.11's force-mounted Dialog releases hideOthers when its `present`
// becomes false, then calls the same non-idempotent cleanup again on unmount.
// Keep its public Root open until this transition-owned subtree unmounts.
// The logical open state still drives Plex triggers, events and exit rendering.
const DialogSurface = defineComponent({
  name: "DialogSurface",
  setup(_props, { slots }) {
    const { mountedSurfaces } = useDialogContext()
    onMounted(() => { mountedSurfaces.value++ })
    // Descendant Reka cleanup runs first; never send it present=false while alive.
    onUnmounted(() => { mountedSurfaces.value-- })
    return () => h("div", slots.default?.())
  },
})

/** Overlay and panel. `class` lands on the panel, like `className` in React. */
const TOP_TOOLBAR = '[data-toolbar][data-placement="top"]'
const BOTTOM_TOOLBAR = '[data-toolbar][data-placement="bottom"]'

export const DialogContent = defineComponent({
  name: "DialogContent",
  inheritAttrs: false,
  props: {
    /** Panel width; numbers are pixels. @default 480 */
    width: { type: [Number, String] as PropType<number | string>, default: 480 },
    /** Renders the close button in the top corner. @default true */
    showClose: { type: Boolean, default: true },
    /**
     * Rounder panel and a round close button, for dialogs that sit beside pill controls.
     * @default false
     */
    pill: { type: Boolean, default: false },
    /**
     * Where the panel sits: centered, near the top, a sheet along the bottom,
     * a full-height panel on the start or end side, or the whole screen.
     * @default "center"
     */
    placement: { type: String as PropType<DialogPlacement>, default: "center" },
    /** Placement at 767px and below, such as a bottom sheet on phones. @default placement */
    mobilePlacement: String as PropType<Extract<DialogPlacement, "center" | "bottom" | "fullscreen">>,
    /** Mobile presentation at 767px and below. Sheets default to bottom placement. */
    mobileVariant: String as PropType<"alert" | "sheet">,
    /** Mobile panel palette; dark mode uses elevated surfaces. @default "plain" */
    surface: { type: String as PropType<"plain" | "grouped">, default: "plain" },
    /** Called when focus moves into the dialog on open; `event.preventDefault()` keeps it for you to place. */
    onOpenAutoFocus: Function as PropType<(event: Event) => void>,
    /** Called when focus returns on close; `event.preventDefault()` keeps it elsewhere. */
    onCloseAutoFocus: Function as PropType<(event: Event) => void>,
    /**
     * Called on Escape before the dialog closes; `event.preventDefault()` keeps it open, such as for a form with
     * unsaved changes.
     */
    onEscapeKeyDown: Function as PropType<(event: KeyboardEvent) => void>,
    /**
     * Called on a press or a focus outside the dialog before it closes; `event.preventDefault()` keeps it open, such
     * as for a press on a developer panel over the page.
     */
    onInteractOutside: Function as PropType<(event: DialogInteractOutsideEvent) => void>,
    /** Stack order of the overlay and the dialog. @default 50 */
    zIndex: Number,
    /** Class, style and data attributes for the fixed layer that holds the panel. Data attributes of DialogContent land here too. */
    rootProps: Object as PropType<DialogLayerProps>,
    /** Class, style and data attributes for the overlay. */
    overlayProps: Object as PropType<DialogLayerProps>,
    /** `phone` lays the dialog out as on a phone at any window width. Inside a PhoneLayout it always is. @default "auto" */
    layout: { type: String as PropType<"auto" | "phone">, default: "auto" },
  },
  setup(props, { slots, attrs }) {
    const { open, setOpen, titleCount, descriptionCount } = useDialogContext()
    const outerPhoneLayout = inject(PHONE_LAYOUT_SCOPE, null)
    // A dialog laid out as on a phone by its own prop, outside a PhoneLayout, keeps the window: what it holds and
    // the dialogs it opens are phone ones too, for as long as the prop says so.
    const phoneLayout = computed(() => !!outerPhoneLayout?.phone.value || props.layout === "phone")
    const portalTarget = computed(() => outerPhoneLayout?.container.value ?? null)
    provide(PHONE_LAYOUT_SCOPE, { container: outerPhoneLayout?.container ?? shallowRef(null), phone: phoneLayout } satisfies PhoneLayoutValue)
    const scroll: DialogScroll = { scrolled: ref(false), contentBelow: ref(false) }
    provide(DIALOG_SCROLL, scroll)
    provide(TOOLBAR_HOST, { kind: "dialog", scrolled: scroll.scrolled, contentBelow: scroll.contentBelow })
    provide(DIALOG_SHEET, computed(() => (props.mobileVariant === "sheet" ? { showClose: props.showClose } : null)))
    // A dialog opened from a header action is not inside that header's bar
    provide(DIALOG_BAR, computed(() => false))
    provide(DIALOG_DESCRIPTION_SLOT, { body: shallowRef<HTMLElement | null>(null), own: shallowRef<HTMLElement | null>(null) })
    const mobilePlacement = computed(() =>
      props.mobileVariant === "alert"
        ? "center"
        : props.mobilePlacement ?? (props.mobileVariant === "sheet" ? "bottom" : undefined),
    )
    const rootContext = injectDialogRootContext()
    // Radix's root makes the content id; Reka's trigger does, so a dialog
    // without one would render `id=""`
    rootContext.contentId ||= useId(undefined, "reka-dialog-content")
    // Reka replaces the root's content ref as it mounts, so the layer is found from the panel once it is in place
    const panelNode = shallowRef<HTMLElement | null>(null)
    let stopViewport: (() => void) | undefined
    watch(
      [panelNode, portalTarget],
      ([panel, box]) => {
        stopViewport?.()
        const content = panel?.closest<HTMLElement>("[data-plex-dialog]")
        stopViewport = content ? watchDialogViewport(content, box) : undefined
      },
      { flush: "post", immediate: true },
    )
    onBeforeUnmount(() => stopViewport?.())

    const handleCloseAutoFocus = (rekaEvent: Event) => {
      // Reka announces unmount before descendant scopes release their traps.
      // Match Radix (and our Menu adapter): dispatch the cancellable callback
      // on the detached content, so custom focus restoration is not trapped.
      rekaEvent.preventDefault()
      const container = rekaEvent.target instanceof HTMLElement ? rekaEvent.target : rootContext.contentElement.value
      const trigger = rootContext.triggerElement.value
      setTimeout(() => {
        const event = new CustomEvent(rekaEvent.type, { bubbles: false, cancelable: true })
        const restoreFocus = (closeEvent: Event) => {
          props.onCloseAutoFocus?.(closeEvent)
          keepMovedFocus(closeEvent)
          if (!closeEvent.defaultPrevented) trigger?.focus()
        }
        if (!container) return restoreFocus(event)
        container.addEventListener(event.type, restoreFocus)
        container.dispatchEvent(event)
        container.removeEventListener(event.type, restoreFocus)
      }, 0)
    }

    // Escape goes through the shared stack, as in React, so the dialog
    // closes before overlays opened earlier (a forced-open Tooltip)
    useEscCloseStack(open, (event) => {
      if (props.onEscapeKeyDown) {
        const request = cancelableKeyCopy(event)
        props.onEscapeKeyDown(request)
        if (request.defaultPrevented) return
      }
      setOpen(false)
    })

    // The second click of a double click lands on the overlay: it must not undo the first
    let openedAt = 0

    // The owner's handler comes first; a prevented interaction keeps the dialog open
    const ownerKeepsOpen = (event: DialogInteractOutsideEvent) => {
      props.onInteractOutside?.(event)
      return event.defaultPrevented
    }
    // Radix's modal content: a Ctrl+click (macOS right click) does not dismiss. A deferred press asks the owner when
    // the click completes it, as Radix does, so a form that changed meanwhile can still forbid closing.
    const outsidePress = useDeferredPointerDownOutside((originalEvent) => {
      const request = new CustomEvent("dismissableLayer.pointerDownOutside", { cancelable: true, detail: { originalEvent } })
      if (ownerKeepsOpen(request)) return
      if (!originalEvent.ctrlKey && performance.now() - openedAt >= DOUBLE_CLICK) setOpen(false)
    }, () => rootContext.contentElement.value)
    const handlePointerDownOutside = (event: Parameters<typeof outsidePress.onPointerDownOutside>[0]) => {
      // The native modal owner outlives logical open. An exiting layer must not
      // start a deferred dismissal that closes a trigger-driven reopen.
      if (!open.value) return event.preventDefault()
      // A press in a toast is not outside: the toast region is a layer above the dialog. The Toaster stops it
      // before Reka sees it; this holds when the Toaster mounted after the dialog.
      if (inToastRegion(event.detail.originalEvent.target)) return event.preventDefault()
      // A primary mouse or pen press waits for its click; a touch or another button dismisses now, as Reka does
      const { originalEvent } = event.detail
      if (originalEvent.button === 0 && originalEvent.pointerType !== "touch") return outsidePress.onPointerDownOutside(event)
      if (!ownerKeepsOpen(event as DialogInteractOutsideEvent)) outsidePress.onPointerDownOutside(event)
    }
    // Focus moving out while a press waits for its click is that press, as on Radix: the owner hears of it once
    const handleFocusOutside = (event: Parameters<typeof outsidePress.onFocusOutside>[0]) => {
      if (inToastRegion((event as DialogInteractOutsideEvent).detail?.originalEvent.target)) return event.preventDefault()
      outsidePress.onFocusOutside(event)
      if (!event.defaultPrevented) props.onInteractOutside?.(event as DialogInteractOutsideEvent)
    }
    const handleInteractOutside = (event: Event) => {
      if (!open.value) event.preventDefault()
    }
    watch(
      open,
      (isOpen) => {
        if (isOpen) openedAt = performance.now()
        else outsidePress.reset()
      },
      { immediate: true },
    )

    const boundary = provideFloatingBoundaryScope()
    let panelElement: HTMLElement | undefined
    let detachDrag: (() => void) | undefined
    let barObserver: ResizeObserver | undefined
    let barChildren: MutationObserver | undefined
    const setPanelRef = (instance: unknown) => {
      const element = instance instanceof HTMLElement ? instance : undefined
      if (element === panelElement) return
      detachDrag?.()
      barObserver?.disconnect()
      barChildren?.disconnect()
      detachDrag = undefined
      panelElement = element
      panelNode.value = element ?? null
      boundary.setRoot(element)
      if (element) {
        const update = () => {
          // A phone Toolbar takes the place of the header or footer bar on its side.
          // A phone Toolbar takes the place of the header or footer bar on its side: one the dialog places itself
          // before the bar its header becomes.
          const header = element.querySelector<HTMLElement>(`:scope > ${TOP_TOOLBAR}:not([data-dialog-bar])`)
            ?? element.querySelector<HTMLElement>(`:scope > ${TOP_TOOLBAR}`)
            ?? element.querySelector<HTMLElement>(`:scope > .${s.Header}`)
          const footer = element.querySelector<HTMLElement>(`:scope > ${BOTTOM_TOOLBAR}`) ?? element.querySelector<HTMLElement>(`:scope > .${s.Footer}`)
          element.style.setProperty("--dialog-header-height", `${header?.offsetHeight ?? 0}px`)
          element.style.setProperty("--dialog-footer-height", `${footer?.offsetHeight ?? 0}px`)
        }
        barObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : undefined
        const observeBars = () => {
          barObserver?.disconnect()
          element.querySelectorAll<HTMLElement>(`:scope > .${s.Header}, :scope > .${s.Footer}, :scope > [data-toolbar]`)
            .forEach((bar) => barObserver?.observe(bar, { box: "border-box" }))
          update()
        }
        observeBars()
        barChildren = new MutationObserver(observeBars)
        barChildren.observe(element, { childList: true })
      }
      if (element && mobilePlacement.value === "bottom") {
        detachDrag = attachSheetDrag(element, () => setOpen(false))
      }
    }

    watch(mobilePlacement, () => {
      detachDrag?.()
      detachDrag = panelElement && mobilePlacement.value === "bottom"
        ? attachSheetDrag(panelElement, () => setOpen(false))
        : undefined
    })
    onBeforeUnmount(() => { detachDrag?.(); barObserver?.disconnect(); barChildren?.disconnect() })

    let overlayElement: Element | undefined
    const setOverlayRef = (instance: unknown) => {
      const el = (instance as { $el?: unknown } | null)?.$el
      const element = el instanceof Element ? el : undefined
      if (element === overlayElement) return
      if (overlayElement) dismissableSurfaces.delete(overlayElement)
      overlayElement = element
      if (element) dismissableSurfaces.add(element)
    }

    const renderDialog = () =>
      h(DialogSurface, { key: "dialog" }, () => [
        h(RekaDialogOverlay, {
          ...props.overlayProps,
          class: [s.Overlay, props.overlayProps?.class],
          style: [layerStyle(), props.overlayProps?.style],
          forceMount: true,
          ref: setOverlayRef,
          "data-state": open.value ? "open" : "closed",
        }),
        h(
          RekaDialogContent,
          {
            ...dataAttributes(attrs),
            ...props.rootProps,
            "forceMount": true,
            "class": [s.Content, props.rootProps?.class],
            "data-plex-dialog": "",
            "style": [toCssVariables({ "dialog-width": props.width }), layerStyle(), props.rootProps?.style],
            "data-placement": props.placement === "center" ? undefined : props.placement,
            "data-mobile-placement": mobilePlacement.value,
            "data-mobile-variant": props.mobileVariant,
            "data-surface": props.surface,
            "data-state": open.value ? "open" : "closed",
            "data-pill": props.pill ? "" : undefined,
            "onOpenAutoFocus": props.onOpenAutoFocus,
            "onCloseAutoFocus": handleCloseAutoFocus,
            // Radix labels and describes the content only by mounted parts
            ...(titleCount.value > 0 ? {} : { "aria-labelledby": undefined }),
            ...(descriptionCount.value > 0 ? {} : { "aria-describedby": undefined }),
            "onEscapeKeyDown": preventDefaultHandler,
            "onPointerDownOutside": handlePointerDownOutside,
            "onFocusOutside": handleFocusOutside,
            "onInteractOutside": handleInteractOutside,
          },
          {
            default: () => [
              // The native Content is the sole focus owner while open, so it
              // keeps tracking replacement inputs. Activate this non-trapping
              // scope only during logical exit to pause the retained modal owner.
              // A second live trap would leave the paused native scope tracking
              // removed inputs; its mutation fallback could then select current text.
              h(RekaFocusScope, {
                asChild: true,
                present: !open.value,
                loop: false,
                trapped: false,
                onMountAutoFocus: preventDefaultHandler,
                onUnmountAutoFocus: preventDefaultHandler,
              }, () => h("div", { class: [s.Panel, attrs.class], ref: setPanelRef }, [
                props.showClose
                  ? h(DialogClose, null, {
                      default: () => [
                        h(NavigationButton, { "action": "close", "variant": "ghost", "class": s.CloseButton, "aria-label": "Close dialog" }),
                      ],
                    })
                  : null,
                slots.default?.(),
              ])),
            ],
          },
        ),
      ])

    const layerStyle = () => toCssVariables({ "dialog-z-index": props.zIndex === undefined ? undefined : String(props.zIndex) })

    return () => {
      const { placement } = props
      const crossesScreen =
        placement === "bottom" || placement === "start" || placement === "end" || placement === "fullscreen" || mobilePlacement.value === "bottom" || mobilePlacement.value === "fullscreen"
      // Portaled out of any phone layout, a phone dialog carries its own scope, above its transition: the phone rules
      // of the style sheet start there.
      const scoped = (group: VNode) =>
        phoneLayout.value && !portalTarget.value ? h("div", { class: s.PhoneScope, "data-plex-layout": "phone" }, [group]) : group
      return h(RekaDialogPortal, { to: portalTarget.value ?? undefined }, {
        default: () => [
          scoped(h(
            TransitionGroup,
            // A dialog mounted open enters too, as `v-if` and `open` together do
            {
              class: s.Transition,
              ...(crossesScreen ? overlayTimingLarge : overlayTiming),
              overlay: true,
              preventInitialTransition: false,
            },
            // `open && <div>` in React: closed still renders the empty wrapper
            { default: () => [open.value ? renderDialog() : createCommentVNode()] },
          )),
        ],
      })
    }
  },
})

/** How a Sheet's bar meets the content scrolled under it; see `BarBackground`. */
export type DialogBarBackground = BarBackground

// The header's own parts, fragments opened up, so its actions can stand at the end of the bar
const headerParts = (children: VNodeArrayChildren | undefined): VNodeArrayChildren =>
  (children ?? []).flatMap((part) =>
    isVNode(part) && part.type === FragmentVNode ? headerParts(part.children as VNodeArrayChildren) : Array.isArray(part) ? headerParts(part) : [part])
const isHeaderAction = (part: unknown) => isVNode(part) && part.type === DialogHeaderAction
const isDescription = (part: unknown) => isVNode(part) && part.type === DialogDescription

// The parts it holds stand outside the header's bar, as React's descriptions stand outside the bar's provider
const OutsideBar = defineComponent({
  name: "DialogOutsideBar",
  setup(_props, { slots }) {
    provide(DIALOG_BAR, computed(() => false))
    return () => slots.default?.()
  },
})

export const DialogHeader = defineComponent({
  name: "DialogHeader",
  // A phone Sheet's header is the bar and the description under it: its attributes go to the bar
  inheritAttrs: false,
  props: {
    /** How the bar meets the content scrolled under it in a phone Sheet. @default "glass" */
    background: { type: String as PropType<DialogBarBackground>, default: "glass" },
  },
  setup(props, { slots, attrs }) {
    const scroll = inject(DIALOG_SCROLL, null)
    const sheet = inject(DIALOG_SHEET, null)
    const descriptionSlot = inject(DIALOG_DESCRIPTION_SLOT, null)
    const phone = usePhoneLayout()
    const bar = computed(() => !!sheet?.value && phone.value)
    provide(DIALOG_BAR, bar)
    return () => {
      if (!bar.value) return h("div", mergeProps({ "class": s.Header, "data-background": props.background, "data-scrolled": scroll?.scrolled.value ? "" : undefined }, attrs), slots.default?.())
      const parts = headerParts(slots.default?.())
      const descriptions = parts.filter(isDescription)
      const slot = descriptionSlot ? descriptionSlot.own.value ?? descriptionSlot.body.value : null
      // On a phone the header of a Sheet is its Toolbar (iOS 27 kit Sheets 507-24684, Toolbar - Top - iPhone
      // 1-54520): Close at the leading edge, the title alone centered on the row of controls, the header actions
      // at the trailing edge, all on one 44px row under the grabber.
      return [
        h(Toolbar, mergeProps({ "background": props.background, "data-dialog-bar": "" }, attrs), () => [
          sheet?.value?.showClose
            ? h(ToolbarLeading, { class: s.BarClose }, () => [
                h(DialogClose, null, { default: () => [h(NavigationButton, { "action": "close", "variant": "ghost", "aria-label": "Close dialog" })] }),
              ])
            : null,
          h("div", { class: [t.Heading, s.BarHeading] }, parts.filter((part) => !isHeaderAction(part) && !isDescription(part))),
          ...parts.filter(isHeaderAction),
        ]),
        // The description reads as the first text of the content, at the top of DialogBody when there is one
        descriptions.length > 0
          ? h(Teleport, { to: slot, disabled: !slot }, [h("div", { class: s.SheetDescription }, [h(OutsideBar, null, () => descriptions)])])
          : null,
      ]
    }
  },
})

export const DialogHeaderAction = defineComponent({
  name: "DialogHeaderAction",
  setup(_props, { slots }) {
    const bar = inject(DIALOG_BAR, null)
    return () => (bar?.value ? h(ToolbarTrailing, null, () => slots.default?.()) : h("div", { class: s.HeaderAction }, slots.default?.()))
  },
})

/** The scrolling part between DialogHeader and DialogFooter: with it, only the body scrolls. */
export const DialogBody = defineComponent({
  name: "DialogBody",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const scroll = inject(DIALOG_SCROLL, null)
    const sheet = inject(DIALOG_SHEET, null)
    const descriptionSlot = inject(DIALOG_DESCRIPTION_SLOT, null)
    const phone = usePhoneLayout()
    const setDescriptionSlot = (slot: unknown) => {
      if (descriptionSlot) descriptionSlot.body.value = slot instanceof HTMLElement ? slot : null
    }
    const element = ref<HTMLElement | null>(null)
    let stop: (() => void) | undefined
    onMounted(() => {
      if (!element.value || !scroll) return
      stop = observeScrollEdges(element.value, (edges) => {
        scroll.scrolled.value = edges.scrolled
        scroll.contentBelow.value = edges.contentBelow
      })
    })
    onBeforeUnmount(() => {
      stop?.()
      if (scroll) { scroll.scrolled.value = false; scroll.contentBelow.value = false }
    })
    return () => h("div", { ref: element, class: [s.Body, attrs.class] }, [
      sheet?.value && phone.value ? h("div", { ref: setDescriptionSlot, class: s.SheetDescriptionSlot }) : null,
      slots.default?.(),
    ])
  },
})

/**
 * Where a phone Sheet's description goes in content of your own, such as a scroller inside a form so that Enter
 * submits: the description starts it, as it starts DialogBody, and it comes before the body's place. It renders
 * nothing outside a phone Sheet.
 */
export const DialogDescriptionSlot = defineComponent({
  name: "DialogDescriptionSlot",
  setup() {
    const sheet = inject(DIALOG_SHEET, null)
    const descriptionSlot = inject(DIALOG_DESCRIPTION_SLOT, null)
    const phone = usePhoneLayout()
    const setOwnSlot = (slot: unknown) => {
      if (descriptionSlot) descriptionSlot.own.value = slot instanceof HTMLElement ? slot : null
    }
    return () => (sheet?.value && phone.value ? h("div", { ref: setOwnSlot, class: s.SheetDescriptionSlot }) : null)
  },
})

export const DialogFooter = defineComponent({
  name: "DialogFooter",
  props: {
    /** Override the mobile action layout. Alerts default to inline; sheets to stacked. */
    mobileLayout: String as PropType<"inline" | "stacked">,
    /** How the bar meets the content scrolled under it in a phone Sheet. @default "soft" */
    background: { type: String as PropType<DialogBarBackground>, default: "soft" },
  },
  setup(props, { slots }) {
    const boundary = useFloatingBoundaryRegistration()
    const scroll = inject(DIALOG_SCROLL, null)
    return () => h("div", {
      "ref": boundary?.setFooter,
      "class": s.Footer,
      "data-mobile-layout": props.mobileLayout,
      "data-background": props.background,
      "data-content-below": scroll?.contentBelow.value ? "" : undefined,
    }, slots.default?.())
  },
})

/** Counts a mounted part, as Radix's title and description counts do. */
const useMountedCount = (count: Ref<number>) => {
  onMounted(() => {
    count.value++
  })
  onBeforeUnmount(() => {
    count.value--
  })
}

export const DialogTitle = defineComponent({
  name: "DialogTitle",
  setup(_props, { slots }) {
    useMountedCount(useDialogContext().titleCount)
    const bar = inject(DIALOG_BAR, null)
    return () => h(RekaDialogTitle, { class: bar?.value ? t.Title : s.Title }, { default: () => slots.default?.() })
  },
})

export const DialogDescription = defineComponent({
  name: "DialogDescription",
  setup(_props, { slots }) {
    useMountedCount(useDialogContext().descriptionCount)
    const bar = inject(DIALOG_BAR, null)
    const element = ref<{ $el?: Element } | Element | null>(null)
    const shown = ref(false)
    // The header leaves its own descriptions out of the bar. One the bar still holds, inside a part of the
    // header's own, is the title's second line (Toolbar's subtitle) when the reader sees it; one that is only
    // read out, visually hidden, leaves the title on its one line.
    const measure = () => {
      const node = element.value instanceof Element ? element.value : element.value?.$el
      shown.value = !!bar?.value && node instanceof HTMLElement && node.offsetHeight > 1 && node.offsetWidth > 1
    }
    onMounted(measure)
    watch(() => bar?.value, () => queueMicrotask(measure))
    return () => h(RekaDialogDescription, { ref: element, class: bar?.value && shown.value ? t.Subtitle : s.Description }, { default: () => slots.default?.() })
  },
})

export const DialogClose = defineComponent({
  name: "DialogClose",
  setup(_props, { slots }) {
    const rootContext = injectDialogRootContext()
    const onClick = (event: Event) => {
      if (!event.defaultPrevented) rootContext.onOpenChange(false)
    }
    return () => withDialogProps(firstElementChild(slots.default?.()), { type: "button" }, onClick)
  },
})

/** The steps of a flow inside a dialog, such as a sign-in that asks for an email and then a code. */
export const DialogSteps = defineComponent({
  name: "DialogSteps",
  props: {
    /** The step on screen. A new value brings its content in. */
    step: { type: [String, Number] as PropType<string | number>, required: true },
    /**
     * `forward` brings the new step in from the trailing edge over the one before, as a push on iOS; `back` returns
     * to a step before it.
     * @default "forward"
     */
    direction: { type: String as PropType<"forward" | "back">, default: "forward" },
  },
  setup(props, { slots }) {
    return () => {
      // Resolve this step now, so a step that leaves cannot read the next one
      const entry = h("div", { "key": props.step, "data-dialog-step": "", "tabindex": -1 }, slots.default?.())
      return h("div", { "class": s.Steps, "data-direction": props.direction }, [
        h(TransitionGroup, {
          ...STEP_TIMING,
          as: "div",
          overlay: true,
          class: s.Step,
          onEnter: enterStep,
          onExit: leaveStep,
          onExitActive: settleStepHeight,
          onExitComplete: releaseStepHeight,
        }, () => [entry]),
      ])
    }
  },
})

export type DialogProps = InstanceType<typeof Dialog>["$props"]

export type DialogPlacement = "center" | "top" | "bottom" | "start" | "end" | "fullscreen"

/** A press or a focus outside the dialog; `event.detail.originalEvent` is the browser's event. */
export type DialogInteractOutsideEvent = CustomEvent<{ originalEvent: PointerEvent | FocusEvent }>

/** Class, style and data attributes for one of the dialog's layers. */
export type DialogLayerProps = {
  class?: HTMLAttributes["class"]
  style?: string | CSSProperties
  [dataAttribute: `data-${string}`]: string | number | boolean | undefined
}

/** DialogContent props; `class` lands on the panel, like `className` in React. */
export type DialogContentProps = InstanceType<typeof DialogContent>["$props"] & { class?: HTMLAttributes["class"] }

export type DialogHeaderProps = InstanceType<typeof DialogHeader>["$props"]
export type DialogFooterProps = InstanceType<typeof DialogFooter>["$props"]
export type DialogStepsProps = InstanceType<typeof DialogSteps>["$props"]
