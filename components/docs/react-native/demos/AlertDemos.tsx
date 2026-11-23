import { useState } from 'react';
import { Alert, Button } from '@plexui/react-native';
import { Lightbulb } from '@plexui/react-native/icons';
import { DemoControlBoolean, DemoControlSelect, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

const COLOR_OPTIONS = ['primary', 'success', 'danger', 'warning', 'caution', 'info', 'discovery'] as const;
const VARIANT_OPTIONS = ['solid', 'soft', 'outline'] as const;
const INDICATOR_OPTIONS = ['default', 'custom', 'none'] as const;
const MOBILE_ACTIONS_OPTIONS = ['capsules', 'own'] as const;

/**
 * The React page's Overview: every setting of the alert. An alert needs a title or a description, so `description`
 * is offered only with a title; a solid alert is for a message alone, so `actions` and `onDismiss` are offered on
 * soft and outline ones, and `mobileActions` only with actions. The web's `actionsPlacement` is a desktop setting: on a
 * phone the actions always stand under the message, so React Native has none.
 */
export const Overview = docsDemo(function Overview() {
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('primary');
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('outline');
  const [title, setTitle] = useState(true);
  const [description, setDescription] = useState(true);
  const [indicator, setIndicator] = useState<(typeof INDICATOR_OPTIONS)[number]>('default');
  const [actions, setActions] = useState(false);
  const [mobileActions, setMobileActions] = useState<(typeof MOBILE_ACTIONS_OPTIONS)[number]>('capsules');
  const [onDismiss, setOnDismiss] = useState(false);
  const [banner, setBanner] = useState(false);
  const shownDescription = !title || description;
  const buttons = variant !== 'solid';
  const shownActions = buttons && actions;
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlSelect name="color" options={COLOR_OPTIONS} value={color} onChange={setColor} />
        <Segments name="variant" options={VARIANT_OPTIONS} value={variant} onChange={setVariant} />
        <DemoControlBoolean name="title" value={title} onChange={setTitle} />
        {title && <DemoControlBoolean name="description" value={description} onChange={setDescription} />}
        <Segments name="indicator" options={INDICATOR_OPTIONS} value={indicator} onChange={setIndicator} />
        {buttons && <DemoControlBoolean name="actions" value={actions} onChange={setActions} />}
        {shownActions && <Segments name="mobileActions" options={MOBILE_ACTIONS_OPTIONS} value={mobileActions} onChange={setMobileActions} />}
        {buttons && <DemoControlBoolean name="onDismiss" value={onDismiss} onChange={setOnDismiss} />}
        <DemoControlBoolean name="banner" value={banner} onChange={setBanner} />
      </div>
      <RNScreen>
        <Alert
          color={color}
          variant={variant}
          title={title ? 'Scheduled maintenance' : undefined}
          description={shownDescription ? "We'll be offline 2 - 4 AM UTC on July 14 while we upgrade our database." : undefined}
          indicator={indicator === 'custom' ? <Lightbulb /> : indicator === 'none' ? false : undefined}
          actions={
            shownActions ? (
              <>
                <Button color="primary" variant="soft" pill>
                  Set reminder
                </Button>
                <Button color="primary" variant="solid" pill>
                  View status
                </Button>
              </>
            ) : undefined
          }
          mobileActions={shownActions ? mobileActions : undefined}
          onDismiss={buttons && onDismiss ? () => {} : undefined}
          banner={banner}
        />
      </RNScreen>
    </>
  );
});
