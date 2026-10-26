import { defineComponent, h, type PropType } from "vue"
import type { Column } from "@tanstack/vue-table"
import { ArrowDownSm, ArrowUpSm, Sort } from "../Icon/index.js"
import s from "@plexui/styles/components/DataTable/DataTable.module.css"

// Vue port of packages/ui/src/components/DataTable/DataTableColumnHeader.tsx.
// React reads `column`, `title` and `className` only, so the root takes the
// caller's `class` and nothing else.

const DataTableColumnHeaderComponent = defineComponent({
  name: "DataTableColumnHeader",
  inheritAttrs: false,
  props: {
    /** TanStack Table column object (from the header context) */
    column: { type: Object as PropType<Column<any, any>>, required: true },
    /** Display text for the header */
    title: { type: String, required: true },
  },
  setup(props, { attrs }) {
    return () => {
      const { column, title } = props

      if (!column.getCanSort()) {
        return h("span", { class: attrs.class }, title)
      }

      const sorted = column.getIsSorted()

      return h(
        "button",
        {
          "type": "button",
          "class": [s.ColumnHeaderButton, attrs.class],
          "data-sorted": sorted || undefined,
          "onClick": column.getToggleSortingHandler(),
        },
        [
          title,
          h("span", { class: s.SortIcon }, [
            sorted === "asc" ? h(ArrowUpSm) : sorted === "desc" ? h(ArrowDownSm) : h(Sort),
          ]),
        ],
      )
    }
  },
})

export type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>
  title: string
  class?: unknown
}

/**
 * Sortable column header: a button that toggles the column's sorting, or
 * plain text when it cannot sort. Typed as a plain component (no generic
 * constructor) so `h(DataTableColumnHeader, { column, title })` type-checks
 * in header renderers.
 */
export const DataTableColumnHeader = DataTableColumnHeaderComponent
