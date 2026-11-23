import { useState } from 'react';
import { Button, toast } from '@plexui/react-native';
import { View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { TOAST_MESSAGES } from '../../toastMessages';
import { RNScreen, docsDemo } from '../RNScreen';
import { useNativePlatform } from '../platform';

// The React page's settings that toast() of React Native has: no promise type, no cancel and no compact option
const TYPES = ['default', 'success', 'error', 'warning', 'info'] as const;
const DESCRIPTIONS = ['none', 'short', 'long'] as const;
const ACTIONS = ['none', 'action'] as const;

/**
 * A toast with every setting, as the React page's Overview: its type and the type's icon, a description, an action
 * and, on Android, the toast's close button. A persistent toast waits to be closed, so it is offered with an action
 * or a close button. The button shows the toast with the settings chosen.
 */
export const Overview = docsDemo(function Overview() {
  const android = useNativePlatform() === 'android';
  const [type, setType] = useState<(typeof TYPES)[number]>('default');
  const [icon, setIcon] = useState(true);
  const [description, setDescription] = useState<(typeof DESCRIPTIONS)[number]>('none');
  const [action, setAction] = useState<(typeof ACTIONS)[number]>('none');
  const [closeButton, setCloseButton] = useState(false);
  const [persistent, setPersistent] = useState(false);
  // iOS banners have no close button: a swipe up closes them
  const closable = action !== 'none' || (android && closeButton);
  const message = TOAST_MESSAGES[type];
  const show = () => {
    const options = {
      description: description === 'none' ? undefined : description === 'short' ? message.description : message.long,
      action: action === 'none' ? undefined : { label: message.action, onClick: () => {} },
      closeButton: android && closeButton,
      duration: closable && persistent ? Infinity : undefined,
      // The type's icon, or none
      icon: icon ? undefined : false,
    };
    (type === 'default' ? toast : toast[type])(message.title, options);
  };
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="type" options={TYPES} value={type} onChange={setType} />
        {/* The type's symbol, on an iOS banner and on Android's toast card */}
        {type !== 'default' && <DemoControlBoolean name="icon" value={icon} onChange={setIcon} />}
        <Segments name="description" options={DESCRIPTIONS} value={description} onChange={setDescription} />
        <Segments name="action" options={ACTIONS} value={action} onChange={setAction} />
        {android && <DemoControlBoolean name="closeButton" value={closeButton} onChange={setCloseButton} />}
        {closable && <DemoControlBoolean name="persistent" value={persistent} onChange={setPersistent} />}
      </div>
      <RNScreen minHeight={200}>
        {/* A Button stands at the start of its row (alignSelf): centered as the React stage centers it */}
        <View style={{ alignSelf: 'center' }}>
          <Button color="secondary" variant="outline" onPress={show}>
            Show toast
          </Button>
        </View>
      </RNScreen>
    </>
  );
});
