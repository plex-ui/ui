import { computed, defineComponent, h, ref, shallowRef, watch, type PropType, type VNode, type VNodeChild } from "vue"
import {
  FlexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
  type ColumnDef,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Updater,
  type VisibilityState,
} from "@tanstack/vue-table"
import { Checkbox, type CheckedState } from "../Checkbox/index.js"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../Table/index.js"
import { DataTablePagination } from "./DataTablePagination.js"
import s from "@plexui/styles/components/DataTable/DataTable.module.css"

// Augments table-core, which @tanstack/vue-table re-exports: @plexui/ui
// augments the same module, so both declarations merge when a project
// type-checks the two packages together
declare module "@tanstack/table-core" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "center" | "right"
  }
}

// Vue port of packages/ui/src/components/DataTable/DataTable.tsx on
// @tanstack/vue-table (same table-core as @tanstack/react-table), with the
// same table options and FlexRender for headers and cells.
//
// - `globalFilter`, `columnVisibility` and `rowSelection` are controlled
//   when the prop is passed (`v-model:global-filter`, ...) and held by the
//   table otherwise, as in React; `update:*` is emitted with the next value
//   either way.
// - `onRowClick` is a function prop (`@row-click` in templates) because its
//   presence makes the rows interactive (`data-clickable`).
// - `emptyMessage` is a prop with the `emptyMessage` slot taking precedence.
// - `enableRowSelection` puts the same checkbox column first, with Checkbox.
// - React passes only its own props: the root takes the caller's `class`.
//
// useReactTable and useVueTable merge options differently: React spreads
// `state: { ...internal, ...options.state }`, so a key whose value is
// undefined (a reset global filter) is undefined in `getState()`. vue-table
// falls back to its internal state for undefined keys, so that internal
// state starts undefined for those three keys (`initialState`) and no
// updater ever writes them (each has its own change handler).

// Id of the checkbox column `enableRowSelection` puts before the columns
const SELECT_COLUMN_ID = "select"

const selectColumn: ColumnDef<any, unknown> = {
  id: SELECT_COLUMN_ID,
  header: ({ table }) =>
    h(Checkbox, {
      "aria-label": "Select all rows",
      "checked": table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? "indeterminate" : false,
      "onUpdate:checked": (checked: CheckedState) => table.toggleAllRowsSelected(checked === true),
    }),
  cell: ({ row }) =>
    h(Checkbox, {
      "aria-label": "Select row",
      "checked": row.getIsSelected(),
      "onUpdate:checked": (checked: CheckedState) => row.toggleSelected(checked === true),
    }),
  enableHiding: false,
}

const resolveUpdater = <T>(updater: Updater<T>, value: T): T => {
  return typeof updater === "function" ? (updater as (old: T) => T)(value) : updater
}

// One piece of table state: controlled when `controlled()` is defined,
// otherwise held here, with `onChange` as a notification either way.
// Successive updaters build on each other instead of on the value read at
// render.
const useTableState = <T>(
  controlled: () => T | undefined,
  initial: T,
  onChange: (next: T) => void,
): [() => T, (updater: Updater<T>) => void] => {
  // Uncontrolled: only the handler writes the state, and it is current at once
  const internal = shallowRef<T>(initial)
  // Controlled: the parent may reject or rewrite a change, so accumulate only
  // within one batch and start every new batch from the current prop
  let batch: { base: T; next: T } | null = null

  const handleChange = (updater: Updater<T>) => {
    const value = controlled()
    let next: T
    if (value === undefined) {
      next = resolveUpdater(updater, internal.value)
      internal.value = next
    } else {
      const pending = batch
      const previous = pending && pending.base === value ? pending.next : value
      next = resolveUpdater(updater, previous)
      if (!pending) {
        queueMicrotask(() => {
          batch = null
        })
      }
      batch = { base: value, next }
    }
    onChange(next)
  }

  return [() => controlled() ?? internal.value, handleChange]
}

const DataTableComponent = defineComponent({
  name: "DataTable",
  inheritAttrs: false,
  props: {
    /** Column definitions following TanStack Table v8 ColumnDef API */
    columns: { type: Array as PropType<ColumnDef<any, unknown>[]>, required: true },
    /** Data array to display */
    data: { type: Array as PropType<any[]>, required: true },
    /**
     * Visual variant
     * - `"default"`: borderless table with transparent header
     * - `"bordered"`: rounded border around the table with a tinted header background
     * @default "default"
     */
    variant: { type: String as PropType<"default" | "bordered">, default: "default" },
    /** External search/filter string (controlled, `v-model:global-filter`) */
    globalFilter: { type: String, default: undefined },
    /** Click handler for rows; makes rows interactive (`@row-click`) */
    onRowClick: Function as PropType<(row: any) => void>,
    /** Number of rows per page. Set to 0 or Infinity to disable pagination. @default 10 */
    pageSize: { type: Number, default: 10 },
    /** Initial sorting state */
    initialSorting: Array as PropType<SortingState>,
    /** Controlled column visibility (`v-model:column-visibility`) */
    columnVisibility: Object as PropType<VisibilityState>,
    /**
     * Enable row selection: adds a first column with a checkbox per row and a
     * header checkbox that selects every row. @default false
     */
    enableRowSelection: { type: Boolean, default: false },
    /** Controlled row selection state (`v-model:row-selection`) */
    rowSelection: Object as PropType<RowSelectionState>,
    /** Custom row ID accessor */
    getRowId: Function as PropType<(row: any) => string>,
    /** Message shown when there are no rows (or the `emptyMessage` slot). @default "No results." */
    emptyMessage: {
      type: [String, Number, Object] as PropType<string | number | VNode | null>,
      default: "No results.",
    },
    /** Whether to show pagination controls. Auto-hidden when all rows fit. @default true */
    showPagination: { type: Boolean, default: true },
  },
  emits: {
    "update:globalFilter": (_value: string) => true,
    "update:columnVisibility": (_visibility: VisibilityState) => true,
    "update:rowSelection": (_selection: RowSelectionState) => true,
  },
  setup(props, { attrs, slots, emit }) {
    const sorting = ref<SortingState>(props.initialSorting ?? [])

    const shouldPaginate = () => Number.isFinite(props.pageSize) && props.pageSize > 0
    const paginationRowModel = getPaginationRowModel<any>()

    const [globalFilter, handleGlobalFilterChange] = useTableState<string>(
      () => props.globalFilter,
      "",
      (next) => emit("update:globalFilter", next),
    )
    const [columnVisibility, handleColumnVisibilityChange] = useTableState<VisibilityState>(
      () => props.columnVisibility,
      {},
      (next) => emit("update:columnVisibility", next),
    )
    const [rowSelection, handleRowSelectionChange] = useTableState<RowSelectionState>(
      () => props.rowSelection,
      {},
      (next) => emit("update:rowSelection", next),
    )

    const columns = computed(() => (props.enableRowSelection ? [selectColumn, ...props.columns] : props.columns))
    const isSelectColumn = (id: string) => props.enableRowSelection && id === SELECT_COLUMN_ID

    const table = useVueTable<any>({
      get data() {
        return props.data
      },
      get columns() {
        return columns.value
      },
      state: {
        get sorting() {
          return sorting.value
        },
        get globalFilter() {
          return globalFilter()
        },
        get columnVisibility() {
          return columnVisibility()
        },
        get rowSelection() {
          return rowSelection()
        },
      },
      initialState: {
        globalFilter: undefined,
        columnVisibility: undefined,
        rowSelection: undefined,
        ...(shouldPaginate() ? { pagination: { pageIndex: 0, pageSize: props.pageSize } } : {}),
      },
      onSortingChange: (updater) => {
        sorting.value = resolveUpdater(updater, sorting.value)
      },
      onGlobalFilterChange: handleGlobalFilterChange,
      onColumnVisibilityChange: handleColumnVisibilityChange,
      onRowSelectionChange: handleRowSelectionChange,
      get getRowId() {
        const { getRowId } = props
        return getRowId ? (originalRow: any) => getRowId(originalRow) : undefined
      },
      get enableRowSelection() {
        return props.enableRowSelection
      },
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      // TanStack keeps its pagination model once created, so a disabled
      // pageSize (0 or Infinity) switches pagination off explicitly, and back on
      get manualPagination() {
        return !shouldPaginate()
      },
      get getPaginationRowModel() {
        return shouldPaginate() ? paginationRowModel : undefined
      },
    })

    // pageSize only seeds initialState, so apply later prop changes to the table
    watch(
      () => props.pageSize,
      (pageSize, previous) => {
        if (!shouldPaginate()) return
        if (Number.isFinite(previous) && previous > 0) {
          table.setPageSize(pageSize)
        } else {
          // Page index is not auto-reset while pagination is off (filters may
          // have changed since), so start over from the first page
          table.setPagination({ pageIndex: 0, pageSize })
        }
      },
    )

    return () => {
      const headerGroups = table.getHeaderGroups()
      const rows = table.getRowModel().rows
      const totalRows = table.getFilteredRowModel().rows.length
      // Hidden only when every row fits on one page, both at the configured
      // page size and at the one picked in the rows-per-page select
      const hasPagination =
        shouldPaginate() && totalRows > Math.min(props.pageSize, table.getState().pagination.pageSize)
      const visibleColumnCount = Math.max(table.getVisibleLeafColumns().length, 1)
      const { onRowClick } = props

      const headerRows = headerGroups.map((headerGroup) =>
        h(
          TableRow,
          { key: headerGroup.id },
          {
            default: () =>
              headerGroup.headers.map((header) => {
                const align = header.column.columnDef.meta?.align
                // aria-sort goes on one header at a time: the primary sort
                // column's real header, not its group placeholders
                const sorted =
                  !header.isPlaceholder && header.column.getSortIndex() === 0 ? header.column.getIsSorted() : false
                return h(
                  TableHead,
                  {
                    "key": header.id,
                    "colspan": header.colSpan > 1 ? header.colSpan : undefined,
                    "class": isSelectColumn(header.column.id) ? s.SelectColumn : undefined,
                    ...(align ? { style: { textAlign: align } } : {}),
                    "aria-sort": sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined,
                  },
                  {
                    default: () =>
                      header.isPlaceholder
                        ? null
                        : h(FlexRender, { render: header.column.columnDef.header, props: header.getContext() }),
                  },
                )
              }),
          },
        ),
      )

      const bodyRows =
        rows.length === 0
          ? [
              h(TableRow, null, {
                default: () => [
                  h(
                    TableCell,
                    { colspan: visibleColumnCount, class: s.EmptyCell },
                    { default: (): VNodeChild => (slots.emptyMessage ? slots.emptyMessage() : props.emptyMessage) },
                  ),
                ],
              }),
            ]
          : rows.map((row) => {
              const cells = row.getVisibleCells()
              return h(
                TableRow,
                {
                  key: row.id,
                  ...(onRowClick
                    ? {
                        // Clickable rows are reached with Tab and activated
                        // with Enter or Space, like a button
                        tabindex: 0,
                        onClick: () => onRowClick(row.original),
                        onKeydown: (event: KeyboardEvent) => {
                          // Keys on a control inside the row are the control's
                          if (event.target !== event.currentTarget) return
                          if (event.key !== "Enter" && event.key !== " ") return
                          event.preventDefault()
                          onRowClick(row.original)
                        },
                      }
                    : {}),
                },
                {
                  default: () =>
                    cells.map((cell) => {
                      const align = cell.column.columnDef.meta?.align
                      return h(
                        TableCell,
                        {
                          key: cell.id,
                          ...(align ? { style: { textAlign: align } } : {}),
                          // A click on a selection checkbox is not a row click
                          ...(onRowClick && isSelectColumn(cell.column.id)
                            ? { onClick: (event: MouseEvent) => event.stopPropagation() }
                            : {}),
                        },
                        {
                          default: () =>
                            h(FlexRender, { render: cell.column.columnDef.cell, props: cell.getContext() }),
                        },
                      )
                    }),
                },
              )
            })

      return h(
        "div",
        {
          "class": [s.DataTable, attrs.class],
          "data-variant": props.variant,
          "data-clickable": onRowClick ? "" : undefined,
        },
        [
          h("div", { class: s.TableContainer }, [
            h(Table, null, {
              default: () => [
                h(TableHeader, null, { default: () => headerRows }),
                h(TableBody, null, { default: () => bodyRows }),
              ],
            }),
          ]),
          props.showPagination && hasPagination ? h(DataTablePagination, { table }) : null,
        ],
      )
    }
  },
})

export type DataTableProps<TData> = {
  /** Column definitions following TanStack Table v8 ColumnDef API */
  columns: ColumnDef<TData, unknown>[]
  /** Data array to display */
  data: TData[]
  /** Visual variant. @default "default" */
  variant?: "default" | "bordered"
  /** External search/filter string (controlled) */
  globalFilter?: string
  /** Called with the next filter string (`v-model:global-filter`) */
  "onUpdate:globalFilter"?: (value: string) => void
  /** Click handler for rows */
  onRowClick?: (row: TData) => void
  /** Number of rows per page. Set to 0 or Infinity to disable pagination. @default 10 */
  pageSize?: number
  /** Initial sorting state */
  initialSorting?: SortingState
  /** Controlled column visibility */
  columnVisibility?: VisibilityState
  /** Called with the next column visibility (`v-model:column-visibility`) */
  "onUpdate:columnVisibility"?: (visibility: VisibilityState) => void
  /** Enable row selection: a first column of checkboxes, with select-all in the header. @default false */
  enableRowSelection?: boolean
  /** Controlled row selection state */
  rowSelection?: RowSelectionState
  /** Called with the next row selection (`v-model:row-selection`) */
  "onUpdate:rowSelection"?: (selection: RowSelectionState) => void
  /** Custom row ID accessor */
  getRowId?: (row: TData) => string
  /** Message shown when there are no rows. @default "No results." */
  emptyMessage?: string | number | VNode | null
  /** Class applied to the outermost wrapper */
  class?: unknown
  /** Whether to show pagination controls. Auto-hidden when all rows fit. @default true */
  showPagination?: boolean
}

/**
 * Data table on TanStack Table v8: sorting, global filter, pagination,
 * column visibility and row clicks. Typed as a plain component so `h()` and
 * templates accept it; `DataTableProps<TData>` is the typed props shape.
 */
export const DataTable = DataTableComponent
