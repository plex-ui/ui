import clsx from "clsx"
import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type HTMLAttributes,
  type PropType,
  type VNodeArrayChildren,
  type VNodeChild,
} from "vue"
import type { SemanticColors, Variants } from "@plexui/styles/types"
import { CheckCircle, Info, Warning } from "../Icon/index.js"
import { Button } from "../Button/index.js"
import { hasContent } from "../../lib/slotContent.js"
import s from "@plexui/styles/components/Alert/Alert.module.css"

// Vue port of packages/ui/src/components/Alert/Alert.tsx. ReactNode props
// are slots (`title`, `description`, `actions`, `indicator`), with string
// props as fallback for `title` and `description`. `:indicator="false"`
// hides the indicator. `onDismiss` stays a function prop (`@dismiss` in
// templates) because its presence adds the Dismiss button.
// The actions auto placement mirrors usehooks-ts `useResizeObserver`: it
// reacts to the container's content-box width only.

export type AlertColor = SemanticColors<
  "primary" | "danger" | "success" | "info" | "discovery" | "caution" | "warning"
>

/** Default indicator icon, chosen from the color (which signals intention). */
const Indicator = (color: AlertColor) => {
  switch (color) {
    case "warning":
    case "caution":
    case "danger":
      return h(Warning)
    case "success":
      return h(CheckCircle)
    default:
      return h(Info)
  }
}

// usehooks-ts `extractSize` for the content box
const contentBoxSize = (entry: ResizeObserverEntry, sizeType: "inlineSize" | "blockSize") => {
  const box = entry.contentBoxSize as ReadonlyArray<ResizeObserverSize> | ResizeObserverSize | undefined
  if (!box) return entry.contentRect[sizeType === "inlineSize" ? "width" : "height"]
  // Firefox once reported a single object instead of an array
  return Array.isArray(box) ? box[0]?.[sizeType] : (box as ResizeObserverSize)[sizeType]
}

const AlertComponent = defineComponent({
  name: "Alert",
  props: {
    /** Color of the alert. @default "primary" */
    color: { type: String as PropType<AlertColor>, default: "primary" },
    /** Style variant. @default "outline" */
    variant: { type: String as PropType<Variants<"solid" | "soft" | "outline">>, default: "outline" },
    /** Title displayed in the alert (or the `title` slot). */
    title: String,
    /** Description text displayed in the alert (or the `description` slot). */
    description: String,
    /** Places `actions` at the end or the bottom. Automatic from sizing when unset. */
    actionsPlacement: String as PropType<"end" | "bottom">,
    /** `false` hides the indicator. Use the `indicator` slot to replace it. */
    indicator: { type: Boolean, default: undefined },
    /** Class applied to the actions container */
    actionsClassName: String,
    /** Shows the Dismiss button; called when it is clicked. */
    onDismiss: Function as PropType<(event: MouseEvent) => void>,
    /** A full-width strip across a page or panel: square corners, lines above and below only. @default false */
    banner: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    const containerRef = ref<HTMLDivElement | null>(null)
    const actionsRef = ref<HTMLDivElement | null>(null)
    const actionsAutoPlacement = ref<"end" | "bottom">("end")
    const containerWidth = ref<number | undefined>(undefined)

    let observer: ResizeObserver | undefined
    onMounted(() => {
      const container = containerRef.value
      if (!container) return
      if (typeof window === "undefined" || !("ResizeObserver" in window)) return
      let previousWidth: number | undefined
      let previousHeight: number | undefined
      observer = new ResizeObserver(([entry]) => {
        if (!entry) return
        const width = contentBoxSize(entry, "inlineSize")
        const height = contentBoxSize(entry, "blockSize")
        if (width !== previousWidth || height !== previousHeight) {
          previousWidth = width
          previousHeight = height
          containerWidth.value = width
        }
      })
      observer.observe(container, { box: "content-box" })
    })
    onBeforeUnmount(() => observer?.disconnect())

    watch(containerWidth, (width) => {
      const actionsWidth = actionsRef.value?.clientWidth ?? 0

      if (actionsWidth && width) {
        // If actions are larger than a third of the container width, wrap them.
        actionsAutoPlacement.value = actionsWidth > width / 3 ? "bottom" : "end"
      }
    })

    return () => {
      const { color } = props
      const title: VNodeChild = slots.title ? slots.title() : props.title
      const description: VNodeChild = slots.description ? slots.description() : props.description
      const actions = slots.actions?.()
      const showActions = hasContent(actions) || !!props.onDismiss

      return h(
        "div",
        {
          "ref": containerRef,
          "class": s.Alert,
          "data-variant": props.variant,
          "data-color": color,
          "role": color === "danger" ? "alert" : undefined,
          "data-actions-placement": props.actionsPlacement ?? actionsAutoPlacement.value,
          "data-banner": props.banner ? "" : undefined,
        },
        [
          props.indicator === false
            ? null
            : h("div", { class: s.Indicator }, slots.indicator ? slots.indicator() : [Indicator(color)]),
          h("div", { class: s.Content }, [
            h("div", { class: s.Message }, [
              hasContent([title as VNodeArrayChildren]) ? h("div", { class: s.Title }, [title]) : null,
              hasContent([description as VNodeArrayChildren])
                ? h("div", { class: s.Description }, [description])
                : null,
            ]),
            showActions
              ? h("div", { class: clsx(s.Actions, props.actionsClassName), ref: actionsRef }, [
                  actions,
                  props.onDismiss
                    ? h(
                        Button,
                        { type: "button", onClick: props.onDismiss, color, variant: "soft", pill: true },
                        { default: () => "Dismiss" },
                      )
                    : null,
                ])
              : null,
          ]),
        ],
      )
    }
  },
})

type AlertOwnProps = InstanceType<typeof AlertComponent>["$props"]

/** Alert props plus the native <div> attributes that fall through to it, as in React. */
export type AlertProps = AlertOwnProps & Omit<HTMLAttributes, keyof AlertOwnProps>

/** Inline message with a semantic color, optional title, description and actions. */
export const Alert = AlertComponent as typeof AlertComponent & { new (): { $props: AlertProps } }
