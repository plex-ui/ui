import { useState } from 'react';
import { Button, Dialog, Input } from '@plexui/react-native';
import { View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { usePreviewEmbed } from '../../PreviewEmbed';
import { RNScreen, docsDemo } from '../RNScreen';
import { useNativePlatform } from '../platform';

const ACTIONS = ['1', '2', '3'] as const;
type AlertActions = (typeof ACTIONS)[number];
/** A DialogAction of @plexui/react-native, which the docs see untyped */
type DialogAction = { label: string; variant?: 'default' | 'cancel' | 'destructive'; preferred?: boolean; disabled?: boolean };

/** What the alert says for each kind, as the React page's: its title, its message and the label of its main action */
function alertText(field: boolean, actions: AlertActions, destructive: boolean) {
  if (field) return { title: 'Rename document', message: 'Enter a new name for this document.', action: 'Rename' };
  if (actions === '1') return { title: 'Unable to save', message: 'Check your connection and try again.', action: 'OK' };
  if (destructive) return { title: 'Delete document?', message: 'This document will be deleted. You can’t undo this.', action: 'Delete' };
  return { title: 'Save changes?', message: 'Do you want to save the changes you made to this document?', action: 'Save' };
}

/**
 * The alert with every setting, as the React page's Overview: one, two or three actions, the main one preferred,
 * plain or destructive, with or without a message, a text field, and two actions side by side or stacked (iOS). As
 * the React phone preview does, the alert opens with the phone's screen; its trigger stands under it.
 */
export const Overview = docsDemo(function Overview() {
  const embed = usePreviewEmbed() !== null;
  const ios = useNativePlatform() === 'ios';
  const [open, setOpen] = useState(embed);
  const [actions, setActions] = useState<AlertActions>('2');
  const [destructiveValue, setDestructive] = useState(false);
  const [preferredValue, setPreferred] = useState(true);
  const [message, setMessage] = useState(true);
  const [fieldValue, setField] = useState(false);
  const [stackedValue, setStacked] = useState(false);
  const [name, setName] = useState('Untitled');
  // A setting shows only where it acts: a destructive action and a field stand with two actions, apart; a preferred
  // action is not destructive, and only iOS draws it apart (Android's alert has text buttons alone, the positive last);
  // two actions stack on iOS (Android stacks its buttons when they do not fit)
  const destructive = actions === '2' && !fieldValue && destructiveValue;
  const field = actions === '2' && !destructive && fieldValue;
  const preferred = !destructive && preferredValue;
  const stacked = ios && actions === '2' && stackedValue;
  const text = alertText(field, actions, destructive);
  // The main action: preferred (the accent fill), plain, or destructive (a red label on the alert's fill)
  const main: DialogAction = { label: text.action, variant: destructive ? 'destructive' : 'default', preferred, disabled: field && !name.trim() };
  const cancel: DialogAction = { label: 'Cancel', variant: 'cancel' };
  const list: DialogAction[] =
    actions === '1' ? [main] : actions === '2' ? [cancel, main] : [main, { label: 'Don’t save', variant: 'destructive' }, cancel];
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="actions" options={ACTIONS} value={actions} onChange={setActions} />
        {actions === '2' && !fieldValue && <DemoControlBoolean name="destructive" value={destructiveValue} onChange={setDestructive} />}
        {ios && !destructive && <DemoControlBoolean name="preferred" value={preferredValue} onChange={setPreferred} />}
        <DemoControlBoolean name="message" value={message} onChange={setMessage} />
        {actions === '2' && !destructive && <DemoControlBoolean name="field" value={fieldValue} onChange={setField} />}
        {ios && actions === '2' && <DemoControlBoolean name="stacked" value={stackedValue} onChange={setStacked} />}
      </div>
      <RNScreen screen minHeight={200}>
        {/* The trigger does not show through the open alert's dim in the phone, as the React phone hides it */}
        <View style={{ flex: 1, justifyContent: 'center', padding: 16, opacity: embed && open ? 0 : 1 }}>
          <View style={{ alignSelf: 'center' }}>
            <Button
              color="secondary"
              variant="outline"
              onPress={() => {
                setName('Untitled');
                setOpen(true);
              }}
            >
              Open alert
            </Button>
          </View>
        </View>
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title={text.title}
          description={message ? text.message : undefined}
          actions={list}
          mobileLayout={stacked ? 'stacked' : undefined}
        >
          {/* Android's alert takes the Android outlined field */}
          {field ? (
            <Input accessibilityLabel="Document name" variant={ios ? 'soft' : 'outline'} size="3xl" pill={ios} value={name} onChangeText={setName} selectTextOnFocus />
          ) : null}
        </Dialog>
      </RNScreen>
    </>
  );
});
