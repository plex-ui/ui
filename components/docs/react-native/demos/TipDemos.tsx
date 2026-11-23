import { useState } from 'react';
import { Button, Tip } from '@plexui/react-native';
import { Bell, Filter } from '@plexui/react-native/icons';
import { View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

const ACTIONS = ['none', 'one', 'two'] as const;
// How a phone draws the actions: rows of text under a separator, or the buttons as capsules
const MOBILE_ACTIONS = ['rows', 'buttons'] as const;
// A phone offers no sideways arrow, as the React page's Phone preview: a tip stands over or under its control
const ARROW_EDGES = ['none', 'top', 'bottom'] as const;

/**
 * The React page's Overview: the kit's notifications tip with every setting, on the grouped background (an inline tip
 * is the card of a grouped list). With an arrow, the button it points at stands on that side; closed, a button shows
 * it again.
 */
export const Overview = docsDemo(function Overview() {
  const [icon, setIcon] = useState(true);
  const [onClose, setOnClose] = useState(true);
  const [actions, setActions] = useState<(typeof ACTIONS)[number]>('none');
  const [mobileActions, setMobileActions] = useState<(typeof MOBILE_ACTIONS)[number]>('rows');
  const [arrowEdge, setArrowEdge] = useState<(typeof ARROW_EDGES)[number]>('none');
  const [shown, setShown] = useState(true);
  const control = arrowEdge !== 'none' && (
    <Button color="secondary" variant="soft" uniform pill accessibilityLabel="Notifications" style={{ alignSelf: 'center' }}>
      <Bell />
    </Button>
  );
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="icon" value={icon} onChange={setIcon} />
        <DemoControlBoolean name="onClose" value={onClose} onChange={setOnClose} />
        <Segments name="actions" options={ACTIONS} value={actions} onChange={setActions} />
        {actions !== 'none' && <Segments name="mobileActions" options={MOBILE_ACTIONS} value={mobileActions} onChange={setMobileActions} />}
        <Segments name="arrowEdge" options={ARROW_EDGES} value={arrowEdge} onChange={setArrowEdge} />
      </div>
      <RNScreen grouped>
        <View style={{ alignItems: 'center', gap: 4 }}>
          {arrowEdge === 'top' && control}
          {shown ? (
            <Tip
              icon={icon ? <Bell /> : undefined}
              title="Turn on notifications"
              description="Get a message when someone replies to your post or mentions you."
              onClose={onClose ? () => setShown(false) : undefined}
              actions={
                actions === 'none' ? undefined : (
                  <>
                    {actions === 'two' && (
                      <Button color="primary" variant="soft" size="sm" pill>
                        Not now
                      </Button>
                    )}
                    <Button color="primary" variant={actions === 'two' ? 'solid' : 'soft'} size="sm" pill>
                      Turn on
                    </Button>
                  </>
                )
              }
              mobileActions={actions === 'none' ? undefined : mobileActions}
              arrowEdge={arrowEdge === 'none' ? undefined : arrowEdge}
            />
          ) : (
            <Button color="secondary" variant="soft" onPress={() => setShown(true)} style={{ alignSelf: 'center' }}>
              Show the tip again
            </Button>
          )}
          {arrowEdge === 'bottom' && control}
        </View>
      </RNScreen>
    </>
  );
});

/** The React page's Popover: a popover tip under the Filter button, which shows and hides it. */
export const PopoverTip = docsDemo(function PopoverTip() {
  const [open, setOpen] = useState(false);
  return (
    <RNScreen minHeight={260}>
      <View style={{ alignItems: 'center' }}>
        <Tip.Popover open={open} onOpenChange={setOpen} title="Filter the list" description="Show only the items from the last week, month or year.">
          <Button color="secondary" variant="soft" onPress={() => setOpen(!open)} style={{ alignSelf: 'center' }}>
            <Filter />
            Filter
          </Button>
        </Tip.Popover>
      </View>
    </RNScreen>
  );
});
