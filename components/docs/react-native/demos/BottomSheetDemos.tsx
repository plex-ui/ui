import { useState } from 'react';
import { BottomSheet, Button, Input, Text } from '@plexui/react-native';
import { View } from 'react-native';
import { Email } from '@plexui/react-native/icons';
import { DemoControlBoolean, controlsTableStyle } from '../../ButtonDemos';
import { usePreviewEmbed } from '../../PreviewEmbed';
import { RNScreen, docsDemo } from '../RNScreen';
import { useNativePlatform } from '../platform';

/** The terms of the React Dialog page's Scrolling body, and more of them, so the sheet scrolls */
const TERMS = [
  'Accounts. You are responsible for the activity on your account and for keeping its password safe.',
  'Content. You keep the rights to what you upload; you give us the rights we need to run the service.',
  'Acceptable use. Do not use the service to break the law, to harm others or to probe its security.',
  'Payments. Paid plans renew until cancelled; you can cancel at any time from the billing page.',
  'Changes. We tell you about material changes to these terms at least 30 days before they apply.',
  'Termination. You can stop using the service at any time; we can suspend accounts that break these terms.',
  'Liability. The service is provided as is, to the extent the law allows.',
  'Privacy. We handle your personal data as the privacy policy describes, and only to run the service.',
  'Data export. You can download your projects and files at any time, in open formats.',
  'Third-party services. Integrations you turn on are covered by their own terms as well as these.',
  'Beta features. Features marked as beta may change or end, and come without the usual guarantees.',
  'Availability. We aim to keep the service running at all times, but planned maintenance may pause it.',
  'Feedback. Ideas you send us can be used to improve the service, with no obligation to you.',
  'Governing law. These terms follow the law of the place where the company is registered.',
  'Contact. Questions about these terms go to the support address in your account settings.',
];

/**
 * The sheet opens with the phone's screen, as the React Dialog page's sheets do in its phone preview, and its trigger
 * does not show through the dim there. Once the sheet closes, the trigger opens it again.
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
        {/* Alone on the screen it is its main action: the kit's Large button, 50 tall, as EmptyMessage's */}
        <Button color="secondary" variant="outline" size="3xl" onPress={onPress}>
          {label}
        </Button>
      </View>
    </View>
  );
}

/**
 * A sheet with every setting, modelled on the React Dialog page's Steps, whose first step is Apple Account's Add
 * Email Address: the text and a soft capsule field, with Continue in the sheet's footer. `title` stands in the sheet's bar, centered
 * on iOS beside Close; `dismissible` lets a tap on the dim, a drag down, Close and Back close it.
 */
export const Overview = docsDemo(function Overview() {
  const ios = useNativePlatform() === 'ios';
  const { open, setOpen, hideTrigger } = useSheetState();
  const [title, setTitle] = useState(true);
  const [hero, setHero] = useState(false);
  const [dismissible, setDismissible] = useState(true);
  const [email, setEmail] = useState('');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="hero" value={hero} onChange={setHero} />
        {!hero && <DemoControlBoolean name="title" value={title} onChange={setTitle} />}
        <DemoControlBoolean name="dismissible" value={dismissible} onChange={setDismissible} />
      </div>
      <RNScreen screen minHeight={200}>
        <Trigger label="Sign in" hidden={hideTrigger} onPress={() => setOpen(true)} />
        <BottomSheet open={open} onOpenChange={setOpen} title={title ? 'Sign in' : undefined}
          hero={hero ? { icon: <Email />, title: 'Sign in', description: 'We’ll send a code to this address.' } : undefined}
          aria-label="Sign in"
          dismissible={dismissible}
        >
          <View style={{ gap: 20 }}>
            {!hero && <Text color="secondary">We’ll send a code to this address.</Text>}
            <Input
              accessibilityLabel="Email"
              placeholder="Email address"
              variant="soft"
              size="3xl"
              pill={ios}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
            />
          </View>
          <BottomSheet.Footer>
            <Button size="xl" block onPress={() => setOpen(false)}>
              Continue
            </Button>
          </BottomSheet.Footer>
        </BottomSheet>
      </RNScreen>
    </>
  );
});

/**
 * Long content scrolls inside the sheet while its bar and its footer stay, as the React Dialog page's Scrolling
 * sheet: the terms of a service over Accept and Decline, pinned in `BottomSheet.Footer`.
 */
export const Scrolling = docsDemo(function Scrolling() {
  const { open, setOpen, hideTrigger } = useSheetState();
  return (
    <RNScreen screen minHeight={200}>
      <Trigger label="Review terms" hidden={hideTrigger} onPress={() => setOpen(true)} />
      <BottomSheet open={open} onOpenChange={setOpen} title="Terms of service">
        <View style={{ gap: 16 }}>
          {TERMS.map((term) => (
            <Text key={term} color="secondary">
              {term}
            </Text>
          ))}
        </View>
        <BottomSheet.Footer>
          <Button size="xl" block onPress={() => setOpen(false)}>
            Accept
          </Button>
          <Button color="secondary" variant="ghost" size="xl" block onPress={() => setOpen(false)}>
            Decline
          </Button>
        </BottomSheet.Footer>
      </BottomSheet>
    </RNScreen>
  );
});
