'use client';

import { useState, type ReactNode } from 'react';
import type { DateTime } from 'luxon';
import { Badge } from '@plexui/ui/components/Badge';
import { DatePicker } from '@plexui/ui/components/DatePicker';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Input } from '@plexui/ui/components/Input';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Select } from '@plexui/ui/components/Select';
import { Sortable, type SortableMove } from '@plexui/ui/components/Sortable';
import { StatCard } from '@plexui/ui/components/StatCard';
import { Switch } from '@plexui/ui/components/Switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@plexui/ui/components/Table';
import { Textarea } from '@plexui/ui/components/Textarea';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';

const SECTIONS = [
  { id: 'overview', label: 'Overview', description: 'Today at a glance.' },
  { id: 'orders', label: 'Orders', description: 'The latest ten.' },
  { id: 'customers', label: 'Customers', description: 'New this week.' },
  { id: 'reports', label: 'Reports', description: 'Sent on Mondays.' },
];

const CONTACT = [
  { id: 'first', label: 'First name', value: 'Jane' },
  { id: 'last', label: 'Last name', value: 'Doe' },
  { id: 'email', label: 'Email', value: 'jane@example.com' },
  { id: 'phone', label: 'Phone', value: '+34 600 000 000' },
];

const QUESTIONS = [
  { id: 'shipping', question: 'How long does shipping take?', answer: 'Two to four working days within the EU.' },
  { id: 'returns', question: 'Can I return an order?', answer: 'Yes, within 30 days. The label is in the box.' },
  { id: 'warranty', question: 'Is there a warranty?', answer: 'Two years on every product.' },
];

const CONTROLS = [
  { id: 'language', label: 'Language' },
  { id: 'theme', label: 'Theme' },
  { id: 'start', label: 'Start date' },
  { id: 'summary', label: 'Weekly summary' },
  { id: 'title', label: 'Title' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'pl', label: 'Polish' },
];

const PRODUCTS = [
  { id: 'table', name: 'Oak side table', sku: 'OS-120', stock: 14, price: '€129.00' },
  { id: 'lamp', name: 'Brass floor lamp', sku: 'BF-210', stock: 6, price: '€189.00' },
  { id: 'chair', name: 'Linen armchair', sku: 'LA-330', stock: 3, price: '€449.00' },
  { id: 'rug', name: 'Wool rug', sku: 'WR-410', stock: 22, price: '€249.00' },
];

const PICTURES = [
  { id: 1, src: '/demo/picture-1.svg', alt: 'Blue picture' },
  { id: 2, src: '/demo/picture-2.svg', alt: 'Green picture' },
  { id: 3, src: '/demo/picture-3.svg', alt: 'Orange picture' },
  { id: 4, src: '/demo/picture-4.svg', alt: 'Purple picture' },
  { id: 5, src: '/demo/picture-5.svg', alt: 'Pink picture' },
  { id: 6, src: '/demo/picture-6.svg', alt: 'Yellow picture' },
];

const TAGS = ['Design', 'Engineering', 'Marketing', 'Sales', 'Support', 'Finance', 'Legal', 'Operations'];

const CARDS = [
  { label: 'Revenue', value: '€45,231' },
  { label: 'Orders', value: '1,204' },
  { label: 'Customers', value: '892' },
  { label: 'Refunds', value: '12' },
];

const STAGE = 'flex w-full justify-center py-10';

/** The stage of a group of rows: on a phone the rows sit on the grouped surface of an iOS settings screen, as on the Input page. */
function RowsStage({ children }: { children: ReactNode }) {
  const phone = usePhoneRows();
  return phone ? <PhoneRowsStage>{children}</PhoneRowsStage> : <div data-demo-stage className={STAGE}>{children}</div>;
}

export function SortableRowsDemo() {
  const [rows, setRows] = useState(SECTIONS);

  return (
    <RowsStage>
      <div className="w-[480px] max-w-full">
        <FieldGroup title="Home screen">
          <Sortable value={rows} onChange={setRows}>
            {rows.map((row) => (
              <div key={row.id} data-row>
                <Sortable.Handle aria-label={`Reorder ${row.label}`} />
                <Field row label={row.label} description={row.description}>
                  <Switch defaultChecked />
                </Field>
              </div>
            ))}
          </Sortable>
        </FieldGroup>
      </div>
    </RowsStage>
  );
}

export function SortableInputsDemo() {
  const [rows, setRows] = useState(CONTACT);

  return (
    <RowsStage>
      <div className="w-[480px] max-w-full">
        <FieldGroup title="Contact details">
          <Sortable value={rows} onChange={setRows} handles>
            {rows.map((row) => (
              <div key={row.id} data-row>
                <Sortable.Handle aria-label={`Reorder ${row.label}`} />
                <Field row label={row.label}>
                  <Input variant="ghost" defaultValue={row.value} />
                </Field>
              </div>
            ))}
          </Sortable>
        </FieldGroup>
      </div>
    </RowsStage>
  );
}

export function SortableStackedDemo() {
  const [rows, setRows] = useState(QUESTIONS);

  return (
    <RowsStage>
      <div className="w-[480px] max-w-full">
        <FieldGroup title="Questions">
          <Sortable value={rows} onChange={setRows}>
            {rows.map((row) => (
              <div key={row.id} data-row>
                <Sortable.Handle aria-label={`Reorder ${row.question}`} />
                <Field row orientation="vertical" label={row.question}>
                  <Textarea variant="ghost" rows={1} autoResize defaultValue={row.answer} />
                </Field>
              </div>
            ))}
          </Sortable>
        </FieldGroup>
      </div>
    </RowsStage>
  );
}

export function SortableControlsDemo() {
  const [rows, setRows] = useState(CONTROLS);
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [start, setStart] = useState<DateTime | null>(null);

  const controls: Record<string, React.ReactElement> = {
    language: <Select value={language} options={LANGUAGES} onChange={(option) => setLanguage(option.value)} variant="soft" block={false} align="end" />,
    theme: (
      <SegmentedControl value={theme} onChange={setTheme} aria-label="Theme">
        <SegmentedControl.Option value="light">Light</SegmentedControl.Option>
        <SegmentedControl.Option value="dark">Dark</SegmentedControl.Option>
      </SegmentedControl>
    ),
    start: <DatePicker value={start} onChange={setStart} triggerDateFormat="MMM d, yyyy" placeholder="Select date" variant="soft" />,
    summary: <Switch defaultChecked />,
    title: <Input variant="ghost" defaultValue="Weekly report" />,
  };

  return (
    <RowsStage>
      <div className="w-[480px] max-w-full">
        <FieldGroup title="Preferences">
          <Sortable value={rows} onChange={setRows}>
            {rows.map((row) => (
              <div key={row.id} data-row>
                <Sortable.Handle aria-label={`Reorder ${row.label}`} />
                <Field row label={row.label}>
                  {controls[row.id]}
                </Field>
              </div>
            ))}
          </Sortable>
        </FieldGroup>
      </div>
    </RowsStage>
  );
}

export function SortableTableDemo() {
  const [rows, setRows] = useState(PRODUCTS);

  return (
    <div data-demo-stage className={STAGE}>
      <div className="w-[640px] max-w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" aria-label="Order" />
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-end">Price</TableHead>
            </TableRow>
          </TableHeader>
          <Sortable as={TableBody} value={rows} onChange={setRows}>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Sortable.Handle aria-label={`Reorder ${row.name}`} />
                </TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.sku}</TableCell>
                <TableCell>{row.stock}</TableCell>
                <TableCell className="text-end">{row.price}</TableCell>
              </TableRow>
            ))}
          </Sortable>
        </Table>
      </div>
    </div>
  );
}

export function SortableImagesDemo() {
  const [pictures, setPictures] = useState(PICTURES);

  return (
    <div data-demo-stage className={STAGE}>
      <Sortable value={pictures} onChange={setPictures} layout="grid" className="grid w-[420px] max-w-full grid-cols-3 gap-3">
        {pictures.map((picture) => (
          <div key={picture.id} tabIndex={0} className="aspect-square overflow-hidden rounded-xl">
            <img src={picture.src} alt={picture.alt} className="block size-full object-cover" />
          </div>
        ))}
      </Sortable>
    </div>
  );
}

export function SortableTagsDemo() {
  const [tags, setTags] = useState(TAGS);

  return (
    <div data-demo-stage className={STAGE}>
      <Sortable value={tags} onChange={setTags} layout="grid" className="flex w-[420px] max-w-full flex-wrap gap-2">
        {tags.map((tag) => (
          <div key={tag} tabIndex={0} className="rounded-full">
            <Badge color="secondary" size="lg" pill>
              {tag}
            </Badge>
          </div>
        ))}
      </Sortable>
    </div>
  );
}

export function SortableCardsDemo() {
  const [cards, setCards] = useState(CARDS);

  return (
    <div data-demo-stage className={STAGE}>
      <Sortable value={cards} onChange={setCards} layout="grid" className="grid w-[480px] max-w-full grid-cols-2 gap-3">
        {cards.map((card) => (
          <div key={card.label} tabIndex={0} className="rounded-xl">
            <StatCard label={card.label} value={card.value} />
          </div>
        ))}
      </Sortable>
    </div>
  );
}

const TASKS = {
  Today: ['Check the invoices', 'Call the supplier', 'Update the price list'],
  Later: ['Plan the summer menu'],
  Done: [],
} as Record<string, string[]>;

export function SortableGroupDemo() {
  const [lists, setLists] = useState(TASKS);

  const move = ({ item, from, to, toIndex }: SortableMove<string>) =>
    setLists((current) => {
      const left = { ...current, [from]: current[from].filter((task) => task !== item) };
      const target = [...left[to]];
      target.splice(toIndex ?? target.length, 0, item);
      return { ...left, [to]: target };
    });

  return (
    <div data-demo-stage className={STAGE}>
      <div className="grid w-[640px] max-w-full gap-4 sm:grid-cols-3">
        {Object.entries(lists).map(([name, tasks]) => (
          <div key={name}>
            <p className="mb-2 text-sm font-medium text-primary">{name}</p>
            <Sortable group="tasks" name={name} value={tasks} onMove={move} className="rounded-xl border border-default">
              {tasks.map((task) => (
                <div key={task} className="px-4 py-3 text-sm text-primary">
                  {task}
                </div>
              ))}
              {!tasks.length && (
                <p data-sortable-static className="px-4 py-3 text-sm text-secondary">
                  Nothing here
                </p>
              )}
            </Sortable>
          </div>
        ))}
      </div>
    </div>
  );
}
