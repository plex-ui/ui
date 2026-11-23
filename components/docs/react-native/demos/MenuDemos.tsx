import { useState, type ReactNode } from 'react';
import { Button, IconButton, List as Rows, ListItem, Menu, NavigationButton, Toolbar } from '@plexui/react-native';
import {
  Chat,
  ChatTripleDots,
  Chats,
  CheckCircle,
  Copy,
  Desktop,
  EditPencil,
  FileDocument,
  FolderPlus,
  List,
  RemoveTrash,
  VideoGrid,
  XSquare,
} from '@plexui/react-native/icons';
import { DemoControlBoolean, controlsTableStyle } from '../../ButtonDemos';
import { usePreviewEmbed } from '../../PreviewEmbed';
import { RNScreen, docsDemo } from '../RNScreen';
import { MoreIcon } from './MoreIcon';
import { PhonePage } from './ToolbarDemos';

/**
 * A menu example on a phone, as the React page's Phone preview draws it: a screen whose menu opens from the More
 * button of its top bar, under the large title named by the example, as iOS opens the menu of an album in Photos. The
 * menu stands open when the screen appears, until it closes; the More button opens it again.
 */
function MenuScreen({ title, label, children }: { title: string; label: string; children: ReactNode }) {
  // Open with the phone preview. Inline on a narrow page it waits for a press: an open menu's layer covers the whole
  // window, so it would hold the page still from the start
  const embed = usePreviewEmbed() !== null;
  const [open, setOpen] = useState(embed);
  return (
    <RNScreen screen minHeight={560}>
      <Toolbar titleStyle="large">
        <Toolbar.Title>{title}</Toolbar.Title>
        <Toolbar.Trailing>
          <Menu open={open} onOpenChange={setOpen}>
            <Menu.Trigger>
              <Button color="secondary" variant="soft" uniform accessibilityLabel="More">
                <MoreIcon />
              </Button>
            </Menu.Trigger>
            <Menu.Content align="end" aria-label={label}>
              {children}
            </Menu.Content>
          </Menu>
        </Toolbar.Trailing>
      </Toolbar>
    </RNScreen>
  );
}

const noop = () => {};

/**
 * A folder's menu, as Files opens it on iOS: actions with their symbols, then the view and the sort order as options,
 * Date with its order under it while it is the chosen sort. `icons` takes the symbols away, `checkmarks` the options
 * (and with them the checkmark column), and Group by opens its submenu: over the menu on iOS, in the popup's place
 * behind Back on Android.
 */
export const Overview = docsDemo(function Overview() {
  const [icons, setIcons] = useState(true);
  const [checkmarks, setCheckmarks] = useState(true);
  const [view, setView] = useState('list');
  const [sort, setSort] = useState('date');
  const [group, setGroup] = useState('date');
  const groups = [
    { value: 'none', label: 'None' },
    { value: 'kind', label: 'Kind' },
    { value: 'date', label: 'Date' },
    { value: 'size', label: 'Size' },
    { value: 'shared', label: 'Shared by' },
  ];
  const sorts = [
    { value: 'name', label: 'Name' },
    { value: 'kind', label: 'Kind' },
    { value: 'date', label: 'Date' },
    { value: 'size', label: 'Size' },
    { value: 'tags', label: 'Tags' },
  ];
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="icons" value={icons} onChange={setIcons} />
        <DemoControlBoolean name="checkmarks" value={checkmarks} onChange={setCheckmarks} />
      </div>
      <MenuScreen title="Overview" label="Downloads">
        <Menu.Item icon={icons ? <CheckCircle /> : undefined} onSelect={noop}>
          Select
        </Menu.Item>
        <Menu.Item icon={icons ? <FolderPlus /> : undefined} onSelect={noop}>
          New folder
        </Menu.Item>
        <Menu.Item icon={icons ? <FileDocument /> : undefined} onSelect={noop}>
          Scan documents
        </Menu.Item>
        <Menu.Item icon={icons ? <Desktop /> : undefined} onSelect={noop}>
          Connect to server
        </Menu.Item>
        <Menu.Separator />
        {checkmarks && (
          <>
            <Menu.Item icon={icons ? <VideoGrid /> : undefined} checked={view === 'icons'} onSelect={() => setView('icons')}>
              Icons
            </Menu.Item>
            <Menu.Item icon={icons ? <List /> : undefined} checked={view === 'list'} onSelect={() => setView('list')}>
              List
            </Menu.Item>
            <Menu.Separator />
            {sorts.map((option) => (
              <Menu.Item
                key={option.value}
                checked={sort === option.value}
                description={option.value === 'date' && sort === 'date' ? 'Newest to oldest' : undefined}
                onSelect={() => setSort(option.value)}
              >
                {option.label}
              </Menu.Item>
            ))}
            <Menu.Separator />
            <Menu.Sub>
              <Menu.SubTrigger>Group by</Menu.SubTrigger>
              <Menu.SubContent>
                {groups.map((option) => (
                  <Menu.Item key={option.value} checked={group === option.value} onSelect={() => setGroup(option.value)}>
                    {option.label}
                  </Menu.Item>
                ))}
              </Menu.SubContent>
            </Menu.Sub>
          </>
        )}
        <Menu.Item onSelect={noop}>View options</Menu.Item>
      </MenuScreen>
    </>
  );
});

/**
 * The filter of the message list, as Messages opens it on iOS: the mailboxes, a section labeled Filter by, and Manage
 * Filtering under a separator. Both sets of options hold one value, so one checkmark marks the list shown.
 */
export const Grouped = docsDemo(function Grouped() {
  const [filter, setFilter] = useState('messages');
  const option = (value: string, icon: ReactNode, label: string) => (
    <Menu.Item icon={icon} checked={filter === value} onSelect={() => setFilter(value)}>
      {label}
    </Menu.Item>
  );
  return (
    <MenuScreen title="Grouped items" label="Filter">
      {option('messages', <Chats />, 'Messages')}
      {option('spam', <XSquare />, 'Spam')}
      {option('deleted', <RemoveTrash />, 'Recently deleted')}
      <Menu.Separator />
      <Menu.Label>Filter by</Menu.Label>
      {option('unread', <Chat />, 'Unread')}
      {option('drafts', <ChatTripleDots />, 'Drafts')}
      <Menu.Separator />
      <Menu.Item onSelect={noop}>Manage filtering</Menu.Item>
    </MenuScreen>
  );
});

const PERIODS = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Today', disabled: true },
  { value: 'last7d', label: 'Last 7 days' },
  { value: 'last30d', label: 'Last 30 days' },
  { value: 'last3m', label: 'Last 3 months' },
];

/** Options of one value: the chosen one shows the checkmark, a disabled one cannot be chosen. */
export const RadioItems = docsDemo(function RadioItems() {
  const [value, setValue] = useState('any');
  return (
    <MenuScreen title="Radio items" label="Date modified">
      {PERIODS.map((period) => (
        <Menu.Item key={period.value} checked={value === period.value} disabled={period.disabled} onSelect={() => setValue(period.value)}>
          {period.label}
        </Menu.Item>
      ))}
    </MenuScreen>
  );
});

/** A destructive action last, after a separator, in the danger color. */
export const Destructive = docsDemo(function Destructive() {
  return (
    <MenuScreen title="Destructive items" label="More actions">
      <Menu.Item icon={<EditPencil />} onSelect={noop}>
        Rename
      </Menu.Item>
      <Menu.Item icon={<Copy />} onSelect={noop}>
        Duplicate
      </Menu.Item>
      <Menu.Separator />
      <Menu.Item icon={<RemoveTrash />} danger onSelect={noop}>
        Delete project
      </Menu.Item>
    </MenuScreen>
  );
});

const DEVICES = [
  { id: 'laptop', name: 'Work laptop', detail: 'Last active today at 9:41' },
  { id: 'phone', name: 'Phone', detail: 'Last active yesterday' },
  { id: 'tablet', name: 'Tablet', detail: 'Last active 3 days ago' },
];

/**
 * A menu from a List row: each signed-in device ends in More, whose menu renames it or signs it out. On Android the
 * screen dims around the row, which stays lit, and the popup stands under it at its end; on iOS the menu opens at its
 * button. In the phone preview the first device's menu stands open.
 */
export const FromRow = docsDemo(function FromRow() {
  const embed = usePreviewEmbed() !== null;
  const [open, setOpen] = useState<string | null>(embed ? DEVICES[0].id : null);
  return (
    <RNScreen screen grouped minHeight={560}>
      <PhonePage
        top={(scrolled, canvas) => (
          <Toolbar scrolled={scrolled} canvasColor={canvas}>
            <Toolbar.Leading>
              <NavigationButton action="back" />
            </Toolbar.Leading>
            <Toolbar.Title>Devices</Toolbar.Title>
          </Toolbar>
        )}
      >
        <Rows footer="Sign out of a device you no longer use.">
          {DEVICES.map((device) => (
            <ListItem
              key={device.id}
              label={device.name}
              description={device.detail}
              trailing={
                <Menu open={open === device.id} onOpenChange={(next: boolean) => setOpen(next ? device.id : null)}>
                  <Menu.Trigger>
                    <IconButton icon={<MoreIcon />} accessibilityLabel={`More for ${device.name}`} />
                  </Menu.Trigger>
                  <Menu.Content align="end" aria-label={`${device.name} actions`}>
                    <Menu.Item icon={<EditPencil />} onSelect={noop}>
                      Rename
                    </Menu.Item>
                    <Menu.Item icon={<RemoveTrash />} danger onSelect={noop}>
                      Sign out
                    </Menu.Item>
                  </Menu.Content>
                </Menu>
              }
            />
          ))}
        </Rows>
      </PhonePage>
    </RNScreen>
  );
});
