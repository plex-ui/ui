import { defineComponent, h, ref, type PropType, type VNode, type VNodeChild } from "vue"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../Table/index.js"
import { DataTablePagination } from "./DataTablePagination.js"
import s from "@plexui/styles/components/DataTable/DataTable.module.css"

declare module "@tanstack/vue-table" {
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
//   only (`v-model:global-filter`, ...), as in React: the table never changes
//   them itself, it emits `update:*` with the next value.
// - `onRowClick` is a function prop (`@row-click` in templates) because its
//   presence makes the rows interactive (`data-clickable`).
// - `emptyMessage` is a prop with the `emptyMessage` slot taking precedence.
// - React passes only its own props: the root takes the caller's `class`.
//
// useReactTable and useVueTable merge options differently, so the options
// below make the effective table state equal React's:
// - React spreads `state: { ...internal, ...options.state }`, so a key the
//   caller leaves undefined is undefined in `getState()`. vue-table falls
//   back to its internal state for undefined keys, so that internal state
//   starts undefined for the three controlled keys (`initialState`) and no
//   updater ever writes them (each has its own change handler).
// - React leaves `onXChange` undefined without a callback, which makes the
//   table's setter a no-op; here the handler emits, and an emit without a
//   listener does nothing either.

const resolveUpdater = <T>(updater: Updater<T>, value: T): T => {
  return typeof updater === "function" ? (updater as (old: T) => T)(value) : updater
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
    /** Enable row selection. @default false */
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

    const table = useVueTable<any>({
      get data() {
        return props.data
      },
      get columns() {
        return props.columns
      },
      state: {
        get sorting() {
          return sorting.value
        },
        get globalFilter() {
          return props.globalFilter
        },
        get columnVisibility() {
          return props.columnVisibility
        },
        get rowSelection() {
          return props.rowSelection
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
      onGlobalFilterChange: (updater: Updater<string>) => {
        emit("update:globalFilter", resolveUpdater(updater, props.globalFilter ?? ""))
      },
      onColumnVisibilityChange: (updater) => {
        emit("update:columnVisibility", resolveUpdater(updater, props.columnVisibility ?? {}))
      },
      onRowSelectionChange: (updater) => {
        emit("update:rowSelection", resolveUpdater(updater, props.rowSelection ?? {}))
      },
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
      get getPaginationRowModel() {
        return shouldPaginate() ? paginationRowModel : undefined
      },
    })

    return () => {
      const headerGroups = table.getHeaderGroups()
      const rows = table.getRowModel().rows
      const totalRows = table.getFilteredRowModel().rows.length
      const hasPagination = shouldPaginate() && totalRows > props.pageSize
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
                return h(
                  TableHead,
                  { key: header.id, ...(align ? { style: { textAlign: align } } : {}) },
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
                { key: row.id, ...(onRowClick ? { onClick: () => onRowClick(row.original) } : {}) },
                {
                  default: () =>
                    cells.map((cell) => {
                      const align = cell.column.columnDef.meta?.align
                      return h(
                        TableCell,
                        { key: cell.id, ...(align ? { style: { textAlign: align } } : {}) },
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
  /** Enable row selection. @default false */
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
