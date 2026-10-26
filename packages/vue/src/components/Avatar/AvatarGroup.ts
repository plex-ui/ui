import {
  Comment,
  Fragment,
  cloneVNode,
  createTextVNode,
  defineComponent,
  h,
  isVNode,
  type PropType,
  type VNode,
  type VNodeArrayChildren,
} from "vue"
import { toCssVariables } from "../../lib/helpers.js"
import s from "@plexui/styles/components/Avatar/AvatarGroup.module.css"

// PatchFlags.KEYED_FRAGMENT | PatchFlags.UNKEYED_FRAGMENT: the fragment of a v-for
const LIST_FRAGMENT = 128 | 256

// Port of React's `Children.toArray`: flattens lists (arrays, and the
// fragment a v-for renders, which is React's `.map()` array) but keeps any
// other fragment as one child, like React keeps `<>...</>`. Drops empty
// children (v-if comments) and keys every child by its position or own key,
// so reversing the order moves avatars instead of re-rendering them in place.
const toChildArray = (children: VNodeArrayChildren | undefined, prefix = "."): VNode[] => {
  const result: VNode[] = []

  ;(children ?? []).forEach((child, index) => {
    if (child == null || typeof child === "boolean") {
      return
    }

    if (Array.isArray(child)) {
      result.push(...toChildArray(child, `${prefix}${index}:`))
      return
    }

    const vnode = isVNode(child) ? child : createTextVNode(String(child))
    if (vnode.type === Comment) {
      return
    }

    const name = vnode.key == null ? String(index) : `$${String(vnode.key)}`
    if (vnode.type === Fragment && vnode.patchFlag & LIST_FRAGMENT && Array.isArray(vnode.children)) {
      result.push(...toChildArray(vnode.children, `${prefix}${name}:`))
      return
    }

    result.push(cloneVNode(vnode, { key: `${prefix}${name}` }))
  })

  return result
}

/**
 * Port of packages/ui/src/components/Avatar/AvatarGroup.tsx. Like React, only
 * `class` is applied; other attributes are not forwarded.
 */
export const AvatarGroup = defineComponent({
  name: "AvatarGroup",
  inheritAttrs: false,
  props: {
    /** Determines stacking layer order. @default "start" */
    stack: { type: String as PropType<"start" | "end">, default: "start" },
    /** Size all avatars in the group, in pixels. */
    size: Number,
  },
  setup(props, { slots, attrs }) {
    return () => {
      const childrenArray = toChildArray(slots.default?.())
      // Conditionally reverse the array depending on desired stacking priority
      const maybeReversedChildren = props.stack === "start" ? childrenArray.slice().reverse() : childrenArray

      return h(
        "div",
        {
          "class": [s.Group, attrs.class],
          "data-stack": props.stack,
          "style": toCssVariables({ "avatar-size": props.size }),
        },
        maybeReversedChildren,
      )
    }
  },
})

export type AvatarGroupProps = InstanceType<typeof AvatarGroup>["$props"]
