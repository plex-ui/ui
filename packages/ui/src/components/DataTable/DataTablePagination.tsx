"use client"

import { type Table } from "@tanstack/react-table"
import { Button } from "../Button"
import { ChevronLeftMd, ChevronRightMd } from "../Icon"
import s from "@plexui/styles/components/DataTable/DataTable.module.css"

export type DataTablePaginationProps<TData> = {
  table: Table<TData>
}

export const DataTablePagination = <TData,>({ table }: DataTablePaginationProps<TData>) => {
  const totalRows = table.getFilteredRowModel().rows.length
  const { pageIndex, pageSize } = table.getState().pagination
  const from = pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, totalRows)

  return (
    <div className={s.Pagination}>
      <div className={s.PaginationLeft}>
        <span className={s.PaginationLabel}>Rows per page</span>
        <select
          aria-label="Rows per page"
          className={s.PaginationSelect}
          value={pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
        >
          {[10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
      <div className={s.PaginationRight}>
        <span className={s.PaginationInfo}>
          {totalRows === 0 ? "0 results" : `${from}–${to} of ${totalRows}`}
        </span>
        <div className={s.PaginationButtons}>
          <Button
            color="secondary"
            variant="outline"
            size="sm"
            pill={false}
            uniform
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            aria-label="Previous page"
          >
            <ChevronLeftMd />
          </Button>
          <Button
            color="secondary"
            variant="outline"
            size="sm"
            pill={false}
            uniform
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            aria-label="Next page"
          >
            <ChevronRightMd />
          </Button>
        </div>
      </div>
    </div>
  )
}
