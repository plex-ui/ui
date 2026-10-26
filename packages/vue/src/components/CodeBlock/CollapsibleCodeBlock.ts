import { defineComponent, h, ref } from "vue"
import { Button } from "../Button/index.js"
import { CodeBlockBase, CodeBlockBaseCode, CodeBlockBaseCopyButton, getSlotText } from "./CodeBlock.js"
import s from "@plexui/styles/components/CodeBlock/CodeBlock.module.css"

// React's inline `style={{ maxHeight: n }}`: numbers get "px", except 0
const toPx = (value: number) => (value === 0 ? "0" : `${value}px`)

// Room for the View Code button, unless `collapsedHeight` is smaller
const MIN_COLLAPSED_HEIGHT = 140

/**
 * Vue port of packages/ui/src/components/CodeBlock/CollapsibleCodeBlock.tsx.
 * The code is the default slot's text or the `code` prop; like React, only
 * `class` reaches the DOM from attributes. `defaultExpanded` is read once.
 */
export const CollapsibleCodeBlock = defineComponent({
  name: "CollapsibleCodeBlock",
  inheritAttrs: false,
  props: {
    /** The code string to display, when the default slot is empty */
    code: String,
    /** Syntax highlighting language */
    language: String,
    /** Whether the code block starts expanded. @default false */
    defaultExpanded: { type: Boolean, default: false },
    /** Height of the collapsed container in pixels. @default 140 */
    collapsedHeight: { type: Number, default: 140 },
    /** Maximum height when expanded (enables scroll if exceeded) */
    maxExpandedHeight: Number,
    /** Whether to show the copy button when expanded. @default true */
    copyable: { type: Boolean, default: true },
  },
  setup(props, { slots, attrs }) {
    const isExpanded = ref(props.defaultExpanded)

    return () => {
      const slotText = getSlotText(slots.default?.())
      const code = slotText !== "" ? slotText : (props.code ?? "")

      const containerStyle = isExpanded.value
        ? props.maxExpandedHeight
          ? { maxHeight: toPx(props.maxExpandedHeight) }
          : undefined
        : {
            maxHeight: toPx(props.collapsedHeight),
            minHeight: toPx(Math.min(props.collapsedHeight, MIN_COLLAPSED_HEIGHT)),
          }

      return h(
        CodeBlockBase,
        {
          "class": [s.CollapsibleCodeBlock, attrs.class],
          "data-collapsed": !isExpanded.value ? "" : undefined,
          "style": containerStyle,
        },
        {
          default: () => [
            h(CodeBlockBaseCode, { language: props.language, code }),
            ...(!isExpanded.value
              ? [
                  h("div", { class: s.GradientOverlay }),
                  h("div", { class: s.ViewCodeButtonContainer }, [
                    h(
                      Button,
                      {
                        color: "secondary",
                        variant: "solid",
                        size: "sm",
                        pill: true,
                        onClick: () => {
                          isExpanded.value = true
                        },
                      },
                      { default: () => "View Code" },
                    ),
                  ]),
                ]
              : []),
            isExpanded.value && props.copyable ? h(CodeBlockBaseCopyButton, { copyValue: code }) : null,
          ],
        },
      )
    }
  },
})

export type CollapsibleCodeBlockProps = InstanceType<typeof CollapsibleCodeBlock>["$props"]
