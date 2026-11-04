import {
  cloneVNode,
  computed,
  createCommentVNode,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
  type ComputedRef,
  type HTMLAttributes,
  type InjectionKey,
  type PropType,
  type Ref,
  type VNode,
} from "vue"
import {
  DialogContent as RekaDialogContent,
  DialogDescription as RekaDialogDescription,
  DialogOverlay as RekaDialogOverlay,
  DialogPortal as RekaDialogPortal,
  DialogRoot as RekaDialogRoot,
  DialogTitle as RekaDialogTitle,
  injectDialogRootContext,
  useForwardExpose,
  useId,
} from "reka-ui"
import { useEscCloseStack } from "../../composables/useEscCloseStack.js"
import { keepMovedFocus, preventDefaultHandler, toCssVariables } from "../../lib/helpers.js"
import { dismissableSurfaces, useDeferredPointerDownOutside } from "../Popover/deferredPointerDownOutside.js"
import { firstElementChild } from "../Tooltip/slot.js"
import { TransitionGroup } from "../Transition/index.js"
import { attachSheetDrag } from "./sheetDrag.js"
import { overlayTiming, overlayTimingLarge } from "../Transition/shared.js"
import s from "@plexui/styles/components/Dialog/Dialog.module.css"

const DOUBLE_CLICK = 300

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
    "update:open": (_open: boolean) => true,
  },
  setup(props, { slots, emit }) {
    const internalOpen = ref(false)
    const isOpen = computed(() => props.open ?? internalOpen.value)

    const setOpen = (nextState: boolean) => {
      emit("update:open", nextState)
      internalOpen.value = nextState
    }

    provide(DialogContextKey, { open: isOpen, setOpen, titleCount: ref(0), descriptionCount: ref(0) })

    return () =>
      h(RekaDialogRoot, { "open": isOpen.value, "onUpdate:open": setOpen }, { default: () => slots.default?.() })
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
    const { forwardRef, currentElement } = useForwardExpose()
    rootContext.contentId ||= useId(undefined, "reka-dialog-content")
    // Focus returns here when the dialog closes
    onMounted(() => {
      rootContext.triggerElement.value = currentElement.value
    })

    const onClick = (event: Event) => {
      if (!event.defaultPrevented) rootContext.onOpenToggle()
    }

    return () => {
      const open = rootContext.open.value
      return withDialogProps(
        firstElementChild(slots.default?.()),
        {
          "type": "button",
          "aria-haspopup": "dialog",
          "aria-expanded": open || false,
          "aria-controls": open ? rootContext.contentId : undefined,
          "data-state": open ? "open" : "closed",
        },
        onClick,
        forwardRef as (el: unknown) => void,
      )
    }
  },
})

const CloseIcon = () =>
  h("svg", { "class": s.CloseIcon, "viewBox": "0 0 20 20", "width": "20", "height": "20", "aria-hidden": "true" }, [
    h("path", {
      fill: "currentColor",
      d: "M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06",
    }),
  ])

/** Overlay and panel. `class` lands on the panel, like `className` in React. */
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
    /** Placement at 640px and below, such as a bottom sheet on phones. @default placement */
    mobilePlacement: String as PropType<Extract<DialogPlacement, "center" | "bottom" | "fullscreen">>,
    /** Mobile presentation at 640px and below. Sheets default to bottom placement. */
    mobileVariant: String as PropType<"alert" | "sheet">,
    /** Called when focus moves into the dialog on open; `event.preventDefault()` keeps it for you to place. */
    onOpenAutoFocus: Function as PropType<(event: Event) => void>,
    /** Called when focus returns on close; `event.preventDefault()` keeps it elsewhere. */
    onCloseAutoFocus: Function as PropType<(event: Event) => void>,
  },
  setup(props, { slots, attrs }) {
    const { open, setOpen, titleCount, descriptionCount } = useDialogContext()
    const mobilePlacement = computed(() =>
      props.mobileVariant === "alert"
        ? "center"
        : props.mobilePlacement ?? (props.mobileVariant === "sheet" ? "bottom" : undefined),
    )
    const rootContext = injectDialogRootContext()
    // Radix's root makes the content id; Reka's trigger does, so a dialog
    // without one would render `id=""`
    rootContext.contentId ||= useId(undefined, "reka-dialog-content")

    // Force-mounted content refocuses Reka's trigger the moment it closes.
    // Focus waits for the exit, as in Radix: the trigger is held back until
    // the content unmounts, where Reka's own close auto focus uses it.
    let closingTrigger: HTMLElement | undefined
    watch(
      open,
      (isOpen) => {
        if (isOpen) {
          if (closingTrigger) rootContext.triggerElement.value = closingTrigger
          closingTrigger = undefined
        } else {
          closingTrigger = rootContext.triggerElement.value
          rootContext.triggerElement.value = undefined
        }
      },
      { flush: "sync" },
    )
    const handleCloseAutoFocus = (event: Event) => {
      props.onCloseAutoFocus?.(event)
      keepMovedFocus(event)
      if (closingTrigger) rootContext.triggerElement.value = closingTrigger
      closingTrigger = undefined
    }

    // Escape goes through the shared stack, as in React, so the dialog
    // closes before overlays opened earlier (a forced-open Tooltip)
    useEscCloseStack(open, () => {
      setOpen(false)
    })

    // The second click of a double click lands on the overlay: it must not undo the first
    let openedAt = 0

    // Radix's modal content: a Ctrl+click (macOS right click) does not dismiss
    const outsidePress = useDeferredPointerDownOutside((originalEvent) => {
      if (!originalEvent.ctrlKey && performance.now() - openedAt >= DOUBLE_CLICK) setOpen(false)
    })
    watch(
      open,
      (isOpen) => {
        if (isOpen) openedAt = performance.now()
        else outsidePress.reset()
      },
      { immediate: true },
    )

    let panelElement: HTMLElement | undefined
    let detachDrag: (() => void) | undefined
    const setPanelRef = (instance: unknown) => {
      const element = instance instanceof HTMLElement ? instance : undefined
      if (element === panelElement) return
      detachDrag?.()
      detachDrag = undefined
      panelElement = element
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
    onBeforeUnmount(() => detachDrag?.())

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
      h("div", { key: "dialog" }, [
        h(RekaDialogOverlay, { class: s.Overlay, forceMount: true, ref: setOverlayRef }),
        h(
          RekaDialogContent,
          {
            "forceMount": true,
            "class": s.Content,
            "data-plex-dialog": "",
            "style": toCssVariables({ "dialog-width": props.width }),
            "data-placement": props.placement === "center" ? undefined : props.placement,
            "data-mobile-placement": mobilePlacement.value,
            "data-mobile-variant": props.mobileVariant,
            "data-pill": props.pill ? "" : undefined,
            "onOpenAutoFocus": props.onOpenAutoFocus,
            "onCloseAutoFocus": handleCloseAutoFocus,
            // Radix labels and describes the content only by mounted parts
            ...(titleCount.value > 0 ? {} : { "aria-labelledby": undefined }),
            ...(descriptionCount.value > 0 ? {} : { "aria-describedby": undefined }),
            "onEscapeKeyDown": preventDefaultHandler,
            "onPointerDownOutside": outsidePress.onPointerDownOutside,
            "onFocusOutside": outsidePress.onFocusOutside,
          },
          {
            default: () => [
              h("div", { class: [s.Panel, attrs.class], ref: setPanelRef }, [
                props.showClose
                  ? h(DialogClose, null, {
                      default: () => [
                        h("button", { "type": "button", "class": s.CloseButton, "aria-label": "Close dialog" }, [
                          h(CloseIcon),
                        ]),
                      ],
                    })
                  : null,
                slots.default?.(),
              ]),
            ],
          },
        ),
      ])

    return () => {
      const { placement } = props
      const crossesScreen =
        placement === "bottom" || placement === "start" || placement === "end" || mobilePlacement.value === "bottom"
      return h(RekaDialogPortal, null, {
        default: () => [
          h(
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
          ),
        ],
      })
    }
  },
})

export const DialogHeader = defineComponent({
  name: "DialogHeader",
  setup(_props, { slots }) {
    return () => h("div", { class: s.Header }, slots.default?.())
  },
})

export const DialogHeaderAction = defineComponent({
  name: "DialogHeaderAction",
  setup(_props, { slots }) {
    return () => h("div", { class: s.HeaderAction }, slots.default?.())
  },
})

/** The scrolling part between DialogHeader and DialogFooter: with it, only the body scrolls. */
export const DialogBody = defineComponent({
  name: "DialogBody",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => h("div", { class: [s.Body, attrs.class] }, slots.default?.())
  },
})

export const DialogFooter = defineComponent({
  name: "DialogFooter",
  props: {
    /** Override the mobile action layout. Alerts default to inline; sheets to stacked. */
    mobileLayout: String as PropType<"inline" | "stacked">,
  },
  setup(props, { slots }) {
    return () => h("div", { class: s.Footer, "data-mobile-layout": props.mobileLayout }, slots.default?.())
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
    return () => h(RekaDialogTitle, { class: s.Title }, { default: () => slots.default?.() })
  },
})

export const DialogDescription = defineComponent({
  name: "DialogDescription",
  setup(_props, { slots }) {
    useMountedCount(useDialogContext().descriptionCount)
    return () => h(RekaDialogDescription, { class: s.Description }, { default: () => slots.default?.() })
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

export type DialogProps = InstanceType<typeof Dialog>["$props"]

export type DialogPlacement = "center" | "top" | "bottom" | "start" | "end" | "fullscreen"

/** DialogContent props; `class` lands on the panel, like `className` in React. */
export type DialogContentProps = InstanceType<typeof DialogContent>["$props"] & { class?: HTMLAttributes["class"] }
