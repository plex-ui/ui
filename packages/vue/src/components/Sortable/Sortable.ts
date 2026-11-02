import clsx, { type ClassValue } from "clsx"
import {
  defineComponent,
  h,
  nextTick,
  type Component,
  type PropType,
  type SlotsType,
  type VNodeArrayChildren,
  type VNodeChild,
} from "vue"
import { moveItem, sortableKeyDown, sortablePointerDown, type SortableLayout } from "../../lib/sortable.js"
import { GripVertical } from "../Icon/index.js"
import s from "@plexui/styles/components/Sortable/Sortable.module.css"

// Vue port of packages/ui/src/components/Sortable/Sortable.tsx.
//
// - `value` binds with `v-model:value`; `change` fires with it.
// - React's `Sortable.Handle` is the flat `SortableHandle` here.
// - Attributes reach the rendered element, as React's rest props do.

const preventNativeDrag = (event: Event) => event.preventDefault()

const SortableComponent = defineComponent({
  name: "Sortable",
  inheritAttrs: false,
  props: {
    /** The list, in the order of the children. Bind with `v-model:value`. */
    value: { type: Array as PropType<readonly unknown[]>, required: true },
    /** `list` for rows one under another, `grid` for items that stand side by side. @default "list" */
    layout: { type: String as PropType<SortableLayout>, default: "list" },
    /** Element to render, such as `TableBody` for table rows. @default "div" */
    as: { type: [String, Object] as PropType<string | Component>, default: "div" },
    /** Turns dragging off. @default false */
    disabled: { type: Boolean, default: false },
    /** Shows the grips of `SortableHandle`. A hidden grip still takes the keyboard, and the item drags from anywhere but a control. @default true in a table, otherwise false */
    handles: { type: Boolean, default: undefined },
  },
  emits: {
    "update:value": (_value: unknown[]) => true,
    "change": (_value: unknown[]) => true,
  },
  slots: Object as SlotsType<{
    /** The items, one direct child per entry of `value`, keyed by the entry and not by its index */
    default?: () => VNodeChild
  }>,
  setup(props, { attrs, emit, slots }) {
    const commit = async (from: number, to: number) => {
      const next = moveItem(props.value, from, to)
      emit("update:value", next)
      emit("change", next)
      await nextTick()
    }

    const onPointerdown = (event: PointerEvent) => {
      if (!props.disabled) {
        sortablePointerDown(event, event.currentTarget as HTMLElement, props.layout, commit)
      }
    }

    const onKeydown = (event: KeyboardEvent) => {
      if (!props.disabled) void sortableKeyDown(event, event.currentTarget as HTMLElement, commit)
    }

    return () => {
      const { class: className, ...rest } = attrs
      const isElement = typeof props.as === "string"
      return h(
        props.as as string,
        {
          ...rest,
          "class": clsx(s.Sortable, className as ClassValue),
          "data-sortable": "",
          "data-layout": props.layout,
          "data-disabled": props.disabled ? "" : undefined,
          "data-handles": props.handles?.toString(),
          onPointerdown,
          onKeydown,
          "onDragstart": preventNativeDrag,
        },
        isElement ? (slots.default?.() as VNodeArrayChildren) : { default: () => slots.default?.() },
      )
    }
  },
})

const SortableHandleComponent = defineComponent({
  name: "SortableHandle",
  inheritAttrs: false,
  props: {
    /** Name of the handle for assistive technology. @default "Reorder" */
    ariaLabel: { type: String, default: "Reorder" },
  },
  slots: Object as SlotsType<{
    /** The grip */
    default?: () => VNodeChild
  }>,
  setup(props, { attrs, slots }) {
    return () => {
      const { class: className, ...rest } = attrs
      return h(
        "button",
        {
          ...rest,
          "type": "button",
          "class": clsx(s.Handle, className as ClassValue),
          "data-sortable-handle": "",
          "aria-label": props.ariaLabel,
        },
        (slots.default ? slots.default() : [h(GripVertical, { "aria-hidden": true })]) as VNodeArrayChildren,
      )
    }
  },
})

/** Reorders its direct children by dragging, from anywhere but a control, or by a `SortableHandle` where grips are shown. */
export const Sortable = SortableComponent
/** The grip of an item. Arrow keys move the item while the handle has focus. */
export const SortableHandle = SortableHandleComponent
export type { SortableLayout }
