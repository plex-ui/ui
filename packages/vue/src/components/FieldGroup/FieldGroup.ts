import clsx, { type ClassValue } from "clsx"
import { defineComponent, h, useId, type PropType, type SlotsType, type VNodeArrayChildren, type VNodeChild } from "vue"
import { hasContent } from "../../lib/slotContent.js"
import s from "@plexui/styles/components/FieldGroup/FieldGroup.module.css"

// Vue port of packages/ui/src/components/FieldGroup/FieldGroup.tsx.
//
// - `title` and `description` take a string prop or a slot of the same name,
//   like React's ReactNode props. `action` and `footer` are slots here.
// - Attributes reach the root `section`, as React's rest props do.

const FieldGroupComponent = defineComponent({
  name: "FieldGroup",
  inheritAttrs: false,
  props: {
    /** Heading over the block (or the `title` slot); it names the group */
    title: String,
    /** Line under the title (or the `description` slot) */
    description: String,
    /** Class for the block that holds the rows */
    bodyClass: [String, Array, Object] as PropType<ClassValue>,
  },
  slots: Object as SlotsType<{
    /** The rows: `Field row`, or rows of your own. */
    default?: () => VNodeChild
    title?: () => VNodeChild
    description?: () => VNodeChild
    /** Content at the end of the header, such as a button */
    action?: () => VNodeChild
    /** Content under the block, such as a note */
    footer?: () => VNodeChild
  }>,
  setup(props, { attrs, slots }) {
    const titleId = `field-group-${useId()}`

    return () => {
      const title = slots.title ? slots.title() : props.title
      const hasTitle = slots.title ? hasContent(title as VNodeArrayChildren) : !!title
      const description = slots.description ? slots.description() : props.description
      const hasDescription = slots.description ? hasContent(description as VNodeArrayChildren) : !!description
      const action = slots.action?.()
      const hasAction = !!action && hasContent(action as VNodeArrayChildren)

      return h(
        "section",
        {
          "role": "group",
          "aria-labelledby": hasTitle ? titleId : undefined,
          ...attrs,
          "class": clsx(s.FieldGroup, attrs.class as ClassValue),
        },
        [
          hasTitle || hasDescription || hasAction
            ? h("div", { class: s.Header }, [
                h("div", { class: s.HeaderText }, [
                  hasTitle ? h("h2", { class: s.Title, id: titleId }, [title as VNodeChild]) : null,
                  hasDescription ? h("p", { class: s.Description }, [description as VNodeChild]) : null,
                ]),
                hasAction ? action : null,
              ])
            : null,
          h("div", { class: clsx(s.Body, props.bodyClass) }, [slots.default?.()]),
          slots.footer?.(),
        ],
      )
    }
  },
})

type FieldGroupOwnProps = InstanceType<typeof FieldGroupComponent>["$props"]

/** FieldGroup props; attributes reach the root element. */
export type FieldGroupProps = FieldGroupOwnProps & { class?: ClassValue }

/** A titled block of rows: `Field row` lines with hairlines between them. */
export const FieldGroup = FieldGroupComponent as typeof FieldGroupComponent & { new (): { $props: FieldGroupProps } }
