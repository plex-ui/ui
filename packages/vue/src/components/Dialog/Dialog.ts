import {
  Comment,
  cloneVNode,
  computed,
  createCommentVNode,
  defineComponent,
  h,
  inject,
  onMounted,
  provide,
  ref,
  type ComputedRef,
  type InjectionKey,
  type PropType,
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
import { toCssVariables } from "../../lib/helpers.js"
import { TransitionGroup } from "../Transition/index.js"
import s from "@plexui/styles/components/Dialog/Dialog.module.css"

// Vue port of packages/ui/src/components/Dialog/Dialog.tsx on Reka UI
// (the Vue lineage of Radix, same anatomy). Exports are flat (`Dialog`,
// `DialogTrigger`, ...) because runtime-compiled templates cannot resolve
// `Dialog.Trigger` from the `components` option.

type DialogContextValue = {
  open: ComputedRef<boolean>
  setOpen: (nextState: boolean) => void
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

    provide(DialogContextKey, { open: isOpen, setOpen })

    return () =>
      h(RekaDialogRoot, { "open": isOpen.value, "onUpdate:open": setOpen }, { default: () => slots.default?.() })
  },
})

// Trigger and Close render their child with the dialog wiring merged in,
// like Reka's `asChild` parts, but run the dialog action after the child's
// own click handlers and skip it when one called preventDefault() (Radix's
// composeEventHandlers). Reka's parts run first and cannot be cancelled.
// Attributes the child sets itself win, as with Radix and Reka slots.
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

const firstChild = (nodes: VNode[] | undefined) => nodes?.find((node) => node.type !== Comment)

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
        firstChild(slots.default?.()),
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
  },
  setup(props, { slots, attrs }) {
    const { open } = useDialogContext()

    // Reka's dismissable layer stacks Escape across nested layers, which
    // React gets from useEscCloseStack, so Escape is left to Reka here.
    const renderDialog = () =>
      h("div", { key: "dialog" }, [
        h(RekaDialogOverlay, { class: s.Overlay }),
        h(
          RekaDialogContent,
          {
            forceMount: true,
            class: s.Content,
            style: toCssVariables({ "dialog-width": props.width }),
          },
          {
            default: () => [
              h("div", { class: [s.Panel, attrs.class] }, [
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

    return () =>
      h(RekaDialogPortal, { forceMount: true }, {
        default: () => [
          h(
            TransitionGroup,
            { class: s.Transition, enterDuration: 250, exitDuration: 150, disableAnimations: true },
            // `open && <div>` in React: closed still renders the empty wrapper
            { default: () => [open.value ? renderDialog() : createCommentVNode()] },
          ),
        ],
      })
  },
})

export const DialogHeader = defineComponent({
  name: "DialogHeader",
  setup(_props, { slots }) {
    return () => h("div", { class: s.Header }, slots.default?.())
  },
})

export const DialogFooter = defineComponent({
  name: "DialogFooter",
  setup(_props, { slots }) {
    return () => h("div", { class: s.Footer }, slots.default?.())
  },
})

export const DialogTitle = defineComponent({
  name: "DialogTitle",
  setup(_props, { slots }) {
    return () => h(RekaDialogTitle, { class: s.Title }, { default: () => slots.default?.() })
  },
})

export const DialogDescription = defineComponent({
  name: "DialogDescription",
  setup(_props, { slots }) {
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
    return () => withDialogProps(firstChild(slots.default?.()), { type: "button" }, onClick)
  },
})
