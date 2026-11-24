import { useRef, useState, type ReactElement } from 'react';
import { ActionSheet, IconButton, List, ListItem, Toolbar } from '@plexui/react-native';
import { CameraPhoto, Copy, EditPencil, Folder, Images, RemoveTrash, Share } from '@plexui/react-native/icons';
import { ScrollView, View } from 'react-native';
import { DemoControlBoolean, controlsTableStyle } from '../../ButtonDemos';
import { usePreviewEmbed } from '../../PreviewEmbed';
import { RNScreen, docsDemo } from '../RNScreen';
import { useNativePlatform } from '../platform';

/**
 * The sheet opens with the phone's screen, as the React Dialog page's alerts and sheets do in its phone preview, and
 * its trigger does not show through the dim there. Once the sheet closes, the trigger opens it again.
 */
function useSheetState() {
  const embed = usePreviewEmbed() !== null;
  const [open, setOpen] = useState(embed);
  return { open, setOpen };
}

/** A screen of an app: its title in the bar and a grouped list, a row of which opens the sheet */
function AppScreen({ title, rows }: { title: string; rows: { label: string; value?: string; onPress?: () => void }[] }) {
  return (
    <View style={{ flex: 1 }}>
      <Toolbar>
        <Toolbar.Title>{title}</Toolbar.Title>
      </Toolbar>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <List>
          {rows.map((row) => (
            <ListItem key={row.label} label={row.label} value={row.value} disclosure={row.onPress != null} onPress={row.onPress} />
          ))}
        </List>
      </ScrollView>
    </View>
  );
}

/**
 * An action sheet with every setting, modelled on the React Menu page's Destructive items (Rename, Duplicate and
 * Delete project, the destructive one last) and drawn as the React Dialog page's alert draws its actions: 48pt
 * capsules on glass. `title` and `message` stand over the actions, one is `destructive`, one `disabled`, and on
 * Android each row shows its icon (iOS leaves icons out, as UIAlertController does).
 */
export const Overview = docsDemo(function Overview() {
  const android = useNativePlatform() === 'android';
  const { open, setOpen } = useSheetState();
  const [title, setTitle] = useState(true);
  const [message, setMessage] = useState(true);
  const [destructive, setDestructive] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [icons, setIcons] = useState(true);
  const icon = (element: ReactElement) => (android && icons ? element : undefined);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="title" value={title} onChange={setTitle} />
        <DemoControlBoolean name="message" value={message} onChange={setMessage} />
        <DemoControlBoolean name="destructive" value={destructive} onChange={setDestructive} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        {android && <DemoControlBoolean name="icons" value={icons} onChange={setIcons} />}
      </div>
      {/* The projects of an app: a project's row asks what to do with it */}
      <RNScreen screen grouped minHeight={420}>
        <AppScreen
          title="Projects"
          rows={[
            { label: 'Website redesign', value: '128 files', onPress: () => setOpen(true) },
            { label: 'Mobile app', value: '64 files', onPress: () => setOpen(true) },
            { label: 'Brand refresh', value: '32 files', onPress: () => setOpen(true) },
          ]}
        />
        <ActionSheet
          open={open}
          onOpenChange={setOpen}
          title={title ? 'Website redesign' : undefined}
          message={message ? 'What would you like to do with this project?' : undefined}
          actions={[
            { label: 'Rename', icon: icon(<EditPencil />) },
            { label: 'Duplicate', icon: icon(<Copy />), disabled },
            { label: 'Delete project', icon: icon(<RemoveTrash />), destructive },
          ]}
        />
      </RNScreen>
    </>
  );
});

/**
 * Without a title and a message the sheet holds its actions alone; `cancelLabel` names the cancel capsule of iOS,
 * and a `disabled` action is dimmed.
 */
export const ActionsOnly = docsDemo(function ActionsOnly() {
  const { open, setOpen } = useSheetState();
  // A profile's settings: Change photo asks where the photo comes from
  return (
    <RNScreen screen grouped minHeight={420}>
      <AppScreen
        title="Edit profile"
        rows={[
          { label: 'Change photo', onPress: () => setOpen(true) },
          { label: 'Name', value: 'Anna Petrova' },
          { label: 'Username', value: '@anna' },
        ]}
      />
      <ActionSheet
        open={open}
        onOpenChange={setOpen}
        cancelLabel="Cancel"
        actions={[
          { label: 'Take photo', icon: <CameraPhoto />, disabled: true },
          { label: 'Photo library', icon: <Images /> },
          { label: 'Browse files', icon: <Folder /> },
        ]}
      />
    </RNScreen>
  );
});

/**
 * A destructive confirmation that opens from its button: `source` takes the Button's ref, and on iOS 26 the sheet
 * stands at it as a glass panel with no Cancel, closed by a tap elsewhere. Android keeps its sheet from the bottom.
 * The button stays in view while the sheet is open, as the sheet stands at it.
 */
export const FromSource = docsDemo(function FromSource() {
  const { open, setOpen } = useSheetState();
  const trash = useRef(null);
  // A project's screen: its details in a list and its actions in the bottom bar; Delete asks at its button, as an
  // iPhone's confirmation from a toolbar button stands at it
  return (
    <RNScreen screen grouped minHeight={420}>
      <View style={{ flex: 1 }}>
        <Toolbar>
          <Toolbar.Title>Website redesign</Toolbar.Title>
        </Toolbar>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <List>
            <ListItem label="Owner" value="Anna Petrova" />
            <ListItem label="Members" value="6" />
            <ListItem label="Files" value="128" />
            <ListItem label="Updated" value="Today" />
          </List>
        </ScrollView>
        <Toolbar placement="bottom">
          <Toolbar.Leading>
            <IconButton icon={<Share />} accessibilityLabel="Share" />
          </Toolbar.Leading>
          <Toolbar.Trailing>
            <IconButton ref={trash} icon={<RemoveTrash />} accessibilityLabel="Delete project" onPress={() => setOpen(true)} />
          </Toolbar.Trailing>
        </Toolbar>
      </View>
      <ActionSheet
        open={open}
        onOpenChange={setOpen}
        source={trash}
        message="This project and its files will be deleted for everyone."
        actions={[{ label: 'Delete project', destructive: true }]}
      />
    </RNScreen>
  );
});
