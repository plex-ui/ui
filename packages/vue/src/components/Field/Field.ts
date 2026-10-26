import clsx, { type ClassValue } from "clsx"
import {
  Comment,
  Fragment,
  Static,
  Text,
  camelize,
  cloneVNode,
  defineComponent,
  h,
  isVNode,
  useId,
  type PropType,
  type SlotsType,
  type VNode,
  type VNodeArrayChildren,
  type VNodeChild,
} from "vue"
import type { ControlSize } from "@plexui/styles/types"
import { FieldError } from "../FieldError/index.js"
import { hasContent } from "../../lib/slotContent.js"
import s from "@plexui/styles/components/Field/Field.module.css"

// Vue port of packages/ui/src/components/Field/Field.tsx.
//
// - `label`, `description` and `errorMessage` take a string prop or a slot of
//   the same name (the slot wins), like React's ReactNode props.
// - Children: React accepts an element, which Field clones with the field
//   props, or a render prop `(fieldProps) => ReactNode`, which it leaves alone.
//   Both are the default slot here, which receives the field props:
//   - a slot that reads them (`v-slot="fieldProps"` + `v-bind="fieldProps"`,
//     `v-slot="{ id }"`, `(fieldProps) => h(...)`) is the render prop: its
//     content renders as it is.
//   - a slot that does not read them and holds exactly one element or
//     component gets it cloned like React's `cloneElement`: `id` and
//     `opticallyAlign` replace the child's own, `aria-describedby` is joined
//     after the child's own ids, and an explicit `aria-invalid` on the child
//     wins. Template comments do not count as children (JSX comments); the
//     placeholder of a `v-if` that renders nothing does, like `{false}` in a
//     React children array, so `<A v-if="x" /><Input />` is not cloned.
//   - anything else (text, several roots, a `v-for` list) renders as it is,
//     like a React child that is not a single element.
//   - content a wrapper forwards with `<slot />` counts as its own roots, as
//     React's `children` passed on to Field are the elements themselves.
// - As in React only `class` reaches the root element; other attributes are
//   dropped.

export type FieldChildProps = {
  id: string
  /** The label's id. Bind it to a control that the label's `for` cannot name, such as a Select trigger. */
  "aria-labelledby"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  opticallyAlign?: "start" | "end"
}

type Props = Record<string, unknown>

const CONTROL_SIZES: ReadonlySet<unknown> = new Set(["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"])

/** The slot props, recording whether the slot read them (the render-prop form). */
const trackUse = (target: FieldChildProps) => {
  const state = { used: false }
  const proxy = new Proxy(target, {
    get(object, key, receiver) {
      state.used = true
      return Reflect.get(object, key, receiver)
    },
    has(object, key) {
      state.used = true
      return Reflect.has(object, key)
    },
    ownKeys(object) {
      state.used = true
      return Reflect.ownKeys(object)
    },
    getOwnPropertyDescriptor(object, key) {
      state.used = true
      return Reflect.getOwnPropertyDescriptor(object, key)
    },
  })
  return { proxy, state }
}

/** Like React's `isValidElement` for a slot root: an element or a component. */
const isElementVNode = (node: VNode) => {
  const { type } = node
  if (type === Fragment || type === Text || type === Comment || type === Static) return false
  if (typeof type === "object" && type !== null && ("__isTeleport" in type || "__isSuspense" in type)) return false
  return true
}

/**
 * Template comments (`<!-- note -->`) are no children, like JSX comments.
 * The empty placeholder of a `v-if` that renders nothing (or of a `false`
 * child) still counts, like `{false}` in a React children array.
 */
const isTemplateComment = (node: VNodeArrayChildren[number]) =>
  isVNode(node) && node.type === Comment && !!node.children && node.children !== "v-if"

/**
 * Unwraps content forwarded through a wrapper's `<slot />`: the fragment
 * `renderSlot` creates, keyed `_<slot name>`.
 */
const unwrapForwardedSlots = (nodes: VNodeArrayChildren): VNodeArrayChildren =>
  nodes.flatMap((node) =>
    isVNode(node) &&
    node.type === Fragment &&
    typeof node.key === "string" &&
    node.key.startsWith("_") &&
    Array.isArray(node.children)
      ? unwrapForwardedSlots(node.children)
      : [node],
  )

/** The one element a non-render-prop slot holds, if it holds exactly one. */
const singleElement = (nodes: VNodeArrayChildren): VNode | undefined => {
  const roots = unwrapForwardedSlots(nodes).filter((node) => !isTemplateComment(node))
  if (roots.length !== 1) return undefined
  const [root] = roots
  return isVNode(root) && isElementVNode(root) ? root : undefined
}

/** A child prop under its attribute name or its camelCase prop name. */
const childProp = (props: Props, name: string) => props[name] ?? props[camelize(name)]

/**
 * `cloneElement(child, fieldProps)` with React Field's merging rules. A child
 * without its own name (`aria-label`, `aria-labelledby`, `label`) is also
 * labelled by the field's label, which names triggers `for` cannot reach.
 */
const cloneWithFieldProps = (child: VNode, fieldChildProps: FieldChildProps, labelId: string): VNode => {
  const own: Props = { ...(child.props ?? {}) }
  const childDescribedBy = childProp(own, "aria-describedby") as string | undefined
  const childInvalid = childProp(own, "aria-invalid")
  const childNamed =
    childProp(own, "aria-label") != null || childProp(own, "aria-labelledby") != null || own.label != null

  const overrides: Props = {
    ...fieldChildProps,
    // Merge with the child's own associations instead of overwriting them
    "aria-describedby": [childDescribedBy, fieldChildProps["aria-describedby"]].filter(Boolean).join(" ") || undefined,
    "aria-invalid": childInvalid ?? fieldChildProps["aria-invalid"],
    ...(!childNamed && { "aria-labelledby": labelId }),
  }

  // One spelling per prop, so the field's value is the one that applies
  for (const key of Object.keys(overrides)) {
    for (const spelling of [key, camelize(key), key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)]) {
      delete own[spelling]
    }
  }

  return cloneVNode({ ...child, props: own } as VNode, overrides)
}

const FieldComponent = defineComponent({
  name: "Field",
  inheritAttrs: false,
  props: {
    /** Label text for the field (or the `label` slot) */
    label: String,
    /** Helper text below the label, linked via `aria-describedby` (or the `description` slot) */
    description: String,
    /**
     * Error message below the control (or the `errorMessage` slot). When set,
     * the control gets `aria-invalid="true"`. Rendered with FieldError.
     */
    errorMessage: String,
    /** Content at the end of the label row, such as a link that acts on the field (or the `labelAction` slot) */
    labelAction: String,
    /** Font size of the label, to match the control's size. @default the child control's `size`, else "md" */
    size: String as PropType<ControlSize>,
    /** Shows a required asterisk after the label. Visual only: no `required` attribute. @default false */
    required: { type: Boolean, default: false },
    /** Layout direction of label and control. @default "vertical" */
    orientation: { type: String as PropType<"vertical" | "horizontal">, default: "vertical" },
    /** Overrides the generated id set on the control and the label's `for`. */
    id: String,
    /** Optically aligns the control's text with surrounding content; passed to the control. */
    opticallyAlign: String as PropType<"start" | "end">,
  },
  slots: Object as SlotsType<{
    /** The control. Read the props to render them yourself (React's render prop). */
    default?: (fieldProps: FieldChildProps) => VNodeChild
    label?: () => VNodeChild
    labelAction?: () => VNodeChild
    description?: () => VNodeChild
    errorMessage?: () => VNodeChild
  }>,
  setup(props, { attrs, slots }) {
    const generatedId = useId()

    return () => {
      const { required, orientation, opticallyAlign } = props
      const fieldId = props.id || `field-${generatedId}`
      const labelId = `${fieldId}-label`

      const description = slots.description ? slots.description() : props.description
      const hasDescription = slots.description ? hasContent(description as VNodeArrayChildren) : !!description
      const errorMessage = slots.errorMessage ? slots.errorMessage() : props.errorMessage
      const hasError = slots.errorMessage ? hasContent(errorMessage as VNodeArrayChildren) : !!errorMessage

      const descriptionId = hasDescription ? `${fieldId}-description` : undefined
      const errorId = hasError ? `${fieldId}-error` : undefined

      // Build aria-describedby from description + error IDs
      const ariaDescribedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined
      const invalid = hasError

      // Props to inject into the child control
      const fieldChildProps: FieldChildProps = {
        "id": fieldId,
        "aria-describedby": ariaDescribedBy,
        "aria-invalid": invalid || undefined,
        ...(opticallyAlign && { opticallyAlign }),
      }

      // Resolve the children
      let resolvedChildren: VNodeArrayChildren | undefined
      let childSize: unknown
      if (slots.default) {
        const { proxy, state } = trackUse({ ...fieldChildProps, "aria-labelledby": labelId })
        const nodes = slots.default(proxy) as VNodeArrayChildren
        const child = state.used ? undefined : singleElement(nodes)
        childSize = child?.props?.size
        resolvedChildren = child ? [cloneWithFieldProps(child, fieldChildProps, labelId)] : nodes
      }
      const size = props.size ?? (CONTROL_SIZES.has(childSize) ? (childSize as ControlSize) : "md")

      const labelAction = slots.labelAction ? slots.labelAction() : props.labelAction
      const hasLabelAction = slots.labelAction ? hasContent(labelAction as VNodeArrayChildren) : !!labelAction
      const labelElement = h("label", { class: s.Label, id: labelId, for: fieldId }, [
        slots.label ? slots.label() : props.label,
        required ? h("span", { "class": s.RequiredIndicator, "aria-hidden": "true" }, "*") : null,
      ])

      return h(
        "div",
        {
          "class": clsx(s.Field, attrs.class as ClassValue),
          "data-size": size,
          "data-orientation": orientation,
          "data-optically-align": opticallyAlign,
        },
        [
          h("div", { class: s.LabelGroup }, [
            hasLabelAction
              ? h("div", { class: s.LabelRow }, [labelElement, h("div", { class: s.LabelAction }, [labelAction as VNodeChild])])
              : labelElement,
            hasDescription ? h("div", { class: s.Description, id: descriptionId }, [description as VNodeChild]) : null,
          ]),
          h("div", { class: s.Content }, [
            h("div", { class: s.Control }, resolvedChildren),
            hasError ? h(FieldError, { id: errorId }, () => [errorMessage as VNodeChild]) : null,
          ]),
        ],
      )
    }
  },
})

type FieldOwnProps = InstanceType<typeof FieldComponent>["$props"]

/** Field props; `class` reaches the root element. */
export type FieldProps = FieldOwnProps & { class?: ClassValue }

/** Form field wrapper with label, description, error and accessibility linking. */
export const Field = FieldComponent as typeof FieldComponent & { new (): { $props: FieldProps } }
