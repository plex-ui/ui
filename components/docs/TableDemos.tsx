'use client';

import React, { useId, useMemo, useState } from 'react';
import {
  DataTable,
  DataTableColumnHeader,
  dateTimeCell,
  idCell,
  statusCell,
  tooltipHeader,
  type ColumnDef,
  type RowSelectionState,
  type VisibilityState,
} from '@plexui/ui/components/DataTable';
import { Input } from '@plexui/ui/components/Input';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Switch } from '@plexui/ui/components/Switch';

const controlsTableStyle: React.CSSProperties = {
  background: 'var(--docs-surface-elevated)',
  width: '100%',
};

const controlRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 16px 6px 8px',
  borderTop: '1px solid var(--color-fd-border)',
};

const controlLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: '0.8125rem',
  padding: '2px 8px',
};

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

const users: User[] = [
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
];

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function DemoControlBoolean({
  name,
  value,
  onChange,
}: {
  name: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const controlId = useId();

  return (
    <div style={controlRowStyle}>
      <label htmlFor={controlId} style={controlLabelStyle}>
        {name}
      </label>
      <Switch id={controlId} checked={value} onCheckedChange={onChange} aria-label={name} />
    </div>
  );
}

export function TableSortingDemo() {
  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'role',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      },
    ],
    [],
  );

  return (
    <div data-demo-stage className="py-6 px-2 w-full">
      <DataTable columns={columns} data={users} pageSize={5} initialSorting={[{ id: 'name', desc: false }]} />
    </div>
  );
}

export function TablePaginationDemo() {
  const columns: ColumnDef<User>[] = useMemo(
    () => [
      { accessorKey: 'id', header: 'ID' },
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'department', header: 'Department' },
      { accessorKey: 'status', header: 'Status' },
    ],
    [],
  );

  return (
    <div data-demo-stage className="py-6 px-2 w-full">
      <DataTable columns={columns} data={users} pageSize={5} />
    </div>
  );
}

export function TableRowClickDemo() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      { accessorKey: 'email', header: 'Email' },
      { accessorKey: 'role', header: 'Role' },
    ],
    [],
  );

  return (
    <div data-demo-stage className="py-6 px-2 w-full">
      <DataTable columns={columns} data={users.slice(0, 8)} pageSize={4} onRowClick={setSelectedUser} />
      <p className="mt-3 text-sm text-secondary">
        {selectedUser
          ? 'Clicked: ' + selectedUser.name + ' (' + selectedUser.id + ') - ' + selectedUser.department
          : 'Click a row to see selected user details.'}
      </p>
    </div>
  );
}

export function TableRowSelectionDemo() {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      { accessorKey: 'role', header: 'Role' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: statusCell<User>((row) => row.status),
      },
    ],
    [],
  );

  return (
    <div data-demo-stage className="py-6 px-2 w-full">
      <DataTable
        columns={columns}
        data={users}
        pageSize={5}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(user) => user.id}
      />
      <p className="mt-3 text-sm text-secondary">
        {Object.keys(rowSelection).length} of {users.length} rows selected
      </p>
    </div>
  );
}

export function TableCellVariantsDemo() {
  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: idCell<User>((row) => row.id),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: statusCell<User>((row) => row.status),
      },
      {
        accessorKey: 'joined',
        header: 'Joined',
        cell: dateTimeCell<User>((row) => row.joined),
      },
      {
        accessorKey: 'salary',
        header: tooltipHeader('Salary', 'Annual base salary in USD.'),
        meta: { align: 'right' as const },
        cell: ({ row }) => <span className="font-medium">{moneyFormatter.format(row.original.salary)}</span>,
      },
    ],
    [],
  );

  return (
    <div data-demo-stage className="py-6 px-2 w-full">
      <DataTable columns={columns} data={users} pageSize={6} />
    </div>
  );
}

export function TableFilteringDemo() {
  const [globalFilter, setGlobalFilter] = useState('');
  const filterInputId = useId();

  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      { accessorKey: 'role', header: 'Role' },
      { accessorKey: 'department', header: 'Department' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: statusCell<User>((row) => row.status),
      },
    ],
    [],
  );

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
      <div data-demo-stage className="py-6 px-2 w-full">
        <DataTable
          columns={columns}
          data={users}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          pageSize={5}
        />
      </div>
    </>
  );
}

export function TableColumnVisibilityDemo() {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    role: true,
    department: true,
    status: true,
    salary: true,
  });

  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      { accessorKey: 'role', header: 'Role' },
      { accessorKey: 'department', header: 'Department' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: statusCell<User>((row) => row.status),
      },
      {
        accessorKey: 'salary',
        header: 'Salary',
        meta: { align: 'right' as const },
        cell: ({ row }) => <span>{moneyFormatter.format(row.original.salary)}</span>,
      },
    ],
    [],
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean
          name="role"
          value={columnVisibility.role !== false}
          onChange={(checked) => setColumnVisibility((prev) => ({ ...prev, role: checked }))}
        />
        <DemoControlBoolean
          name="department"
          value={columnVisibility.department !== false}
          onChange={(checked) => setColumnVisibility((prev) => ({ ...prev, department: checked }))}
        />
        <DemoControlBoolean
          name="status"
          value={columnVisibility.status !== false}
          onChange={(checked) => setColumnVisibility((prev) => ({ ...prev, status: checked }))}
        />
        <DemoControlBoolean
          name="salary"
          value={columnVisibility.salary !== false}
          onChange={(checked) => setColumnVisibility((prev) => ({ ...prev, salary: checked }))}
        />
      </div>
      <div data-demo-stage className="py-6 px-2 w-full">
        <DataTable
          columns={columns}
          data={users}
          pageSize={5}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      </div>
    </>
  );
}

export function TableEmptyStateDemo() {
  const columns: ColumnDef<User>[] = useMemo(
    () => [
      { accessorKey: 'id', header: 'ID' },
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'email', header: 'Email' },
      { accessorKey: 'status', header: 'Status' },
    ],
    [],
  );

  return (
    <div data-demo-stage className="py-6 px-2 w-full">
      <DataTable columns={columns} data={[]} emptyMessage="No users found." />
    </div>
  );
}

const VARIANTS = ['default', 'bordered'] as const;

export function TableVariantDemo() {
  const [variant, setVariant] = useState<(typeof VARIANTS)[number]>('bordered');

  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      { accessorKey: 'role', header: 'Role' },
      { accessorKey: 'department', header: 'Department' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: statusCell<User>((row) => row.status),
      },
    ],
    [],
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <div style={controlRowStyle}>
          <span style={controlLabelStyle}>variant</span>
          <SegmentedControl<(typeof VARIANTS)[number]>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            {VARIANTS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>
                {v}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </div>
      </div>
      <div data-demo-stage className="py-6 px-2 w-full">
        <DataTable columns={columns} data={users.slice(0, 6)} variant={variant} pageSize={Infinity} />
      </div>
    </>
  );
}
