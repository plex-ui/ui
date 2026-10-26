"use client"

import clsx from "clsx"
import { type ComponentPropsWithRef } from "react"
import s from "@plexui/styles/components/Table/Table.module.css"

export type TableProps = ComponentPropsWithRef<"table">
export const Table = ({ className, ...props }: TableProps) => (
  <div className={s.TableWrapper}>
    <table className={clsx(s.Table, className)} {...props} />
  </div>
)

export type TableHeaderProps = ComponentPropsWithRef<"thead">
export const TableHeader = ({ className, ...props }: TableHeaderProps) => (
  <thead className={clsx(s.TableHeader, className)} {...props} />
)

export type TableBodyProps = ComponentPropsWithRef<"tbody">
export const TableBody = ({ className, ...props }: TableBodyProps) => (
  <tbody className={clsx(s.TableBody, className)} {...props} />
)

export type TableFooterProps = ComponentPropsWithRef<"tfoot">
export const TableFooter = ({ className, ...props }: TableFooterProps) => (
  <tfoot className={clsx(s.TableFooter, className)} {...props} />
)

export type TableRowProps = ComponentPropsWithRef<"tr">
export const TableRow = ({ className, ...props }: TableRowProps) => (
  <tr className={clsx(s.TableRow, className)} {...props} />
)

export type TableHeadProps = ComponentPropsWithRef<"th">
export const TableHead = ({ className, ...props }: TableHeadProps) => (
  <th className={clsx(s.TableHead, className)} {...props} />
)

export type TableCellProps = ComponentPropsWithRef<"td">
export const TableCell = ({ className, ...props }: TableCellProps) => (
  <td className={clsx(s.TableCell, className)} {...props} />
)

export type TableCaptionProps = ComponentPropsWithRef<"caption">
export const TableCaption = ({ className, ...props }: TableCaptionProps) => (
  <caption className={clsx(s.TableCaption, className)} {...props} />
)
