'use client';

import { useId, useMemo, useState, type ComponentProps, type CSSProperties } from 'react';
import { h, markRaw } from 'vue';
import { Input } from '@plexui/ui/components/Input';
import {
  DataTableColumnHeader,
  dateTimeCell,
  idCell,
  statusCell,
  tooltipHeader,
  type ColumnDef,
  type VisibilityState,
} from '@plexui/vue/components/DataTable';
import { DemoControlBoolean, controlsTableStyle } from '../ButtonDemos';
import { VuePreview } from '../VuePreview';
import { VueDemo } from './VueDemo';

// A DataTable example is a single-file component: its <script setup> builds
// the column definitions (header and cell renderers are functions returning
// VNodes), its <template> renders the table. Templates compile at runtime
// but scripts do not, so each example passes its whole SFC as `code` and the
// demo runs the <template> part with the same values the script declares:
// `users` (the React demos' data) and the example's `columns`, built here.

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department: string;
  joined: string;
  salary: number;
};

const users: User[] = markRaw([
  { id: 'USR-001', name: 'Lindsay Walton', email: 'lindsay@example.com', role: 'Front-end Developer', status: 'Active', department: 'Engineering', joined: '2023-01-15T09:00:00Z', salary: 95000 },
  { id: 'USR-002', name: 'Courtney Henry', email: 'courtney@example.com', role: 'Designer', status: 'Active', department: 'Design', joined: '2023-03-22T09:00:00Z', salary: 88000 },
  { id: 'USR-003', name: 'Tom Cook', email: 'tom@example.com', role: 'Director of Product', status: 'Active', department: 'Product', joined: '2022-06-10T09:00:00Z', salary: 120000 },
  { id: 'USR-004', name: 'Whitney Francis', email: 'whitney@example.com', role: 'Copywriter', status: 'Inactive', department: 'Marketing', joined: '2023-07-04T09:00:00Z', salary: 72000 },
  { id: 'USR-005', name: 'Leonard Krasner', email: 'leonard@example.com', role: 'Senior Developer', status: 'Active', department: 'Engineering', joined: '2022-02-18T09:00:00Z', salary: 115000 },
  { id: 'USR-006', name: 'Floyd Miles', email: 'floyd@example.com', role: 'UX Researcher', status: 'Active', department: 'Design', joined: '2023-05-11T09:00:00Z', salary: 85000 },
  { id: 'USR-007', name: 'Emily Selman', email: 'emily@example.com', role: 'VP Marketing', status: 'Active', department: 'Marketing', joined: '2021-11-20T09:00:00Z', salary: 130000 },
  { id: 'USR-008', name: 'Kristin Watson', email: 'kristin@example.com', role: 'Data Analyst', status: 'Pending', department: 'Engineering', joined: '2024-01-08T09:00:00Z', salary: 78000 },
  { id: 'USR-009', name: 'Emma Dorsey', email: 'emma@example.com', role: 'QA Engineer', status: 'Active', department: 'Engineering', joined: '2023-09-14T09:00:00Z', salary: 82000 },
  { id: 'USR-010', name: 'Alicia Bell', email: 'alicia@example.com', role: 'Product Manager', status: 'Active', department: 'Product', joined: '2023-04-01T09:00:00Z', salary: 105000 },
  { id: 'USR-011', name: 'Jenny Wilson', email: 'jenny@example.com', role: 'Designer', status: 'Cancelled', department: 'Design', joined: '2022-08-15T09:00:00Z', salary: 90000 },
  { id: 'USR-012', name: 'Anna Roberts', email: 'anna@example.com', role: 'Backend Developer', status: 'Active', department: 'Engineering', joined: '2023-02-28T09:00:00Z', salary: 98000 },
  { id: 'USR-013', name: 'Benjamin Russel', email: 'ben@example.com', role: 'DevOps Engineer', status: 'Active', department: 'Engineering', joined: '2022-12-05T09:00:00Z', salary: 110000 },
  { id: 'USR-014', name: 'Jeffrey Webb', email: 'jeffrey@example.com', role: 'Tech Lead', status: 'Active', department: 'Engineering', joined: '2021-09-01T09:00:00Z', salary: 135000 },
  { id: 'USR-015', name: 'Kathryn Murphy', email: 'kathryn@example.com', role: 'Content Strategist', status: 'Inactive', department: 'Marketing', joined: '2023-06-20T09:00:00Z', salary: 76000 },
]);

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const sortable = (title: string): ColumnDef<User>['header'] => ({ column }) => h(DataTableColumnHeader, { column, title });
const nameColumn: ColumnDef<User> = {
  accessorKey: 'name',
  header: sortable('Name'),
  cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name),
};
const statusColumn: ColumnDef<User> = { accessorKey: 'status', header: 'Status', cell: statusCell<User>((row) => row.status) };

/** The `columns` each example's <script setup> declares. */
const COLUMNS = {
  variant: [nameColumn, { accessorKey: 'role', header: 'Role' }, { accessorKey: 'department', header: 'Department' }, statusColumn],
  sorting: [
    nameColumn,
    { accessorKey: 'role', header: sortable('Role') },
    { accessorKey: 'status', header: sortable('Status') },
  ],
  pagination: [
    { accessorKey: 'id', header: 'ID' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'department', header: 'Department' },
    { accessorKey: 'status', header: 'Status' },
  ],
  rowClick: [nameColumn, { accessorKey: 'email', header: 'Email' }, { accessorKey: 'role', header: 'Role' }],
  rowSelection: [nameColumn, { accessorKey: 'role', header: 'Role' }, statusColumn],
  cellVariants: [
    { accessorKey: 'id', header: 'ID', cell: idCell<User>((row) => row.id) },
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name) },
    statusColumn,
    { accessorKey: 'joined', header: 'Joined', cell: dateTimeCell<User>((row) => row.joined) },
    {
      accessorKey: 'salary',
      header: tooltipHeader('Salary', 'Annual base salary in USD.'),
      meta: { align: 'right' },
      cell: ({ row }) => h('span', { class: 'font-medium' }, money.format(row.original.salary)),
    },
  ],
  filtering: [nameColumn, { accessorKey: 'role', header: 'Role' }, { accessorKey: 'department', header: 'Department' }, statusColumn],
  columnVisibility: [
    nameColumn,
    { accessorKey: 'role', header: 'Role' },
    { accessorKey: 'department', header: 'Department' },
    statusColumn,
    {
      accessorKey: 'salary',
      header: 'Salary',
      meta: { align: 'right' },
      cell: ({ row }) => h('span', money.format(row.original.salary)),
    },
  ],
  emptyState: [
    { accessorKey: 'id', header: 'ID' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'status', header: 'Status' },
  ],
} satisfies Record<string, ColumnDef<User>[]>;

type Example = keyof typeof COLUMNS;

// Functions live here, not in the page's `state`: an MDX page is a server
// component and cannot pass functions to this client one
const scopeOf = (example: Example) => ({
  users,
  columns: markRaw(COLUMNS[example]),
  getRowId: (user: User) => user.id,
});

/** The <template> block of a single-file component. */
const templateOf = (code: string) =>
  code.slice(code.indexOf('<template>') + '<template>'.length, code.lastIndexOf('</template>')).trim();

const STAGE = 'py-6 px-2 w-full';

type VueDataTableDemoProps = Omit<ComponentProps<typeof VueDemo>, 'template'> & {
  /** Which example's columns the template reads */
  example: Example;
  /** The example as a single-file component; the demo runs its <template> */
  code: string;
};

/** A VueDemo running an SFC's template with the example's `users` and `columns` in scope. */
export function VueDataTableDemo({ example, code, state, stageClassName = STAGE, ...props }: VueDataTableDemoProps) {
  const [scope] = useState(() => scopeOf(example));
  return <VueDemo {...props} template={templateOf(code)} stageClassName={stageClassName} state={{ ...scope, ...state }} />;
}

const controlRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 16px 6px 8px',
  borderTop: '1px solid var(--color-fd-border)',
};

const controlLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: '0.8125rem',
  padding: '2px 8px',
};

/** Filtering: the search field in the controls bar (as in the React demo) drives `globalFilter`. */
export function VueDataTableFilteringDemo({ code }: { code: string }) {
  const [scope] = useState(() => scopeOf('filtering'));
  const [globalFilter, setGlobalFilter] = useState('');
  const filterInputId = useId();
  const props = useMemo(() => ({ ...scope, globalFilter }), [scope, globalFilter]);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <div style={controlRowStyle}>
          <label htmlFor={filterInputId} style={controlLabelStyle}>
            globalFilter
          </label>
          <div style={{ width: 'min(420px, 100%)' }}>
            <Input
              id={filterInputId}
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              placeholder="Search name, role, department..."
            />
          </div>
        </div>
      </div>
      <div data-demo-stage className={STAGE}>
        <VuePreview template={templateOf(code)} props={props} />
      </div>
    </>
  );
}

const TOGGLEABLE = ['role', 'department', 'status', 'salary'] as const;

/** Column visibility: one switch per column (as in the React demo) drives `columnVisibility`. */
export function VueDataTableColumnVisibilityDemo({ code }: { code: string }) {
  const [scope] = useState(() => scopeOf('columnVisibility'));
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    role: true,
    department: true,
    status: true,
    salary: true,
  });
  const props = useMemo(() => ({ ...scope, columnVisibility }), [scope, columnVisibility]);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        {TOGGLEABLE.map((name) => (
          <DemoControlBoolean
            key={name}
            name={name}
            value={columnVisibility[name] !== false}
            onChange={(checked) => setColumnVisibility((prev) => ({ ...prev, [name]: checked }))}
          />
        ))}
      </div>
      <div data-demo-stage className={STAGE}>
        <VuePreview template={templateOf(code)} props={props} />
      </div>
    </>
  );
}
