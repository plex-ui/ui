import { useEffect, useRef, useState } from 'react';
import { BottomSheet, Button, IconButton, List, ListItem, Popover, Switch, Text, Toolbar, usePopoverController, useTheme } from '@plexui/react-native';
import { Sparkles } from '@plexui/react-native/icons';
import { TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';
import { MoreIcon } from './MoreIcon';
import { PhonePage } from './ToolbarDemos';

const MIN_WIDTHS = ['300', 'auto'] as const;

/**
 * The React page's Overview in its Phone view: a phone has no room beside the trigger and no hover, so the panel
 * opens under it, centered, on a tap (the web's `side`, `align` and `showOnHover` are desktop settings). `minWidth` is
 * 300 by default; `auto` lets the panel hug its content.
 */
export const Overview = docsDemo(function Overview() {
  const [minWidth, setMinWidth] = useState<(typeof MIN_WIDTHS)[number]>('300');
  const [translucent, setTranslucent] = useState(false);
  const theme = useTheme();
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="minWidth" options={MIN_WIDTHS} value={minWidth} onChange={setMinWidth} />
        <DemoControlBoolean name="translucent" value={translucent} onChange={setTranslucent} />
      </div>
      <RNScreen minHeight={240}>
        <View style={{ alignItems: 'center' }}>
          <Popover>
            <Popover.Trigger>
              <Button color="primary" pill={false} style={{ alignSelf: 'center' }}>
                Generate
              </Button>
            </Popover.Trigger>
            <Popover.Content minWidth={minWidth === 'auto' ? 'auto' : 300} translucent={translucent}>
              <View style={{ padding: 16 }}>
                <Text size="sm" color={theme.colors.textSecondary}>
                  Use with any floating UI.
                </Text>
              </View>
            </Popover.Content>
          </Popover>
        </View>
      </RNScreen>
    </>
  );
});

/** The prompt's field: a ghost text area of three lines, as the web's Textarea (`variant="ghost"`, `gutterSize="xl"`) */
function PromptField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const theme = useTheme();
  const size = theme.length('--font-text-md-size', 16);
  const line = theme.length('--font-text-md-line-height', 24);
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      accessibilityLabel="Prompt"
      multiline
      numberOfLines={3}
      placeholder="Describe what you're using the model for, and we'll generate system instructions."
      placeholderTextColor={theme.colors.textTertiary}
      style={{
        minHeight: line * 3 + 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        color: theme.colors.text,
        fontSize: size,
        lineHeight: line,
        textAlignVertical: 'top',
        ...theme.font('regular'),
        outlineStyle: 'none',
      } as never}
    />
  );
}

function ControllerForm({ value, onChange, submitting, onSubmit }: { value: string; onChange: (value: string) => void; submitting: boolean; onSubmit: (close: () => void, shake: () => void) => void }) {
  const { shake, close } = usePopoverController();
  // The web's text-tertiary class
  const tertiary = useTheme().colors.textTertiary;
  return (
    <View style={{ paddingTop: 8 }}>
      <PromptField value={value} onChange={onChange} />
      <View style={{ paddingHorizontal: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Sparkles size={16} color={tertiary} />
          <Text size="sm" color={tertiary}>
            Free beta
          </Text>
        </View>
        <Button color="primary" size="xs" pill={false} loading={submitting} onPress={() => onSubmit(close, shake)}>
          Create
        </Button>
      </View>
    </View>
  );
}

/**
 * The React page's Using the controller: `usePopoverController()` inside the content. An empty prompt shakes the
 * panel; Create runs a simulated two-second request and then closes it. Closing or unmounting cancels the request, and
 * reopening starts a fresh session.
 */
export const Controller = docsDemo(function Controller() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const session = useRef(0);
  useEffect(
    () => () => {
      session.current++;
      clearTimeout(timer.current);
    },
    [],
  );
  const changeOpen = (next: boolean) => {
    session.current++;
    clearTimeout(timer.current);
    timer.current = undefined;
    if (next) {
      setSubmitting(false);
      setValue('');
    }
    setOpen(next);
  };
  const submitPrompt = (close: () => void, shake: () => void) => {
    if (!value) {
      shake();
      return;
    }
    if (timer.current !== undefined) return;
    setSubmitting(true);
    const current = session.current;
    timer.current = setTimeout(() => {
      if (session.current !== current) return;
      timer.current = undefined;
      close();
    }, 2000);
  };
  return (
    <RNScreen minHeight={168}>
      <View style={{ alignItems: 'center' }}>
        <Popover open={open} onOpenChange={changeOpen}>
          <Popover.Trigger>
            <Button color="primary" pill={false} style={{ alignSelf: 'center' }}>
              Generate
            </Button>
          </Popover.Trigger>
          <Popover.Content>
            <ControllerForm value={value} onChange={setValue} submitting={submitting} onSubmit={submitPrompt} />
          </Popover.Content>
        </Popover>
      </View>
    </RNScreen>
  );
});

function ConfirmationBody() {
  const theme = useTheme();
  const { close } = usePopoverController();
  return (
    <>
      {/* The alert's message: 17/22 in the text color, 15 in from the panel's padding */}
      <Text variant="body" style={theme.isAndroid ? { paddingHorizontal: 8, paddingTop: 4, paddingBottom: 16 } : { paddingHorizontal: 15, paddingTop: 5, paddingBottom: 19 }}>
        Are you sure you want to delete this event?
      </Text>
      <Button color="danger" variant="soft" block pill size={theme.isAndroid ? 'lg' : 'xl'} style={theme.isAndroid ? undefined : { minHeight: theme.length('--dialog-alert-action-height', 48) }} onPress={close}>
        Delete event
      </Button>
    </>
  );
}

/**
 * The React page's Confirmation: the panel covers the button that asks for it, as iOS presents an action sheet from
 * a bar button, with no Cancel (a tap anywhere else cancels). The button stands at the bottom of the screen.
 */
export const Confirmation = docsDemo(function Confirmation() {
  const insets = useSafeAreaInsets();
  return (
    <RNScreen screen minHeight={280}>
      <View style={{ flex: 1 }}>
        <Toolbar background="none">
          <Toolbar.Title>Confirmation</Toolbar.Title>
        </Toolbar>
        <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: Math.max(16, insets.bottom) }}>
          <Popover>
            <Popover.Trigger>
              <Button color="danger" variant="soft" size="3xl" block pill>
                Delete event
              </Button>
            </Popover.Trigger>
            {/* The panel covers its 50pt button and ends 16 above the button's bottom edge */}
            <Popover.Content side="top" sideOffset={-34} width={240} minWidth="auto" style={{ padding: 16 }}>
              <ConfirmationBody />
            </Popover.Content>
          </Popover>
        </View>
      </View>
    </RNScreen>
  );
});

const ALL_COLUMNS = [
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
  { id: 'role', label: 'Role' },
  { id: 'status', label: 'Status' },
  { id: 'created', label: 'Created at' },
  { id: 'lastLogin', label: 'Last login' },
  { id: 'avatar', label: 'Avatar' },
  { id: 'phone', label: 'Phone' },
];

/**
 * The React page's Column configuration in its Phone view: a sheet of switch rows in a fixed order (a row stays in
 * place when its switch changes, as in iOS settings), opened from the More button of the screen's top bar.
 */
export const ColumnConfiguration = docsDemo(function ColumnConfiguration() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(['name', 'email', 'role', 'status']);
  const toggle = (id: string) => setShown((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  return (
    <RNScreen screen minHeight={640}>
      <PhonePage
        top={(scrolled, canvas) => (
          <Toolbar scrolled={scrolled} canvasColor={canvas}>
            <Toolbar.Title>Members</Toolbar.Title>
            <Toolbar.Trailing>
              <IconButton icon={<MoreIcon />} accessibilityLabel="Columns" onPress={() => setOpen(true)} />
            </Toolbar.Trailing>
          </Toolbar>
        )}
      />
      <BottomSheet open={open} onOpenChange={setOpen} title="Columns">
        <List>
          {ALL_COLUMNS.map((col) => (
            <ListItem
              key={col.id}
              label={col.label}
              trailing={<Switch color="accent" checked={shown.includes(col.id)} onCheckedChange={() => toggle(col.id)} accessibilityLabel={col.label} />}
            />
          ))}
        </List>
      </BottomSheet>
    </RNScreen>
  );
});
