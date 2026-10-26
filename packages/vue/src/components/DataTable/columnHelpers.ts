import { h, type VNode } from "vue"
import type { CellContext, HeaderContext } from "@tanstack/vue-table"
import { Badge, type BadgeColor } from "../Badge/index.js"
import { CopyTooltip, Tooltip } from "../Tooltip/index.js"

// Vue port of packages/ui/src/components/DataTable/columnHelpers.tsx. Each
// helper returns a functional component for a column's `cell` or `header`;
// FlexRender renders it with the cell or header context as props, as
// flexRender does in React.

type StatusColor = Extract<BadgeColor, "secondary" | "success" | "danger" | "warning" | "info" | "discovery" | "caution">

/** A cell renderer: FlexRender calls it with the cell context. */
export type CellComponent<T> = ((context: CellContext<T, unknown>) => VNode) & { displayName?: string }

/** A header renderer: FlexRender calls it with the header context. */
export type HeaderComponent<T> = ((context: HeaderContext<T, unknown>) => VNode) & { displayName?: string }

/** Monospace ID that copies itself on click, with a copy tooltip. */
export function idCell<T>(accessor: (row: T) => string): CellComponent<T> {
  const IdCell: CellComponent<T> = ({ row }) => {
    const value = accessor(row.original)
    return h(
      CopyTooltip,
      { copyValue: value },
      {
        default: () =>
          h(
            "span",
            {
              style: {
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
              },
            },
            value,
          ),
      },
    )
  }
  IdCell.displayName = "IdCell"
  return IdCell
}

/** Date and time formatted with Intl.DateTimeFormat ("en-US"); "—" when empty. */
export function dateTimeCell<T>(
  accessor: (row: T) => string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): CellComponent<T> {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
  const fmt = new Intl.DateTimeFormat("en-US", options ?? defaultOptions)

  const DateTimeCell: CellComponent<T> = ({ row }) => {
    const val = accessor(row.original)
    return h("span", { style: { color: "var(--color-text-secondary)" } }, val ? fmt.format(new Date(val)) : "—")
  }
  DateTimeCell.displayName = "DateTimeCell"
  return DateTimeCell
}

/** Soft Badge whose color comes from the lowercased status (`colorMap`, or the default map). */
export function statusCell<T>(accessor: (row: T) => string, colorMap?: Record<string, StatusColor>): CellComponent<T> {
  const defaultColorMap: Record<string, StatusColor> = {
    active: "success",
    completed: "success",
    paid: "success",
    pending: "warning",
    processing: "info",
    inactive: "secondary",
    cancelled: "danger",
    failed: "danger",
    unpaid: "danger",
  }

  const StatusCell: CellComponent<T> = ({ row }) => {
    const status = accessor(row.original)
    const map = colorMap ?? defaultColorMap
    const color = map[status.toLowerCase()] ?? "secondary"
    return h(Badge, { color, variant: "soft" }, { default: () => status })
  }
  StatusCell.displayName = "StatusCell"
  return StatusCell
}

/** Header label with a dashed underline and a tooltip carrying `description`. */
export function tooltipHeader<T = any>(label: string, description: string): HeaderComponent<T> {
  const TooltipHeader: HeaderComponent<T> = () =>
    h(
      Tooltip,
      { content: description, side: "bottom", maxWidth: 260 },
      {
        default: () => h("span", { style: { cursor: "help", borderBottom: "1px dashed currentColor" } }, label),
      },
    )
  TooltipHeader.displayName = "TooltipHeader"
  return TooltipHeader
}
