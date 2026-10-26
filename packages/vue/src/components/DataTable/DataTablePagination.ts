import { defineComponent, h, onMounted, onUpdated, ref, type PropType } from "vue"
import type { Table } from "@tanstack/vue-table"
import { Button } from "../Button/index.js"
import { ChevronLeftMd, ChevronRightMd } from "../Icon/index.js"
import s from "@plexui/styles/components/DataTable/DataTable.module.css"

// Vue port of packages/ui/src/components/DataTable/DataTablePagination.tsx.
//
// React controls the rows-per-page <select> with `value={pageSize}`. React
// DOM selects options through their `selected` property (no attribute) after
// every render and after every change event, and when no option matches the
// value it selects the first enabled option: a page size of 5 shows "10".
// Vue's `value` binding would leave the select blank instead, so the same
// option sync runs here on mount, on update and after a change.

const PAGE_SIZES = [10, 20, 50, 100]

/** React DOM's `updateOptions` for a single select. */
const syncOptions = (select: HTMLSelectElement | undefined, value: number) => {
  if (!select) return
  const selectedValue = String(value)
  let fallback: HTMLOptionElement | null = null
  for (const option of Array.from(select.options)) {
    if (option.value === selectedValue) {
      option.selected = true
      return
    }
    if (fallback === null && !option.disabled) fallback = option
  }
  if (fallback !== null) fallback.selected = true
}

const DataTablePaginationComponent = defineComponent({
  name: "DataTablePagination",
  props: {
    /** The TanStack table instance */
    table: { type: Object as PropType<Table<any>>, required: true },
  },
  setup(props) {
    const selectRef = ref<HTMLSelectElement>()
    const sync = () => syncOptions(selectRef.value, props.table.getState().pagination.pageSize)

    onMounted(sync)
    onUpdated(sync)

    return () => {
      const { table } = props
      const totalRows = table.getFilteredRowModel().rows.length
      const { pageIndex, pageSize } = table.getState().pagination
      const from = pageIndex * pageSize + 1
      const to = Math.min((pageIndex + 1) * pageSize, totalRows)

      return h("div", { class: s.Pagination }, [
        h("div", { class: s.PaginationLeft }, [
          h("span", { class: s.PaginationLabel }, "Rows per page"),
          h(
            "select",
            {
              ref: selectRef,
              class: s.PaginationSelect,
              onChange: (event: Event) => {
                table.setPageSize(Number((event.target as HTMLSelectElement).value))
                // React puts the controlled value back after the event
                sync()
              },
            },
            PAGE_SIZES.map((size) => h("option", { key: size, value: size }, size)),
          ),
        ]),
        h("div", { class: s.PaginationRight }, [
          h("span", { class: s.PaginationInfo }, totalRows === 0 ? "0 results" : `${from}–${to} of ${totalRows}`),
          h("div", { class: s.PaginationButtons }, [
            h(
              Button,
              {
                color: "secondary",
                variant: "outline",
                size: "sm",
                pill: false,
                uniform: true,
                disabled: !table.getCanPreviousPage(),
                onClick: () => table.previousPage(),
              },
              { default: () => h(ChevronLeftMd) },
            ),
            h(
              Button,
              {
                color: "secondary",
                variant: "outline",
                size: "sm",
                pill: false,
                uniform: true,
                disabled: !table.getCanNextPage(),
                onClick: () => table.nextPage(),
              },
              { default: () => h(ChevronRightMd) },
            ),
          ]),
        ]),
      ])
    }
  },
})

export type DataTablePaginationProps<TData> = {
  table: Table<TData>
}

/** Rows-per-page select, range label and previous/next buttons for a TanStack table. */
export const DataTablePagination = DataTablePaginationComponent
