import clsx from "clsx"
import { defineComponent, h, isVNode, mergeProps, onBeforeUnmount, onMounted, onUpdated, ref, toRaw, watch, type Component, type CSSProperties, type PropType } from "vue"
import { toast, useVueSonner, type Action, type ToastT, type ToasterProps } from "vue-sonner"
import { CheckCircle, InfoCircle, Warning, XCircle } from "../Icon/index.js"
import { documentDirection, offsetStyles, ToastLifecycle, type Position, type ToastEntry } from "./toastLifecycle.js"

type Classes = NonNullable<NonNullable<ToasterProps["toastOptions"]>["classes"]>
const fallbackIcons = { success: CheckCircle, error: XCircle, warning: Warning, info: InfoCircle }
const CloseIcon = () => h("svg", { xmlns: "http://www.w3.org/2000/svg", "aria-hidden": "true", width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.5", "stroke-linecap": "round", "stroke-linejoin": "round" }, [h("line", { x1: 18, y1: 6, x2: 6, y2: 18 }), h("line", { x1: 6, y1: 6, x2: 18, y2: 18 })])
const actionObject = (value: Action | Component | undefined): value is Action => typeof value === "object" && value !== null && "label" in value
const content = (value: unknown, componentProps?: unknown) => {
  if (value === undefined || value === null || value === false) return undefined
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (isVNode(value)) return value
  if (typeof value === "object" || typeof value === "function") return h(toRaw(value) as Component, typeof componentProps === "object" && componentProps !== null ? componentProps : {})
  return undefined
}

const ToastItem = defineComponent({
  name: "ToastItem",
  props: {
    entry: { type: Object as PropType<ToastEntry<ToastT>>, required: true },
    lifecycle: { type: Object as PropType<ToastLifecycle<ToastT>>, required: true },
    options: { type: Object as PropType<ToasterProps>, required: true },
    index: { type: Number, required: true }, count: { type: Number, required: true }, revision: Number,
  },
  setup(props, { slots }) {
    const node = ref<HTMLElement | null>(null)
    let observer: ResizeObserver | null = null
    const measure = () => {
      const element = node.value
      if (!element) return
      const height = element.style.height
      element.style.height = "auto"
      props.lifecycle.measure(props.entry.toast.id, element.offsetHeight || element.getBoundingClientRect().height)
      element.style.height = height
    }
    onMounted(() => {
      props.lifecycle.setNode(props.entry.toast.id, node.value)
      measure()
      observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
      if (node.value) { observer?.observe(node.value); for (const child of node.value.children) observer?.observe(child) }
    })
    onUpdated(measure)
    onBeforeUnmount(() => { observer?.disconnect(); props.lifecycle.setNode(props.entry.toast.id, null) })
    return () => {
      const { entry, lifecycle, options, index, count } = props
      const item = entry.toast
      const slot = (name: keyof Classes) => clsx(options.toastOptions?.classes?.[name], item.classes?.[name])
      const [y, x] = lifecycle.position(entry).split("-")
      const visible = index < (options.visibleToasts ?? 3)
      const disabled = item.dismissible === false || item.type === "loading"
      const type = item.type === "normal" || item.type === "default" ? undefined : item.type
      const icon = item.icon ?? (type && type in fallbackIcons ? options.icons?.[type as keyof typeof fallbackIcons] ?? fallbackIcons[type as keyof typeof fallbackIcons] : undefined)
      const actionButton = (kind: "action" | "cancel") => {
        const action = item[kind]
        if (!action) return null
        if (!actionObject(action)) return content(action)
        return h("button", { type: "button", "data-button": "true", [`data-${kind}`]: "true", disabled: kind === "cancel" && disabled,
          class: slot(kind === "action" ? "actionButton" : "cancelButton"),
          style: kind === "action" ? item.actionButtonStyle ?? options.toastOptions?.actionButtonStyle : item.cancelButtonStyle ?? options.toastOptions?.cancelButtonStyle,
          onClick: (event: MouseEvent) => { if (kind === "cancel" && disabled) return; action.onClick(event); if (kind === "cancel" || !event.defaultPrevented) lifecycle.close(item.id, "action") },
        }, content(action.label))
      }
      const loader = () => h("div", { class: clsx("sonner-loading-wrapper", slot("loader")), "data-visible": item.type === "loading" },
        slots["loading-icon"] ? slots["loading-icon"]() : options.icons?.loading ? h("div", { class: "sonner-loader", "data-visible": item.type === "loading" }, content(options.icons.loading)) : h("div", { class: "sonner-spinner" }, Array.from({ length: 12 }, (_, i) => h("div", { key: i, class: "sonner-loading-bar" }))))
      return h("li", {
        ref: node, tabindex: visible && !entry.removed ? 0 : -1, inert: !visible || entry.removed ? "" : undefined, "aria-hidden": !visible || entry.removed || undefined,
        class: clsx(options.toastOptions?.class, item.class, slot("toast"), slot("default"), type && slot(type as keyof Classes)),
        "data-sonner-toast": "", "data-rich-colors": item.richColors ?? options.richColors ?? undefined, "data-styled": !Boolean(item.component || item.unstyled || options.toastOptions?.unstyled),
        "data-mounted": entry.mounted, "data-promise": Boolean(item.promise), "data-swiped": Boolean(entry.x || entry.y), "data-removed": entry.removed,
        "data-visible": visible, "data-y-position": y, "data-x-position": x, "data-index": index, "data-front": index === 0, "data-swiping": entry.swiping,
        "data-dismissible": item.dismissible !== false, "data-type": type, "data-invert": item.invert || options.invert || undefined,
        "data-swipe-out": Boolean(entry.swipeOut), "data-swipe-direction": entry.swipeOut, "data-expanded": lifecycle.expanded || Boolean(options.expand && entry.mounted), "data-testid": item.testId,
        style: { "--index": index, "--toasts-before": index, "--z-index": count - index, "--offset": `${lifecycle.offset(entry)}px`, "--initial-height": options.expand ? "auto" : `${entry.height}px`, "--swipe-amount-x": `${entry.x}px`, "--swipe-amount-y": `${entry.y}px`, ...options.toastOptions?.style, ...item.style },
        onPointerdown: (event: PointerEvent) => lifecycle.pointerDown(item.id, event), onPointermove: (event: PointerEvent) => lifecycle.pointerMove(item.id, event),
        onPointerup: (event: PointerEvent) => lifecycle.pointerEnd(item.id, event), onPointercancel: (event: PointerEvent) => lifecycle.pointerEnd(item.id, event, true), onLostpointercapture: (event: PointerEvent) => lifecycle.pointerEnd(item.id, event, true),
      }, [
        (item.closeButton ?? options.toastOptions?.closeButton ?? options.closeButton) && !item.component && item.type !== "loading" ? h("button", {
          type: "button", "aria-label": options.toastOptions?.closeButtonAriaLabel ?? "Close toast", "data-disabled": disabled, disabled, "data-close-button": "true", "data-close-button-position": item.closeButtonPosition ?? options.closeButtonPosition ?? "top-left", class: slot("closeButton"),
          onClick: () => lifecycle.close(item.id, "dismiss"),
        }, options.icons?.close ? content(options.icons.close) : slots["close-icon"]?.() ?? h(CloseIcon)) : null,
        item.component ? h(toRaw(item.component), { ...item.componentProps, onCloseToast: () => { if (!disabled) lifecycle.close(item.id, "dismiss") }, isPaused: lifecycle.paused }) : [
          (type || item.icon || item.promise) && item.icon !== null ? h("div", { "data-icon": "", class: slot("icon") }, [
            item.promise || item.type === "loading" ? item.icon ? content(item.icon) : loader() : null,
            item.type !== "loading" ? type && slots[`${type}-icon`] && !item.icon ? slots[`${type}-icon`]?.() : content(icon) : null,
          ]) : null,
          h("div", { "data-content": "", class: slot("content") }, [h("div", { "data-title": "", class: slot("title") }, content(item.title, item.componentProps)), item.description ? h("div", { "data-description": "", class: clsx(options.toastOptions?.descriptionClass, slot("description")) }, content(item.description, item.componentProps)) : null]),
          actionButton("cancel"), actionButton("action"),
        ],
      ])
    }
  },
})

/** Owns presentation/interaction only; vue-sonner remains the public toast store. */
export const ToastRenderer = defineComponent({
  name: "ToastRenderer", inheritAttrs: false,
  props: {
    id: String, position: String as PropType<ToasterProps["position"]>, duration: Number, gap: Number, visibleToasts: Number,
    expand: { type: Boolean, default: undefined }, closeButton: { type: Boolean, default: undefined }, invert: { type: Boolean, default: undefined }, richColors: { type: Boolean, default: undefined },
    theme: String as PropType<ToasterProps["theme"]>, hotkey: Array as PropType<string[]>, dir: String as PropType<ToasterProps["dir"]>,
    swipeDirections: Array as PropType<ToasterProps["swipeDirections"]>, icons: Object as PropType<ToasterProps["icons"]>, containerAriaLabel: String,
    offset: [String, Number, Object] as PropType<ToasterProps["offset"]>, mobileOffset: [String, Number, Object] as PropType<ToasterProps["mobileOffset"]>,
    class: String, style: Object as PropType<CSSProperties>, toastOptions: Object as PropType<ToasterProps["toastOptions"]>, closeButtonPosition: String as PropType<ToasterProps["closeButtonPosition"]>,
  },
  setup(props, { attrs, slots }) {
    const { activeToasts } = useVueSonner()
    const revision = ref(0)
    const lifecycle = new ToastLifecycle<ToastT>(toast.dismiss, (reason, item) => reason === "auto" ? item.onAutoClose?.(item) : item.onDismiss?.(item))
    const unsubscribe = lifecycle.subscribe(() => { revision.value++ })
    const keydown = (event: KeyboardEvent) => lifecycle.keyDown(event, props.hotkey ?? ["altKey", "KeyT"])
    onMounted(() => { lifecycle.connect(document); document.addEventListener("keydown", keydown) })
    onBeforeUnmount(() => { unsubscribe(); lifecycle.disconnect(); document.removeEventListener("keydown", keydown) })
    watch(() => [activeToasts.value, props.id, props.position, props.duration, props.toastOptions?.duration, props.gap, props.visibleToasts, props.expand, props.swipeDirections], () => {
      lifecycle.sync(activeToasts.value, { id: props.id, position: props.position ?? "bottom-right", duration: props.toastOptions?.duration ?? props.duration ?? 4000, gap: props.gap ?? 14, visibleToasts: props.visibleToasts ?? 3, expand: props.expand, swipeDirections: props.swipeDirections })
    }, { immediate: true })
    return () => {
      const version = revision.value
      const hotkeyLabel = (props.hotkey ?? ["altKey", "KeyT"]).join("+").replace(/Key|Digit/g, "")
      const positions = [...new Set(lifecycle.entries.map((entry) => lifecycle.position(entry)))]
      const dir = props.dir === "auto" || !props.dir ? documentDirection(typeof document === "undefined" ? undefined : document) : props.dir
      return h("section", { "aria-label": `${props.containerAriaLabel ?? "Notifications"} ${hotkeyLabel}`, tabindex: -1, "aria-live": "polite", "aria-relevant": "additions text", "aria-atomic": "false" }, positions.map((position: Position) => {
        const entries = lifecycle.at(position)
        const [y, x] = position.split("-")
        return h("ol", mergeProps({ key: position, ref: (node) => lifecycle.setList(position, node instanceof HTMLElement ? node : null), dir, tabindex: -1, class: props.class,
          "data-sonner-toaster": "true", "data-sonner-theme": props.theme ?? "light", "data-y-position": y, "data-x-position": x,
          style: { "--front-toast-height": `${entries.find((entry) => !entry.removed)?.height ?? 0}px`, "--width": "356px", "--gap": `${props.gap ?? 14}px`, ...props.style, ...offsetStyles(props.offset, props.mobileOffset) },
          onFocusin: (event: FocusEvent) => lifecycle.focusIn(event), onFocusout: (event: FocusEvent) => lifecycle.focusOut(event),
          onPointerenter: (event: PointerEvent) => lifecycle.pointerEnter(event), onMouseenter: () => lifecycle.hover(true), onMousemove: () => lifecycle.hover(true), onMouseleave: () => lifecycle.hover(false),
        }, attrs), entries.map((entry, index) => h(ToastItem, { key: entry.toast.id, entry, lifecycle, options: props, index, count: entries.length, revision: version }, slots)))
      }))
    }
  },
})
