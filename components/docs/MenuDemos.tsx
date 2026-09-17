'use client';

import React, { useState } from 'react';
import { Menu } from '@plexui/ui/components/Menu';
import { Button } from '@plexui/ui/components/Button';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import {
  ArrowUp,
  ChevronDownMd,
  Code,
  EditPencil,
  UnfoldHorizontal,
  Functions,
  Globe,
  History,
  ImageSquare,
  Link,
  Play,
  Search,
  SettingsCog,
  Tools,
  Trash,
  FileDocument,
} from '@plexui/ui/components/Icon';

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

function DemoControlRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={controlRowStyle}>
      <span style={controlLabelStyle}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

const INDICATOR_POSITION_OPTIONS = ['start', 'end'] as const;
const INDICATOR_VARIANT_OPTIONS = ['solid', 'ghost'] as const;
const SIZE_OPTIONS = ['sm', 'md', 'lg'] as const;

export function MenuHeroContent() {
  return (
    <div style={{ width: 180, height: 118 }}>
      <Menu forceOpen>
        <Menu.Trigger>
          <div />
        </Menu.Trigger>
        <Menu.Content align="start" minWidth="auto">
          <Menu.Item onSelect={() => { }}>
            <ArrowUp height={20} width={20} /> Upload image
          </Menu.Item>
          <Menu.Item onSelect={() => { }}>
            <Link height={20} width={20} /> Link to image
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item className="text-tertiary text-xs py-1">
            Supported formats: .jpeg .jpg .gif .png
          </Menu.Item>
        </Menu.Content>
      </Menu>
    </div>
  );
}

export function MenuBaseDemo() {
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <Menu>
        <Menu.Trigger>
          <Button color="primary" size="lg" variant="ghost">
            Sample menu <ChevronDownMd />
          </Button>
        </Menu.Trigger>
        <Menu.Content width={210} minWidth={210}>
          <Menu.Item description="sam.smith@gmail.com">Sam Smith</Menu.Item>
          <Menu.Separator />
          <Menu.Link href="/settings">Your profile</Menu.Link>
          <Menu.Link href="#">Terms & policies</Menu.Link>
          <Menu.Item disabled onSelect={() => { }}>
            Feature flags
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item onSelect={() => { }}>Logout</Menu.Item>
        </Menu.Content>
      </Menu>
    </div>
  );
}

export function MenuNaturalSizingDemo() {
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <Menu>
        <Menu.Trigger>
          <Button color="primary" size="lg" variant="ghost" className="font-semibold gap-1.5">
            <Tools /> Tools
          </Button>
        </Menu.Trigger>
        <Menu.Content minWidth="auto">
          <Menu.Item onSelect={() => { }}>
            <Functions height={18} width={18} /> Function
          </Menu.Item>
          <Menu.Item onSelect={() => { }}>
            <Search height={18} width={18} /> File Search
          </Menu.Item>
          <Menu.Item onSelect={() => { }}>
            <Globe height={18} width={18} /> Web Search
          </Menu.Item>
          <Menu.Item onSelect={() => { }}>
            <Code height={18} width={18} /> Code Interpreter
          </Menu.Item>
          <Menu.Item onSelect={() => { }}>
            <ImageSquare height={18} width={18} /> Image Generation
          </Menu.Item>
        </Menu.Content>
      </Menu>
    </div>
  );
}

export function MenuSubmenuDemo() {
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <Menu>
        <Menu.Trigger>
          <Button color="primary" size="lg" variant="ghost">
            Options <ChevronDownMd />
          </Button>
        </Menu.Trigger>
        <Menu.Content minWidth={180}>
          <Menu.Item onSelect={() => { }}>Edit</Menu.Item>
          <Menu.Item onSelect={() => { }}>Duplicate</Menu.Item>
          <Menu.Separator />
          <Menu.Sub>
            <Menu.SubTrigger>More</Menu.SubTrigger>
            <Menu.SubContent>
              <Menu.Item onSelect={() => { }}>Move to project…</Menu.Item>
              <Menu.Item onSelect={() => { }}>Move to folder…</Menu.Item>
              <Menu.Separator />
              <Menu.Item onSelect={() => { }}>Advanced options…</Menu.Item>
            </Menu.SubContent>
          </Menu.Sub>
          <Menu.Separator />
          <Menu.Item onSelect={() => { }}>Share</Menu.Item>
          <Menu.Item onSelect={() => { }}>Add to favorites</Menu.Item>
          <Menu.Separator />
          <Menu.Item onSelect={() => { }}>Delete</Menu.Item>
        </Menu.Content>
      </Menu>
    </div>
  );
}

export function MenuItemActionsDemo() {
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <Menu>
        <Menu.Trigger>
          <Button color="primary" size="lg" variant="ghost" className="font-semibold gap-1.5">
            <History /> Conversations
          </Button>
        </Menu.Trigger>
        <Menu.Content width={270}>
          <Menu.Item onSelect={() => { }}>
            <span className="flex-1 truncate">Sample thread title</span>
            <Menu.ItemActions>
              <Menu.ItemAction onClick={() => { }}>
                <Trash />
              </Menu.ItemAction>
            </Menu.ItemActions>
          </Menu.Item>
          <Menu.Item onSelect={() => { }}>
            <span className="flex-1 truncate">Another sample thread title</span>
            <Menu.ItemActions>
              <Menu.ItemAction onClick={() => { }}>
                <Trash />
              </Menu.ItemAction>
            </Menu.ItemActions>
          </Menu.Item>
          <Menu.Item onSelect={() => { }}>
            <span className="flex-1 truncate">Long thread title that is going to be clipped off</span>
            <Menu.ItemActions>
              <Menu.ItemAction onClick={() => { }}>
                <Trash />
              </Menu.ItemAction>
            </Menu.ItemActions>
          </Menu.Item>
        </Menu.Content>
      </Menu>
    </div>
  );
}

export function MenuWithCheckboxesDemoWithControls() {
  const [settings, setSettings] = useState({
    showGrid: true,
    showLabels: false,
    enableShadows: false,
  });
  const [indicatorPosition, setIndicatorPosition] = useState<
    (typeof INDICATOR_POSITION_OPTIONS)[number]
  >('end');
  const [indicatorVariant, setIndicatorVariant] = useState<
    (typeof INDICATOR_VARIANT_OPTIONS)[number]
  >('solid');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="indicatorPosition">
          <SegmentedControl<(typeof INDICATOR_POSITION_OPTIONS)[number]>
            value={indicatorPosition}
            onChange={setIndicatorPosition}
            aria-label="indicatorPosition"
            size="xs"
          >
            {INDICATOR_POSITION_OPTIONS.map((o) => (
              <SegmentedControl.Option key={o} value={o}>
                {o}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="indicatorVariant">
          <SegmentedControl<(typeof INDICATOR_VARIANT_OPTIONS)[number]>
            value={indicatorVariant}
            onChange={setIndicatorVariant}
            aria-label="indicatorVariant"
            size="xs"
          >
            {INDICATOR_VARIANT_OPTIONS.map((o) => (
              <SegmentedControl.Option key={o} value={o}>
                {o}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <Menu>
          <Menu.Trigger>
            <Button variant="ghost" color="primary">
              Checkbox menu <ChevronDownMd />
            </Button>
          </Menu.Trigger>
          <Menu.Content minWidth={200}>
            <Menu.CheckboxItem
              checked={settings.showGrid}
              onCheckedChange={(checked) => setSettings((s) => ({ ...s, showGrid: checked }))}
              onSelect={(evt) => evt.preventDefault()}
              indicatorPosition={indicatorPosition}
              indicatorVariant={indicatorVariant}
            >
              Show grid lines
            </Menu.CheckboxItem>
            <Menu.CheckboxItem
              checked={settings.showLabels}
              onCheckedChange={(checked) => setSettings((s) => ({ ...s, showLabels: checked }))}
              onSelect={(evt) => evt.preventDefault()}
              indicatorPosition={indicatorPosition}
              indicatorVariant={indicatorVariant}
            >
              Display labels
            </Menu.CheckboxItem>
            <Menu.CheckboxItem
              checked={settings.enableShadows}
              onCheckedChange={(checked) => setSettings((s) => ({ ...s, enableShadows: checked }))}
              onSelect={(evt) => evt.preventDefault()}
              indicatorPosition={indicatorPosition}
              indicatorVariant={indicatorVariant}
            >
              Enable shadows
            </Menu.CheckboxItem>
          </Menu.Content>
        </Menu>
      </div>
    </>
  );
}

export function MenuWithRadioItemsDemoWithControls() {
  const [value, setValue] = useState('any');
  const [indicatorPosition, setIndicatorPosition] = useState<
    (typeof INDICATOR_POSITION_OPTIONS)[number]
  >('end');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="indicatorPosition">
          <SegmentedControl<(typeof INDICATOR_POSITION_OPTIONS)[number]>
            value={indicatorPosition}
            onChange={setIndicatorPosition}
            aria-label="indicatorPosition"
            size="xs"
          >
            {INDICATOR_POSITION_OPTIONS.map((o) => (
              <SegmentedControl.Option key={o} value={o}>
                {o}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <Menu>
          <Menu.Trigger>
            <Button color="primary" variant="ghost">
              Radio menu <ChevronDownMd />
            </Button>
          </Menu.Trigger>
          <Menu.Content align="start" minWidth="auto" width="auto">
            <Menu.RadioGroup
              indicatorPosition={indicatorPosition}
              value={value}
              onChange={setValue}
            >
              <Menu.RadioItem value="any">Any time</Menu.RadioItem>
              <Menu.RadioItem value="today" disabled>
                Today
              </Menu.RadioItem>
              <Menu.RadioItem value="last7d">Last 7 days</Menu.RadioItem>
              <Menu.RadioItem value="last30d">Last 30 days</Menu.RadioItem>
              <Menu.RadioItem value="last3m">Last 3 months</Menu.RadioItem>
            </Menu.RadioGroup>
          </Menu.Content>
        </Menu>
      </div>
    </>
  );
}


export function MenuHorizontalIconsOnlyDemoWithControls() {
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl<(typeof SIZE_OPTIONS)[number]>
            value={size}
            onChange={setSize}
            aria-label="size"
            size="xs"
          >
            {SIZE_OPTIONS.map((o) => (
              <SegmentedControl.Option key={o} value={o}>
                {o}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <Menu>
          <Menu.Trigger>
            <Button color="primary" size="lg" variant="ghost">
              Actions <ChevronDownMd />
            </Button>
          </Menu.Trigger>
          <Menu.Content layout="horizontal" size={size} minWidth="auto">
            <Menu.Item onSelect={() => { }}>
              <EditPencil />
            </Menu.Item>
            <Menu.Item onSelect={() => { }}>
              <SettingsCog />
            </Menu.Item>
            <Menu.Item onSelect={() => { }}>
              <Play />
            </Menu.Item>
            <Menu.Item onSelect={() => { }}>
              <UnfoldHorizontal />
            </Menu.Item>
          </Menu.Content>
        </Menu>
      </div>
    </>
  );
}

export function MenuHorizontalWithLabelsDemoWithControls() {
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl<(typeof SIZE_OPTIONS)[number]>
            value={size}
            onChange={setSize}
            aria-label="size"
            size="xs"
          >
            {SIZE_OPTIONS.map((o) => (
              <SegmentedControl.Option key={o} value={o}>
                {o}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <Menu>
          <Menu.Trigger>
            <Button color="primary" size="lg" variant="ghost">
              Actions <ChevronDownMd />
            </Button>
          </Menu.Trigger>
          <Menu.Content layout="horizontal" size={size} minWidth="auto">
            <Menu.Item onSelect={() => { }}>
              <EditPencil />
              Edit
            </Menu.Item>
            <Menu.Item onSelect={() => { }}>
              <SettingsCog />
              Settings
            </Menu.Item>
            <Menu.Item onSelect={() => { }}>
              <Play />
              Play
            </Menu.Item>
            <Menu.Item onSelect={() => { }}>
              <UnfoldHorizontal />
              Expand
            </Menu.Item>
          </Menu.Content>
        </Menu>
      </div>
    </>
  );
}

export function MenuGroupedDemo() {
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <Menu>
        <Menu.Trigger>
          <Button color="primary" size="lg" variant="ghost" className="font-semibold gap-1.5">
            <FileDocument /> Templates <ChevronDownMd />
          </Button>
        </Menu.Trigger>
        <Menu.Content minWidth={220}>
          <Menu.Group>
            <Menu.Label>Active</Menu.Label>
            <Menu.Link href="#">Welcome email</Menu.Link>
            <Menu.Link href="#">Order confirmation</Menu.Link>
            <Menu.Link href="#">Password reset</Menu.Link>
          </Menu.Group>
          <Menu.Separator />
          <Menu.Group>
            <Menu.Label>Draft</Menu.Label>
            <Menu.Link href="#">New promo campaign</Menu.Link>
            <Menu.Link href="#">Account deactivation</Menu.Link>
          </Menu.Group>
        </Menu.Content>
      </Menu>
    </div>
  );
}
