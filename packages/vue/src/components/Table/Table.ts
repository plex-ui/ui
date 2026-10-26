import {
  defineComponent,
  h,
  type HTMLAttributes,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "vue"
import s from "@plexui/styles/components/Table/Table.module.css"

// Vue port of packages/ui/src/components/Table/Table.tsx. Every part renders
// its native element with the part's class merged before the caller's, and
// forwards all other attributes and listeners, as React's `{...props}` does.

type Parts<Props> = { new (): { $props: Props } }

const part = (name: string, tag: string, className: string | undefined) =>
  defineComponent({
    name,
    setup(_props, { slots }) {
      // Attributes fall through to the root element; Vue merges `class`
      // after the part's own class, like clsx(s.Part, className)
      return () => h(tag, { class: className }, slots.default?.())
    },
  })

export type TableProps = TableHTMLAttributes

/** Root `<table>`, inside a horizontally scrollable wrapper. Attributes go to the `<table>`. */
const TableComponent = defineComponent({
  name: "Table",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () =>
      h("div", { class: s.TableWrapper }, [
        h("table", { ...attrs, class: [s.Table, attrs.class] }, slots.default?.()),
      ])
  },
})
export const Table = TableComponent as typeof TableComponent & Parts<TableProps>

export type TableHeaderProps = HTMLAttributes
export const TableHeader = part("TableHeader", "thead", s.TableHeader) as ReturnType<typeof part> & Parts<TableHeaderProps>

export type TableBodyProps = HTMLAttributes
export const TableBody = part("TableBody", "tbody", s.TableBody) as ReturnType<typeof part> & Parts<TableBodyProps>

export type TableFooterProps = HTMLAttributes
export const TableFooter = part("TableFooter", "tfoot", s.TableFooter) as ReturnType<typeof part> & Parts<TableFooterProps>

export type TableRowProps = HTMLAttributes
export const TableRow = part("TableRow", "tr", s.TableRow) as ReturnType<typeof part> & Parts<TableRowProps>

export type TableHeadProps = ThHTMLAttributes
export const TableHead = part("TableHead", "th", s.TableHead) as ReturnType<typeof part> & Parts<TableHeadProps>

export type TableCellProps = TdHTMLAttributes
export const TableCell = part("TableCell", "td", s.TableCell) as ReturnType<typeof part> & Parts<TableCellProps>

export type TableCaptionProps = HTMLAttributes
export const TableCaption = part("TableCaption", "caption", s.TableCaption) as ReturnType<typeof part> & Parts<TableCaptionProps>
