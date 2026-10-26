import {
  Comment,
  Fragment,
  cloneVNode,
  createTextVNode,
  defineComponent,
  h,
  inject,
  isVNode,
  provide,
  shallowRef,
  type Component,
  type InjectionKey,
  type PropType,
  type VNode,
  type VNodeArrayChildren,
} from "vue"
import type { Sizes } from "@plexui/styles/types"
import { isDev } from "../../lib/environment.js"
import { isTransparentFragment } from "../../lib/renderHelpers.js"
import { CheckMd } from "../Icon/index.js"
import s from "@plexui/styles/components/ProgressSteps/ProgressSteps.module.css"

// Vue port of packages/ui/src/components/ProgressSteps/ProgressSteps.tsx.
// Flat exports: `ProgressStepsStep`, `ProgressStepsTitle`,
// `ProgressStepsDescription` (React's `ProgressSteps.Step`, `.Title`, `.Description`).
//
// React counts children with `Children.count` and hands each element its
// position as `_index` via `cloneElement`. The same is done with the slot
// vnodes, following React's rules: lists (arrays, the fragment a v-for
// renders, and the one a forwarded `<slot />` renders, see
// `isTransparentFragment`) are flattened, an empty `v-if` placeholder counts
// like React's `{cond && <Step />}` (which is `false`, still a child), and
// text counts.
// Template comments are dropped, like JSX comments.

type Orientation = "horizontal" | "vertical"
type StepState = "completed" | "active" | "inactive"
type ConnectorStyle = "solid" | "dashed"
type Variant = "default" | "minimal"
type Color = "default" | "success"

type ProgressStepsContextValue = {
  current: () => number
  totalSteps: () => number
}

const ProgressStepsContextKey: InjectionKey<ProgressStepsContextValue> = Symbol("PlexUIProgressSteps")

const useProgressStepsContext = () => {
  const context = inject(ProgressStepsContextKey, null)
  if (!context) {
    throw new Error("ProgressSteps components must be wrapped in <ProgressSteps />")
  }
  return context
}

// React's `Children.map` slots: `null` stands for an empty child
// (React's `false` / `null`), which is counted and indexed but not rendered.
const toChildSlots = (children: VNodeArrayChildren | undefined): Array<VNode | null> => {
  const result: Array<VNode | null> = []
  for (const child of children ?? []) {
    if (child == null || typeof child === "boolean") {
      result.push(null)
      continue
    }
    if (Array.isArray(child)) {
      result.push(...toChildSlots(child))
      continue
    }
    const vnode = isVNode(child) ? child : createTextVNode(String(child))
    if (vnode.type === Comment) {
      // `v-if` with no branch rendered (the compiler writes "v-if" in dev
      // builds, "" in production): React's `{cond && <Step />}`
      if (vnode.children === "v-if" || vnode.children === "") result.push(null)
      continue
    }
    if (isTransparentFragment(vnode)) {
      result.push(...toChildSlots(vnode.children as VNodeArrayChildren))
      continue
    }
    result.push(vnode)
  }
  return result
}

// React's `isValidElement`, minus fragments: React clones them too, but a
// fragment ignores `_index`, so leaving them as they are renders the same
const isElementVNode = (vnode: VNode) => typeof vnode.type !== "symbol"

const ProgressStepsComponent = defineComponent({
  name: "ProgressSteps",
  inheritAttrs: false,
  props: {
    /** Current active step (1-indexed, starts from 1) */
    current: { type: Number, required: true },
    /** Total number of steps (required for minimal variant) */
    total: Number,
    /** Visual variant. @default "default" */
    variant: { type: String as PropType<Variant>, default: "default" },
    /** Color scheme. @default "default" */
    color: { type: String as PropType<Color>, default: "default" },
    /** Layout orientation. @default "horizontal" */
    orientation: { type: String as PropType<Orientation>, default: "horizontal" },
    /** Size of step indicators. @default "md" */
    size: { type: String as PropType<Sizes<"sm" | "md" | "lg">>, default: "md" },
    /** Connector line style. @default "solid" */
    connectorStyle: { type: String as PropType<ConnectorStyle>, default: "solid" },
  },
  setup(props, { slots, attrs }) {
    let warned = false
    // Written on each render, read by the steps: a step re-renders when the
    // count changes (its `isLast`), like React's context value
    const totalStepsRef = shallowRef(0)

    provide(ProgressStepsContextKey, {
      current: () => props.current,
      totalSteps: () => totalStepsRef.value,
    })

    return () => {
      const children = props.variant === "minimal" ? [] : toChildSlots(slots.default?.())
      const totalSteps = props.variant === "minimal" ? (props.total ?? 0) : children.length
      totalStepsRef.value = totalSteps

      if (isDev && props.variant === "minimal" && (props.total == null || props.total <= 0) && !warned) {
        warned = true
        // eslint-disable-next-line no-console
        console.warn('[ProgressSteps] variant="minimal" requires a positive `total` prop. Received:', props.total)
      }

      // Minimal variant: render horizontal bar segments
      if (props.variant === "minimal") {
        // A div, not nav: role="progressbar" is not allowed on <nav>
        return h(
          "div",
          {
            "aria-label": "Progress",
            "role": "progressbar",
            "aria-valuenow": props.current,
            "aria-valuemin": 1,
            "aria-valuemax": totalSteps,
            "class": [s.ProgressSteps, s.Minimal, attrs.class],
            "data-size": props.size,
            "data-color": props.color,
            "data-variant": "minimal",
          },
          [
            h(
              "div",
              { class: s.MinimalList },
              Array.from({ length: totalSteps }, (_, i) =>
                h("div", { "key": i, "class": s.MinimalSegment, "data-state": i < props.current ? "completed" : "upcoming" }),
              ),
            ),
          ],
        )
      }

      return h(
        "nav",
        {
          "aria-label": "Progress",
          "class": [s.ProgressSteps, attrs.class],
          "data-size": props.size,
          "data-color": props.color,
          "data-variant": props.variant,
        },
        [
          h(
            "ol",
            {
              "class": s.List,
              "data-orientation": props.orientation,
              "data-connector": props.connectorStyle,
              "data-variant": props.variant,
            },
            children.map((child, index) =>
              child && isElementVNode(child) ? cloneVNode(child, { _index: index }) : child,
            ),
          ),
        ],
      )
    }
  },
})

type ProgressStepsOwnProps = InstanceType<typeof ProgressStepsComponent>["$props"]

/** ProgressSteps props plus `class` (React's `className`). */
export type ProgressStepsProps = ProgressStepsOwnProps & { class?: unknown }

export const ProgressSteps = ProgressStepsComponent as typeof ProgressStepsComponent & {
  new (): { $props: ProgressStepsProps }
}

/** Icon for a step: a component (e.g. an icon from @plexui/vue), a vnode, or text */
export type StepIconProp = string | number | VNode | Component

const renderIcon = (icon: StepIconProp) =>
  (typeof icon === "object" && !isVNode(icon)) || typeof icon === "function" ? h(icon as Component) : icon

const hasContent = (nodes: VNode[] | undefined): nodes is VNode[] =>
  !!nodes?.some((node) => {
    if (node.type === Comment) return false
    if (Array.isArray(node.children) && node.type === Fragment) return hasContent(node.children as VNode[])
    return true
  })

/** A step. Its position comes from <ProgressSteps>, like React's injected `_index`. */
export const ProgressStepsStep = defineComponent({
  name: "ProgressStepsStep",
  inheritAttrs: false,
  props: {
    /** Custom icon (replaces step number): a component, a vnode or text. The `icon` slot takes precedence. */
    icon: [String, Number, Object, Function] as PropType<StepIconProp>,
    /** @internal - injected by parent */
    _index: { type: Number, default: 0 },
  },
  setup(props, { slots }) {
    const context = useProgressStepsContext()

    return () => {
      const index = props._index
      const current = context.current()

      const state: StepState = index < current - 1 ? "completed" : index === current - 1 ? "active" : "inactive"
      const isLast = index === context.totalSteps() - 1

      const iconSlot = slots.icon?.()
      const icon = hasContent(iconSlot) ? iconSlot : props.icon != null ? renderIcon(props.icon) : index + 1

      return h(
        "li",
        {
          "class": s.Step,
          "data-state": state,
          "aria-current": state === "active" ? "step" : undefined,
        },
        [
          h("div", { class: s.StepIndicator }, [state === "completed" ? h(CheckMd, { "data-no-autosize": true }) : icon]),
          !isLast ? h("div", { class: s.StepConnector }) : null,
          h("div", { class: s.StepContent }, slots.default?.()),
        ],
      )
    }
  },
})

export type StepProps = InstanceType<typeof ProgressStepsStep>["$props"]

/** Step title. Like React, only `class` reaches the DOM from attributes. */
export const ProgressStepsTitle = defineComponent({
  name: "ProgressStepsTitle",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => h("div", { class: [s.StepTitle, attrs.class] }, slots.default?.())
  },
})

/** Step description. Like React, only `class` reaches the DOM from attributes. */
export const ProgressStepsDescription = defineComponent({
  name: "ProgressStepsDescription",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => h("div", { class: [s.StepDescription, attrs.class] }, slots.default?.())
  },
})
