"use client"

import { type Column } from "@tanstack/react-table"
import clsx from "clsx"
import { ArrowDownSm, ArrowUpSm, Sort } from "../Icon"
import s from "@plexui/styles/components/DataTable/DataTable.module.css"

export type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>
  title: string
  className?: string
}

export const DataTableColumnHeader = <TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) => {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>
  }

  const sorted = column.getIsSorted()

  return (
    <button
      type="button"
      className={clsx(s.ColumnHeaderButton, className)}
      data-sorted={sorted || undefined}
      onClick={column.getToggleSortingHandler()}
    >
      {title}
      <span className={s.SortIcon}>
        {sorted === "asc" ? <ArrowUpSm /> : sorted === "desc" ? <ArrowDownSm /> : <Sort />}
      </span>
    </button>
  )
}
