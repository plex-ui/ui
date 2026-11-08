'use client';

import { useState, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { Menu } from '@plexui/ui/components/Menu';

type MenuContentProps = ComponentProps<typeof Menu.Content>;
import { Button } from '@plexui/ui/components/Button';
import { Page } from '@plexui/ui/components/Page';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import {
  ArrowUp,
  CameraPhoto,
  ChevronDownMd,
  Clock,
  Code,
  Copy,
  DotsHorizontal,
  EditPencil,
  Folder,
  InfoCircle,
  UnfoldHorizontal,
  Functions,
  Globe,
  Grid,
  Heart,
  History,
  ImageSquare,
  Link,
  Play,
  Search,
  SettingsCog,
  Share,
  Tools,
  Trash,
  FileDocument,
} from '@plexui/ui/components/Icon';
import { DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { menuPhoneTitle } from './menuPhone';
import { usePreviewEmbed } from './PreviewEmbed';
import p from './PageDemos.module.css';

const INDICATOR_POSITION_OPTIONS = ['start', 'end'] as const;
const INDICATOR_VARIANT_OPTIONS = ['solid', 'ghost'] as const;
const SIZE_OPTIONS = ['sm', 'md', 'lg'] as const;

/**
 * A menu example. In the Phone preview it is a screen whose menu opens from the More button of the top bar, as the
 * menu of an album in Photos (iOS-menu IMG_5657) and of a collection (IMG_5664) over the large title of the screen,
 * and stands open when the screen appears; the panel covers the button, aligned to its end, and takes the kit's
 * width, so it drops its desktop width, minimum width and size (menuPhone.ts writes the same form into the code).
 * Elsewhere the example's own trigger opens it.
 */
function MenuExample({ title, trigger, children }: { title: string; trigger: ReactElement; children: ReactElement<MenuContentProps> }) {
  const phone = usePreviewEmbed() !== null;
  const [open, setOpen] = useState(true);
  if (!phone) {
    return (
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <Menu>
          <Menu.Trigger>{trigger}</Menu.Trigger>
          {children}
        </Menu>
      </div>
    );
  }
  const { layout, children: items } = children.props as MenuContentProps & { children: ReactNode };
  const heading = menuPhoneTitle(title);
  return (
    <div data-demo-stage className={p.Stage}>
      <div className={p.Frame}>
        <Page>
          <Toolbar titleStyle="large">
            <Toolbar.Title subtitle={heading.subtitle}>{heading.title}</Toolbar.Title>
            <Toolbar.Trailing>
              <Menu forceOpen={open || undefined} onClose={() => setOpen(false)}>
                <Menu.Trigger>
                  <Button color="secondary" variant="soft" uniform pill aria-label="More"><DotsHorizontal /></Button>
                </Menu.Trigger>
                {/* A menu that stands open when the screen appears leaves focus where it is: every phone frame of the
                    page opens its menu, and one that took focus would blur the frame before it, which closes its menu */}
                <Menu.Content align="end" layout={layout} onOpenAutoFocus={open ? (event) => event.preventDefault() : undefined}>
                  {items}
                </Menu.Content>
              </Menu>
            </Toolbar.Trailing>
          </Toolbar>
        </Page>
      </div>
    </div>
  );
}

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
    <MenuExample
      title="Overview"
      trigger={
        <Button color="primary" size="lg" variant="ghost">
          Sample menu <ChevronDownMd />
        </Button>
      }
    >
      <Menu.Content width={210} minWidth={210}>
        <Menu.Item description="sam.smith@gmail.com">Sam Smith</Menu.Item>
        <Menu.Separator />
        <Menu.Link href="#">Your profile</Menu.Link>
        <Menu.Link href="#">Terms & policies</Menu.Link>
        <Menu.Item disabled onSelect={() => { }}>
          Feature flags
        </Menu.Item>
        <Menu.Separator />
        <Menu.Item onSelect={() => { }}>Logout</Menu.Item>
      </Menu.Content>
    </MenuExample>
  );
}

export function MenuNaturalSizingDemo() {
  return (
    <MenuExample
      title="Natural sizing"
      trigger={
        <Button color="primary" size="lg" variant="ghost" className="font-semibold gap-1.5">
          <Tools /> Tools
        </Button>
      }
    >
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
    </MenuExample>
  );
}

export function MenuSubmenuDemo() {
  return (
    <MenuExample
      title="Submenus"
      trigger={
        <Button color="primary" size="lg" variant="ghost">
          Options <ChevronDownMd />
        </Button>
      }
    >
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
    </MenuExample>
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
        <DemoControlRow name="indicatorPosition" desktopOnly>
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
        <DemoControlRow name="indicatorVariant" desktopOnly>
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
      <MenuExample
        title="Checkbox items"
        trigger={
          <Button variant="ghost" color="primary">
            Checkbox menu <ChevronDownMd />
          </Button>
        }
      >
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
      </MenuExample>
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
        <DemoControlRow name="indicatorPosition" desktopOnly>
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
      <MenuExample
        title="Radio items"
        trigger={
          <Button color="primary" variant="ghost">
            Radio menu <ChevronDownMd />
          </Button>
        }
      >
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
      </MenuExample>
    </>
  );
}


export function MenuHorizontalIconsOnlyDemoWithControls() {
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size" desktopOnly>
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
      <MenuExample
        title="Horizontal (icons only)"
        trigger={
          <Button color="primary" size="lg" variant="ghost">
            Actions <ChevronDownMd />
          </Button>
        }
      >
        <Menu.Content layout="horizontal" size={size} minWidth="auto">
          <Menu.Item onSelect={() => { }}>
            <EditPencil />
            <span className="sr-only">Edit</span>
          </Menu.Item>
          <Menu.Item onSelect={() => { }}>
            <SettingsCog />
            <span className="sr-only">Settings</span>
          </Menu.Item>
          <Menu.Item onSelect={() => { }}>
            <Play />
            <span className="sr-only">Play</span>
          </Menu.Item>
          <Menu.Item onSelect={() => { }}>
            <UnfoldHorizontal />
            <span className="sr-only">Expand</span>
          </Menu.Item>
        </Menu.Content>
      </MenuExample>
    </>
  );
}

export function MenuTabsDemo() {
  const [sort, setSort] = useState('added');
  const [filter, setFilter] = useState('all');
  return (
    <MenuExample
      title="Tabs"
      trigger={
        <Button color="primary" size="lg" variant="ghost">
          Library <ChevronDownMd />
        </Button>
      }
    >
      <Menu.Content>
        <Menu.RadioGroup layout="horizontal" value={sort} onChange={setSort}>
          <Menu.RadioItem value="added">
            <Clock /> Added
          </Menu.RadioItem>
          <Menu.RadioItem value="captured">
            <CameraPhoto /> Captured
          </Menu.RadioItem>
        </Menu.RadioGroup>
        <Menu.Separator />
        <Menu.Label>Filter</Menu.Label>
        <Menu.RadioGroup value={filter} onChange={setFilter}>
          <Menu.RadioItem value="all">
            <Grid /> All items
          </Menu.RadioItem>
          <Menu.RadioItem value="favorites">
            <Heart /> Favorites
          </Menu.RadioItem>
          <Menu.RadioItem value="edited">
            <EditPencil /> Edited
          </Menu.RadioItem>
        </Menu.RadioGroup>
      </Menu.Content>
    </MenuExample>
  );
}

export function MenuHeaderDemo() {
  return (
    <MenuExample
      title="Header"
      trigger={
        <Button color="primary" size="lg" variant="ghost">
          File <ChevronDownMd />
        </Button>
      }
    >
      <Menu.Content>
        <Menu.Header
          media={<img src="/demo/picture-1.svg" alt="" />}
          description="Image · 382 KB"
          action={
            <Menu.HeaderAction aria-label="Share" onSelect={() => { }}>
              <Share />
            </Menu.HeaderAction>
          }
        >
          Sunset.png
        </Menu.Header>
        <Menu.Item onSelect={() => { }}>
          <EditPencil /> Rename
        </Menu.Item>
        <Menu.Item onSelect={() => { }}>
          <Copy /> Copy
        </Menu.Item>
        <Menu.Item onSelect={() => { }}>
          <Folder /> Move
        </Menu.Item>
        <Menu.Separator />
        <Menu.Item onSelect={() => { }}>
          <InfoCircle /> Get info
        </Menu.Item>
      </Menu.Content>
    </MenuExample>
  );
}

export function MenuGroupedDemo() {
  return (
    <MenuExample
      title="Grouped items"
      trigger={
        <Button color="primary" size="lg" variant="ghost" className="font-semibold gap-1.5">
          <FileDocument /> Templates <ChevronDownMd />
        </Button>
      }
    >
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
    </MenuExample>
  );
}

export function MenuDangerDemo() {
  return (
    <MenuExample
      title="Destructive items"
      trigger={
        <Button color="secondary" variant="soft" uniform aria-label="More actions">
          <DotsHorizontal />
        </Button>
      }
    >
      <Menu.Content align="end" minWidth={200}>
        <Menu.Item onSelect={() => {}}>
          <EditPencil /> Rename
        </Menu.Item>
        <Menu.Item onSelect={() => {}}>
          <Copy /> Duplicate
        </Menu.Item>
        <Menu.Separator />
        <Menu.Item onSelect={() => {}} danger>
          <Trash /> Delete project
        </Menu.Item>
      </Menu.Content>
    </MenuExample>
  );
}
