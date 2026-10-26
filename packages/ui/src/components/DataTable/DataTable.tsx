"use client"

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Updater,
  type VisibilityState,
} from "@tanstack/react-table"

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "center" | "right"
  }
}
import clsx from "clsx"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../Table"
import { DataTablePagination } from "./DataTablePagination"
import s from "./DataTable.module.css"

export type DataTableProps<TData> = {
  /** Column definitions following TanStack Table v8 ColumnDef API */
  columns: ColumnDef<TData, unknown>[]
  /** Data array to display */
  data: TData[]
  /** Visual variant
   * - `"default"` — borderless table with transparent header
   * - `"bordered"` — rounded border around the table with a tinted header background
   * @default "default"
   */
  variant?: "default" | "bordered"
  /** External search/filter string (controlled) */
  globalFilter?: string
  /** Callback when global filter changes */
  onGlobalFilterChange?: (value: string) => void
  /** Click handler for rows */
  onRowClick?: (row: TData) => void
  /** Number of rows per page. Set to 0 or Infinity to disable pagination.
   * @default 10
   */
  pageSize?: number
  /** Initial sorting state */
  initialSorting?: SortingState
  /** Controlled column visibility */
  columnVisibility?: VisibilityState
  /** Callback when column visibility changes */
  onColumnVisibilityChange?: (visibility: VisibilityState) => void
  /** Enable row selection checkboxes
   * @default false
   */
  enableRowSelection?: boolean
  /** Controlled row selection state */
  rowSelection?: RowSelectionState
  /** Callback when row selection changes */
  onRowSelectionChange?: (selection: RowSelectionState) => void
  /** Custom row ID accessor */
  getRowId?: (row: TData) => string
  /** Message shown when there are no rows
   * @default "No results."
   */
  emptyMessage?: ReactNode
  /** Class applied to the outermost wrapper */
  className?: string
  /** Whether to show pagination controls. Auto-hidden when all rows fit.
   * @default true
   */
  showPagination?: boolean
}

const resolveUpdater = <T,>(updater: Updater<T>, value: T): T => {
  return typeof updater === "function" ? (updater as (old: T) => T)(value) : updater
}

export const DataTable = <TData,>({
  columns,
  data,
  variant = "default",
  globalFilter,
  onGlobalFilterChange,
  onRowClick,
  pageSize = 10,
  initialSorting,
  columnVisibility,
  onColumnVisibilityChange,
  enableRowSelection = false,
  rowSelection,
  onRowSelectionChange,
  getRowId,
  emptyMessage = "No results.",
  className,
  showPagination = true,
}: DataTableProps<TData>) => {
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? [])

  const shouldPaginate = Number.isFinite(pageSize) && pageSize > 0

  // Each piece of state is controlled only when its value prop is passed;
  // otherwise it lives here and the on*Change prop is just a notification.
  const [internalGlobalFilter, setInternalGlobalFilter] = useState("")
  const [internalColumnVisibility, setInternalColumnVisibility] = useState<VisibilityState>({})
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({})
  const effectiveGlobalFilter = globalFilter ?? internalGlobalFilter
  const effectiveColumnVisibility = columnVisibility ?? internalColumnVisibility
  const effectiveRowSelection = rowSelection ?? internalRowSelection

  const handleGlobalFilterChange: OnChangeFn<string> = (updater) => {
    const next = resolveUpdater(updater, effectiveGlobalFilter)
    if (globalFilter === undefined) {
      setInternalGlobalFilter(next)
    }
    onGlobalFilterChange?.(next)
  }

  const handleColumnVisibilityChange: OnChangeFn<VisibilityState> = (updater) => {
    const next = resolveUpdater(updater, effectiveColumnVisibility)
    if (columnVisibility === undefined) {
      setInternalColumnVisibility(next)
    }
    onColumnVisibilityChange?.(next)
  }

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    const next = resolveUpdater(updater, effectiveRowSelection)
    if (rowSelection === undefined) {
      setInternalRowSelection(next)
    }
    onRowSelectionChange?.(next)
  }

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter: effectiveGlobalFilter,
      columnVisibility: effectiveColumnVisibility,
      rowSelection: effectiveRowSelection,
    },
    ...(shouldPaginate ? { initialState: { pagination: { pageIndex: 0, pageSize } } } : {}),
    onSortingChange: setSorting,
    onGlobalFilterChange: handleGlobalFilterChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onRowSelectionChange: handleRowSelectionChange,
    getRowId: getRowId ? (originalRow) => getRowId(originalRow) : undefined,
    enableRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // TanStack keeps its pagination model once created and merges options
    // across renders, so a disabled pageSize (0 or Infinity) switches
    // pagination off explicitly, and back on, on every render
    manualPagination: !shouldPaginate,
    ...(shouldPaginate ? { getPaginationRowModel: getPaginationRowModel() } : {}),
  })

  // pageSize only seeds initialState, so apply later prop changes to the table
  const appliedPageSize = useRef(pageSize)
  useEffect(() => {
    if (appliedPageSize.current === pageSize) {
      return
    }
    appliedPageSize.current = pageSize
    if (shouldPaginate) {
      table.setPageSize(pageSize)
    }
  }, [table, pageSize, shouldPaginate])

  const rows = table.getRowModel().rows
  const totalRows = table.getFilteredRowModel().rows.length
  const hasPagination = shouldPaginate && totalRows > pageSize
  const visibleColumnCount = Math.max(table.getVisibleLeafColumns().length, 1)

  return (
    <div
      className={clsx(s.DataTable, className)}
      data-variant={variant}
      data-clickable={onRowClick ? "" : undefined}
    >
      <div className={s.TableContainer}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const align = header.column.columnDef.meta?.align
                  return (
                    <TableHead key={header.id} style={align ? { textAlign: align } : undefined}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className={s.EmptyCell}>
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => {
                    const align = cell.column.columnDef.meta?.align
                    return (
                      <TableCell key={cell.id} style={align ? { textAlign: align } : undefined}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {showPagination && hasPagination && <DataTablePagination table={table} />}
    </div>
  )
}
