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
  Atom,
  AvatarProfile,
  CameraPhoto,
  Chat,
  ChatTripleDots,
  Chats,
  CheckCircle,
  ChevronDownMd,
  Clock,
  Code,
  Copy,
  Desktop,
  DotsHorizontal,
  EditPencil,
  EyeOff,
  Filter,
  Folder,
  FolderPlus,
  InfoCircle,
  UnfoldHorizontal,
  Functions,
  Globe,
  Grid,
  Heart,
  History,
  ImageSquare,
  Link,
  List,
  Play,
  Plus,
  Search,
  SettingsCog,
  Share,
  Sort,
  Storyboard,
  Tools,
  Trash,
  UploadDocuments,
  VideoGrid,
  FileDocument,
  XSquare,
} from '@plexui/ui/components/Icon';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';
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

/** The More menu of a folder in Files on iOS (the owner's shots of 08.11): actions with their symbols, the view, the sort
 * order with the order of the chosen sort under it (IMG_5687: Name, Ascending), and Group By (IMG_5689) as a submenu. */
export function MenuBaseDemo() {
  const [icons, setIcons] = useState(true);
  const [checkmarks, setCheckmarks] = useState(true);
  const [pill, setPill] = useState(false);
  const [view, setView] = useState('list');
  const [sort, setSort] = useState('date');
  const [group, setGroup] = useState('date');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="icons" value={icons} onChange={setIcons} />
        {/* Without the selection rows the menu is the folder's actions alone, with no checkmark column */}
        <DemoControlBoolean name="checkmarks" value={checkmarks} onChange={setCheckmarks} />
        {/* A phone menu is the iOS panel either way: touch.css gives pill the plain menu's corner and spacing */}
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} desktopOnly />
      </div>
      <MenuExample
        title="Overview"
        trigger={
          <Button color="primary" size="lg" variant="ghost">
            Downloads <ChevronDownMd />
          </Button>
        }
      >
        <Menu.Content minWidth={220} pill={pill}>
          <Menu.Item onSelect={() => { }}>{icons && <CheckCircle />} Select</Menu.Item>
          <Menu.Item onSelect={() => { }}>{icons && <FolderPlus />} New Folder</Menu.Item>
          <Menu.Item onSelect={() => { }}>{icons && <FileDocument />} Scan Documents</Menu.Item>
          <Menu.Item onSelect={() => { }}>{icons && <Desktop />} Connect to Server</Menu.Item>
          <Menu.Separator />
          {checkmarks && (
            <>
              <Menu.RadioGroup value={view} onChange={setView}>
                <Menu.RadioItem value="icons">{icons && <VideoGrid />} Icons</Menu.RadioItem>
                <Menu.RadioItem value="list">{icons && <List />} List</Menu.RadioItem>
              </Menu.RadioGroup>
              <Menu.Separator />
              <Menu.RadioGroup value={sort} onChange={setSort}>
                <Menu.RadioItem value="name">Name</Menu.RadioItem>
                <Menu.RadioItem value="kind">Kind</Menu.RadioItem>
                <Menu.RadioItem value="date" description={sort === 'date' ? 'Newest to Oldest' : undefined}>Date</Menu.RadioItem>
                <Menu.RadioItem value="size">Size</Menu.RadioItem>
                <Menu.RadioItem value="tags">Tags</Menu.RadioItem>
              </Menu.RadioGroup>
              <Menu.Separator />
              <Menu.Sub>
                <Menu.SubTrigger>Group By</Menu.SubTrigger>
                <Menu.SubContent>
                  <Menu.RadioGroup value={group} onChange={setGroup}>
                    <Menu.RadioItem value="none">None</Menu.RadioItem>
                    <Menu.RadioItem value="kind">Kind</Menu.RadioItem>
                    <Menu.RadioItem value="date">Date</Menu.RadioItem>
                    <Menu.RadioItem value="size">Size</Menu.RadioItem>
                    <Menu.RadioItem value="shared">Shared by</Menu.RadioItem>
                  </Menu.RadioGroup>
                </Menu.SubContent>
              </Menu.Sub>
            </>
          )}
          <Menu.Item onSelect={() => { }}>View Options</Menu.Item>
        </Menu.Content>
      </MenuExample>
    </>
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

// A list's menu as Reminders opens it on iOS (the owner's shot of 08.11, Groceries): View as Columns over a separator,
// then the list's actions, Manage Sections and Sort By as submenus, Sort By showing its order under it, and Delete List
// last in red. Sort By holds Reminders' five orders (Apple's iPhone guide); Manage Sections its New Section.
export function MenuSubmenuDemo() {
  const [sort, setSort] = useState('Manual');
  return (
    <MenuExample
      title="Submenus"
      trigger={
        <Button color="secondary" variant="soft" uniform aria-label="List actions">
          <DotsHorizontal />
        </Button>
      }
    >
      <Menu.Content align="end" minWidth={220}>
        <Menu.Item onSelect={() => { }}><Storyboard /> View as Columns</Menu.Item>
        <Menu.Separator />
        <Menu.Item onSelect={() => { }}><InfoCircle /> Show List Info</Menu.Item>
        <Menu.Item onSelect={() => { }}><CheckCircle /> Select Items</Menu.Item>
        <Menu.Sub>
          <Menu.SubTrigger><List /> Manage Sections</Menu.SubTrigger>
          <Menu.SubContent>
            <Menu.Item onSelect={() => { }}><Plus /> New Section</Menu.Item>
          </Menu.SubContent>
        </Menu.Sub>
        <Menu.Sub>
          <Menu.SubTrigger description={sort}><Sort /> Sort By</Menu.SubTrigger>
          <Menu.SubContent>
            <Menu.RadioGroup value={sort} onChange={setSort}>
              <Menu.RadioItem value="Manual">Manual</Menu.RadioItem>
              <Menu.RadioItem value="Due Date">Due Date</Menu.RadioItem>
              <Menu.RadioItem value="Creation Date">Creation Date</Menu.RadioItem>
              <Menu.RadioItem value="Priority">Priority</Menu.RadioItem>
              <Menu.RadioItem value="Title">Title</Menu.RadioItem>
            </Menu.RadioGroup>
          </Menu.SubContent>
        </Menu.Sub>
        <Menu.Item onSelect={() => { }}><EyeOff /> Hide Completed</Menu.Item>
        <Menu.Item onSelect={() => { }}><UploadDocuments /> Save as Template</Menu.Item>
        <Menu.Item onSelect={() => { }}><FileDocument /> Print</Menu.Item>
        <Menu.Item onSelect={() => { }} danger><Trash /> Delete List</Menu.Item>
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
  const [view, setView] = useState({
    categories: true,
    priority: true,
    contactPhotos: false,
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
            View <ChevronDownMd />
          </Button>
        }
      >
        <Menu.Content minWidth={220}>
          <Menu.Label>View Options</Menu.Label>
          <Menu.CheckboxItem
            checked={view.categories}
            onCheckedChange={(checked) => setView((v) => ({ ...v, categories: checked }))}
            onSelect={(evt) => evt.preventDefault()}
            indicatorPosition={indicatorPosition}
            indicatorVariant={indicatorVariant}
          >
            <Storyboard /> Show Categories
          </Menu.CheckboxItem>
          <Menu.CheckboxItem
            checked={view.priority}
            onCheckedChange={(checked) => setView((v) => ({ ...v, priority: checked }))}
            onSelect={(evt) => evt.preventDefault()}
            indicatorPosition={indicatorPosition}
            indicatorVariant={indicatorVariant}
          >
            <Atom /> Show Priority
          </Menu.CheckboxItem>
          <Menu.CheckboxItem
            checked={view.contactPhotos}
            onCheckedChange={(checked) => setView((v) => ({ ...v, contactPhotos: checked }))}
            onSelect={(evt) => evt.preventDefault()}
            indicatorPosition={indicatorPosition}
            indicatorVariant={indicatorVariant}
          >
            <AvatarProfile /> Show Contact Photos
          </Menu.CheckboxItem>
          <Menu.Separator />
          <Menu.Item onSelect={() => {}}>
            <InfoCircle /> About Categories
          </Menu.Item>
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

export function MenuModeSwitchDemo() {
  const [sort, setSort] = useState('added');
  const [filter, setFilter] = useState('all');
  return (
    <MenuExample
      title="Mode switch"
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
  const [filter, setFilter] = useState('messages');
  return (
    <MenuExample
      title="Grouped items"
      trigger={
        <Button variant="ghost" color="primary">
          <Filter /> Filter <ChevronDownMd />
        </Button>
      }
    >
      <Menu.Content minWidth={220}>
        <Menu.RadioGroup value={filter} onChange={setFilter}>
          <Menu.RadioItem value="messages">
            <Chats /> Messages
          </Menu.RadioItem>
          <Menu.RadioItem value="spam">
            <XSquare /> Spam
          </Menu.RadioItem>
          <Menu.RadioItem value="deleted">
            <Trash /> Recently Deleted
          </Menu.RadioItem>
        </Menu.RadioGroup>
        <Menu.Separator />
        <Menu.Group>
          <Menu.Label>Filter By</Menu.Label>
          <Menu.RadioGroup value={filter} onChange={setFilter}>
            <Menu.RadioItem value="unread">
              <Chat /> Unread
            </Menu.RadioItem>
            <Menu.RadioItem value="drafts">
              <ChatTripleDots /> Drafts
            </Menu.RadioItem>
          </Menu.RadioGroup>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Item onSelect={() => {}}>Manage Filtering</Menu.Item>
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
