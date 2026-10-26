'use client';

import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';

import { Accordion } from '@plexui/ui/components/Accordion';
import { Alert } from '@plexui/ui/components/Alert';
import { Badge } from '@plexui/ui/components/Badge';
import { Button } from '@plexui/ui/components/Button';
import { ButtonGroup } from '@plexui/ui/components/ButtonGroup';
import { Card } from '@plexui/ui/components/Card';
import { Checkbox } from '@plexui/ui/components/Checkbox';
import {
  DateRangePicker,
  type DateRange,
  type DateRangeShortcut,
} from '@plexui/ui/components/DateRangePicker';
import { EmptyMessage } from '@plexui/ui/components/EmptyMessage';
import { Field } from '@plexui/ui/components/Field';
import {
  Archive,
  ArrowLeftSm,
  Bell,
  Calendar,
  Check,
  Clock,
  DotsHorizontal,
  EditPencil,
  Email,
  Home,
  List,
  Play,
  RemoveTrash,
  Report,
  SettingsCog,
  Tag,
  Translate,
  UnfoldHorizontal,
  User,
  UserAdd,
  UserLock,
} from '@plexui/ui/components/Icon';
import { LoadingIndicator } from '@plexui/ui/components/Indicator';
import { Input } from '@plexui/ui/components/Input';
import { Label } from '@plexui/ui/components/Label';
import {
  MarkdownEditor,
  markdownEditorStyles,
} from '@plexui/ui/components/MarkdownEditor';
import { Menu } from '@plexui/ui/components/Menu';
import { RadioGroup } from '@plexui/ui/components/RadioGroup';
import { Select } from '@plexui/ui/components/Select';
import { Separator } from '@plexui/ui/components/Separator';
import { Slider } from '@plexui/ui/components/Slider';
import { Tabs } from '@plexui/ui/components/Tabs';
import { TagInput, type Tag as TagInputValue } from '@plexui/ui/components/TagInput';
import { toast } from '@plexui/ui/components/Toast';
import { Switch } from '@plexui/ui/components/Switch';
import { Textarea } from '@plexui/ui/components/Textarea';
import { TextLink } from '@plexui/ui/components/TextLink';

/* ------------------------------------------------------------------ */
/*  Block 1 — Payment Method (inline composition)                      */
/* ------------------------------------------------------------------ */

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const value = String(i + 1).padStart(2, '0');
  return { label: value, value };
});

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => {
  const value = String(2025 + i);
  return { label: value, value };
});

function PaymentMethodCard() {
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  return (
    <Card variant="outline" size="md">
      <Card.Header>
        <Card.Title>Payment Method</Card.Title>
        <Card.Description>
          All transactions are secure and encrypted
        </Card.Description>
      </Card.Header>

      <Field label="Name on Card">
        <Input placeholder="Aisha Cooper" />
      </Field>

      <Field label="Card Number">
        <Input placeholder="1234 5678 9012 3456" inputMode="numeric" />
      </Field>

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}
      >
        <Field label="Month">
          <Select
            value={month}
            options={MONTH_OPTIONS}
            multiple={false}
            pill={false}
            placeholder="MM"
            onChange={(params) => setMonth(params.value)}
          />
        </Field>
        <Field label="Year">
          <Select
            value={year}
            options={YEAR_OPTIONS}
            multiple={false}
            pill={false}
            placeholder="YYYY"
            onChange={(params) => setYear(params.value)}
          />
        </Field>
        <Field label="CVV">
          <Input placeholder="123" inputMode="numeric" />
        </Field>
      </div>

      <Separator />

      <Card.Header>
        <Card.Title>Billing Address</Card.Title>
        <Card.Description>
          The billing address associated with your payment method
        </Card.Description>
      </Card.Header>

      <Checkbox
        checked={sameAsShipping}
        onCheckedChange={setSameAsShipping}
        label="Same as shipping address"
      />

      <Separator />

      <Field label="Comments">
        <Textarea placeholder="Add any additional comments" rows={3} />
      </Field>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button color="primary" variant="solid" pill={false}>
          Submit
        </Button>
        <Button color="secondary" variant="outline" pill={false}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Block 2 — Date Range Picker overview (bare, no Card wrapper)       */
/* ------------------------------------------------------------------ */

const dayShortcuts: DateRangeShortcut[] = [
  {
    label: 'Today',
    getDateRange: () => {
      const today = DateTime.local();
      return [today.startOf('day'), today.endOf('day')];
    },
  },
  {
    label: 'Yesterday',
    getDateRange: () => {
      const yesterday = DateTime.local().minus({ days: 1 });
      return [yesterday.startOf('day'), yesterday.endOf('day')];
    },
  },
  {
    label: 'Last 7 days',
    getDateRange: () => {
      const today = DateTime.local().endOf('day');
      return [today.minus({ days: 6 }).startOf('day'), today];
    },
  },
  {
    label: 'Last 30 days',
    getDateRange: () => {
      const today = DateTime.local().endOf('day');
      return [today.minus({ days: 29 }).startOf('day'), today];
    },
  },
];

function DateRangePickerOverview() {
  const [value, setValue] = useState<DateRange | null>(null);
  return (
    <DateRangePicker
      size="md"
      pill={false}
      clearable
      value={value}
      onChange={(next) => setValue(next as DateRange | null)}
      shortcuts={dayShortcuts}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Block 4 — Alert action-placement (bare, Alert is its own surface)  */
/* ------------------------------------------------------------------ */

function AlertActionPlacementOverview() {
  return (
    <Alert
      title="Try our new dashboard layout"
      description="We've introduced a streamlined layout that makes using the dashboard even easier. You can switch back any time."
      actions={
        <>
          <Button color="primary" variant="soft" pill={false}>
            Dismiss
          </Button>
          <Button color="primary" variant="solid" pill={false}>
            Try it
          </Button>
        </>
      }
      actionsPlacement="bottom"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Block 5 — Email-toolbar (ButtonGroup + Menu w/ submenu, destructive) */
/* ------------------------------------------------------------------ */

type LabelValue = 'personal' | 'work' | 'other';

function EmailToolbar() {
  const [label, setLabel] = useState<LabelValue>('personal');

  return (
    <ButtonGroup>
      <Button
        variant="outline"
        color="secondary"
        pill={false}
        size="md"
        uniform
        aria-label="Back"
      >
        <ArrowLeftSm />
      </Button>
      <Button variant="outline" color="secondary" pill={false} size="md">
        Archive
      </Button>
      <Button variant="outline" color="secondary" pill={false} size="md">
        Report
      </Button>
      <Button variant="outline" color="secondary" pill={false} size="md">
        Snooze
      </Button>
      <Menu>
        <Menu.Trigger>
          <Button
            variant="outline"
            color="secondary"
            pill={false}
            size="md"
            uniform
            aria-label="More actions"
          >
            <DotsHorizontal />
          </Button>
        </Menu.Trigger>
        <Menu.Content align="end" minWidth={220}>
          <Menu.Item onSelect={() => {}}>
            <Email height={18} width={18} /> Mark as Read
          </Menu.Item>
          <Menu.Item onSelect={() => {}}>
            <Archive height={18} width={18} /> Archive
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item onSelect={() => {}}>
            <Clock height={18} width={18} /> Snooze
          </Menu.Item>
          <Menu.Item onSelect={() => {}}>
            <Calendar height={18} width={18} /> Add to Calendar
          </Menu.Item>
          <Menu.Item onSelect={() => {}}>
            <List height={18} width={18} /> Add to List
          </Menu.Item>
          <Menu.Sub>
            <Menu.SubTrigger>
              <span className="flex items-center gap-2">
                <Tag height={18} width={18} /> Label As...
              </span>
            </Menu.SubTrigger>
            <Menu.SubContent minWidth={160}>
              {(['personal', 'work', 'other'] as const).map((value) => (
                <Menu.CheckboxItem
                  key={value}
                  checked={label === value}
                  onCheckedChange={(c) => c && setLabel(value)}
                  onSelect={(e) => e.preventDefault()}
                  indicatorVariant="ghost"
                >
                  {value[0].toUpperCase() + value.slice(1)}
                </Menu.CheckboxItem>
              ))}
            </Menu.SubContent>
          </Menu.Sub>
          <Menu.Separator />
          <Menu.Item
            onSelect={() => {}}
            className="[--color-text:var(--color-text-danger-ghost)]"
          >
            <RemoveTrash height={18} width={18} /> Trash
          </Menu.Item>
        </Menu.Content>
      </Menu>
    </ButtonGroup>
  );
}

/* ------------------------------------------------------------------ */
/*  Block 6 — Pricing (single Pro plan, inline, no grid wrapper)        */
/* ------------------------------------------------------------------ */

const PRO_FEATURES = [
  'Unlimited projects',
  'Priority support',
  'Custom domains',
  'Early components',
];

function PricingCard() {
  return (
    <Card variant="solid" size="md">
      <Card.Header>
        <Card.Title>Pro</Card.Title>
        <Card.Description>
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: 'var(--color-text)',
            }}
          >
            $19
          </span>
          <span style={{ marginLeft: 4 }}>/ month</span>
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {PRO_FEATURES.map((f) => (
            <li
              key={f}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Check
                style={{
                  width: 16,
                  height: 16,
                  color: 'var(--color-text-success-soft)',
                }}
              />
              {f}
            </li>
          ))}
        </ul>
      </Card.Content>
      <Card.Footer>
        <Button color="primary" variant="solid" block pill={false}>
          Choose Pro
        </Button>
      </Card.Footer>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Block 7 — Login card (inline, adaptive)                            */
/* ------------------------------------------------------------------ */

function LoginCard() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Log in to your account</Card.Title>
        <Card.Description>
          Enter your email below to log in to your account.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Field label="Email">
            <Input type="email" placeholder="you@example.com" />
          </Field>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <Label htmlFor="bento-login-password">Password</Label>
              <TextLink href="#" primary>
                Forgot your password?
              </TextLink>
            </div>
            <Input id="bento-login-password" type="password" />
          </div>
        </div>
      </Card.Content>
      <Card.Footer
        style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}
      >
        <Button color="primary" variant="solid" block pill={false}>
          Log in
        </Button>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            textAlign: 'center',
            color: 'var(--color-text-tertiary)',
          }}
        >
          Don&apos;t have an account?{' '}
          <TextLink href="#" primary>
            Sign up
          </TextLink>
        </p>
      </Card.Footer>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Block 8 — Subscription FAQ accordion (inline, adaptive)            */
/* ------------------------------------------------------------------ */

const FAQ_ITEMS = [
  {
    value: 'plans',
    trigger: 'What subscription plans do you offer?',
    content:
      'Starter ($9/mo), Pro ($29/mo), and Enterprise (from $99/mo). Each tier raises seat, project, and API call limits; Enterprise adds SSO, audit log export, and a dedicated success manager.',
  },
  {
    value: 'billing',
    trigger: 'How does billing work?',
    content:
      'Billed at the start of each cycle. We accept all major cards, and ACH or invoice for annual Enterprise contracts. Every invoice is emailed and archived in Billing → Invoices.',
  },
  {
    value: 'cancel',
    trigger: 'How do I cancel my subscription?',
    content:
      'Cancel anytime from Billing → Plan. No cancellation fee. Access continues through the end of the current billing period, and projects stay read-only afterwards — nothing is deleted.',
  },
];

function SubscriptionCard() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Subscription &amp; billing</Card.Title>
        <Card.Description>
          Common questions about plans, invoices, and cancellations.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <Accordion type="single" collapsible defaultValue="plans">
          {FAQ_ITEMS.map((item) => (
            <Accordion.Item key={item.value} value={item.value}>
              <Accordion.Trigger>{item.trigger}</Accordion.Trigger>
              <Accordion.Content>{item.content}</Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion>
      </Card.Content>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Block 9 — Empty / loading states (inline, adaptive)                */
/* ------------------------------------------------------------------ */

function NoTeamMembersCard() {
  return (
    <Card style={{ padding: 24 }}>
      <EmptyMessage>
        <EmptyMessage.Icon>
          <UserAdd />
        </EmptyMessage.Icon>
        <EmptyMessage.Title>No team members</EmptyMessage.Title>
        <EmptyMessage.Description>
          Invite your team to collaborate on this project.
        </EmptyMessage.Description>
        <EmptyMessage.ActionRow>
          <Button color="primary" variant="solid" size="md" pill={false}>
            Invite members
          </Button>
        </EmptyMessage.ActionRow>
      </EmptyMessage>
    </Card>
  );
}

function ProcessingCard() {
  return (
    <Card style={{ padding: 24 }}>
      <EmptyMessage>
        <div style={{ marginBottom: 12, color: 'var(--color-text-tertiary)' }}>
          <LoadingIndicator size={28} />
        </div>
        <EmptyMessage.Title>Processing your request</EmptyMessage.Title>
        <EmptyMessage.Description>
          Please wait while we process your request. Do not refresh the page.
        </EmptyMessage.Description>
        <EmptyMessage.ActionRow>
          <Button color="secondary" variant="outline" size="md" pill={false}>
            Cancel
          </Button>
        </EmptyMessage.ActionRow>
      </EmptyMessage>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Block 10 — Notifications (Switch fields)                           */
/* ------------------------------------------------------------------ */

const HORIZONTAL_FIELD_CLASS =
  'justify-between [--field-horizontal-label-width:auto] [--field-horizontal-control-width:auto] [--field-label-horizontal-offset:0px]';

function NotificationsCard() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Notifications</Card.Title>
        <Card.Description>
          Choose how you&apos;d like to hear from us.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Field
            label="Email notifications"
            description="Weekly digests and important updates."
            orientation="horizontal"
            className={HORIZONTAL_FIELD_CLASS}
          >
            {(fieldProps) => <Switch id={fieldProps.id} defaultChecked />}
          </Field>
          <Field
            label="Push notifications"
            description="Real-time alerts in your browser."
            orientation="horizontal"
            className={HORIZONTAL_FIELD_CLASS}
          >
            {(fieldProps) => <Switch id={fieldProps.id} />}
          </Field>
          <Field
            label="Marketing emails"
            description="Tips, product updates, and promotions."
            orientation="horizontal"
            className={HORIZONTAL_FIELD_CLASS}
          >
            {(fieldProps) => <Switch id={fieldProps.id} />}
          </Field>
        </div>
      </Card.Content>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Block 11 — Markdown editor (toolbar end slot, bare surface)         */
/* ------------------------------------------------------------------ */

const MARKDOWN_DEFAULT = `**Bold**, *italic*, and [links](https://plexui.com).

- Lists and ordered lists supported
- Edit inline, see toolbar buttons toggle`;

function MarkdownEditorOverview() {
  return (
    <MarkdownEditor
      defaultValue={MARKDOWN_DEFAULT}
      toolbarEnd={
        <button
          type="button"
          className={markdownEditorStyles.toolbarButton}
          aria-label="Edit translations"
          title="Edit translations"
        >
          <Translate />
        </button>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Block 12 — Horizontal Menu (icons + labels, outlined trigger)       */
/* ------------------------------------------------------------------ */

function HorizontalMenuOverview() {
  return (
    <Menu>
      <Menu.Trigger>
        <Button color="secondary" variant="soft" pill={false} block>
          Actions
        </Button>
      </Menu.Trigger>
      <Menu.Content layout="horizontal" size="md" minWidth="auto">
        <Menu.Item onSelect={() => {}}>
          <EditPencil />
          Edit
        </Menu.Item>
        <Menu.Item onSelect={() => {}}>
          <SettingsCog />
          Settings
        </Menu.Item>
        <Menu.Item onSelect={() => {}}>
          <Play />
          Play
        </Menu.Item>
        <Menu.Item onSelect={() => {}}>
          <UnfoldHorizontal />
          Expand
        </Menu.Item>
      </Menu.Content>
    </Menu>
  );
}

/* ------------------------------------------------------------------ */
/*  Block 13 — Choice cards (RadioGroup styled as bordered cards)       */
/* ------------------------------------------------------------------ */

const WORKSPACE_OPTIONS = [
  {
    id: 'personal',
    title: 'Personal',
    description: 'For hobby projects and experimentation.',
  },
  {
    id: 'team',
    title: 'Team',
    description: 'Collaborate with up to 10 members.',
  },
  {
    id: 'business',
    title: 'Business',
    description: 'SSO, audit logs, and priority support.',
  },
];

function ChoiceCardOverview() {
  const [value, setValue] = useState('team');

  return (
    <RadioGroup
      className="flex-col gap-3"
      value={value}
      onChange={setValue}
      aria-label="Workspace type"
    >
      {WORKSPACE_OPTIONS.map((option) => {
        const isSelected = value === option.id;
        return (
          <div
            key={option.id}
            style={{
              border: '1px solid',
              borderColor: isSelected
                ? 'var(--color-background-primary-solid)'
                : 'var(--color-border-primary-outline)',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: isSelected
                ? 'var(--color-background-primary-soft-alpha)'
                : undefined,
              transition:
                'border-color 150ms ease, background-color 150ms ease',
            }}
          >
            <RadioGroup.Item
              value={option.id}
              block
              orientation="left"
              className="gap-3 p-3"
            >
              <div className="flex flex-1 flex-col">
                <span className="font-semibold">{option.title}</span>
                <span className="mt-0.5 text-xs text-secondary">
                  {option.description}
                </span>
              </div>
            </RadioGroup.Item>
          </div>
        );
      })}
    </RadioGroup>
  );
}

/* ------------------------------------------------------------------ */
/*  Block 14 — Select with descriptions (role picker)                   */
/* ------------------------------------------------------------------ */

const RoleOptionDescription = ({ children }: { children: React.ReactNode }) => (
  <div className="py-px text-[0.935em] font-normal leading-[1.45] text-secondary">
    {children}
  </div>
);

const ROLE_OPTIONS = [
  {
    value: 'owner',
    label: 'Owner',
    description: (
      <RoleOptionDescription>
        Can modify project information and manage members
      </RoleOptionDescription>
    ),
  },
  {
    value: 'reader',
    label: 'Reader',
    description: (
      <RoleOptionDescription>
        Can make API requests that read or modify data
      </RoleOptionDescription>
    ),
  },
];

function SelectWithDescriptionsOverview() {
  const [role, setRole] = useState('reader');
  return (
    <Field label="Role">
      <Select
        value={role}
        options={ROLE_OPTIONS}
        placeholder="Select role..."
        align="start"
        listMinWidth={260}
        variant="outline"
        size="md"
        multiple={false}
        pill={false}
        onChange={({ value }) => setRole(value)}
        TriggerStartIcon={role === 'owner' ? UserLock : User}
      />
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/*  Block 15 — Select with grouped options (plans + deployments)        */
/* ------------------------------------------------------------------ */

const PLAN_GROUPS = [
  {
    label: 'Plans',
    options: [
      { label: 'Enterprise Plus', value: '1' },
      { label: 'Enterprise', value: '1o' },
      { label: 'Professional Plus', value: '2' },
      { label: 'Professional', value: '3' },
      { label: 'Basic Plus', value: '4' },
      { label: 'Basic', value: '5' },
      { label: 'Starter', value: '6' },
      { label: 'Free', value: '7' },
    ],
    optionsLimit: { limit: 5, label: 'Show all' },
  },
  {
    label: 'Custom Deployments',
    options: [
      { label: 'Production US-East (v2.4.1)', value: 'ft1' },
      { label: 'Production EU-West (v2.4.0)', value: 'ft2' },
      { label: 'Staging US-West (v2.5.0-rc1)', value: 'ft3' },
      { label: 'Development (latest)', value: 'ft4' },
    ],
  },
];

function SelectGroupedOptionsOverview() {
  const [value, setValue] = useState('1');
  return (
    <Select
      variant="outline"
      size="md"
      multiple={false}
      pill={false}
      value={value}
      side="bottom"
      options={PLAN_GROUPS}
      listMinWidth={300}
      placeholder="Select a plan..."
      searchPlaceholder="Select an option..."
      clearable
      onChange={(v) => setValue(v.value)}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Block 16 — Slider range (dual-thumb price range)                    */
/* ------------------------------------------------------------------ */

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function SliderRangeOverview() {
  const mounted = useMounted();
  const [value, setValue] = useState<number[]>([25, 75]);
  // Slider reads getComputedStyle on mount — defer to client to avoid SSR error.
  if (!mounted) return <div style={{ height: 39 }} />;
  return (
    <Slider
      range
      label="Price range"
      min={0}
      max={100}
      step={1}
      value={value}
      onChange={setValue}
      prefixUnit="$"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Block 17 — Tabs (segmented with icons, lg)                          */
/* ------------------------------------------------------------------ */

function TabsSegmentedIconsOverview() {
  const [tab, setTab] = useState('home');
  return (
    <Tabs
      size="md"
      pill={false}
      block
      value={tab}
      onChange={setTab}
      aria-label="Navigation"
    >
      <Tabs.Tab value="home" icon={<Home />}>
        Home
      </Tabs.Tab>
      <Tabs.Tab value="settings" icon={<SettingsCog />}>
        Settings
      </Tabs.Tab>
      <Tabs.Tab value="notifications" icon={<Bell />}>
        Notifications
      </Tabs.Tab>
    </Tabs>
  );
}

/* ------------------------------------------------------------------ */
/*  Block 17b — TagInput with click-to-add suggestions                  */
/* ------------------------------------------------------------------ */

const TAG_INPUT_SUGGESTIONS = [
  'React',
  'TypeScript',
  'Next.js',
  'Tailwind',
  'Node.js',
  'GraphQL',
];

function TagInputSuggestionsOverview() {
  const [tags, setTags] = useState<TagInputValue[]>([
    { value: 'React', valid: true },
    { value: 'TypeScript', valid: true },
  ]);
  const selectedValues = new Set(tags.map((t) => t.value));
  const available = TAG_INPUT_SUGGESTIONS.filter((s) => !selectedValues.has(s));

  return (
    <div className="flex w-full flex-col gap-2">
      <TagInput
        size="md"
        value={tags}
        onChange={setTags}
        placeholder="Add a skill…"
      />
      {available.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {available.map((suggestion) => (
            <Button
              key={suggestion}
              // Match the height of the chips inside the TagInput
              // (≈ 20 px on md; xs Button is the closest token).
              size="xs"
              color="secondary"
              variant="soft"
              pill={false}
              onClick={() =>
                setTags((prev) => [...prev, { value: suggestion, valid: true }])
              }
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Block 18 — Badge overview (status indicators)                       */
/* ------------------------------------------------------------------ */

function BadgeOverview() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge size="md" variant="solid" pill={false}>
        Solid
      </Badge>
      <Badge size="md" variant="soft" pill={false}>
        Soft
      </Badge>
      <Badge size="md" variant="outline" pill={false}>
        Outline
      </Badge>
      <Badge size="md" variant="soft" pill={false} className="gap-1.5">
        <LoadingIndicator /> Progress
      </Badge>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Block 19 — Toast variants (semantic success/error/warning/info)     */
/* ------------------------------------------------------------------ */

function ToastVariantsOverview() {
  return (
    <Field label="Toast">
      <div className="flex flex-wrap gap-2">
        <Button
          size="md"
          color="secondary"
          variant="outline"
          pill={false}
          onClick={() => toast.success('Inquiry ID copied')}
        >
          Success
        </Button>
        <Button
          size="md"
          color="secondary"
          variant="outline"
          pill={false}
          onClick={() => toast.error('Failed to assign owner')}
        >
          Error
        </Button>
        <Button
          size="md"
          color="secondary"
          variant="outline"
          pill={false}
          onClick={() => toast.warning('Session expires in 2 minutes')}
        >
          Warning
        </Button>
        <Button
          size="md"
          color="secondary"
          variant="outline"
          pill={false}
          onClick={() => toast.info('New version available')}
        >
          Info
        </Button>
      </div>
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/*  Showcase — 4-column bento grid with hand-distributed items         */
/* ------------------------------------------------------------------ */

export function ComponentShowcase() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 xl:max-w-[1440px]">
      <div className="mx-auto grid w-full max-w-xl gap-8 md:max-w-none md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6">
        <div className="flex flex-col gap-6">
          <LoginCard />
          <SliderRangeOverview />
          <PricingCard />
          <HorizontalMenuOverview />
          <TagInputSuggestionsOverview />
        </div>
        <div className="flex flex-col gap-6">
          <DateRangePickerOverview />
          <SubscriptionCard />
          <MarkdownEditorOverview />
          <ToastVariantsOverview />
          <NotificationsCard />
        </div>
        <div className="flex flex-col gap-6">
          <PaymentMethodCard />
          <EmailToolbar />
          <AlertActionPlacementOverview />
          <SelectGroupedOptionsOverview />
        </div>
        <div className="order-first flex flex-col gap-6 lg:hidden xl:order-last xl:flex">
          <TabsSegmentedIconsOverview />
          <ChoiceCardOverview />
          <SelectWithDescriptionsOverview />
          <NoTeamMembersCard />
          <BadgeOverview />
          <ProcessingCard />
        </div>
      </div>
    </section>
  );
}
