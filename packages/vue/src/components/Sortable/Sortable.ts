import clsx, { type ClassValue } from "clsx"
import {
  defineComponent,
  h,
  mergeProps,
  nextTick,
  onBeforeUnmount,
  watch,
  type Component,
  type PropType,
  type SlotsType,
  type VNodeArrayChildren,
  type VNodeChild,
} from "vue"
import { moveItem, sortableKeyDown, sortablePointerDown, type SortableLayout, type SortableMove } from "../../lib/sortable.js"
import { GripVertical, Hamburger } from "../Icon/index.js"
import s from "@plexui/styles/components/Sortable/Sortable.module.css"

// Vue port of packages/ui/src/components/Sortable/Sortable.tsx.
//
// - `value` binds with `v-model:value`; `change` fires with it.
// - React's `Sortable.Handle` and `Sortable.Target` are the flat `SortableHandle` and `SortableTarget` here.
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
    /** Lists of one group trade items, and a `SortableTarget` of that group takes them. Give each list a `name`. */
    group: { type: String, default: undefined },
    /** Names the list in `move`. */
    name: { type: String, default: undefined },
  },
  emits: {
    "update:value": (value: unknown[]) => Array.isArray(value),
    "change": (value: unknown[]) => Array.isArray(value),
    /** An item moved, inside this list or out of it. Out of it the app updates both lists: `update:value` is for a move inside one. */
    "move": (move: SortableMove) => typeof move === "object" && move !== null,
    /** A drag rests on a `SortableTarget` of the group: open what it stands for or go there. */
    "hold": (name: string) => typeof name === "string",
  },
  slots: Object as SlotsType<{
    /** The items, one direct child per entry of `value`, keyed by the entry and not by its index */
    default?: () => VNodeChild
  }>,
  setup(props, { attrs, emit, slots }) {
    let cancelDrag: ReturnType<typeof sortablePointerDown>
    onBeforeUnmount(() => cancelDrag?.())
    watch(() => props.disabled, (disabled) => {
      if (disabled) {
        cancelDrag?.()
        cancelDrag = undefined
      }
    }, { flush: "sync" })
    const commit = async (from: number, to: number) => {
      const next = moveItem(props.value, from, to)
      emit("update:value", next)
      emit("change", next)
      emit("move", { item: props.value[from], from: props.name as string, fromIndex: from, to: props.name as string, toIndex: to })
      await nextTick()
    }

    const link = {
      move: async (fromIndex: number, to: string, toIndex?: number) => {
        emit("move", { item: props.value[fromIndex], from: props.name as string, fromIndex, to, toIndex })
        await nextTick()
      },
      hold: (name: string) => emit("hold", name),
    }

    const onPointerdown = (event: PointerEvent) => {
      if (!props.disabled && !event.defaultPrevented) {
        cancelDrag = sortablePointerDown(event, event.currentTarget as HTMLElement, props.layout, commit, link) ?? cancelDrag
      }
    }

    const onKeydown = (event: KeyboardEvent) => {
      if (!props.disabled && !event.defaultPrevented) void sortableKeyDown(event, event.currentTarget as HTMLElement, commit, link)
    }

    return () => {
      const { class: className, ...rest } = attrs
      const isElement = typeof props.as === "string"
      return h(
        props.as as string,
        mergeProps(rest, {
          "class": clsx(s.Sortable, className as ClassValue),
          "data-sortable": "",
          "data-layout": props.layout,
          "data-disabled": props.disabled ? "" : undefined,
          "data-handles": props.handles?.toString(),
          "data-group": props.group,
          "data-name": props.name,
          onPointerdown,
          onKeydown,
          "onDragstart": preventNativeDrag,
        }),
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
        (slots.default ? slots.default() : [h(GripVertical, { class: s.DesktopGrip, "aria-hidden": true }), h(Hamburger, { class: s.PhoneGrip, "aria-hidden": true })]) as VNodeArrayChildren,
      )
    }
  },
})

const SortableTargetComponent = defineComponent({
  name: "SortableTarget",
  inheritAttrs: false,
  props: {
    /** The `group` of the lists whose items it takes */
    group: { type: String, required: true },
    /** Names the target in `move` and `hold` on the list */
    name: { type: String, required: true },
    /** Element to render. @default "div" */
    as: { type: [String, Object] as PropType<string | Component>, default: "div" },
  },
  slots: Object as SlotsType<{
    /** What the target shows */
    default?: () => VNodeChild
  }>,
  setup(props, { attrs, slots }) {
    return () => {
      const { class: className, ...rest } = attrs
      const isElement = typeof props.as === "string"
      return h(
        props.as as string,
        {
          ...rest,
          "class": clsx(s.Target, className as ClassValue),
          "data-sortable-target": props.group,
          "data-name": props.name,
        },
        isElement ? (slots.default?.() as VNodeArrayChildren) : { default: () => slots.default?.() },
      )
    }
  },
})

/** Reorders its direct children by dragging, from anywhere but a control, or by a `SortableHandle` where grips are shown. */
export const Sortable = SortableComponent
/** The grip of an item. Arrow keys move the item while the handle has focus. */
export const SortableHandle = SortableHandleComponent
/** A place outside the lists that takes an item whole: a folder, a category in a side list. */
export const SortableTarget = SortableTargetComponent
export type { SortableLayout, SortableMove }
