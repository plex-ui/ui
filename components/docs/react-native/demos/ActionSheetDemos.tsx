import { useState, type ReactElement } from 'react';
import { ActionSheet, Button } from '@plexui/react-native';
import { CameraPhoto, Copy, EditPencil, Folder, Images, RemoveTrash } from '@plexui/react-native/icons';
import { View } from 'react-native';
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
  return { open, setOpen, hideTrigger: embed && open };
}

function Trigger({ label, hidden, onPress }: { label: string; hidden: boolean; onPress: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, opacity: hidden ? 0 : 1 }}>
      {/* A Button stands at the start of its row (alignSelf): centered here as the React stage centers it */}
      <View style={{ alignSelf: 'center' }}>
        <Button color="secondary" variant="outline" onPress={onPress}>
          {label}
        </Button>
      </View>
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
  const { open, setOpen, hideTrigger } = useSheetState();
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
      <RNScreen screen minHeight={200}>
        <Trigger label="Project actions" hidden={hideTrigger} onPress={() => setOpen(true)} />
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
  const { open, setOpen, hideTrigger } = useSheetState();
  return (
    <RNScreen screen minHeight={200}>
      <Trigger label="Add a photo" hidden={hideTrigger} onPress={() => setOpen(true)} />
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
