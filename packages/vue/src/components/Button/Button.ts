import { createCommentVNode, defineComponent, h, type ButtonHTMLAttributes, type PropType } from "vue"
import type { ControlSize, SemanticColors, Sizes, Variants } from "@plexui/styles/types"
import { handlePressableMouseEnter } from "../../lib/helpers.js"
import { wrapTextNodeSiblings } from "../../lib/renderHelpers.js"
import { LoadingIndicator } from "../Indicator/index.js"
import { TransitionGroup } from "../Transition/index.js"
import s from "@plexui/styles/components/Button/Button.module.css"

// Vue port of packages/ui/src/components/Button/Button.tsx. Props, defaults
// and rendered attributes match React 1:1 (checked by the parity tests).
// Boolean props default to `undefined` where React distinguishes "not set"
// from `false` (`inert` falls back to `loading`, `aria-disabled` renders "false").

export type ButtonColor = SemanticColors<
  "primary" | "secondary" | "danger" | "success" | "info" | "discovery" | "caution" | "warning"
>

const ButtonComponent = defineComponent({
  name: "Button",
  props: {
    /** @default "button" */
    type: { type: String as PropType<"button" | "submit" | "reset">, default: "button" },
    /** Color for the button. @default "primary" */
    color: { type: String as PropType<ButtonColor>, default: "primary" },
    /** Style variant for the Button. @default "solid" */
    variant: { type: String as PropType<Variants<"solid" | "soft" | "outline" | "ghost">>, default: "solid" },
    /** Determines if the button should be a fully rounded pill shape. @default false */
    pill: { type: Boolean, default: false },
    /** Determines if the button should have matching width and height, based on the `size`. @default false */
    uniform: { type: Boolean, default: false },
    /** Controls size of the button: height, plus defaults for `gutterSize`, `iconSize` and font size. @default "md" */
    size: { type: String as PropType<ControlSize>, default: "md" },
    /** Controls the size of icons within the button, defaults to value from `size`. */
    iconSize: String as PropType<Sizes<"sm" | "md" | "lg" | "xl" | "2xl">>,
    /** Controls gutter on the edges of the button, defaults to value from `size`. */
    gutterSize: String as PropType<Sizes<"3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl">>,
    /** Displays loading indicator on top of button contents. @default false */
    loading: { type: Boolean, default: undefined },
    /** Displays selected styles on the button, varying by `variant`. @default false */
    selected: { type: Boolean, default: undefined },
    /** Determines if the button should take up 100% of available width. @default false */
    block: { type: Boolean, default: undefined },
    /** Applies a negative margin using the current gutter to optically align the button with surrounding content. */
    opticallyAlign: String as PropType<"start" | "end">,
    /** Disables the button visually and from interactions. @default false */
    disabled: { type: Boolean, default: undefined },
    /** Controls the visual tone when the button is disabled. "relaxed" will use a default cursor instead of not-allowed. */
    disabledTone: String as PropType<"relaxed">,
    /** Determines whether the button should be made inert, without introducing visual change. Defaults to `loading`. */
    inert: { type: Boolean, default: undefined },
  },
  emits: {
    click: (_event: MouseEvent) => true,
  },
  setup(props, { slots, emit }) {
    const handleClick = (event: MouseEvent) => {
      if (props.disabled) {
        return
      }
      emit("click", event)
    }

    return () => {
      // Defaults to `loading` state
      const inert = props.inert === undefined ? props.loading : props.inert
      const isInert = props.disabled || inert
      const { loading } = props

      return h(
        "button",
        {
          "type": props.type,
          "class": s.Button,
          "data-color": props.color,
          "data-variant": props.variant,
          "data-pill": props.pill ? "" : undefined,
          "data-uniform": props.uniform ? "" : undefined,
          "data-size": props.size,
          "data-gutter-size": props.gutterSize,
          "data-icon-size": props.iconSize,
          "data-loading": loading ? "" : undefined,
          "data-selected": props.selected ? "" : undefined,
          "data-block": props.block ? "" : undefined,
          "data-optically-align": props.opticallyAlign,
          "onPointerenter": handlePressableMouseEnter,
          // Non-visual, accessible disablement
          // NOTE: Do not use literal `inert` because that is incorrect semantically
          "disabled": isInert,
          "aria-disabled": isInert,
          "tabindex": isInert ? -1 : undefined,
          // Visual disablement
          "data-disabled": props.disabled ? "" : undefined,
          "data-disabled-tone": props.disabled ? props.disabledTone : undefined,
          "onClick": handleClick,
        },
        [
          // React renders `{loading && <LoadingIndicator />}`: nothing when
          // `loading` is unset, an empty slot when it is `false`.
          h(
            TransitionGroup,
            { class: s.ButtonLoader, enterDuration: 250, exitDuration: 150 },
            loading === undefined
              ? undefined
              : {
                  default: () =>
                    loading ? [h(LoadingIndicator, { key: "loader" })] : [createCommentVNode()],
                },
          ),
          h("span", { class: s.ButtonInner }, wrapTextNodeSiblings(slots.default?.())),
        ],
      )
    }
  },
})

type ButtonOwnProps = InstanceType<typeof ButtonComponent>["$props"]

/** Button props plus the native <button> attributes that fall through to it, as in React. */
export type ButtonProps = ButtonOwnProps & Omit<ButtonHTMLAttributes, keyof ButtonOwnProps>

export const Button = ButtonComponent as typeof ButtonComponent & { new (): { $props: ButtonProps } }
